from flask import Blueprint, request, jsonify
from app.repositories import repacks_repo

repacks_bp = Blueprint('repacks', __name__)

@repacks_bp.route('', methods=['GET'])
def list_repacks():
    search = request.args.get('search', '')
    status = request.args.get('status', 'all')
    page = int(request.args.get('page', '1'))
    per_page = int(request.args.get('per_page', '50'))
    sort_by = request.args.get('sort_by', 'id')
    sort_dir = request.args.get('sort_dir', 'asc')

    data = repacks_repo.get_repacks_paginated(search, status, page, per_page, sort_by, sort_dir)
    return jsonify(data)

@repacks_bp.route('/<int:rid>', methods=['GET'])
def get_repack(rid):
    data = repacks_repo.get_repack_detail(rid)
    if not data:
        return jsonify({'error': 'not found'}), 404
    return jsonify(data)

@repacks_bp.route('/by-ids', methods=['POST'])
def repacks_by_ids():
    data = request.get_json()
    ids = data.get('ids', [])
    rows = repacks_repo.get_repacks_by_ids(ids)
    return jsonify(rows)