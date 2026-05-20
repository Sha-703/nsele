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

    # Mettre à jour l'état de l'actionneur dans la mémoire globale
    from backend.processing.processor import latest_actuator_states
    if gh_id not in latest_actuator_states:
        latest_actuator_states[gh_id] = {'pump': 'off', 'cooling': 'off'}
    
    from backend.models.history_db import log_actuator_event
    for act, val in command.items():
        if act in ['pump', 'cooling']:
            old_state = latest_actuator_states[gh_id].get(act)
            if old_state != val:
                latest_actuator_states[gh_id][act] = val
                log_actuator_event(gh_id, act, val)

    return jsonify({
        'status': 'sent',
        'topic': topic,
        'command': command
    })

# Endpoint: Consulter l'état des actionneurs réels en mémoire
@bp.route('/api/actuators/<gh_id>/state', methods=['GET'])
def actuator_state(gh_id):
    from backend.processing.processor import latest_actuator_states
    state = latest_actuator_states.get(gh_id, {'pump': 'off', 'cooling': 'off'})
    return jsonify({
        'id': gh_id,
        'pump': state.get('pump', 'off'),
        'cooling': state.get('cooling', 'off')
    })
