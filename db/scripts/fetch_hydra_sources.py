import psycopg2
from psycopg2.extras import execute_values
from curl_cffi import requests as curl_requests
import time

DB_PARAMS = {
    "dbname": "playnitedb",
    "user": "postgres",
    "password": "3248",
    "host": "localhost",
    "port": "5432"
}

def fetch_hydra_sources():
    print("🚀 Starting Ultra-Fast Hydra Sources Update Pipeline...")
    start_time = time.time()
    
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()

    cur.execute("SELECT id, title, url FROM sources WHERE url IS NOT NULL AND url != '';")
    sources = cur.fetchall()

    if not sources:
        print("⚠️ No sources with URLs found in the database.")
        return

    total_new_repacks = 0

    for source_id, source_title, url in sources:
        print(f"\n📡 Fetching {source_title}...")
        try:
            # Upgrade impersonation to chrome120 to beat updated Cloudflare rules
            headers = {
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://hydralinks.cloud/"
            }
            response = curl_requests.get(url, impersonate="chrome120", headers=headers, timeout=30)
            response.raise_for_status()
            
            raw_data = response.json()
            
            repacks_data = []
            if isinstance(raw_data, dict):
                repacks_data = raw_data.get('downloads', [])
                if not repacks_data:
                    print(f"❌ Error: Dictionary found but no 'downloads' array for {source_title}.")
                    continue
            elif isinstance(raw_data, list):
                repacks_data = raw_data
            else:
                print(f"❌ Error: Unknown JSON structure.")
                continue
                
            print(f"✅ Downloaded {len(repacks_data)} entries. Processing in memory...")
            
            # 1. OPTIMIZATION: Fetch ALL existing titles for this source into a fast Python Set
            cur.execute("SELECT title FROM repacks WHERE source_id = %s;", (source_id,))
            existing_titles = set(row[0] for row in cur.fetchall())
            
            # 2. Get the starting IDs ONCE
            cur.execute("SELECT COALESCE(MAX(id), 0) FROM repacks;")
            next_repack_id = cur.fetchone()[0] + 1
            
            cur.execute("SELECT COALESCE(MAX(id), 0) FROM repack_uris;")
            next_uri_id = cur.fetchone()[0] + 1

            # 3. Prepare Bulk Insert Arrays
            repacks_to_insert = []
            uris_to_insert = []
            new_for_source = 0

            for item in repacks_data:
                title = item.get('title', '').strip()
                if not title or title in existing_titles: 
                    continue
                
                # Add to Repacks batch
                repacks_to_insert.append((
                    next_repack_id, source_id, title, 
                    item.get('fileSize', ''), item.get('uploadDate', '')
                ))
                
                # Add URIs to batch
                for uri_str in item.get('uris', []):
                    uri_type = 'magnet' if uri_str.startswith('magnet:') else 'torrent' if uri_str.endswith('.torrent') else 'direct'
                    uris_to_insert.append((next_uri_id, next_repack_id, uri_str, uri_type))
                    next_uri_id += 1
                
                existing_titles.add(title) # Prevent duplicates within the same JSON file
                next_repack_id += 1
                new_for_source += 1
                total_new_repacks += 1

            # 4. Execute Bulk Inserts (Takes milliseconds instead of minutes)
            if repacks_to_insert:
                print(f"⏳ Writing {new_for_source} new repacks to database...")
                execute_values(cur, """
                    INSERT INTO repacks (id, source_id, title, file_size, upload_date) 
                    VALUES %s
                """, repacks_to_insert)
                
                execute_values(cur, """
                    INSERT INTO repack_uris (id, repack_id, uri, type) 
                    VALUES %s
                """, uris_to_insert)
                
                conn.commit()
                print(f"🎉 Added {new_for_source} NEW repacks from {source_title}!")
            else:
                print(f"👍 {source_title} is fully up to date.")
                
        except Exception as e:
            conn.rollback()
            if hasattr(e, 'response') and e.response is not None:
                print(f"❌ Failed to fetch {source_title}: HTTP {e.response.status_code}")
            else:
                print(f"❌ Failed to fetch {source_title}: {e}")

    cur.close()
    conn.close()

    elapsed = round(time.time() - start_time, 2)
    print(f"\n=======================================================")
    print(f"🏁 Pipeline Complete in {elapsed} seconds!")
    print(f"📈 Total New Repacks Added to DB: {total_new_repacks}")
    print(f"=======================================================\n")

if __name__ == "__main__":
    fetch_hydra_sources()