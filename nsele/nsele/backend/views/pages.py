from flask import Blueprint, render_template, Response
import json
import queue
from backend.services.mqtt_service import register_listener, unregister_listener

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
    return render_template('dashboard.html')


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
