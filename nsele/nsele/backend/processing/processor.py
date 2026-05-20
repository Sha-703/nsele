import json
import os
import sqlite3
import threading
import time
from backend.models.db import load_data

# Ce module traite les données capteurs reçues, calcule les moyennes par serre,
# décide des commandes d'actionneurs et persiste les mesures et l'état courant.

# Mémoire globale pour stocker les dernières données de chaque compartiment
# pendant que le backend tourne. Ce cache est aussi sauvegardé dans un JSON
# pour conserver l'état après rechargement de l'application.
latest_sensor_data = {}
latest_sensor_lock = threading.Lock()


def get_latest_sensor_file_path() -> str:
    """Retourne le chemin local du fichier JSON de persistance des données capteurs."""
    return os.path.abspath(os.path.join(os.path.dirname(__file__), 'latest_sensor_data.json'))


def load_latest_sensor_data_from_json() -> dict:
    """Charge les valeurs de capteur sauvegardées dans le fichier JSON local."""
    path = get_latest_sensor_file_path()
    if not os.path.exists(path):
        return {}

<<<<<<< Updated upstream
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f) # lire les valeur des sauvegarder 
        if not isinstance(data, dict):
            return {}

        result = {}
        for target, values in data.items():
            if not isinstance(values, dict):
                continue
            
            result[target] = {}
            for sensor, val in values.items():
                if sensor in ['ta', 'ts', 'ha', 'hs']:
                    try:
                        result[target][sensor] = float(val)
                    except (ValueError, TypeError):
                        pass
        return result
    except Exception as e:
        print(f"[PROCESSOR WARNING] Impossible de charger les donnees capteurs depuis JSON : {e}")
        return {}


def save_latest_sensor_data_to_json() -> None: # Sauvegarde les dernières valeurs de capteurs dans un fichier JSON local pour persistance
    path = get_latest_sensor_file_path()
    try:
        with latest_sensor_lock:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(latest_sensor_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[PROCESSOR WARNING] Impossible d'enregistrer les donnees capteurs dans JSON : {e}")


# Charger les dernières valeurs connues au démarrage si le fichier JSON existe
with latest_sensor_lock:
    latest_sensor_data.update(load_latest_sensor_data_from_json())


def get_sqlite_db_path() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'serre.db')) # Chemin relatif vers la base de données SQLite à partir du fichier processor.py


def load_culture_from_sqlite(gh_id: str) -> dict | None:
    """Charge les seuils de culture depuis la base SQLite serre.db si elle contient des valeurs."""
    db_path = get_sqlite_db_path()
    if not os.path.exists(db_path):
        return None

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        if str(gh_id).isdigit():
            cursor.execute("SELECT culture_id FROM serres WHERE id = ?", (int(gh_id),)) # Essayer d'abord de trouver la serre par ID numérique
        else:
            cursor.execute("SELECT culture_id FROM serres WHERE nom = ?", (gh_id,))
        row = cursor.fetchone()
        if not row:
            return None

        culture_id = row[0]
        if culture_id is None:
            return None

        cursor.execute(
            "SELECT temperature_air_min, temperature_air_max, temperature_sol_min, temperature_sol_max, "
            "humidite_sol_min, humidite_sol_max, humidite_air_min, humidite_air_max "
            "FROM cultures WHERE id = ?",
            (culture_id,)
        )
        culture_row = cursor.fetchone() # Récupère les seuils de la culture associée à la serre
        if not culture_row:
            return None

        return {
            'min_temp_air': culture_row[0],
            'max_temp_air': culture_row[1],
            'min_temp_sol': culture_row[2],
            'max_temp_sol': culture_row[3],
            'min_hum_sol': culture_row[4],
            'max_hum_sol': culture_row[5],
            'min_hum_air': culture_row[6],
            'max_hum_air': culture_row[7]
        }
    except Exception as e:
        print(f"[PROCESSOR WARNING] Impossible de charger culture depuis SQLite : {e}")
        return None
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _get_serre_row_id(gh_id: str) -> int | None:
    """Retrouve l'identifiant interne de la serre dans la base SQLite."""
    db_path = get_sqlite_db_path()
    if not os.path.exists(db_path):
        return None

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        if str(gh_id).isdigit():
            cursor.execute("SELECT id FROM serres WHERE id = ?", (int(gh_id),))
        else:
            cursor.execute("SELECT id FROM serres WHERE nom = ? COLLATE NOCASE", (gh_id,))
        row = cursor.fetchone()
        if row:
            return row[0]

        cursor.execute("SELECT id FROM serres WHERE nom = ?", (gh_id,))
        row = cursor.fetchone()
        return row[0] if row else None
    except Exception as e:
        print(f"[PROCESSOR WARNING] Impossible de trouver la serre dans SQLite : {e}")
        return None
    finally:
        try:
            conn.close()
        except Exception:
            pass


def save_greenhouse_measure(gh_id: str, avg_data: dict, quantite_eau: float = 0.0) -> bool:
    """Enregistre une mesure agrégée de la serre dans la table mesures de SQLite."""
    serre_id = _get_serre_row_id(gh_id)
    if serre_id is None:
        print(f"[DB SAVE] Aucune serre SQLite trouvee pour {gh_id}, mesure ignoree.")
        return False

    db_path = get_sqlite_db_path()
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO mesures (serre_id, temperature_air, humidite_air, temperature_sol, humidite_sol, quantite_eau)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                serre_id,
                float(avg_data.get('ta', 0.0)),
                float(avg_data.get('ha', 0.0)),
                float(avg_data.get('ts', 0.0)),
                float(avg_data.get('hs', 0.0)),
                float(quantite_eau)
            )
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB SAVE] Erreur lors de l'enregistrement des mesures pour {gh_id} : {e}")
        return False
    finally:
        try:
            conn.close()
        except Exception:
            pass


def compute_greenhouse_averages(gh_id: str) -> dict | None:
    """Calcule les moyennes des capteurs pour une serre à partir des dernières valeurs en mémoire."""
    with latest_sensor_lock:
        snapshot = {k: v.copy() for k, v in latest_sensor_data.items()}

    comp_keys = [k for k in snapshot.keys() if k.startswith(f"{gh_id}/")]
    if not comp_keys:
        return None
=======
# Mémoire globale pour stocker les dernières moyennes calculées de chaque serre
# Clé : "S1", Valeur : {"TA": 24.0, "TS": 20.0, ...}
latest_averages = {}

# Mémoire globale pour stocker l'état actuel des actionneurs de chaque serre
# Clé : "S1", Valeur : {"pump": "off", "cooling": "off"}
latest_actuator_states = {}

# Historique des moyennes de chaque serre (pour persister le graphique au rafraîchissement)
# Clé : "S1", Valeur : Liste de max 20 points [{'time': '12:00:00', 'TA': 24.0, ...}]
averages_history = {}

def process_raw_sensor_message(gh_id: str, comp_id: str, data: dict) -> dict:
    """
    Met à jour les données du compartiment, calcule les moyennes de la serre, 
    et prend des décisions d'automatisation basées sur les seuils de culture.
    
    Retourne : {
        'averages': {'greenhouse': gh_id, 'TA': ..., 'TS': ..., 'HA': ..., 'HS': ...},
        'command': {'pump': 'on/off', 'cooling': 'on/off'}  # ou {}
    }
    """
    global latest_sensor_data
    
    target = f"{gh_id}/{comp_id}"
    if target not in latest_sensor_data:
        latest_sensor_data[target] = {}
        
    ta_key = f"{gh_id}{comp_id}TA"
    ts_key = f"{gh_id}{comp_id}TS"
    ha_key = f"{gh_id}{comp_id}HA"
    hs_key = f"{gh_id}{comp_id}HS"
    
    try:
        if ta_key in data: latest_sensor_data[target]['TA'] = float(data[ta_key])
        if ts_key in data: latest_sensor_data[target]['TS'] = float(data[ts_key])
        if ha_key in data: latest_sensor_data[target]['HA'] = float(data[ha_key])
        if hs_key in data: latest_sensor_data[target]['HS'] = float(data[hs_key])
        
        # Enregistrer la mesure reçue dans la base de données historique SQLite
        from backend.models.history_db import log_sensor_event
        log_sensor_event(
            gh_id,
            comp_id,
            latest_sensor_data[target].get('TA'),
            latest_sensor_data[target].get('TS'),
            latest_sensor_data[target].get('HA'),
            latest_sensor_data[target].get('HS')
        )
    except (ValueError, TypeError) as e:
        print(f"[PROCESSOR WARNING] Erreur conversion numerique : {e}")
>>>>>>> Stashed changes

    avg_data = {'greenhouse': gh_id}
    for sensor in ['ta', 'ts', 'ha', 'hs']:
        vals = [snapshot[k][sensor] for k in comp_keys if sensor in snapshot[k]]
        if vals:
            avg_data[sensor] = round(sum(vals) / len(vals), 2)
        else:
            avg_data[sensor] = 0.0

    return avg_data


def _save_periodic_measures(interval_seconds: int):
    """Tâche de fond qui sauvegarde les mesures SQLite toutes les X secondes."""
    while True:
        time.sleep(interval_seconds)
        with latest_sensor_lock:
            gh_ids = {key.split('/')[0] for key in latest_sensor_data.keys()}

        for gh_id in gh_ids:
            avg_data = compute_greenhouse_averages(gh_id)
            if not avg_data:
                continue

            if save_greenhouse_measure(gh_id, avg_data):
                print(f"[DB SAVE] Mesures enregistrees pour la serre {gh_id}.")


def start_periodic_measure_save(interval_seconds: int = 600):
    """Démarre le thread daemon de sauvegarde périodique des mesures."""
    thread = threading.Thread(target=_save_periodic_measures, args=(interval_seconds,), daemon=True)
    thread.start()
    print(f"[DB SAVE] Enregistrement periodique des mesures toutes les {interval_seconds} secondes demarre.")


def process_raw_sensor_message(gh_id: str, comp_id: str, data: dict) -> dict:
    """Traite une mise à jour de capteur, met à jour le cache et retourne les commandes."""
    """
    Met à jour les données du compartiment, calcule les moyennes de la serre, 
    et prend des décisions d'automatisation basées sur les seuils de culture.
    
    Retourne : {
        'averages': {'greenhouse': gh_id, 'ta': ..., 'ts': ..., 'ha': ..., 'hs': ...},
        'command': {'pump': 'on/off', 'cooling': 'on/off'}  # ou {}
    }
    """
    global latest_sensor_data
    
    target = f"{gh_id}/{comp_id}" # Ex: "S1/C1"
    ta_key = f"{gh_id}{comp_id}ta" # Ex: "S1C1ta"
    ts_key = f"{gh_id}{comp_id}ts"
    ha_key = f"{gh_id}{comp_id}ha"
    hs_key = f"{gh_id}{comp_id}hs"

    with latest_sensor_lock:
        if target not in latest_sensor_data:
            latest_sensor_data[target] = {} # Initialiser la structure pour ce compartiment s'il n'existe pas encore

        try:
            if ta_key in data:
                latest_sensor_data[target]['ta'] = float(data[ta_key])
            if ts_key in data:
                latest_sensor_data[target]['ts'] = float(data[ts_key])
            if ha_key in data:
                latest_sensor_data[target]['ha'] = float(data[ha_key])
            if hs_key in data:
                latest_sensor_data[target]['hs'] = float(data[hs_key])
        except (ValueError, TypeError) as e:
            print(f"[PROCESSOR WARNING] Erreur conversion numerique : {e}")

        # Sauvegarde du cache mémoire dans un fichier JSON pour conserver les dernières valeurs
        # même après changement de page ou redémarrage de l'application.
        save_latest_sensor_data_to_json()
        snapshot = {k: v.copy() for k, v in latest_sensor_data.items()}

    avg_data = {'greenhouse': gh_id}
    for sensor in ['ta', 'ts', 'ha', 'hs']:
        vals = [snapshot[k][sensor] for k in snapshot.keys() if k.startswith(f"{gh_id}/") and sensor in snapshot[k]]
        if vals:
            avg_data[sensor] = round(sum(vals) / len(vals), 2)
        else:
            avg_data[sensor] = 0.0

    # Prise de décision automatisée basée sur les seuils de la culture de cette serre.
    # On recherche d'abord la serre dans le JSON de configuration pour connaître
    # l'ID de culture associé, puis on charge les seuils soit depuis SQLite, soit
    # depuis le JSON si SQLite ne contient pas la culture.
    db = load_data()
    greenhouse = None
    for g in db.get('greenhouses', []): # Trouver la serre correspondante dans la DB
        if g['id'] == gh_id:
            greenhouse = g
            break

    command = {}
    if greenhouse:
        culture_id = greenhouse.get('culture')
        culture = load_culture_from_sqlite(gh_id)

        if not culture:
            for c in db.get('cultures', []):
                if c['id'] == culture_id:
                    culture = c
                    break

        if not culture:
            # Fallback par défaut si aucune valeur n'est enregistrée
            culture = {
                'min_hum_sol': 30.0,
                'max_hum_sol': 70.0,
                'min_temp_air': 18.0,
                'max_temp_air': 30.0
            }

        # 1. Décision Arrosage (hs)
        if avg_data.get('hs') is not None:
            try:
                hs_val = float(avg_data['hs'])
                min_hs = float(culture.get('min_hum_sol', 30.0))
                max_hs = float(culture.get('max_hum_sol', 70.0))

                if hs_val < min_hs:
                    command['pump'] = 'on'
                elif hs_val >= max_hs:
                    command['pump'] = 'off'
            except (ValueError, TypeError):
                pass

        # 2. Décision Ventilation (ta)
        if avg_data.get('ta') is not None:
            try:
                ta_val = float(avg_data['ta'])
                min_ta = float(culture.get('min_temp_air', 18.0))
                max_ta = float(culture.get('max_temp_air', 30.0))

                if ta_val > max_ta:
                    command['cooling'] = 'on'
                elif ta_val <= min_ta:
                    command['cooling'] = 'off'
            except (ValueError, TypeError):
                pass

    # Sauvegarder les moyennes calculées en mémoire
    latest_averages[gh_id] = avg_data

    # Ajouter le point de mesure dans l'historique de la serre (limité à 20 points)
    import datetime
    current_time = datetime.datetime.now().strftime('%H:%M:%S')
    if gh_id not in averages_history:
        averages_history[gh_id] = []
    
    averages_history[gh_id].append({
        'time': current_time,
        'TA': avg_data.get('TA'),
        'TS': avg_data.get('TS'),
        'HA': avg_data.get('HA'),
        'HS': avg_data.get('HS')
    })
    
    if len(averages_history[gh_id]) > 20:
        averages_history[gh_id].pop(0)

    # Initialiser et mettre à jour les états des actionneurs selon les décisions automatisées
    if gh_id not in latest_actuator_states:
        latest_actuator_states[gh_id] = {'pump': 'off', 'cooling': 'off'}
    
    from backend.models.history_db import log_actuator_event
    if 'pump' in command:
        old_pump = latest_actuator_states[gh_id].get('pump')
        new_pump = command['pump']
        if old_pump != new_pump:
            latest_actuator_states[gh_id]['pump'] = new_pump
            log_actuator_event(gh_id, 'pump', new_pump)
            
    if 'cooling' in command:
        old_cooling = latest_actuator_states[gh_id].get('cooling')
        new_cooling = command['cooling']
        if old_cooling != new_cooling:
            latest_actuator_states[gh_id]['cooling'] = new_cooling
            log_actuator_event(gh_id, 'cooling', new_cooling)

    return {
        'averages': avg_data,
        'command': command
    }
