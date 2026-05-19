from flask import Blueprint, jsonify, request
from backend.models.greenhouse import get_all_greenhouses, update_greenhouse

bp = Blueprint('greenhouse', __name__)

@bp.route('/api/greenhouses', methods=['GET'])
def greenhouses():
    return jsonify(get_all_greenhouses())

@bp.route('/api/greenhouses/<gh_id>', methods=['PUT'])
def update_gh(gh_id):
    data = request.json
    res = update_greenhouse(gh_id, data)
    if res:
        return jsonify({'status': 'updated', 'data': res})
    return jsonify({'error': 'Serre introuvable'}), 404
