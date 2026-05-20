from flask import Blueprint, render_template, Response
import json
import queue
from backend.services.mqtt_service import register_listener, unregister_listener
from backend.models.greenhouse import get_all_greenhouses
from backend.processing.processor import (
    latest_sensor_data, latest_averages, latest_actuator_states, averages_history
)

# Blueprint des pages et du flux SSE du front-end
bp = Blueprint('pages', __name__)


@bp.route('/api/stream')
def api_stream():
    """Flux SSE pour envoyer les mises à jour MQTT au navigateur."""
    def event_generator():
        q = register_listener()
        try:
            while True:
                try:
                    msg = q.get(timeout=20)
                    yield f"data: {json.dumps(msg)}\n\n"
                except queue.Empty:
                    yield ": keepalive\n\n"
        except GeneratorExit:
            pass
        finally:
            unregister_listener(q)

    return Response(event_generator(), mimetype='text/event-stream')


@bp.route('/')
def home():
    """Page d'accueil qui affiche le tableau de bord principal."""
    # Récupérer la liste des serres configurées
    greenhouses = get_all_greenhouses()

    # Construire un contexte initial avec les dernières valeurs connues ou des placeholders
    latest_states = {}
    for gh in greenhouses:
        gh_id = gh.get('id')

        # Données capteurs par compartiment
        comps_data = {}
        for key, val in latest_sensor_data.items():
            if key.startswith(f"{gh_id}/"):
                try:
                    comp_id = key.split('/')[1]
                    comps_data[comp_id] = val
                except IndexError:
                    pass

        # Moyennes (valeurs brutes et affichage de secours "--")
        avg = latest_averages.get(gh_id, None)
        if not avg:
            avg = {'greenhouse': gh_id, 'ta': '--', 'ts': '--', 'ha': '--', 'hs': '--'}

        # Fournir aussi une version lisible en majuscules si le template l'attend
        avg_display = {
            'greenhouse': gh_id,
            'TA': avg.get('ta', '--') if isinstance(avg.get('ta', '--'), (int, float)) else avg.get('ta', '--'),
            'TS': avg.get('ts', '--') if isinstance(avg.get('ts', '--'), (int, float)) else avg.get('ts', '--'),
            'HA': avg.get('ha', '--') if isinstance(avg.get('ha', '--'), (int, float)) else avg.get('ha', '--'),
            'HS': avg.get('hs', '--') if isinstance(avg.get('hs', '--'), (int, float)) else avg.get('hs', '--')
        }

        actuators = latest_actuator_states.get(gh_id, {'pump': 'off', 'cooling': 'off'})
        history = averages_history.get(gh_id, [])

        latest_states[gh_id] = {
            'sensor_data': comps_data,
            'averages': avg,
            'averages_display': avg_display,
            'actuators': actuators,
            'history': history
        }

    return render_template('dashboard.html', greenhouses=greenhouses, latest_states=latest_states)


@bp.route('/settings')
def settings():
    """Page de paramétrage de l'application."""
    return render_template('settings.html')


@bp.route('/commande')
def commands():
    """Page de commande manuelle des actionneurs."""
    return render_template('commands.html')


@bp.route('/history')
def history_page():
    """Page d'historique des mesures et événements."""
    return render_template('history.html')
