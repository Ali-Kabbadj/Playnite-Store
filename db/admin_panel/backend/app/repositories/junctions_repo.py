from app.database import get_db_cursor

def assign_repacks(repack_ids, game_id):
    count = 0
    with get_db_cursor() as cur:
        for rid in repack_ids:
            try:
                cur.execute('INSERT INTO game_repacks (game_id, repack_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', (game_id, rid))
                count += cur.rowcount
            except Exception: pass
    return count

def unassign_repacks(repack_ids):
    if not repack_ids: return 0
    with get_db_cursor() as cur:
        placeholders = ','.join(['%s'] * len(repack_ids))
        cur.execute(f'DELETE FROM game_repacks WHERE repack_id IN ({placeholders})', repack_ids)
        return cur.rowcount

def move_repacks(repack_ids, target_game_id):
    if not repack_ids: return 0
    with get_db_cursor() as cur:
        placeholders = ','.join(['%s'] * len(repack_ids))
        cur.execute(f'DELETE FROM game_repacks WHERE repack_id IN ({placeholders})', repack_ids)
        
        count = 0
        for rid in repack_ids:
            try:
                cur.execute('INSERT INTO game_repacks (game_id, repack_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', (target_game_id, rid))
                count += cur.rowcount
            except Exception: pass
    return count