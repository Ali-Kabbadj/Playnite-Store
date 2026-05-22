from app.database import get_db_cursor

def get_companies(search, page, per_page):
    where, params = [], []
    if search:
        where.append('name ILIKE %s')
        params.append(f'%{search}%')
    where_sql = ' AND '.join(where) if where else 'TRUE'

    with get_db_cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM companies WHERE {where_sql}', params)
        total = cur.fetchone()['count']
        offset = (page - 1) * per_page
        cur.execute(f"""
            SELECT id, name,
                (SELECT COUNT(*) FROM game_companies gc WHERE gc.company_id = companies.id)::int as game_count
            FROM companies WHERE {where_sql} ORDER BY name LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        return {'rows': cur.fetchall(), 'total': total}

def get_providers(search, page, per_page):
    where, params = [], []
    if search:
        where.append('name ILIKE %s')
        params.append(f'%{search}%')
    where_sql = ' AND '.join(where) if where else 'TRUE'
    with get_db_cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM providers WHERE {where_sql}', params)
        total = cur.fetchone()['count']
        offset = (page - 1) * per_page
        cur.execute(f"""
            SELECT id, name, (SELECT COUNT(*) FROM sources s WHERE s.provider_id = providers.id)::int as source_count
            FROM providers WHERE {where_sql} ORDER BY name LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        return {'rows': cur.fetchall(), 'total': total}

def get_sources(search, page, per_page):
    where, params = [], []
    if search:
        where.append('s.title ILIKE %s')
        params.append(f'%{search}%')
    where_sql = ' AND '.join(where) if where else 'TRUE'
    with get_db_cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM sources s WHERE {where_sql}', params)
        total = cur.fetchone()['count']
        offset = (page - 1) * per_page
        cur.execute(f"""
            SELECT s.id, s.title as name, COALESCE(p.name, '-') as provider_name,
                (SELECT COUNT(*) FROM repacks r WHERE r.source_id = s.id)::int as repack_count
            FROM sources s LEFT JOIN providers p ON p.id = s.provider_id
            WHERE {where_sql} ORDER BY s.title LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        return {'rows': cur.fetchall(), 'total': total}

def get_simple_list(table, search, page, per_page):
    db_table_map = {'series': 'collections', 'tags': 'themes', 'platforms': 'platforms', 'genres': 'genres', 'link_sources': 'link_sources'}
    actual_table = db_table_map.get(table, table)
    
    count_map = {
        'platforms': ('game_platforms', 'platform_id'),
        'genres': ('game_genres', 'genre_id'),
        'collections': ('game_collections', 'collection_id'),
        'themes': ('game_themes', 'theme_id'),
        'link_sources': ('game_external_links', 'link_source_id')
    }
    
    where, params = [], []
    if search:
        where.append('name ILIKE %s')
        params.append(f'%{search}%')
    where_sql = ' AND '.join(where) if where else 'TRUE'
    
    if actual_table is not None:
        j_table, j_col = count_map.get(actual_table, (None, None))
    else:
        j_table, j_col = None, None
    
    with get_db_cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM {actual_table} WHERE {where_sql}', params)
        total = cur.fetchone()['count']
        offset = (page - 1) * per_page
        
        cols = f"id, name, (SELECT COUNT(*) FROM {j_table} WHERE {j_col} = {actual_table}.id)::int as game_count" if j_table else "id, name"
        cur.execute(f'SELECT {cols} FROM {actual_table} WHERE {where_sql} ORDER BY name LIMIT %s OFFSET %s', params + [per_page, offset])
        return {'rows': cur.fetchall(), 'total': total}

def create_record(table, name):
    db_table_map = {'series': 'collections', 'tags': 'themes', 'sources': 'sources', 'link_sources': 'link_sources'}
    actual_table = db_table_map.get(table, table)
    col = 'title' if actual_table == 'sources' else 'name'
    with get_db_cursor() as cur:
        try:
            cur.execute(f'SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM {actual_table}')
            new_id = cur.fetchone()['new_id']
            cur.execute(f'INSERT INTO {actual_table} (id, {col}) VALUES (%s, %s)', (new_id, name))
            return new_id
        except Exception: return None

def update_record(table, rid, name):
    db_table_map = {'series': 'collections', 'tags': 'themes', 'link_sources': 'link_sources'}
    actual_table = db_table_map.get(table, table)
    col = 'title' if actual_table == 'sources' else 'name'
    with get_db_cursor() as cur:
        cur.execute(f'UPDATE {actual_table} SET {col} = %s WHERE id = %s', (name, rid))
        return cur.rowcount > 0

def delete_record(table, rid):
    db_table_map = {'series': 'collections', 'tags': 'themes', 'link_sources': 'link_sources'}
    actual_table = db_table_map.get(table, table)
    with get_db_cursor() as cur:
        try:
            if actual_table in ['platforms', 'genres', 'collections', 'themes']:
                j_table, j_col = {'platforms': ('game_platforms', 'platform_id'), 'genres': ('game_genres', 'genre_id'), 'collections': ('game_collections', 'collection_id'), 'themes': ('game_themes', 'theme_id')}[actual_table]
                cur.execute(f'DELETE FROM {j_table} WHERE {j_col} = %s', (rid,))
            elif actual_table == 'companies':
                cur.execute('DELETE FROM game_companies WHERE company_id = %s', (rid,))
            elif actual_table == 'sources':
                cur.execute('UPDATE repacks SET source_id = NULL WHERE source_id = %s', (rid,))
            elif actual_table == 'providers':
                cur.execute('UPDATE sources SET provider_id = NULL WHERE provider_id = %s', (rid,))
            elif actual_table == 'link_sources':
                cur.execute('DELETE FROM game_external_links WHERE link_source_id = %s', (rid,))
            
            cur.execute(f'DELETE FROM {actual_table} WHERE id = %s', (rid,))
            return True
        except Exception as e:
            print(f"Delete Error: {e}")
            return False

def get_link_source_names():
    with get_db_cursor() as cur:
        cur.execute('SELECT name FROM link_sources ORDER BY name')
        rows = [r['name'] for r in cur.fetchall()]
        defaults = ['steam', 'epic', 'gog', 'itch', 'xbox', 'psn', 'nintendo', 'amazon', 'twitch', 'youtube', 'official', 'wikipedia']
        return list(dict.fromkeys(defaults + rows))