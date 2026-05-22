import psycopg2
import sqlite3
import re
import time
from collections import Counter

DB_PARAMS = {
    "dbname": "playnitedb",  
    "user": "postgres",   
    "password": "3248",   
    "host": "localhost",
    "port": "5432"
}

def analyze_and_strip(title):
    if not title:
        return "", ""
        
    stripped_parts = []
    
    # Intercept regex replacements to save exactly what was removed
    def capture_removal(match):
        stripped_parts.append(match.group(0).strip())
        return ' '

    norm_title = str(title)
    
    # 1. Russian Pipe/Slash separators
    if ' | ' in norm_title:
        parts = norm_title.split(' | ', 1)
        norm_title = parts[0]
        stripped_parts.append(' | ' + parts[1])
        
    # 2. Brackets and Parentheses
    norm_title = re.sub(r'\[.*?\]', capture_removal, norm_title)
    norm_title = re.sub(r'\(.*?\)', capture_removal, norm_title)

    # 3. Release Groups after a dash/tilde
    norm_title = re.sub(r'(?i)\s*[-~]\s*(dodi|fitgirl|elamigos|rune|razor1911|gog|tenoke|kaos|rg mechanics|emp|skidrow|codex|plaza|p2p|tinyiso|flt|simplex|prophet|reloaded|ali213|hoodlum|cpy|empress|bat).*', capture_removal, norm_title)

    # 4. Repack Jargon
    jargon = [
        r'repack', r'rip', r'free download', r'pre-installed', r'portable', r'clean files',
        r'лицензия', r'папка игры', r'коллекционное издание', r'механики', r'архив', 
        r'от', r'сборник', r'антология', r'дилогия', r'трилогия', r'новый диск', r'акелла', 
        r'удалено', r'руссобит-м', r'демоверсия', r'софтклаб', r'некондиционная раздача',
        r'let\'splay', r'let\'sрlay'
    ]
    jargon_pattern = r'(?i)\b(' + '|'.join(jargon) + r')\b'
    norm_title = re.sub(jargon_pattern, capture_removal, norm_title)

    # 5. Editions
    editions = [
        r'digital deluxe edition', r'deluxe edition', r'premium edition', r'ultimate edition',
        r'definitive edition', r'game of the year edition', r'goty', r'enhanced edition',
        r'special edition', r'director\'s cut', r'anniversary edition', r'complete edition',
        r'standard edition', r'collector\'s edition', r'supporter edition'
    ]
    editions_pattern = r'(?i)\b(' + '|'.join(editions) + r')\b'
    norm_title = re.sub(editions_pattern, capture_removal, norm_title)

    # 6. Version/Build patterns
    norm_title = re.sub(r'(?i)\b(v\s*\d+[\d\.\w]*|build\s*\d+|update\s*\d+)\b', capture_removal, norm_title)

    # 7. Final Clean
    norm_title = norm_title.lower()
    norm_title = re.sub(r'[^\w\s]', ' ', norm_title)
    norm_title = re.sub(r'\b\d{1,4}\b$', ' ', norm_title) 
    norm_title = re.sub(r'\s+', ' ', norm_title).strip()
    
    stripped_str = " || ".join(stripped_parts) if stripped_parts else "NONE"

    return norm_title, stripped_str


def run_audit():
    print("🚀 Starting Procedural Title Audit...")
    start_time = time.time()
    
    # Connect to Postgres (Source Data)
    pg_conn = psycopg2.connect(**DB_PARAMS)
    pg_cur = pg_conn.cursor(name="audit_cursor")
    pg_cur.execute("SELECT id, title FROM repacks;")
    
    # Connect to local SQLite (Output Audit Data)
    sqlite_conn = sqlite3.connect("audit.sqlite")
    sqlite_cur = sqlite_conn.cursor()
    sqlite_cur.execute("DROP TABLE IF EXISTS repack_audit;")
    sqlite_cur.execute("""
        CREATE TABLE repack_audit (
            id INTEGER PRIMARY KEY,
            original_title TEXT,
            normalized_title TEXT,
            stripped_garbage TEXT
        );
    """)
    sqlite_conn.commit()
    
    batch_size = 25000
    total_processed = 0
    leftover_words_counter = Counter()

    print("📝 Writing to local SQLite database (audit.sqlite)...")
    
    while True:
        rows = pg_cur.fetchmany(batch_size)
        if not rows:
            break
            
        sqlite_batch = []
        for row_id, orig_title in rows:
            norm, stripped = analyze_and_strip(orig_title)
            sqlite_batch.append((row_id, orig_title, norm, stripped))
            
            # Count every single word that wasn't stripped out
            if norm:
                leftover_words_counter.update(norm.split())
                
        # Insert into SQLite
        sqlite_cur.executemany(
            "INSERT INTO repack_audit (id, original_title, normalized_title, stripped_garbage) VALUES (?, ?, ?, ?)", 
            sqlite_batch
        )
        sqlite_conn.commit()
                
        total_processed += len(rows)
        print(f"   -> Audited {total_processed} titles...")

    pg_cur.close()
    pg_conn.close()
    sqlite_conn.close()

    print("\n📊 Compiling leftover words summary (NO LIMIT)...")
    with open("leftover_words_summary.txt", "w", encoding="utf-8") as summary_file:
        summary_file.write("=========================================\n")
        summary_file.write("ALL WORDS REMAINING IN THE NORMALIZED TITLES\n")
        summary_file.write("=========================================\n\n")
        
        # .most_common() with no arguments returns EVERYTHING
        for word, count in leftover_words_counter.most_common():
            summary_file.write(f"[{count:^7}] {word}\n")

    elapsed = round(time.time() - start_time, 2)
    print(f"\n🎉 Audit Complete in {elapsed} seconds!")
    print("1. Open 'audit.sqlite' in your SQL IDE. You can now easily sort and query the results.")
    print("2. Look at 'leftover_words_summary.txt' to see EVERY single word that survived.")

if __name__ == "__main__":
    run_audit()