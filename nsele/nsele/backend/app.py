import sys
import os

# Ajout du chemin d'accès parent pour résoudre les imports du module backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import queue
from flask import Flask, render_template, Response
from flask_cors import CORS
from backend.views.greenhouse import bp as greenhouse_bp
from backend.views.actuator import bp as actuator_bp
from backend.views.culture import bp as culture_bp
from backend.views.history import bp as history_bp
from backend.services.mqtt_service import mqtt_start, register_listener, unregister_listener
from backend.processing.processor import start_periodic_measure_save

# Initialisation de l'application Flask
app = Flask(__name__)
CORS(app)  # Autoriser les requêtes cross-origin (CORS)

# Route pour le flux d'événements temps réel SSE (Server-Sent Events)
@app.route('/api/stream')
def api_stream():
    def event_generator():
        q = register_listener()
        try:
            while True:
                try:
                    # Attente d'un message avec un timeout de 20s (pour pouvoir envoyer des keep-alives)
                    msg = q.get(timeout=20)
                    yield f"data: {json.dumps(msg)}\n\n"
                except queue.Empty:
                    # Envoyer un ping de keep-alive pour maintenir la connexion ouverte
                    yield ": keepalive\n\n"
        except GeneratorExit:
            pass
        finally:
            unregister_listener(q)

    return Response(event_generator(), mimetype='text/event-stream')

# Route pour la page principale (Tableau de bord / Dashboard)
@app.route('/')
def home():
    return render_template('dashboard.html')

# Route pour la page de configuration des paramètres
@app.route('/settings')
def settings():
    return render_template('settings.html')

# Route pour la page de contrôle manuel des commandes
@app.route('/commande')
def commands():
    return render_template('commands.html')

# Route pour afficher les détails et gérer une serre spécifique
@app.route('/greenhouse/<gh_id>')
def greenhouse_detail(gh_id):
    return render_template('greenhouse_detail.html', gh_id=gh_id)

# Enregistrement des Blueprints Flask (les APIs REST de l'application)
app.register_blueprint(greenhouse_bp)
app.register_blueprint(actuator_bp)
app.register_blueprint(culture_bp)
app.register_blueprint(history_bp)

# Route pour la page de l'historique
@app.route('/history')
def history_page():
    return render_template('history.html')

# Initialisation de la base de données historique SQLite
from backend.models.history_db import init_history_db
init_history_db()

# Démarrage du client MQTT au démarrage de l'application
mqtt_start()

# Lancement de l'application
if __name__ == '__main__':
    mqtt_start()
    start_periodic_measure_save(600)
    app.run(host='0.0.0.0', port=5000, debug=True)
import os

# Ajout du chemin d'accès parent pour résoudre les imports du module backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import queue
from flask import Flask, render_template, Response
from flask_cors import CORS
from backend.views.greenhouse import bp as greenhouse_bp
from backend.views.actuator import bp as actuator_bp
from backend.views.culture import bp as culture_bp
<<<<<<< Updated upstream
from backend.services.mqtt_service import mqtt_start
from backend.processing.processor import start_periodic_measure_save
=======
from backend.views.history import bp as history_bp
from backend.services.mqtt_service import mqtt_start, register_listener, unregister_listener
>>>>>>> Stashed changes

# Initialisation de l'application Flask
app = Flask(__name__)
CORS(app)  # Autoriser les requêtes cross-origin (CORS)

# Route pour le flux d'événements temps réel SSE (Server-Sent Events)
@app.route('/api/stream')
def api_stream():
    def event_generator():
        q = register_listener()
        try:
            while True:
                try:
                    # Attente d'un message avec un timeout de 20s (pour pouvoir envoyer des keep-alives)
                    msg = q.get(timeout=20)
                    yield f"data: {json.dumps(msg)}\n\n"
                except queue.Empty:
                    # Envoyer un ping de keep-alive pour maintenir la connexion ouverte
                    yield ": keepalive\n\n"
        except GeneratorExit:
            pass
        finally:
            unregister_listener(q)

    return Response(event_generator(), mimetype='text/event-stream')

# Route pour la page principale (Tableau de bord / Dashboard)
@app.route('/')
def home():
    return render_template('dashboard.html')

# Route pour la page de configuration des paramètres
@app.route('/settings')
def settings():
    return render_template('settings.html')

# Route pour la page de contrôle manuel des commandes
@app.route('/commande')
def commands():
    return render_template('commands.html')

# Route pour afficher les détails et gérer une serre spécifique
@app.route('/greenhouse/<gh_id>')
def greenhouse_detail(gh_id):
    return render_template('greenhouse_detail.html', gh_id=gh_id)

# Enregistrement des Blueprints Flask (les APIs REST de l'application)
app.register_blueprint(greenhouse_bp)
app.register_blueprint(actuator_bp)
app.register_blueprint(culture_bp)
app.register_blueprint(history_bp)

# Route pour la page de l'historique
@app.route('/history')
def history_page():
    return render_template('history.html')

# Initialisation de la base de données historique SQLite
from backend.models.history_db import init_history_db
init_history_db()

# Démarrage du client MQTT au démarrage de l'application
mqtt_start()

# Lancement de l'application
if __name__ == '__main__':
<<<<<<< Updated upstream
    # Démarrage du client MQTT en tâche de fond
    mqtt_start()
    # Démarrage de l'enregistrement périodique des mesures en base toutes les 10 minutes
    start_periodic_measure_save(600)
=======
>>>>>>> Stashed changes
    # Démarrage du serveur Flask sur le port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
