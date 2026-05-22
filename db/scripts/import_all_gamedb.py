import os
import json
import psycopg2
from psycopg2.extras import execute_values

# --- CONFIGURATION ---
DB_PARAMS = {
    "dbname": "your_db_name",
    "user": "your_username",
    "password": "your_password",
    "host": "localhost",
    "port": "5432"
}

# The folder where you cloned the gh-pages branch
REPO_DIR = './GameDB'

# Map LizardByte's folders to your new Postgres tables
CATEGORIES = {
    "games": "gamedb_games",
    "platforms": "gamedb_platforms",
    "characters": "gamedb_characters",
    "collections": "gamedb_collections",
    "franchises": "gamedb_franchises",
    "videos": "gamedb_videos"
}

def create_tables(cur):
    print("Creating tables and GIN indexes...")
    for table in CATEGORIES.values():
        # JSONB allows us to keep ALL data without missing nested properties
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {table} (
                id BIGINT PRIMARY KEY,
                name TEXT,
                data JSONB
            );
            
            -- GIN Index allows ultra-fast querying of any JSON property
            CREATE INDEX IF NOT EXISTS idx_{table}_data ON {table} USING GIN (data);
        """)

def import_data():
    conn = psycopg2.connect(**DB_PARAMS)
    cur = conn.cursor()
    
    create_tables(cur)
    conn.commit()

    for folder, table in CATEGORIES.items():
        folder_path = os.path.join(REPO_DIR, folder)
        
        if not os.path.exists(folder_path):
            print(f"⚠️ Folder not found: {folder_path}, skipping...")
            continue
            
        print(f"📦 Importing {folder} into {table}...")
        
        records = []
        files = os.listdir(folder_path)
        total_files = len(files)
        
        for idx, filename in enumerate(files):
            # Skip aggregation/bucket files or non-json files
            if filename == 'all.json' or not filename.endswith('.json'):
                continue
                
            filepath = os.path.join(folder_path, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    
                    item_id = data.get('id')
                    if item_id is None:
                        item_id = int(filename.split('.')[0])
                        
                    # Videos use 'title' instead of 'name' usually
                    item_name = data.get('name') or data.get('title') or 'Unknown'
                    
                    # Convert dict to JSON string for the JSONB column
                    records.append((item_id, item_name, json.dumps(data)))
                    
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
            
            # Batch insert every 2000 records to keep memory low and speed high
            if len(records) >= 2000 or (idx == total_files - 1 and records):
                query = f"""
                    INSERT INTO {table} (id, name, data)
                    VALUES %s
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        data = EXCLUDED.data;
                """
                # execute_values runs a massive multi-insert statement
                execute_values(cur, query, records)
                conn.commit()
                records = []
                
        print(f"✅ Finished importing {folder}!")

    cur.close()
    conn.close()
    print("🎉 Full database import completed successfully!")

if __name__ == "__main__":
    import_data()