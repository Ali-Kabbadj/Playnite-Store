from flask import Blueprint, jsonify, request
from app.repositories import games_repo
from app.repositories import junctions_repo

games_bp = Blueprint('games', __name__)

@games_bp.route('', methods=['GET'])
def list_games():
    search = request.args.get('search', '')
    status = request.args.get('status', 'all')
    page = int(request.args.get('page', '1'))
    per_page = int(request.args.get('per_page', '30'))
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'asc')

    data = games_repo.get_games_paginated(search, status, page, per_page, sort_by, sort_dir)
    return jsonify(data)

@games_bp.route('/<int:gid>', methods=['GET'])
def get_game(gid):
    game = games_repo.get_game_detail(gid)
    if not game:
        return jsonify({'error': 'not found'}), 404
    return jsonify(game)

@games_bp.route('/<int:gid>', methods=['PUT'])
def update_game(gid):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
        
    updated = games_repo.update_game(gid, data)
    if not updated:
        return jsonify({'error': 'not found or no valid fields provided'}), 404
        
    return jsonify({'updated': True, 'game_id': gid})

@games_bp.route('/<int:gid>', methods=['DELETE'])
def delete_game(gid):
    deleted = games_repo.delete_game(gid)
    if not deleted:
        return jsonify({'error': 'not found'}), 404
    return jsonify({'deleted': True})


@games_bp.route('', methods=['POST'])
def create_game():
    data = request.get_json()
    name = data.get('name', '').strip()
    repack_ids = data.get('repack_ids', [])
    if not name: return jsonify({'error': 'name is required'}), 400

    from app.database import get_db_cursor
    with get_db_cursor() as cur:
        cur.execute('SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM games')
        game_id = cur.fetchone()['new_id']
        cur.execute('INSERT INTO games (id, name) VALUES (%s, %s)', (game_id, name))
    
    count = junctions_repo.assign_repacks(repack_ids, game_id)
    return jsonify({'game_id': game_id, 'name': name, 'linked_repacks': count})

@games_bp.route('/<int:gid>/repacks', methods=['GET'])
def game_repacks(gid):
    from app.database import get_db_cursor
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT r.id, r.title, 'matched' as status
            FROM repacks r JOIN game_repacks gr ON gr.repack_id = r.id
            WHERE gr.game_id = %s ORDER BY r.id
        """, (gid,))
        return jsonify(cur.fetchall())


@games_bp.route('/<int:gid>/external-links', methods=['GET', 'PUT'])
def game_external_links(gid):
    from app.database import get_db_cursor
    if request.method == 'GET':
        with get_db_cursor() as cur:
            cur.execute('''
                SELECT ls.name as source_name, gel.url 
                FROM game_external_links gel
                JOIN link_sources ls ON gel.link_source_id = ls.id
                WHERE gel.game_id = %s
            ''', (gid,))
            result = {'game_id': gid}
            result.update({r['source_name']: r['url'] for r in cur.fetchall()})
            return jsonify(result)
    
    # PUT
    data = request.get_json()
    with get_db_cursor() as cur:
        # Clear existing links for this game
        cur.execute('DELETE FROM game_external_links WHERE game_id = %s', (gid,))
        for source_name, url in data.items():
            if source_name == 'game_id' or not url: continue
            
            # Find the ID of this source_name (Twitch, Steam, etc.)
            cur.execute('SELECT id FROM link_sources WHERE name = %s', (source_name,))
            row = cur.fetchone()
            if row:
                link_source_id = row['id']
                cur.execute('SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM game_external_links')
                new_id = cur.fetchone()['new_id']
                cur.execute("""
                    INSERT INTO game_external_links (id, game_id, link_source_id, url) 
                    VALUES (%s, %s, %s, %s)
                """, (new_id, gid, link_source_id, url))
        return jsonify({'updated': list(data.keys()), 'game_id': gid})
    
@games_bp.route('/<int:gid>/media', methods=['POST'])
def add_media(gid):
    data = request.get_json()
    typ, url = data.get('type', '').strip(), data.get('url', '').strip()
    from app.database import get_db_cursor
    with get_db_cursor() as cur:
        table = 'game_artworks' if typ == 'artwork' else 'game_screenshots'
        cur.execute(f'SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM {table}')
        new_id = cur.fetchone()['new_id']
        cur.execute(f'INSERT INTO {table} (id, game_id, url) VALUES (%s, %s, %s)', (new_id, gid, url))
        return jsonify({'id': new_id, 'game_id': gid, 'type': typ, 'url': url})

@games_bp.route('/<int:gid>/media/<int:mid>', methods=['PUT', 'DELETE'])
def manage_media(gid, mid):
    from app.database import get_db_cursor
    with get_db_cursor() as cur:
        if request.method == 'DELETE':
            cur.execute('DELETE FROM game_artworks WHERE id = %s AND game_id = %s', (mid, gid))
            c1 = cur.rowcount
            cur.execute('DELETE FROM game_screenshots WHERE id = %s AND game_id = %s', (mid, gid))
            c2 = cur.rowcount
            return jsonify({'deleted': (c1 + c2) > 0})
        
        # PUT
        data = request.get_json()
        url = data.get('url', '').strip()
        cur.execute('UPDATE game_artworks SET url = %s WHERE id = %s AND game_id = %s', (url, mid, gid))
        c1 = cur.rowcount
        cur.execute('UPDATE game_screenshots SET url = %s WHERE id = %s AND game_id = %s', (url, mid, gid))
        c2 = cur.rowcount
        return jsonify({'updated': (c1 + c2) > 0, 'id': mid, 'url': url})

@games_bp.route('/<int:gid>/junctions', methods=['POST'])
def manage_junctions(gid):
    data = request.get_json()
    relation, add_ids, remove_ids = data.get('relation'), data.get('add', []), data.get('remove', [])
    
    JUNCTION_MAP = {
        'platforms': ('game_platforms', 'platform_id'), 
        'genres': ('game_genres', 'genre_id'),
        'series': ('game_collections', 'collection_id'), 
        'tags': ('game_themes', 'theme_id')
    }

    from app.database import get_db_cursor
    with get_db_cursor() as cur:
        if relation in ['developers', 'publishers']:
            is_dev = relation == 'developers'
            is_pub = relation == 'publishers'
            for rid in add_ids:
                cur.execute('SELECT id, is_developer, is_publisher FROM game_companies WHERE game_id = %s AND company_id = %s', (gid, rid))
                row = cur.fetchone()
                if row:
                    col = 'is_developer' if is_dev else 'is_publisher'
                    cur.execute(f'UPDATE game_companies SET {col} = true WHERE id = %s', (row['id'],))
                else:
                    cur.execute('SELECT COALESCE(MAX(id), 0) + 1 as new_id FROM game_companies')
                    new_id = cur.fetchone()['new_id']
                    cur.execute('INSERT INTO game_companies (id, game_id, company_id, is_developer, is_publisher) VALUES (%s, %s, %s, %s, %s)', (new_id, gid, rid, is_dev, is_pub))
            for rid in remove_ids:
                col = 'is_developer' if is_dev else 'is_publisher'
                cur.execute(f'UPDATE game_companies SET {col} = false WHERE game_id = %s AND company_id = %s', (gid, rid))
            cur.execute('DELETE FROM game_companies WHERE game_id = %s AND (is_developer = false OR is_developer IS NULL) AND (is_publisher = false OR is_publisher IS NULL)', (gid,))
            return jsonify({'updated': True, 'relation': relation, 'added': len(add_ids), 'removed': len(remove_ids)})
            
        if relation not in JUNCTION_MAP: return jsonify({'error': 'invalid relation'}), 400
        
        table, fk_col = JUNCTION_MAP[relation]
        for rid in add_ids:
            try: cur.execute(f'INSERT INTO {table} (game_id, {fk_col}) VALUES (%s, %s) ON CONFLICT DO NOTHING', (gid, rid))
            except Exception: pass
        for rid in remove_ids:
            try: cur.execute(f'DELETE FROM {table} WHERE game_id = %s AND {fk_col} = %s', (gid, rid))
            except Exception: pass
    return jsonify({'updated': True, 'relation': relation, 'added': len(add_ids), 'removed': len(remove_ids)})