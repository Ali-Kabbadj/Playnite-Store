from flask import Blueprint, jsonify
from app.repositories import stats_repo

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/stats', methods=['GET'])
def stats():
    data = stats_repo.get_dashboard_stats()
    return jsonify(data)