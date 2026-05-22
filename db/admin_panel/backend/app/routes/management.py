from flask import Blueprint, request, jsonify
from app.repositories import management_repo

management_bp = Blueprint('management', __name__)

@management_bp.route('/link-source-names', methods=['GET'])
def list_link_source_names():
    return jsonify(management_repo.get_link_source_names())

@management_bp.route('/<string:resource>', methods=['GET', 'POST'])
def resource_list(resource):
    valid = {'companies', 'providers', 'sources', 'platforms', 'genres', 'series', 'tags', 'link_sources'}
    if resource not in valid:
        return jsonify({'error': 'Invalid resource'}), 404
        
    if request.method == 'POST':
        name = request.get_json().get('name', '').strip()
        if not name: return jsonify({'error': 'name required'}), 400
        new_id = management_repo.create_record(resource, name)
        if new_id: return jsonify({'id': new_id, 'name': name})
        return jsonify({'error': 'Could not create (may already exist)'}), 400
        
    search = request.args.get('search', '')
    page = int(request.args.get('page', '1'))
    per_page = int(request.args.get('per_page', '50'))
    
    if resource == 'companies': return jsonify(management_repo.get_companies(search, page, per_page))
    elif resource == 'providers': return jsonify(management_repo.get_providers(search, page, per_page))
    elif resource == 'sources': return jsonify(management_repo.get_sources(search, page, per_page))
    else: return jsonify(management_repo.get_simple_list(resource, search, page, per_page))

@management_bp.route('/<string:resource>/<int:rid>', methods=['PUT', 'DELETE'])
def resource_item(resource, rid):
    valid = {'companies', 'providers', 'sources', 'platforms', 'genres', 'series', 'tags', 'link_sources'}
    if resource not in valid: return jsonify({'error': 'Invalid resource'}), 404
        
    if request.method == 'PUT':
        name = request.get_json().get('name', '').strip()
        if not name: return jsonify({'error': 'name required'}), 400
        if management_repo.update_record(resource, rid, name):
            return jsonify({'updated': True})
        return jsonify({'error': 'not found or update failed'}), 400
        
    if request.method == 'DELETE':
        if management_repo.delete_record(resource, rid):
            return jsonify({'deleted': True})
        return jsonify({'error': 'Cannot delete resource (DB constraint)'}), 400
    
    return jsonify({'error': 'Method not allowed'}), 405