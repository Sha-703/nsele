import json
import paho.mqtt.client as mqtt
from backend.processing.processor import process_sensor_data

MQTT_BROKER = 'localhost'
MQTT_PORT = 1883
client = mqtt.Client()

# Connexion entre Backend et les Capteur pour envoyer les données dans le frontend
# On s'abonne aux données brutes des capteurs pour les traiter et les envoyer au frontend
def on_connect(client, userdata, flags, rc):
    print('MQTT connected with result code', rc)
    # Le backend s'abonne uniquement aux données brutes des capteurs
    client.subscribe('nsele/raw_sensors/#')

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode()
        data = json.loads(payload)
    except Exception:
        data = {'raw': msg.payload.decode()}

    # Normalisation des cles contenant des slashes (ex: "S1/C1/TA" -> "S1C1TA")
    if isinstance(data, dict):
        data = {k.replace('/', ''): v for0 k, v in data.items()}

    # Extraction des identifiants (Serre et Compartiment) depuis le topic
    # Exemple de topic attendu : nsele/raw_sensors/S1/C1

    parts = msg.topic.split('/')
    if len(parts) >= 4:
        gh_id = parts[2]
        comp_id = parts[3]
        target = f"{gh_id}/{comp_id}"
        
        # Injecte le target pour que process_sensor_data sache quelle serre/compartiment cibler
        data['greenhouse'] = target
        
        # Si la clé de l'humidité du sol spécifique (ex: S1C1HS) est présente, 
        # on la copie dans la clé générique 'humidity' pour le traitement de process_sensor_data
        soil_humidity_key = f"{gh_id}{comp_id}HS"
        if soil_humidity_key in data:
            data['humidity'] = data[soil_humidity_key]

    # Traitement de la donnée et prise de décision
    result = process_sensor_data(data)

    # 1. Si le backend décide d'activer un actionneur, il publie la commande
    if result.get('command'):
        actuator_topic = f"nsele/actuators/{result['target']}"
        client.publish(actuator_topic, json.dumps(result['command']))
        print(f"[DECISION BACKEND] Commande envoyee sur {actuator_topic} : {result['command']}")


    # 2. On nettoie les clés temporaires avant d'envoyer la donnée propre au frontend
    data.pop('greenhouse', None)
    data.pop('humidity', None)

    # 3. Le backend republie la donnée validée sur le topic écouté par le frontend (nsele/sensors/...)
    processed_topic = msg.topic.replace("nsele/raw_sensors/", "nsele/sensors/")
    client.publish(processed_topic, json.dumps(data))
    print(f"[ROUTAGE BACKEND] Donnee brute recue sur {msg.topic} -> Transmise au Frontend sur {processed_topic}")



def mqtt_start():
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        print(f"Service MQTT démarré sur {MQTT_BROKER}:{MQTT_PORT}")
    except ConnectionRefusedError:
        print(f"AVERTISSEMENT : Impossible de se connecter au broker MQTT sur {MQTT_BROKER}:{MQTT_PORT}. Assurez-vous que Mosquitto est lance.")
    except Exception as e:
        print(f"Erreur MQTT : {e}")
