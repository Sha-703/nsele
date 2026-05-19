import json
import paho.mqtt.client as mqtt
from backend.processing.processor import process_sensor_data

MQTT_BROKER = 'localhost' # Le IPV de la machine ici nous sommess en locale
MQTT_PORT = 1883
client = mqtt.Client() # creation client

def on_connect(client, userdata, flags, rc):
    print('MQTT connected with result code', rc)
    client.subscribe('nsele/sensors/#')

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode() # pour lire les information
        data = json.loads(payload)
        
    except Exception as e:
        data = {'raw': msg.payload.decode()} # en cas de probleme 
        print(f"Erreur lors du traitement du message : {e}")
        
    result = process_sensor_data(data) # nous passon l'analyse des donnees ici

    if result.get('command'):
        client.publish(f"nsele/actuators/{result['target']}", json.dumps(result['command'])) # Pour publier les informations 

def mqtt_start():
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start() # Ecouter MQTT en permance 
        print(f"Service MQTT démarré sur {MQTT_BROKER}:{MQTT_PORT}")
        
    except ConnectionRefusedError:
        print(f"AVERTISSEMENT : Impossible de se connecter au broker MQTT sur {MQTT_BROKER}:{MQTT_PORT}. Assurez-vous que Mosquitto est lance.")
    except Exception as e:
        print(f"Erreur MQTT : {e}")
