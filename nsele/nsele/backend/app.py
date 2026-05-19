import sys
import os

# Ajout du chemin d'accès parent pour résoudre les imports du module backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template
from flask_cors import CORS
from backend.views.greenhouse import bp as greenhouse_bp
from backend.views.actuator import bp as actuator_bp
from backend.views.culture import bp as culture_bp
from backend.services.mqtt_service import mqtt_start

# Initialisation de l'application Flask
app = Flask(__name__)
CORS(app)  # Autoriser les requêtes cross-origin (CORS)

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

# Lancement de l'application
if __name__ == '__main__':
    # Démarrage du client MQTT en tâche de fond
    mqtt_start()
    # Démarrage du serveur Flask sur le port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
