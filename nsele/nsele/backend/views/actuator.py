import json
from flask import Blueprint, jsonify, request
from backend.services.mqtt_service import client

# Définition du Blueprint pour les commandes manuelles des actionneurs
bp = Blueprint('actuator', __name__)

# Endpoint: Relayer une commande manuelle (Arrosage ou Cooling) vers MQTT
@bp.route('/api/greenhouses/<gh_id>/commands', methods=['POST'])
def send_command(gh_id):
    body = request.json
    comp_id = body.get('compId')
    command = body.get('command', {})

    # Choix du topic MQTT global serre ou par compartiment
    if comp_id:
        topic = f'nsele/actuators/{gh_id}/{comp_id}'
    else:
        topic = f'nsele/actuators/{gh_id}'
        
    payload = json.dumps(command)
    
    # Publication de la commande sur MQTT pour réception par les actionneurs matériels
    client.publish(topic, payload)
    print(f"[COMMANDE BACKEND] Commande recue via API pour {topic} -> Publiee sur MQTT : {command}")

    return jsonify({
        'status': 'sent',
        'topic': topic,
        'command': command
    })

# Endpoint: Consulter l'état de l'actionneur (temporaire/simulé)
@bp.route('/api/actuators/<gh_id>/state', methods=['GET'])
def actuator_state(gh_id):
    return jsonify({'id': gh_id, 'pump': 'off', 'vent': 'auto'})
