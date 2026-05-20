from flask import Blueprint, jsonify, request
from backend.models.history_db import get_history_logs, clear_history_db

# Définition du Blueprint pour les routes d'API de l'historique
bp = Blueprint('history', __name__)

# Endpoint: Récupérer tous les logs de l'historique (avec filtres optionnels)
@bp.route('/api/history', methods=['GET'])
def get_history():
    serre_filter = request.args.get('serre') # ex: S1, S2
    type_filter = request.args.get('type') # ex: capteur, actionneur
    limit = request.args.get('limit', default=500, type=int)
    
    logs = get_history_logs(serre_filter=serre_filter, type_filter=type_filter, limit=limit)
    return jsonify(logs)

# Endpoint: Vider la table historique de la base de données
@bp.route('/api/history', methods=['DELETE'])
def clear_history():
    success = clear_history_db()
    if success:
        return jsonify({'status': 'success', 'message': 'Historique vidé avec succès'})
    return jsonify({'status': 'error', 'message': 'Erreur lors du vidage de l\'historique'}), 500
