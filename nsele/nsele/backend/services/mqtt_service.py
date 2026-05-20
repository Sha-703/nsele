import json
import queue
import paho.mqtt.client as mqtt
from backend.processing.processor import process_raw_sensor_message

MQTT_BROKER = 'localhost' # Le IPV de la machine ici nous sommess en locale
MQTT_PORT = 1883
client = mqtt.Client() # creation client

# Liste de files d'attente (Queues) pour les clients SSE connectés (HTML pages)
sse_listeners = []

def register_listener():
    q = queue.Queue(maxsize=100)
    sse_listeners.append(q)
    return q

def unregister_listener(q):
    if q in sse_listeners:
        try:
            sse_listeners.remove(q)
        except ValueError:
            pass

def broadcast_sensor_data(topic, payload):
    message = {
        'topic': topic,
        'payload': payload
    }
    for q in list(sse_listeners):
        try:
            q.put_nowait(message)
        except queue.Full:
            try:
                q.get_nowait()
                q.put_nowait(message)
            except Exception:
                pass

def on_connect(client, userdata, flags, rc):
    print('MQTT connected with result code', rc)
    # S'abonner à tous les sujets sous nsele/ (raw_sensors, sensors, actuators)
    client.subscribe('nsele/#')

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode() # pour lire les information
        data = json.loads(payload)
    except Exception:
        data = {'raw': msg.payload.decode()}



    gh_id = None
    comp_id = None
    parsed_data = None

    if msg.topic.startswith('nsele/raw_sensors/'):
        parts = msg.topic.split('/')
        print(parts)
        if len(parts) >= 4:
            gh_id = parts[2]
            comp_id = parts[3]
        else:
            print(f"Format de topic inattendu : {msg.topic}. Attendu 'nsele/raw_sensors/<gh_id>/<comp_id>'.")

    if gh_id and comp_id and isinstance(data, dict):
        if len(data) == 1 and isinstance(next(iter(data.values())), dict):
            data = next(iter(data.values()))

        if all(isinstance(k, str) and k.lower() in {'ta', 'ts', 'ha', 'hs'} for k in data.keys()):
            parsed_data = {f"{gh_id}{comp_id}{k.lower()}": v for k, v in data.items()}
        else:
            parsed_data = data

    if gh_id and comp_id and isinstance(parsed_data, dict):
        result = process_raw_sensor_message(gh_id, comp_id, parsed_data)

        if result.get('command'):
            actuator_topic = f"nsele/actuators/{gh_id}"
            client.publish(actuator_topic, json.dumps(result['command']))
            print(f"[DECISION BACKEND MOYENNES] Commande envoyee sur {actuator_topic} : {result['command']}")

        processed_topic = msg.topic.replace('nsele/raw_sensors/', 'nsele/sensors/')
        client.publish(processed_topic, json.dumps(parsed_data), retain=True)
        print(f"[ROUTAGE BACKEND] Donnee brute recue sur {msg.topic} -> Transmise au Frontend sur {processed_topic}")

        if result.get('averages'):
            avg_topic = f"nsele/sensors/{gh_id}/averages"
            client.publish(avg_topic, json.dumps(result['averages']), retain=True)
            print(f"[MOYENNES BACKEND] Moyennes de la serre {gh_id} publiees sur {avg_topic} : {result['averages']}")

    if msg.topic.startswith('nsele/sensors/') or msg.topic.startswith('nsele/actuators/'):
        broadcast_sensor_data(msg.topic, data)


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


