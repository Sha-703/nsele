from flask import Blueprint, jsonify, request

bp = Blueprint('actuator', __name__)

# Placeholder: à connecter à la logique MQTT/service
@bp.route('/api/greenhouses/<gh_id>/commands', methods=['POST'])
def send_command(gh_id):
    body = request.json
    # Ici, on devrait publier sur MQTT
    # mqtt_service.client.publish(f'nsele/actuators/{gh_id}', json.dumps(body))
    return jsonify({'status': 'sent', 'topic': f'nsele/actuators/{gh_id}'})

@bp.route('/api/actuators/<gh_id>/state', methods=['GET'])
def actuator_state(gh_id):
    # Placeholder: retourner l'état simulé
    return jsonify({'id': gh_id, 'pump': 'off', 'vent': 'auto'})
