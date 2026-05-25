import functools
import re
import time
import urllib.parse


def retry(max_attempts=3, base_delay=1.0, backoff=1.5):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    if attempt < max_attempts - 1:
                        delay = base_delay * (backoff ** attempt)
                        time.sleep(delay)
            raise last_exc
        return wrapper
    return decorator


STEAM_ID_RE = re.compile(r'/app/(\d+)')

SGDB_API_KEY = "a7f507563af5cfde7a4e72d0f9ac80d3"
FANART_API_KEY = ""
RAWG_API_KEY = ""
THEGAMESDB_API_KEY = ""

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 PlayniteEnricher/2.0',
    'Accept': 'application/json, text/plain, */*'
}

@retry(max_attempts=2, base_delay=0.5, backoff=1.5)
def check_image_exists(url, session):
    with session.get(url, headers=HEADERS, stream=True, timeout=3) as r:
        if r.status_code == 200 and 'image' in r.headers.get('Content-Type', ''):
            return True
        elif r.status_code == 429:
            time.sleep(1)
            return False
        else:
            return False


def build_steam_endpoints(app_id):
    return [
        f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_logo.png",
        f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/logo.png",
        f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{app_id}/library_logo.png",
        f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{app_id}/logo.png",
        f"https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/logo.png",
        f"https://steamcdn-a.akamaihd.net/steam/apps/{app_id}/logo.png",
        f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{app_id}/header.jpg",
    ]


def check_first_valid(endpoints, session):
    for url in endpoints:
        try:
            if check_image_exists(url, session):
                return url
        except Exception:
            continue
    return None


def get_candidate_app_ids(name, steam_url, session):
    candidate_app_ids = []
    clean_name = re.sub(r'[^\w\s]', ' ', name).strip()
    quoted_name = urllib.parse.quote(name)
    quoted_clean_name = urllib.parse.quote(clean_name)

    if steam_url:
        match = STEAM_ID_RE.search(steam_url)
        if match:
            candidate_app_ids.append(match.group(1))

    if not candidate_app_ids:
        for q_name in [quoted_name, quoted_clean_name]:
            try:
                url = f"https://steamcommunity.com/actions/SearchApps/{q_name}"
                res = session.get(url, headers=HEADERS, timeout=5)
                if res.status_code == 200:
                    data = res.json()
                    for item in data[:3]:
                        if "appid" in item:
                            candidate_app_ids.append(str(item["appid"]))
                    if candidate_app_ids:
                        break
            except Exception:
                pass

    if not candidate_app_ids:
        try:
            url = f"https://store.steampowered.com/api/storesearch/?term={quoted_name}&l=english&cc=US"
            res = session.get(url, headers=HEADERS, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("items"):
                    for item in data["items"][:3]:
                        if "id" in item:
                            candidate_app_ids.append(str(item["id"]))
        except Exception:
            pass

    return list(dict.fromkeys(candidate_app_ids))


def fetch_steam_source(game_id, name, steam_url, session):
    app_ids = get_candidate_app_ids(name, steam_url, session)

    for app_id in app_ids:
        endpoints = build_steam_endpoints(app_id)
        result = check_first_valid(endpoints, session)
        if result:
            return result, f"Steam CDN (AppID: {app_id})"

    return None, None


def fetch_steamgriddb_source(game_id, name, steam_url, session):
    if not SGDB_API_KEY or SGDB_API_KEY == "PASTE_YOUR_KEY_HERE":
        return None, None

    clean_name = re.sub(r'[^\w\s]', ' ', name).strip()
    quoted_name = urllib.parse.quote(clean_name)

    try:
        sgdb_headers = {"Authorization": f"Bearer {SGDB_API_KEY}"}
        search_res = session.get(
            f"https://www.steamgriddb.com/api/v2/search/autocomplete/{quoted_name}",
            headers=sgdb_headers, timeout=5,
        )
        if search_res.status_code == 200:
            sgdb_data = search_res.json()
            if sgdb_data.get("success") and sgdb_data.get("data"):
                sgdb_game_id = sgdb_data["data"][0]["id"]
                logo_res = session.get(
                    f"https://www.steamgriddb.com/api/v2/logos/game/{sgdb_game_id}",
                    headers=sgdb_headers, timeout=5,
                )
                if logo_res.status_code == 200:
                    logo_data = logo_res.json()
                    if logo_data.get("success") and logo_data.get("data"):
                        for logo in logo_data["data"]:
                            url = logo.get("url")
                            if url and check_image_exists(url, session):
                                return url, "SteamGridDB API"
    except Exception:
        pass

    return None, None


def fetch_steam_store_fallback(game_id, name, steam_url, session):
    app_ids = get_candidate_app_ids(name, steam_url, session)
    if not app_ids:
        return None, None

    for app_id in app_ids[:1]:
        try:
            url = f"https://store.steampowered.com/api/appdetails?appids={app_id}"
            res = session.get(url, headers=HEADERS, timeout=5)
            if res.status_code == 200:
                raw = res.json()
                data = raw.get(app_id, {}).get("data")
                if data:
                    for key in ("header_image", "capsule_image", "capsule_imagev5", "background_raw", "background"):
                        img_url = data.get(key)
                        if img_url and check_image_exists(img_url, session):
                            return img_url, f"Steam Store {key} (AppID: {app_id})"
        except Exception:
            pass

    return None, None


def fetch_fanart_source(game_id, name, steam_url, session):
    if not FANART_API_KEY:
        return None, None

    quoted_name = urllib.parse.quote(name)
    try:
        url = f"https://webservice.fanart.tv/v3/games/search?name={quoted_name}&api_key={FANART_API_KEY}"
        res = session.get(url, headers=HEADERS, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data:
                game_data = data[0] if isinstance(data, list) else next(iter(data.values()))
                if isinstance(game_data, dict):
                    for logo in game_data.get("hdr_logo", []):
                        logo_url = logo.get("url")
                        if logo_url and check_image_exists(logo_url, session):
                            return logo_url, "Fanart.tv hdr_logo"
                    for logo in game_data.get("clearlogo", []):
                        logo_url = logo.get("url")
                        if logo_url and check_image_exists(logo_url, session):
                            return logo_url, "Fanart.tv clearlogo"
    except Exception:
        pass

    return None, None


def fetch_thegamesdb_source(game_id, name, steam_url, session):
    if not THEGAMESDB_API_KEY:
        return None, None

    quoted_name = urllib.parse.quote(name)
    try:
        url = f"https://api.thegamesdb.net/v1/Games/ByGameName?apikey={THEGAMESDB_API_KEY}&name={quoted_name}&filter=clearlogo"
        res = session.get(url, headers=HEADERS, timeout=5)
        if res.status_code == 200:
            data = res.json()
            games_data = data.get("data", {}).get("games", [])
            if games_data:
                game_id_tgdb = games_data[0].get("id")
                if game_id_tgdb:
                    images_url = f"https://api.thegamesdb.net/v1/Games/Images?apikey={THEGAMESDB_API_KEY}&games_id={game_id_tgdb}&filter[clearlogo]=1"
                    img_res = session.get(images_url, headers=HEADERS, timeout=5)
                    if img_res.status_code == 200:
                        img_data = img_res.json()
                        base_url = img_data.get("data", {}).get("base_url", {}).get("original", "")
                        for image_info in img_data.get("data", {}).get("images", {}).values():
                            if isinstance(image_info, list):
                                for img in image_info:
                                    filename = img.get("filename")
                                    if filename:
                                        full_url = base_url + filename
                                        if check_image_exists(full_url, session):
                                            return full_url, "TheGamesDB"
    except Exception:
        pass

    return None, None


def fetch_rawg_source(game_id, name, steam_url, session):
    if not RAWG_API_KEY:
        return None, None

    quoted_name = urllib.parse.quote(name)
    try:
        url = f"https://api.rawg.io/api/games?key={RAWG_API_KEY}&search={quoted_name}&page_size=1"
        res = session.get(url, headers=HEADERS, timeout=5)
        if res.status_code == 200:
            data = res.json()
            results = data.get("results", [])
            if results:
                bg_image = results[0].get("background_image")
                if bg_image and check_image_exists(bg_image, session):
                    return bg_image, "RAWG background_image"
    except Exception:
        pass

    return None, None


SOURCE_REGISTRY = [
    ("Steam", fetch_steam_source),
    ("SteamGridDB", fetch_steamgriddb_source),
    ("SteamStore", fetch_steam_store_fallback),
    ("Fanart.tv", fetch_fanart_source),
    ("TheGamesDB", fetch_thegamesdb_source),
    ("RAWG", fetch_rawg_source),
]


def try_all_sources(game_id, name, steam_url, session, source_filter=None):
    for source_name, source_fn in SOURCE_REGISTRY:
        if source_filter and source_name not in source_filter:
            continue
        try:
            url, reason = source_fn(game_id, name, steam_url, session)
            if url:
                return url, reason
        except Exception:
            continue
    return None, None
