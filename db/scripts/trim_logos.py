import argparse
import io
import os
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from PIL import Image
import numpy as np

from db_utils import get_connection

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

TRIM_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "GamesNexus", "LogosTrimmed")
os.makedirs(TRIM_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PlayniteGamesNexus/1.0",
}

session = requests.Session()


def trim_transparent(img):
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    arr = np.array(img)
    alpha = arr[:, :, 3]
    mask = alpha > 20
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not rows.any() or not cols.any():
        return img
    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]
    y_min = max(0, y_min - 2)
    y_max = min(img.height - 1, y_max + 2)
    x_min = max(0, x_min - 2)
    x_max = min(img.width - 1, x_max + 2)
    return img.crop((x_min, y_min, x_max + 1, y_max + 1))


def process_logo(game_id, url):
    out_path = os.path.join(TRIM_DIR, f"{game_id}.png")
    if os.path.exists(out_path):
        return game_id, True, "already trimmed"
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return game_id, False, f"HTTP {r.status_code}"
        ct = r.headers.get("Content-Type", "")
        if "image" not in ct:
            return game_id, False, f"not an image ({ct})"
        img = Image.open(io.BytesIO(r.content))
        trimmed = trim_transparent(img)
        trimmed.save(out_path, "PNG")
        return game_id, True, f"saved ({img.size} -> {trimmed.size})"
    except Exception as e:
        return game_id, False, str(e)


def main():
    parser = argparse.ArgumentParser(description="Trim transparent padding from logo images")
    parser.add_argument("--threads", type=int, default=10, help="Worker threads")
    parser.add_argument("--dry-run", action="store_true", help="Check what would be processed")
    args = parser.parse_args()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT game_id, url FROM game_logos ORDER BY game_id")
    rows = cur.fetchall()
    conn.close()

    if not rows:
        log.info("No logos in database.")
        return

    if args.dry_run:
        log.info("Would process %d logos to: %s", len(rows), TRIM_DIR)
        return

    log.info("Processing %d logos with %d workers...", len(rows), args.threads)
    ok = 0
    fail = 0
    with ThreadPoolExecutor(max_workers=args.threads) as ex:
        futures = {ex.submit(process_logo, gid, url): gid for gid, url in rows}
        for i, f in enumerate(as_completed(futures), 1):
            gid, success, msg = f.result()
            if success:
                ok += 1
            else:
                fail += 1
            if i % 100 == 0:
                log.info("Progress: %d/%d (ok=%d fail=%d)", i, len(rows), ok, fail)
    log.info("Done! %d trimmed, %d failed. Output: %s", ok, fail, TRIM_DIR)


if __name__ == "__main__":
    main()
