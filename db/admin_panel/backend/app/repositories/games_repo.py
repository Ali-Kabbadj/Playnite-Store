from app.database import get_db_cursor, get_db_connection

def get_games_paginated(search, status, page, per_page, sort_by, sort_dir):
    allowed_sort = {'id': 'g.id', 'name': 'g.name', 'repack_count': 'repack_count'}
    order_col = allowed_sort.get(sort_by, 'g.id')
    order_dir = 'DESC' if sort_dir.lower() == 'desc' else 'ASC'

    where_clauses = []
    params = []

    if search:
        where_clauses.append('g.name ILIKE %s')
        params.append(f'%{search}%')
    if status == 'no_repacks':
        where_clauses.append('NOT EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.game_id = g.id)')
    elif status == 'no_metadata':
        where_clauses.append('(g.summary IS NULL AND g.cover_url IS NULL)')

    where_sql = ' AND '.join(where_clauses) if where_clauses else 'TRUE'

    with get_db_cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM games g WHERE {where_sql}', params)
        total = cur.fetchone()['count']

        offset = (page - 1) * per_page
        cur.execute(f"""
            SELECT g.id, g.name, g.cover_url as poster_url, 
                   (SELECT COUNT(*) FROM game_repacks gr WHERE gr.game_id = g.id)::int as repack_count
            FROM games g
            WHERE {where_sql}
            ORDER BY {order_col} {order_dir}, g.id
            LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        rows = cur.fetchall()

    return {'rows': rows, 'total': total}

def get_game_detail(gid):
    with get_db_cursor() as cur:
        cur.execute('SELECT * FROM games WHERE id = %s', (gid,))
        row = cur.fetchone()
        if not row:
            return None
            
        result = dict(row)
        result['poster_url'] = result.get('cover_url')

        cur.execute("""
            SELECT p.id, p.name FROM platforms p
            JOIN game_platforms gp ON gp.platform_id = p.id
            WHERE gp.game_id = %s ORDER BY p.name
        """, (gid,))
        result['platforms'] = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT g.id, g.name FROM genres g
            JOIN game_genres gg ON gg.genre_id = g.id
            WHERE gg.game_id = %s ORDER BY g.name
        """, (gid,))
        result['genres'] = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT c.id, c.name FROM companies c
            JOIN game_companies gc ON gc.company_id = c.id
            WHERE gc.game_id = %s AND gc.is_developer = true ORDER BY c.name
        """, (gid,))
        result['developers'] = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT c.id, c.name FROM companies c
            JOIN game_companies gc ON gc.company_id = c.id
            WHERE gc.game_id = %s AND gc.is_publisher = true ORDER BY c.name
        """, (gid,))
        result['publishers'] = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT c.id, c.name FROM collections c
            JOIN game_collections gc ON gc.collection_id = c.id
            WHERE gc.game_id = %s ORDER BY c.name
        """, (gid,))
        result['series'] = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT t.id, t.name FROM themes t
            JOIN game_themes gt ON gt.theme_id = t.id
            WHERE gt.game_id = %s ORDER BY t.name
        """, (gid,))
        result['tags'] = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT id, 'artwork' as type, url FROM game_artworks WHERE game_id = %s
            UNION ALL
            SELECT id, 'screenshot' as type, url FROM game_screenshots WHERE game_id = %s
        """, (gid, gid))
        result['media'] = [dict(r) for r in cur.fetchall()]

        # Filter out NULL names to prevent JSON serialization TypeErrors
        cur.execute('''
            SELECT ls.name as source_name, gel.url 
            FROM game_external_links gel
            JOIN link_sources ls ON gel.link_source_id = ls.id
            WHERE gel.game_id = %s
        ''', (gid,))
        result['external_links'] = {str(r['source_name']): str(r['url']) for r in cur.fetchall()}

    return result

def update_game(gid, updates):
    editable = {'name', 'slug', 'summary', 'storyline', 'url', 'rating', 'aggregated_rating', 'cover_url'}
    
    if 'poster_url' in updates:
        updates['cover_url'] = updates.pop('poster_url')
        
    valid_updates = {k: v for k, v in updates.items() if k in editable}
    if not valid_updates:
        return False
        
    set_parts = []
    params = []
    for k, v in valid_updates.items():
        set_parts.append(f'{k} = %s')
        params.append(v if v != '' else None)
    params.append(gid)

    with get_db_cursor() as cur:
        cur.execute(f'UPDATE games SET {", ".join(set_parts)} WHERE id = %s', params)
        updated = cur.rowcount > 0
    return updated

def delete_game(gid):
    with get_db_cursor() as cur:
        cur.execute('DELETE FROM game_repacks WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_genres WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_platforms WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_companies WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_collections WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_themes WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_artworks WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_screenshots WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_videos WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_external_links WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_modes_map WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_player_perspectives WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_multiplayer_modes WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_age_ratings WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_characters WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_platform_versions WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM game_release_dates WHERE game_id = %s', (gid,))
        cur.execute('DELETE FROM games WHERE id = %s', (gid,))
        return cur.rowcount > 0