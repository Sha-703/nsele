from backend.models.db import load_data, save_data

def get_all_cultures():
    """
    Récupère la liste de toutes les cultures disponibles et leurs seuils.
    """
    data = load_data()
    return data.get('cultures', [])

def get_culture_by_id(culture_id):
    """
    Recherche une culture spécifique par son identifiant unique.
    """
    data = load_data()
    for c in data.get('cultures', []):
        if c['id'] == culture_id:
            return c
    return None

def create_culture(culture_id, name, params):
    """
    Crée et enregistre une nouvelle culture avec ses seuils de température et d'humidité.
    """
    data = load_data()
    # Vérification d'unicité
    for c in data.get('cultures', []):
        if c['id'] == culture_id:
            return None
            
    new_cult = {
        'id': culture_id,
        'name': name,
        'min_temp_air': float(params.get('min_temp_air', 20)),
        'max_temp_air': float(params.get('max_temp_air', 30)),
        'min_temp_sol': float(params.get('min_temp_sol', 15)),
        'max_temp_sol': float(params.get('max_temp_sol', 25)),
        'min_hum_air': float(params.get('min_hum_air', 50)),
        'max_hum_air': float(params.get('max_hum_air', 80)),
        'min_hum_sol': float(params.get('min_hum_sol', 30)),
        'max_hum_sol': float(params.get('max_hum_sol', 70))
    }
    data['cultures'].append(new_cult)
    save_data(data)
    return new_cult

def update_culture(culture_id, params):
    """
    Met à jour les seuils de température et d'humidité d'une culture existante.
    """
    data = load_data()
    for c in data.get('cultures', []):
        if c['id'] == culture_id:
            # Liste des seuils à mettre à jour dynamiquement
            for k in ['min_temp_air', 'max_temp_air', 'min_temp_sol', 'max_temp_sol', 
                      'min_hum_air', 'max_hum_air', 'min_hum_sol', 'max_hum_sol']:
                if k in params:
                    c[k] = float(params[k])
            if 'name' in params:
                c['name'] = params['name']
            save_data(data)
            return c
    return None
