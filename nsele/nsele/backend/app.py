import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template
from flask_cors import CORS
from backend.views.greenhouse import bp as greenhouse_bp
from backend.views.actuator import bp as actuator_bp
from backend.services.mqtt_service import mqtt_start

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return render_template('dashboard.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')


# Enregistrer les blueprints
app.register_blueprint(greenhouse_bp)
app.register_blueprint(actuator_bp)

if __name__ == '__main__':
    mqtt_start()
    app.run(host='0.0.0.0', port=5000, debug=True)
if __name__ == '__main__':
    mqtt_start()
    app.run(host='0.0.0.0', port=5000, debug=True)
