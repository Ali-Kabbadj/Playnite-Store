import argparse
import threading
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from requests.adapters import HTTPAdapter

from db_utils import (
    get_connection,
    setup_game_logos_table,
    setup_game_meta_table,
    get_missing_logo_games,
    get_games_missing_metadata,
    insert_logo,
    upsert_meta,
)
from sources import try_all_sources, SOURCE_REGISTRY
from metadata import fetch_metadata

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

DEFAULT_MAX_THREADS = 25

thread_local = threading.local()


def get_session():
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
        adapter = HTTPAdapter(pool_connections=50, pool_maxsize=50)
        thread_local.session.mount("https://", adapter)
    return thread_local.session


def get_db_conn():
    if not hasattr(thread_local, "db_conn"):
        thread_local.db_conn = get_connection()
    return thread_local.db_conn


def resolve_steam_url(steam_url, uid):
    if steam_url and steam_url not in ("None", ""):
        return steam_url
    if uid and uid not in ("None", ""):
        return f"https://store.steampowered.com/app/{uid}"
    return steam_url


def process_logo(game, source_filter=None, dry_run=False):
    game_id, name, steam_url, uid = game
    steam_url = resolve_steam_url(steam_url, uid)
    session = get_session()

    url, reason = try_all_sources(game_id, name, steam_url, session, source_filter)

    if url:
        if not dry_run:
            conn = get_db_conn()
            insert_logo(conn, game_id, url)
        return game_id, name, url, reason
    return game_id, name, None, reason or "No logo found across all sources"


def process_metadata(game, dry_run=False):
    game_id, name, steam_url, uid = game
    steam_url = resolve_steam_url(steam_url, uid)
    session = get_session()

    meta = fetch_metadata(game_id, name, steam_url, session)
    if meta and not dry_run:
        conn = get_db_conn()
        upsert_meta(conn, game_id, meta)
        return game_id, name, meta
    return game_id, name, meta if meta else None


def run_logos(max_workers, source_filter=None, dry_run=False):
    if not dry_run:
        conn = get_connection()
        setup_game_logos_table(conn)
        games = get_missing_logo_games(conn)
        conn.close()
    else:
        conn = get_connection()
        games = get_missing_logo_games(conn)
        conn.close()
        games = games[:10]

    if not games:
        log.info("No missing logos found. Database is up to date!")
        return

    label = " [DRY RUN]" if dry_run else ""
    log.info("Found %d missing logos%s. Using %d workers...", len(games), label, max_workers)

    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_logo, game, source_filter, dry_run): game for game in games}

        for idx, future in enumerate(as_completed(futures), 1):
            try:
                game_id, name, logo_url, reason = future.result()
                if logo_url:
                    success_count += 1
                    log.info("[%d/%d]%s SAVED: %s (Source: %s)", idx, len(games), label, name, reason)
                else:
                    log.warning("[%d/%d]%s FAILED: %s - %s", idx, len(games), label, name, reason)
            except Exception as e:
                log.error("[%d/%d]%s ERROR: %s", idx, len(games), label, e)

    log.info("Done!%s Successfully scraped %d transparent logos.", label, success_count)


def run_metadata(max_workers, dry_run=False):
    if not dry_run:
        conn = get_connection()
        setup_game_meta_table(conn)
        games = get_games_missing_metadata(conn)
        conn.close()
    else:
        conn = get_connection()
        games = get_games_missing_metadata(conn)
        conn.close()
        games = games[:10]

    if not games:
        log.info("No games missing metadata found. Database is up to date!")
        return

    label = " [DRY RUN]" if dry_run else ""
    log.info("Found %d games missing metadata%s. Using %d workers...", len(games), label, max_workers)

    success_count = 0
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_metadata, game, dry_run): game for game in games}

        for idx, future in enumerate(as_completed(futures), 1):
            try:
                game_id, name, meta = future.result()
                if meta:
                    success_count += 1
                    fields = ", ".join(k for k in meta if meta[k])
                    log.info("[%d/%d]%s SAVED: %s (%s)", idx, len(games), label, name, fields)
                else:
                    log.warning("[%d/%d]%s NO DATA: %s", idx, len(games), label, name)
            except Exception as e:
                log.error("[%d/%d]%s ERROR: %s", idx, len(games), label, e)

    log.info("Done!%s Enriched metadata for %d games.", label, success_count)


def main():
    parser = argparse.ArgumentParser(description="Fetch logos and metadata for Playnite game database")
    parser.add_argument("--metadata", action="store_true", help="Fetch missing metadata instead of logos")
    parser.add_argument("--dry-run", action="store_true", help="Discover what would be fetched without writing to DB")
    parser.add_argument("--threads", type=int, default=DEFAULT_MAX_THREADS, help=f"Max worker threads (default: {DEFAULT_MAX_THREADS})")
    parser.add_argument("--sources", type=str, help="Comma-separated list of sources to use (default: all)")
    args = parser.parse_args()

    source_filter = None
    if args.sources:
        source_filter = [s.strip() for s in args.sources.split(",")]

    if args.metadata:
        run_metadata(args.threads, dry_run=args.dry_run)
    else:
        run_logos(args.threads, source_filter, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
