from flask import Blueprint, request, jsonify
from app.repositories import junctions_repo

junctions_bp = Blueprint('junctions', __name__)

@junctions_bp.route('/assign', methods=['POST'])
def assign():
    data = request.get_json()
    repack_ids, game_id = data.get('repack_ids', []), data.get('game_id')
    if not repack_ids or not game_id: return jsonify({'error': 'missing data'}), 400
    count = junctions_repo.assign_repacks(repack_ids, game_id)
    return jsonify({'count': count})

@junctions_bp.route('/unassign', methods=['POST'])
def unassign():
    repack_ids = request.get_json().get('repack_ids', [])
    count = junctions_repo.unassign_repacks(repack_ids)
    return jsonify({'count': count})

@junctions_bp.route('/move', methods=['POST'])
def move():
    data = request.get_json()
    repack_ids, target_id = data.get('repack_ids', []), data.get('target_game_id')
    if not repack_ids or not target_id: return jsonify({'error': 'missing data'}), 400
    count = junctions_repo.move_repacks(repack_ids, target_id)
    return jsonify({'count': count, 'repack_ids': repack_ids, 'target_game_id': target_id})