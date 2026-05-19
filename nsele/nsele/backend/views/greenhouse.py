from flask import Blueprint, jsonify, request
from backend.models.greenhouse import (
    get_all_greenhouses, update_greenhouse, create_greenhouse, delete_greenhouse,
    add_compartment, delete_compartment
)

# Définition du Blueprint pour les routes d'API des serres
bp = Blueprint('greenhouse', __name__)

# Endpoint: Récupérer toutes les serres
@bp.route('/api/greenhouses', methods=['GET'])
def greenhouses():
    return jsonify(get_all_greenhouses())

# Endpoint: Créer une nouvelle serre
@bp.route('/api/greenhouses', methods=['POST'])
def add_greenhouse():
    body = request.json
    gh_id = body.get('id')
    name = body.get('name')
    culture_id = body.get('culture')
    
    if not gh_id or not name or not culture_id:
        return jsonify({'error': 'Champs obligatoires manquants'}), 400
        
    res = create_greenhouse(gh_id.upper().strip(), name, culture_id)
    if res:
        return jsonify({'status': 'created', 'data': res})
    return jsonify({'error': 'Une serre avec cet ID existe déjà'}), 400

# Endpoint: Obtenir les informations détaillées d'une serre
@bp.route('/api/greenhouses/<gh_id>', methods=['GET'])
def get_gh(gh_id):
    for g in get_all_greenhouses():
        if g['id'] == gh_id:
            return jsonify(g)
    return jsonify({'error': 'Serre introuvable'}), 404

# Endpoint: Mettre à jour une serre
@bp.route('/api/greenhouses/<gh_id>', methods=['PUT'])
def update_gh(gh_id):
    data = request.json
    res = update_greenhouse(gh_id, data)
    if res:
        return jsonify({'status': 'updated', 'data': res})
    return jsonify({'error': 'Serre introuvable'}), 404

# Endpoint: Supprimer une serre
@bp.route('/api/greenhouses/<gh_id>', methods=['DELETE'])
def delete_gh(gh_id):
    if delete_greenhouse(gh_id):
        return jsonify({'status': 'deleted'})
    return jsonify({'error': 'Serre introuvable'}), 404

# Endpoint: Ajouter un compartiment à une serre
@bp.route('/api/greenhouses/<gh_id>/compartments', methods=['POST'])
def add_comp(gh_id):
    body = request.json
    comp_id = body.get('id')
    if not comp_id:
        return jsonify({'error': 'ID de compartiment obligatoire'}), 400
    if add_compartment(gh_id, comp_id):
        return jsonify({'status': 'added'})
    return jsonify({'error': 'Le compartiment existe déjà ou la serre est introuvable'}), 400

# Endpoint: Supprimer un compartiment d'une serre
@bp.route('/api/greenhouses/<gh_id>/compartments/<comp_id>', methods=['DELETE'])
def delete_comp(gh_id, comp_id):
    if delete_compartment(gh_id, comp_id):
        return jsonify({'status': 'deleted'})
    return jsonify({'error': 'Compartiment introuvable'}), 404
