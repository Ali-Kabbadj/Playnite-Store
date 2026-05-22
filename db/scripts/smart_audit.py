import psycopg2
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

# --- THE SAME REGEX PIPELINE AS BEFORE ---
def analyze_and_strip(title):
    if not title: return "", []
    stripped_words = []
    
    def capture_removal(match):
        text = match.group(0)
        # Extract just the alphabetic words from what we are removing to analyze them
        words = re.findall(r'[a-zA-Zа-яА-Я0-9]+', text.lower())
        stripped_words.extend(words)
        return ' '

    norm = str(title)
    if ' | ' in norm:
        parts = norm.split(' | ', 1)
        norm = parts[0]
        stripped_words.extend(re.findall(r'[a-zA-Zа-яА-Я0-9]+', parts[1].lower()))
        
    norm = re.sub(r'\[.*?\]', capture_removal, norm)
    norm = re.sub(r'\(.*?\)', capture_removal, norm)
    norm = re.sub(r'(?i)\s*[-~]\s*(dodi|fitgirl|elamigos|rune|razor1911|gog|tenoke|kaos|rg mechanics|emp|skidrow|codex|plaza|p2p|tinyiso|flt|simplex|prophet|reloaded|ali213|hoodlum|cpy|empress|bat).*', capture_removal, norm)
    
    jargon = [r'repack', r'rip', r'free download', r'pre-installed', r'portable', r'clean files', r'лицензия', r'папка игры', r'коллекционное издание', r'механики', r'архив', r'от', r'сборник', r'антология', r'дилогия', r'трилогия', r'новый диск', r'акелла', r'удалено', r'руссобит-м', r'демоверсия', r'софтклаб', r'некондиционная раздача', r'let\'splay', r'let\'sрlay']
    norm = re.sub(r'(?i)\b(' + '|'.join(jargon) + r')\b', capture_removal, norm)
    
    editions = [r'digital deluxe edition', r'deluxe edition', r'premium edition', r'ultimate edition', r'definitive edition', r'game of the year edition', r'goty', r'enhanced edition', r'special edition', r'director\'s cut', r'anniversary edition', r'complete edition', r'standard edition', r'collector\'s edition', r'supporter edition']
    norm = re.sub(r'(?i)\b(' + '|'.join(editions) + r')\b', capture_removal, norm)
    
    norm = re.sub(r'(?i)\b(v\s*\d+[\d\.\w]*|build\s*\d+|update\s*\d+)\b', capture_removal, norm)

    norm = norm.lower()
    norm = re.sub(r'[^\w\s]', ' ', norm)
    norm = re.sub(r'\b\d{1,4}\b$', ' ', norm)
    norm = re.sub(r'\s+', ' ', norm).strip()
    
    return norm, stripped_words

def run_smart_audit():
    print("🚀 Starting Smart Cross-Reference Audit...")
    start_time = time.time()
    
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    # 1. BUILD THE GROUND TRUTH DICTIONARY
    print("📚 Learning valid game words from 362,000+ official GameDB titles...")
    cur.execute("SELECT name FROM games;")
    valid_words = set()
    for row in cur.fetchall():
        if row[0]:
            words = re.findall(r'[a-zA-Zа-яА-Я0-9]+', row[0].lower())
            valid_words.update(words)
    print(f"   -> Learned {len(valid_words)} unique valid game words.")

    # 2. ANALYZE REPACKS
    print("🔍 Analyzing 579,000+ repacks against the dictionary...")
    cur = conn.cursor(name="repack_cursor")
    cur.execute("SELECT title FROM repacks;")
    
    missed_garbage = Counter()
    wrongfully_stripped = Counter()
    
    batch_size = 25000
    total = 0
    
    while True:
        rows = cur.fetchmany(batch_size)
        if not rows: break
            
        for row in rows:
            norm_title, stripped_words = analyze_and_strip(row[0])
            
            # Check leftovers (Missed Garbage)
            if norm_title:
                for word in norm_title.split():
                    # If the leftover word NEVER appears in official games, it's garbage!
                    if word not in valid_words:
                        missed_garbage[word] += 1
                        
            # Check casualties (Wrongfully Stripped)
            for word in stripped_words:
                # If we stripped a word, but it DOES exist in official games (and isn't an 'edition' word)
                # Note: We ignore common words we WANT to strip like 'edition', 'deluxe'
                if word in valid_words and word not in ['edition', 'deluxe', 'premium', 'ultimate', 'game', 'of', 'the', 'year', 'director', 's', 'cut']:
                    wrongfully_stripped[word] += 1
                    
        total += len(rows)
        print(f"   -> Cross-referenced {total} titles...")

    cur.close()
    conn.close()

    # 3. WRITE THE INTELLIGENT REPORT
    print("\n📝 Generating the Smart Report...")
    with open("smart_audit_report.txt", "w", encoding="utf-8") as f:
        f.write("=========================================================\n")
        f.write("CATEGORY 1: MISSED GARBAGE (False Negatives)\n")
        f.write("These words survived our regex, but appear ZERO TIMES in official games.\n")
        f.write("These are definitely repack patterns we need to add to the script.\n")
        f.write("=========================================================\n")
        for word, count in missed_garbage.most_common(100):
            f.write(f"[{count:^7}] {word}\n")
            
        f.write("\n\n=========================================================\n")
        f.write("CATEGORY 2: CASUALTIES (False Positives)\n")
        f.write("These words were DESTROYED by our regex, but they ARE valid game words.\n")
        f.write("We need to fix the regex so it stops deleting these words.\n")
        f.write("=========================================================\n")
        for word, count in wrongfully_stripped.most_common(100):
            f.write(f"[{count:^7}] {word}\n")

    elapsed = round(time.time() - start_time, 2)
    print(f"\n🎉 Smart Audit Complete in {elapsed} seconds!")
    print("Please open 'smart_audit_report.txt' and paste the results here. It will only be about 200 lines long, and will show us exactly how to fix the pipeline.")

if __name__ == "__main__":
    run_smart_audit()