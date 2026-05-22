import os
import json
import psycopg2
from psycopg2.extras import execute_values

DB_PARAMS = {
    "dbname": "playnitedb",
    "user": "postgres",
    "password": "3248",
    "host": "localhost",
    "port": "5432"
}

BATCH_SIZE = 2500

def get_json_files(folder):
    """Yields valid JSON file paths from a folder."""
    if not os.path.exists(folder):
        return []
    files = [f for f in os.listdir(folder) if f.endswith('.json') and f not in ('all.json', 'stats.json')]
    # Ignore buckets and bucket-like files
    return [os.path.join(folder, f) for f in files if f[:-5].isdigit()]

def execute_batch(cur, query, data, page_size=1000):
    if data:
        execute_values(cur, query, list(data), page_size=page_size)

def load_dimension_tables(conn):
    """Loads independent entity tables like Platforms, Franchises, Collections, Characters"""
    cur = conn.cursor()
    print("🚀 Stage 1: Loading Dimension Entities...")

    # 1. FRANCHISES
    print(" -> Loading Franchises...")
    franchises = []
    for filepath in get_json_files('franchises'):
        with open(filepath, 'r', encoding='utf-8') as f:
            d = json.load(f)
            franchises.append((d.get('id'), d.get('name'), d.get('slug'), d.get('url')))
    execute_batch(cur, """
        INSERT INTO franchises (id, name, slug, url) VALUES %s 
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;
    """, franchises)
    conn.commit()

    # 2. COLLECTIONS
    print(" -> Loading Collections...")
    collections = []
    for filepath in get_json_files('collections'):
        with open(filepath, 'r', encoding='utf-8') as f:
            d = json.load(f)
            collections.append((d.get('id'), d.get('name'), d.get('slug'), d.get('url')))
    execute_batch(cur, "INSERT INTO collections (id, name, slug, url) VALUES %s ON CONFLICT DO NOTHING;", collections)
    conn.commit()

    # 3. CHARACTERS
    print(" -> Loading Characters...")
    characters = []
    for filepath in get_json_files('characters'):
        with open(filepath, 'r', encoding='utf-8') as f:
            d = json.load(f)
            gender = d.get('character_gender', {}) or {}
            species = d.get('character_species', {}) or {}
            mug = d.get('mug_shot', {}) or {}
            characters.append((
                d.get('id'), d.get('name'), 
                gender.get('id'), gender.get('name'),
                species.get('id'), species.get('name'),
                mug.get('id'), mug.get('url')
            ))
    execute_batch(cur, "INSERT INTO characters VALUES %s ON CONFLICT DO NOTHING;", characters)
    conn.commit()

    # 4. PLATFORMS
    print(" -> Loading Platforms...")
    platforms = []
    for filepath in get_json_files('platforms'):
        with open(filepath, 'r', encoding='utf-8') as f:
            d = json.load(f)
            ptype = d.get('platform_type', {}) or {}
            logo = d.get('platform_logo', {}) or {}
            platforms.append((
                d.get('id'), d.get('name'), d.get('abbreviation'), d.get('alternative_name'),
                d.get('summary'), d.get('url'), d.get('generation'),
                ptype.get('id'), ptype.get('name'),
                logo.get('id'), logo.get('url')
            ))
    execute_batch(cur, "INSERT INTO platforms VALUES %s ON CONFLICT DO NOTHING;", platforms)
    conn.commit()
    cur.close()

def load_games(conn):
    """Loads Games and resolves all One-to-Many and Many-to-Many relationships."""
    cur = conn.cursor()
    print("🚀 Stage 2: Shredding Game files and normalizing relationships...")
    
    files = get_json_files('games')
    total_files = len(files)
    
    # Batch Arrays
    b_games, b_genres, b_themes, b_modes, b_persp, b_companies, b_videos = set(), set(), set(), set(), set(), set(), set()
    b_g_genres, b_g_themes, b_g_modes, b_g_persp, b_g_companies, b_g_platforms, b_g_vids = set(), set(), set(), set(), set(), set(), set()
    b_screenshots, b_artworks, b_release, b_external, b_age, b_multi = set(), set(), set(), set(), set(), set()
    
    for idx, filepath in enumerate(files):
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                d = json.load(f)
                g_id = d.get('id')
                if not g_id: continue

                # Insert Core Game
                franchise = d.get('franchise', {}) or {}
                cover = d.get('cover', {}) or {}
                b_games.add((
                    g_id, d.get('name'), d.get('slug'), d.get('summary'), d.get('storyline'),
                    d.get('url'), d.get('rating'), d.get('aggregated_rating'),
                    cover.get('id'), cover.get('url'), franchise.get('id')
                ))

                # Extract Lookups and M:N Junctions
                for g in d.get('genres', []):
                    b_genres.add((g['id'], g['name']))
                    b_g_genres.add((g_id, g['id']))
                
                for t in d.get('themes', []):
                    b_themes.add((t['id'], t['name']))
                    b_g_themes.add((g_id, t['id']))
                    
                for m in d.get('game_modes', []):
                    b_modes.add((m['id'], m['name']))
                    b_g_modes.add((g_id, m['id']))
                    
                for p in d.get('player_perspectives', []):
                    b_persp.add((p['id'], p['name']))
                    b_g_persp.add((g_id, p['id']))

                for c in d.get('involved_companies', []):
                    comp = c.get('company', {})
                    if comp:
                        b_companies.add((comp['id'], comp['name']))
                        b_g_companies.add((c['id'], g_id, comp['id'], c.get('developer'), c.get('publisher')))

                for plat_id in d.get('platforms', []):
                    b_g_platforms.add((g_id, plat_id))

                for v in d.get('videos', []):
                    vid_id = v.get('video_id')
                    if vid_id:
                        b_videos.add((vid_id, v.get('title'), v.get('name'), v.get('thumb')))
                        b_g_vids.add((v['id'], g_id, vid_id))

                # Extract 1:N Child items
                for s in d.get('screenshots', []):
                    b_screenshots.add((s['id'], g_id, s.get('url')))
                    
                for a in d.get('artworks', []):
                    b_artworks.add((a['id'], g_id, a.get('url')))

                for r in d.get('release_dates', []):
                    reg = r.get('release_region', {}) or {}
                    b_release.add((r['id'], g_id, r.get('platform'), r.get('date'), r.get('y'), reg.get('id'), reg.get('region')))

                for e in d.get('external_games', []):
                    src = e.get('external_game_source', {}) or {}
                    b_external.add((e['id'], g_id, e.get('platform'), e.get('name'), e.get('uid'), e.get('url'), src.get('id'), src.get('name')))

                for mm in d.get('multiplayer_modes', []):
                    b_multi.add((
                        mm['id'], g_id, mm.get('platform'), mm.get('campaigncoop'), mm.get('dropin'), 
                        mm.get('lancoop'), mm.get('offlinecoop'), mm.get('offlinecoopmax'), mm.get('offlinemax'),
                        mm.get('onlinecoop'), mm.get('onlinecoopmax'), mm.get('onlinemax'), mm.get('splitscreen')
                    ))

            except Exception as e:
                print(f"Error parsing {filepath}: {e}")

        # Execute Batch Query when limit reached
        if len(b_games) >= BATCH_SIZE or idx == total_files - 1:
            # 1. Insert Lookups FIRST (ON CONFLICT DO NOTHING)
            execute_batch(cur, "INSERT INTO genres VALUES %s ON CONFLICT DO NOTHING;", b_genres)
            execute_batch(cur, "INSERT INTO themes VALUES %s ON CONFLICT DO NOTHING;", b_themes)
            execute_batch(cur, "INSERT INTO game_modes VALUES %s ON CONFLICT DO NOTHING;", b_modes)
            execute_batch(cur, "INSERT INTO player_perspectives VALUES %s ON CONFLICT DO NOTHING;", b_persp)
            execute_batch(cur, "INSERT INTO companies VALUES %s ON CONFLICT DO NOTHING;", b_companies)
            execute_batch(cur, "INSERT INTO videos (id, title, description, thumbnail_url) VALUES %s ON CONFLICT DO NOTHING;", b_videos)
            
            # 2. Insert Base Game (Wait for lookups)
            execute_batch(cur, "INSERT INTO games VALUES %s ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;", b_games)
            
            # 3. Insert M:N Junctions & 1:N Child properties
            execute_batch(cur, "INSERT INTO game_genres VALUES %s ON CONFLICT DO NOTHING;", b_g_genres)
            execute_batch(cur, "INSERT INTO game_themes VALUES %s ON CONFLICT DO NOTHING;", b_g_themes)
            execute_batch(cur, "INSERT INTO game_modes_map VALUES %s ON CONFLICT DO NOTHING;", b_g_modes)
            execute_batch(cur, "INSERT INTO game_player_perspectives VALUES %s ON CONFLICT DO NOTHING;", b_g_persp)
            execute_batch(cur, "INSERT INTO game_companies VALUES %s ON CONFLICT DO NOTHING;", b_g_companies)
            # Using ON CONFLICT DO NOTHING for platforms ensures if a game references a platform we don't have, it just ignores the link safely
            execute_batch(cur, "INSERT INTO game_platforms VALUES %s ON CONFLICT DO NOTHING;", b_g_platforms)
            execute_batch(cur, "INSERT INTO game_videos VALUES %s ON CONFLICT DO NOTHING;", b_g_vids)
            
            execute_batch(cur, "INSERT INTO game_screenshots VALUES %s ON CONFLICT DO NOTHING;", b_screenshots)
            execute_batch(cur, "INSERT INTO game_artworks VALUES %s ON CONFLICT DO NOTHING;", b_artworks)
            execute_batch(cur, "INSERT INTO game_release_dates VALUES %s ON CONFLICT DO NOTHING;", b_release)
            execute_batch(cur, "INSERT INTO game_external_links VALUES %s ON CONFLICT DO NOTHING;", b_external)
            execute_batch(cur, "INSERT INTO game_multiplayer_modes VALUES %s ON CONFLICT DO NOTHING;", b_multi)

            conn.commit()
            print(f"Processed {idx + 1}/{total_files} games...")
            
            # Clear batches
            b_games.clear(); b_genres.clear(); b_themes.clear(); b_modes.clear(); b_persp.clear(); b_companies.clear(); b_videos.clear()
            b_g_genres.clear(); b_g_themes.clear(); b_g_modes.clear(); b_g_persp.clear(); b_g_companies.clear(); b_g_platforms.clear(); b_g_vids.clear()
            b_screenshots.clear(); b_artworks.clear(); b_release.clear(); b_external.clear(); b_age.clear(); b_multi.clear()

    cur.close()

if __name__ == "__main__":
    print("Establishing connection to PostgreSQL...")
    conn = psycopg2.connect(**DB_PARAMS)
    
    load_dimension_tables(conn)
    load_games(conn)
    
    conn.close()
    print("🎉 ETL Complete! Your database is fully structured and populated.")