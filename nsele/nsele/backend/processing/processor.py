import os
import sqlite3
from backend.models.db import load_data

# Mémoire globale pour stocker les dernières données de chaque compartiment
# Clé : "S1/C1", Valeur : {"ta": 24.0, "ts": 20.0, ...}
latest_sensor_data = {}


def load_culture_from_sqlite(gh_id: str) -> dict | None:
    """Charge les seuils de culture depuis la base SQLite serre.db si elle contient des valeurs."""
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'serre.db'))
    if not os.path.exists(db_path):
        return None

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        if str(gh_id).isdigit():
            cursor.execute("SELECT culture_id FROM serres WHERE id = ?", (int(gh_id),))
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
        culture_row = cursor.fetchone()
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

def process_raw_sensor_message(gh_id: str, comp_id: str, data: dict) -> dict:
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
    if target not in latest_sensor_data:
        latest_sensor_data[target] = {} # Initialiser la structure pour ce compartiment s'il n'existe pas encore
        
    ta_key = f"{gh_id}{comp_id}ta" # Ex: "S1C1ta"
    ts_key = f"{gh_id}{comp_id}ts"
    ha_key = f"{gh_id}{comp_id}ha"
    hs_key = f"{gh_id}{comp_id}hs"
    
    try:
        if ta_key in data: latest_sensor_data[target]['ta'] = float(data[ta_key])
        if ts_key in data: latest_sensor_data[target]['ts'] = float(data[ts_key])
        if ha_key in data: latest_sensor_data[target]['ha'] = float(data[ha_key])
        if hs_key in data: latest_sensor_data[target]['hs'] = float(data[hs_key])
    except (ValueError, TypeError) as e:
        print(f"[PROCESSOR WARNING] Erreur conversion numerique : {e}")


    # Calculer les moyennes pour toute la serre (gh_id)
    comp_keys = [k for k in latest_sensor_data.keys() if k.startswith(f"{gh_id}/")] # Ex: ["S1/C1", "S1/C2", ...]
    
    avg_data = {'greenhouse': gh_id}
    for sensor in ['ta', 'ts', 'ha', 'hs']:
        vals = [latest_sensor_data[k][sensor] for k in comp_keys if k in latest_sensor_data and sensor in latest_sensor_data[k]] # Ex: [24.0, 25.5, ...]
        if vals:
            avg_data[sensor] = round(sum(vals) / len(vals), 2)
        else:
            avg_data[sensor] = 0.0

    # Prise de décision automatisée basée sur les seuils de la culture de cette serre
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

    return {
        'averages': avg_data,
        'command': command
    }
