from flask import Blueprint, jsonify, request
from backend.models.culture import get_all_cultures, create_culture, update_culture

# Définition du Blueprint pour les routes d'API des cultures
bp = Blueprint('culture', __name__)

# Endpoint: Liste de toutes les cultures et leurs seuils
@bp.route('/api/cultures', methods=['GET'])
def list_cultures():
    return jsonify(get_all_cultures())

# Endpoint: Ajouter une nouvelle culture configurée
@bp.route('/api/cultures', methods=['POST'])
def add_culture():
    body = request.json
    c_id = body.get('id')
    name = body.get('name')
    if not c_id or not name:
        return jsonify({'error': 'ID et nom obligatoires'}), 400
    
    # ID converti en minuscules sans espaces pour la clé technique
    c_id = c_id.lower().strip().replace(' ', '_')
    res = create_culture(c_id, name, body)
    if res:
        return jsonify({'status': 'created', 'data': res})
    return jsonify({'error': 'Une culture avec cet ID existe déjà'}), 400

# Endpoint: Modifier les seuils d'une culture existante
@bp.route('/api/cultures/<c_id>', methods=['PUT'])
def edit_culture(c_id):
    body = request.json
    res = update_culture(c_id, body)
    if res:
        return jsonify({'status': 'updated', 'data': res})
    return jsonify({'error': 'Culture introuvable'}), 404
