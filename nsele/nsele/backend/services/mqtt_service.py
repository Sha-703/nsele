import json
import paho.mqtt.client as mqtt
from backend.processing.processor import process_raw_sensor_message

MQTT_BROKER = 'localhost' # Le IPV de la machine ici nous sommess en locale
MQTT_PORT = 1883
client = mqtt.Client() # creation client

def on_connect(client, userdata, flags, rc):
    print('MQTT connected with result code', rc)
    client.subscribe('nsele/raw_sensors/#')

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode() # pour lire les information
        data = json.loads(payload)
    except Exception:
        data = {'raw': msg.payload.decode()}


    # Normalisation des clés contenant des slashes (ex: "S1/C1/TA" -> "S1C1TA")
    if isinstance(data, dict):
        data = {k.replace("/",'') : v for k, v in data.items()} # creation d'une nouvelle dict avec les clés normalisées 

        # Exemple de topic attendu : {"s1/c1":{"ta": 25.5, "hu": 60.2,"ts":20.0,"hs":55.0}"}}
        
        clef = list(data.keys())[0] # Extrait la clé principale du message (ex: "s1/c1")
        parts = clef.split('/') # Sépare la clé en parties (ex: ["s1", "c1"])
        if len(parts) > 2:
            gh_id = parts[0] # Extrait l'identifiant de la serre (ex: "s1")
            comp_id = parts[1] # Extrait l'identifiant du compartiment (ex: "c1")
        else:
            print(f"Format de topic inattendu : {msg.topic}. Attendu 'nsele/raw_sensors/<gh_id>/<comp_id>'.")
            return 
        
        
        # Déléguer tout le traitement logique, stockage de données et calcul de moyennes au processeur
        result = process_raw_sensor_message(gh_id, comp_id, data)

        # Si le processeur décide d'activer un actionneur global pour la serre
        if result.get('command'):
            actuator_topic = f"nsele/actuators/{gh_id}"
            client.publish(actuator_topic, json.dumps(result['command']))
            print(f"[DECISION BACKEND MOYENNES] Commande envoyee sur {actuator_topic} : {result['command']}")

        # Republier la donnée brute validée sur le topic écouté par le frontend
        processed_topic = msg.topic.replace("nsele/raw_sensors/", "nsele/sensors/")
        client.publish(processed_topic, json.dumps(data))
        print(f"[ROUTAGE BACKEND] Donnee brute recue sur {msg.topic} -> Transmise au Frontend sur {processed_topic}")

        # Publier aussi les moyennes calculées par le processeur pour le Dashboard
        if result.get('averages'):
            avg_topic = f"nsele/sensors/{gh_id}/averages"
            client.publish(avg_topic, json.dumps(result['averages']))
            print(f"[MOYENNES BACKEND] Moyennes de la serre {gh_id} publiees sur {avg_topic} : {result['averages']}")


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


