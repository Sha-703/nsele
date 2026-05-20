import sys
import os

# Ajout du chemin d'accès parent pour résoudre les imports du module backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_cors import CORS
from backend.views.pages import bp as pages_bp
from backend.views.greenhouse import bp as greenhouse_bp
from backend.views.actuator import bp as actuator_bp
from backend.views.culture import bp as culture_bp
from backend.views.history import bp as history_bp
from backend.models.history_db import init_history_db
from backend.services.mqtt_service import mqtt_start
from backend.processing.processor import start_periodic_measure_save

# Initialisation de l'application Flask
app = Flask(__name__)
CORS(app)  # Autoriser les requêtes cross-origin (CORS)

# Enregistrement des blueprints pour les pages et les APIs
app.register_blueprint(pages_bp)
app.register_blueprint(greenhouse_bp)
app.register_blueprint(actuator_bp)
app.register_blueprint(culture_bp)
app.register_blueprint(history_bp)

# Initialisation de la base de données historique SQLite
init_history_db()

if __name__ == '__main__':
    # Démarrage du service MQTT et du thread de sauvegarde périodique
    mqtt_start()
    start_periodic_measure_save(600)
    app.run(host='0.0.0.0', port=5000, debug=True)
