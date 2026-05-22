import psycopg2
import re
from collections import Counter
import concurrent.futures
import time

DB_PARAMS = {
    "dbname": "playnitedb", 
    "user": "postgres",     
    "password": "3248",
    "host": "localhost",
    "port": "5432"
}

def analyze_titles_chunk(titles):
    # Counters to hold our findings and their frequencies
    brackets = Counter()
    parentheses = Counter()
    after_dash = Counter()
    non_ascii = Counter()
    versions = Counter()

    for title in titles:
        if not title:
            continue
            
        # Extract [...]
        for match in re.findall(r'\[(.*?)\]', title):
            brackets[match.strip()] += 1
            
        # Extract (...)
        for match in re.findall(r'\((.*?)\)', title):
            parentheses[match.strip()] += 1
            
        # Extract text after the last dash or tilde (usually release groups)
        dash_match = re.search(r'[-~]\s*([^-~]+)$', title)
        if dash_match:
            after_dash[dash_match.group(1).strip()] += 1

        # Extract words with non-ascii characters (Russian, Chinese, etc.)
        for word in title.split():
            if re.search(r'[^\x00-\x7F]', word):
                non_ascii[word] += 1

        # Extract version/build patterns (e.g. v1.0, Build 1234)
        for match in re.findall(r'(?i)\b(v\d[\d\.]*|build\s*\d+|update\s*\d+)\b', title):
            versions[match] += 1

    return brackets, parentheses, after_dash, non_ascii, versions

def run_analysis():
    print("🚀 Starting Deep Title Analysis Pipeline...")
    start_time = time.time()
    
    conn = psycopg2.connect(**DB_PARAMS)
    # Using a server-side cursor so we don't blow up your RAM with 500k strings
    cur = conn.cursor(name="title_cursor")
    cur.execute("SELECT title FROM repacks;")

    batch_size = 25000
    all_brackets = Counter()
    all_parentheses = Counter()
    all_after_dash = Counter()
    all_non_ascii = Counter()
    all_versions = Counter()

    print("🔍 Fetching and analyzing 579,000+ titles in parallel...")
    
    with concurrent.futures.ProcessPoolExecutor() as executor:
        futures = []
        
        while True:
            rows = cur.fetchmany(batch_size)
            if not rows:
                break
                
            titles = [row[0] for row in rows]
            futures.append(executor.submit(analyze_titles_chunk, titles))
            
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            b, p, d, na, v = future.result()
            all_brackets.update(b)
            all_parentheses.update(p)
            all_after_dash.update(d)
            all_non_ascii.update(na)
            all_versions.update(v)
            print(f"   -> Processed batch {i+1}/{len(futures)}...")

    cur.close()
    conn.close()

    # Write the report
    print("📝 Writing report to 'title_analysis_report.txt'...")
    with open("title_analysis_report.txt", "w", encoding="utf-8") as f:
        f.write("=========================================\n")
        f.write("REPACK TITLE ANALYSIS REPORT\n")
        f.write("=========================================\n\n")

        categories = [
            ("TOP 300 TEXT IN BRACKETS [...]", all_brackets),
            ("TOP 300 TEXT IN PARENTHESES (...)", all_parentheses),
            ("TOP 300 TEXT AFTER DASH/TILDE (Release Groups / Junk)", all_after_dash),
            ("TOP 300 NON-ASCII/FOREIGN WORDS", all_non_ascii),
            ("TOP 300 VERSION/BUILD PATTERNS", all_versions)
        ]

        for title, counter in categories:
            f.write(f"--- {title} ---\n")
            for item, count in counter.most_common(300):
                f.write(f"[{count:^7}] {item}\n")
            f.write("\n\n")

    elapsed = round(time.time() - start_time, 2)
    print(f"\n🎉 Analysis Complete in {elapsed} seconds!")
    print("Please open 'title_analysis_report.txt' and let's look at the actual data.")

if __name__ == "__main__":
    run_analysis()