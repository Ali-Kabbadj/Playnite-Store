import re
import urllib.parse

STEAM_ID_RE = re.compile(r'/app/(\d+)')

RAWG_API_KEY = ""


def fetch_metadata(game_id, name, steam_url, session):
    meta = {}
    app_ids = []

    if steam_url:
        match = STEAM_ID_RE.search(steam_url)
        if match:
            app_ids.append(match.group(1))

    if not app_ids:
        clean_name = re.sub(r'[^\w\s]', ' ', name).strip()
        quoted_name = urllib.parse.quote(clean_name)
        try:
            url = f"https://store.steampowered.com/api/storesearch/?term={quoted_name}&l=english&cc=US"
            res = session.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data.get("items"):
                    app_ids.append(str(data["items"][0]["id"]))
        except Exception:
            pass

    if app_ids:
        app_id = app_ids[0]
        try:
            url = f"https://store.steampowered.com/api/appdetails?appids={app_id}"
            res = session.get(url, timeout=5)
            if res.status_code == 200:
                raw = res.json()
                data = raw.get(app_id, {}).get("data")
                if data:
                    if data.get("short_description"):
                        meta["summary"] = data["short_description"]
                    if data.get("developers"):
                        meta["developer"] = data["developers"][0]
                    if data.get("publishers"):
                        meta["publisher"] = data["publishers"][0]
                    if data.get("website"):
                        meta["website"] = data["website"]
                    if data.get("genres"):
                        meta["genre_names"] = [g["description"] for g in data["genres"]]
                    if data.get("release_date", {}).get("date"):
                        meta["release_date"] = data["release_date"]["date"]
                    if data.get("background_raw"):
                        meta["background_url"] = data["background_raw"]
                    elif data.get("background"):
                        meta["background_url"] = data["background"]
                    if data.get("about_the_game"):
                        if not meta.get("summary"):
                            meta["summary"] = data["about_the_game"]
        except Exception:
            pass

    if not meta.get("background_url") and RAWG_API_KEY:
        try:
            quoted_name = urllib.parse.quote(name)
            url = f"https://api.rawg.io/api/games?key={RAWG_API_KEY}&search={quoted_name}&page_size=1"
            res = session.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results:
                    if not meta.get("summary") and results[0].get("description_raw"):
                        meta["summary"] = results[0]["description_raw"]
                    if not meta.get("background_url") and results[0].get("background_image"):
                        meta["background_url"] = results[0]["background_image"]
                    if not meta.get("release_date") and results[0].get("released"):
                        meta["release_date"] = results[0]["released"]
                    if results[0].get("genres") and not meta.get("genre_names"):
                        meta["genre_names"] = [g["name"] for g in results[0]["genres"]]
                    if results[0].get("developers") and not meta.get("developer"):
                        meta["developer"] = results[0]["developers"][0]["name"]
                    if results[0].get("publishers") and not meta.get("publisher"):
                        meta["publisher"] = results[0]["publishers"][0]["name"]
        except Exception:
            pass

    return meta
