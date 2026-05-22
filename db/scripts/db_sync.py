import psycopg2
from psycopg2.extras import execute_values
import re
import time
import multiprocessing
import sys
import json
from concurrent.futures import ProcessPoolExecutor, as_completed

DB_PARAMS = {
    "dbname": "playnitedb",
    "user": "postgres",
    "password": "3248",
    "host": "localhost",
    "port": "5432"
}

# LOAD PATTERNS ONCE GLOBALLY
with open('patterns.json', 'r', encoding='utf-8') as f:
    PATTERNS = json.load(f)

REGEX_GROUPS = r'(?i)\b(' + '|'.join(PATTERNS["groups"]) + r')\b'
REGEX_JARGON = r'(?i)\b(' + '|'.join(PATTERNS["jargon"]) + r')\b'
REGEX_EDITIONS = r'(?i)\b(' + '|'.join(PATTERNS["editions"]) + r')\b'

def normalize_repack_title(title):
    if not title: return ""
    norm = str(title)
    
    for sep in [' | ', ' / ', ' \\ ', ' ~ ']:
        if sep in norm:
            norm = norm.split(sep)[0]

    norm = re.sub(r'\[.*?\]', ' ', norm)
    norm = re.sub(r'\(.*?\)', ' ', norm)

    norm = re.sub(REGEX_GROUPS, ' ', norm)
    norm = re.sub(REGEX_JARGON, ' ', norm)
    norm = re.sub(REGEX_EDITIONS, ' ', norm)

    norm = re.sub(r'(?i)\b(v\.?\s*\d+[\d\.\w-]*|build\s*\d+[\d\.\w-]*|update\s*\d+[\d\.\w-]*|patch\s*\d+[\d\.\w-]*)\b', ' ', norm)
    norm = re.sub(r'(?i)\s*[-~]\s*(rune|bat|prophet|kaos|flt|reloaded|emp)\s*$', ' ', norm)

    return clean_weird_punctuation(norm)

def clean_weird_punctuation(title):
    if not title: return ""
    norm = str(title).lower()
    norm = re.sub(r'[\.\'’]', '', norm)
    norm = re.sub(r'[^\w\s]', ' ', norm)
    norm = re.sub(r'\s+', ' ', norm).strip()
    return norm


def setup_database_schema(conn, cur):
    print("⚙️ Upgrading Schema for better visibility and indexing...")
    cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    
    cur.execute("ALTER TABLE games ADD COLUMN IF NOT EXISTS normalized_name TEXT;")
    cur.execute("ALTER TABLE repacks ADD COLUMN IF NOT EXISTS normalized_title TEXT;")
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS game_repacks (
            game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
            repack_id INTEGER REFERENCES repacks(id) ON DELETE CASCADE,
            PRIMARY KEY (game_id, repack_id)
        );
    """)
    # THIS FIXES THE CRASH: Forces the column to be added if the table already existed
    cur.execute("ALTER TABLE game_repacks ADD COLUMN IF NOT EXISTS similarity_score NUMERIC;")
    conn.commit()

    print("📚 Pre-calculating normalized names for official games...")
    cur.execute("SELECT id, name FROM games WHERE normalized_name IS NULL;")
    games_to_update = cur.fetchall()
    if games_to_update:
        game_updates = [(clean_weird_punctuation(name), gid) for gid, name in games_to_update]
        execute_values(cur, "UPDATE games AS g SET normalized_name = v.norm_name FROM (VALUES %s) AS v(norm_name, id) WHERE g.id = v.id;", game_updates, page_size=5000)
        conn.commit()

    print("📦 Pre-calculating normalized titles for repacks...")
    cur.execute("SELECT id, title FROM repacks WHERE normalized_title IS NULL;")
    repacks_to_update = cur.fetchall()
    if repacks_to_update:
        repack_updates = [(normalize_repack_title(title), rid) for rid, title in repacks_to_update]
        execute_values(cur, "UPDATE repacks AS r SET normalized_title = v.norm_title FROM (VALUES %s) AS v(norm_title, id) WHERE r.id = v.id;", repack_updates, page_size=5000)
        conn.commit()

    cur.execute("CREATE INDEX IF NOT EXISTS idx_games_norm_trgm ON games USING gist (normalized_name gist_trgm_ops);")
    conn.commit()


# --- WORKER FUNCTION FOR MULTIPROCESSING ---
def process_chunk(chunk):
    """Each worker gets its own DB connection to process a chunk of repacks concurrently."""
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()
    
    cur.execute("SET pg_trgm.similarity_threshold = 0.4;")
    
    match_query = """
        SELECT id, name, similarity(normalized_name, %s) as sim
        FROM games 
        WHERE normalized_name %% %s
        ORDER BY sim DESC 
        LIMIT 1;
    """
    
    insert_query = """
        INSERT INTO game_repacks (game_id, repack_id, similarity_score) 
        VALUES %s
        ON CONFLICT (game_id, repack_id) DO UPDATE SET similarity_score = EXCLUDED.similarity_score;
    """

    matches = []
    log_samples = []
    
    for repack_id, norm_title, original_title in chunk:
        cur.execute(match_query, (norm_title, norm_title))
        match = cur.fetchone()
        
        if match:
            game_id, game_name, sim_score = match[0], match[1], match[2]
            matches.append((game_id, repack_id, round(sim_score, 3)))
            
            # Store a visual sample so the user can see what's happening
            log_samples.append(f"  [+] Matched: '{original_title[:45]:<45}' ---> '{game_name[:35]:<35}' (Score: {sim_score:.2f})")

    # Write results directly to DB from the worker
    if matches:
        execute_values(cur, insert_query, matches, page_size=2000)
        conn.commit()

    cur.close()
    conn.close()
    return len(chunk), len(matches), log_samples


def run_sync():
    start_time = time.time()
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    setup_database_schema(conn, cur)

    print("🔍 Fetching unmatched repacks...")
    cur.execute("""
        SELECT r.id, r.normalized_title, r.title 
        FROM repacks r
        LEFT JOIN game_repacks gr ON r.id = gr.repack_id
        WHERE gr.repack_id IS NULL AND r.normalized_title != '';
    """)
    unmatched_repacks = cur.fetchall()
    cur.close()
    conn.close()
    
    total_unmatched = len(unmatched_repacks)
    if total_unmatched == 0:
        print("🎉 No unmatched repacks found. Everything is synced!")
        return

    print(f"🔗 Found {total_unmatched} repacks to sync.")
    
    # Chunk the data for the workers
    chunk_size = 500  # 500 repacks per thread chunk
    chunks = [unmatched_repacks[i:i + chunk_size] for i in range(0, total_unmatched, chunk_size)]
    
    num_workers = multiprocessing.cpu_count()
    print(f"🚀 Launching parallel sync using {num_workers} CPU cores across {len(chunks)} chunks...\n")

    processed_count = 0
    matched_count = 0

    try:
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = {executor.submit(process_chunk, chunk): chunk for chunk in chunks}
            
            for future in as_completed(futures):
                try:
                    processed, matched, logs = future.result()
                    processed_count += processed
                    matched_count += matched
                    
                    percent = (processed_count / total_unmatched) * 100
                    
                    # Print beautiful visual feedback
                    print(f"📊 PROGRESS: {processed_count}/{total_unmatched} ({percent:.1f}%) | Total Matches: {matched_count}")
                    
                    # Print up to 3 example matches from this chunk so it doesn't spam too hard
                    for log in logs[:3]:
                        print(log)
                    print("-" * 100)
                        
                except Exception as e:
                    print(f"⚠️ Worker Error: {e}")
                    
    except KeyboardInterrupt:
        print("\n🛑 Process interrupted by user! Shutting down gracefully...")
        sys.exit(0)

    elapsed = round(time.time() - start_time, 2)
    print(f"\n🎉 Sync Complete! Matched {matched_count} games in {elapsed} seconds!")

if __name__ == "__main__":
    run_sync()