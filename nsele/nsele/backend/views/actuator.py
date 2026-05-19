import json
from flask import Blueprint, jsonify, request
from backend.services.mqtt_service import client

bp = Blueprint('actuator', __name__)

@bp.route('/api/greenhouses/<gh_id>/commands', methods=['POST'])
def send_command(gh_id):
    body = request.json
    comp_id = body.get('compId')
    command = body.get('command', {})

    if not comp_id:
        return jsonify({'error': 'ID de compartiment manquant'}), 400

    topic = f'nsele/actuators/{gh_id}/{comp_id}'
    payload = json.dumps(command)
    
    # Le backend publie la commande sur MQTT pour l'actionneur
    client.publish(topic, payload)
    print(f"[COMMANDE BACKEND] Commande recue via API pour {topic} -> Publiee sur MQTT : {command}")


    return jsonify({
        'status': 'sent',
        'topic': topic,
        'command': command
    })

@bp.route('/api/actuators/<gh_id>/state', methods=['GET'])
def actuator_state(gh_id):
    # Placeholder: retourner l'état simulé
    return jsonify({'id': gh_id, 'pump': 'off', 'vent': 'auto'})

