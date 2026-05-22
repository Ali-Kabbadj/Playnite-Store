from app.database import get_db_cursor

def get_dashboard_stats():
    with get_db_cursor() as cur:
        cur.execute('SELECT COUNT(*) FROM repacks')
        total = cur.fetchone()['count']
        
        cur.execute('SELECT COUNT(*) FROM repacks r WHERE EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.repack_id = r.id)')
        matched = cur.fetchone()['count']
        
        cur.execute('SELECT COUNT(*) FROM games')
        games = cur.fetchone()['count']
        
        cur.execute('SELECT COUNT(*) FROM games WHERE NOT EXISTS (SELECT 1 FROM game_repacks gr WHERE gr.game_id = games.id)')
        no_repacks = cur.fetchone()['count']
        
        cur.execute('SELECT COUNT(*) FROM games WHERE summary IS NULL AND cover_url IS NULL')
        no_metadata = cur.fetchone()['count']
        
    return {
        'total_repacks': total,
        'matched_repacks': matched,
        'orphan_repacks': total - matched,
        'total_games': games,
        'games_no_repacks': no_repacks,
        'games_no_metadata': no_metadata,
    }