from app.database import get_db_cursor

def get_repacks_paginated(search, status, page, per_page, sort_by, sort_dir):
    allowed_sort = {'id': 'r.id', 'title': 'r.title', 'status': 'match_status'}
    order_col = allowed_sort.get(sort_by, 'r.id')
    order_dir = 'DESC' if sort_dir.lower() == 'desc' else 'ASC'

    where = []
    params = []
    
    if search:
        where.append('r.title ILIKE %s')
        params.append(f'%{search}%')
        
    # Bulletproof dynamic check: ONLY look at the actual game_repacks junction table
    if status == 'matched':
        where.append('EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id)')
    elif status == 'orphan':
        where.append('NOT EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id)')

    where_sql = ' AND '.join(where) if where else 'TRUE'

    with get_db_cursor() as cur:
        cur.execute(f'SELECT COUNT(*) FROM repacks r WHERE {where_sql}', params)
        total = cur.fetchone()['count']

        offset = (page - 1) * per_page
        cur.execute(f"""
            SELECT r.id, r.title,
                   CASE WHEN EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id) 
                   THEN 'matched' ELSE 'orphan' END as status
            FROM repacks r WHERE {where_sql}
            ORDER BY {order_col} {order_dir}, r.id LIMIT %s OFFSET %s
        """, params + [per_page, offset])
        rows = cur.fetchall()

    return {'rows': rows, 'total': total}

def get_repack_detail(rid):
    with get_db_cursor() as cur:
        cur.execute('SELECT * FROM repacks WHERE id = %s', (rid,))
        row = cur.fetchone()
        if not row:
            return None
            
        res = dict(row)
        # Dynamically calculate "has_game" for the UI without needing the column
        cur.execute('SELECT 1 FROM game_repacks WHERE repack_id = %s LIMIT 1', (rid,))
        res['has_game'] = bool(cur.fetchone())
        return res

def get_repacks_by_ids(ids):
    if not ids:
        return []
    with get_db_cursor() as cur:
        placeholders = ','.join(['%s'] * len(ids))
        cur.execute(f"""
            SELECT id, title, 
                   CASE WHEN EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = repacks.id) 
                   THEN 'matched' ELSE 'orphan' END as status 
            FROM repacks WHERE id IN ({placeholders}) ORDER BY id
        """, ids)
        return cur.fetchall()