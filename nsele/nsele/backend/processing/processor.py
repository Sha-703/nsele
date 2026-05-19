from backend.models.db import load_data

# Mémoire globale pour stocker les dernières données de chaque compartiment
# Clé : "S1/C1", Valeur : {"TA": 24.0, "TS": 20.0, ...}
latest_sensor_data = {}

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
    except (ValueError, TypeError) as e:
        print(f"[PROCESSOR WARNING] Erreur conversion numerique : {e}")

    # Calculer les moyennes pour toute la serre (gh_id)
    comp_keys = [k for k in latest_sensor_data.keys() if k.startswith(f"{gh_id}/")]
    
    avg_data = {'greenhouse': gh_id}
    for sensor in ['TA', 'TS', 'HA', 'HS']:
        vals = [latest_sensor_data[k][sensor] for k in comp_keys if k in latest_sensor_data and sensor in latest_sensor_data[k]]
        if vals:
            avg_data[sensor] = round(sum(vals) / len(vals), 2)
        else:
            avg_data[sensor] = 0.0

    # Prise de décision automatisée basée sur les seuils de la culture de cette serre
    db = load_data()
    greenhouse = None
    for g in db.get('greenhouses', []):
        if g['id'] == gh_id:
            greenhouse = g
            break
            
    command = {}
    if greenhouse:
        culture_id = greenhouse.get('culture')
        culture = None
        for c in db.get('cultures', []):
            if c['id'] == culture_id:
                culture = c
                break
                
        if not culture:
            # Fallback par défaut
            culture = {
                'min_hum_sol': 30.0,
                'max_hum_sol': 70.0,
                'min_temp_air': 18.0,
                'max_temp_air': 30.0
            }
            
        # 1. Décision Arrosage (HS)
        if avg_data.get('HS') is not None:
            try:
                hs_val = float(avg_data['HS'])
                min_hs = float(culture.get('min_hum_sol', 30.0))
                max_hs = float(culture.get('max_hum_sol', 70.0))
                
                if hs_val < min_hs:
                    command['pump'] = 'on'
                elif hs_val >= max_hs:
                    command['pump'] = 'off'
            except ValueError:
                pass
                
        # 2. Décision Ventilation (TA)
        if avg_data.get('TA') is not None:
            try:
                ta_val = float(avg_data['TA'])
                min_ta = float(culture.get('min_temp_air', 18.0))
                max_ta = float(culture.get('max_temp_air', 30.0))
                
                if ta_val > max_ta:
                    command['cooling'] = 'on'
                elif ta_val <= min_ta:
                    command['cooling'] = 'off'
            except ValueError:
                pass

    return {
        'averages': avg_data,
        'command': command
    }
