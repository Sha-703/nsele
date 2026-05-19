from backend.models.db import load_data, save_data

def get_all_greenhouses():
    """
    Récupère la liste de toutes les serres.
    Résout le nom de la culture correspondante et injecte les compartiments par défaut si absents.
    """
    data = load_data()
    # Création d'un dictionnaire pour associer l'ID de la culture à son nom
    cultures_dict = {c['id']: c['name'] for c in data.get('cultures', [])}
    result = []
    for g in data.get('greenhouses', []):
        g_copy = g.copy()
        # Remplacement de l'identifiant par le nom lisible de la culture
        g_copy['culture'] = cultures_dict.get(g['culture'], g['culture'])
        g_copy['culture_id'] = g['culture']  # Conserver l'identifiant brut pour les liaisons
        g_copy['compartments'] = g.get('compartments', ["C1", "C2", "C3", "C4"])
        result.append(g_copy)
    return result

def create_greenhouse(gh_id, name, culture_id):
    """
    Enregistre une nouvelle serre dans le fichier JSON.
    Vérifie les doublons sur l'ID de la serre.
    """
    data = load_data()
    # Vérification d'unicité
    for g in data.get('greenhouses', []):
        if g['id'] == gh_id:
            return None
            
    new_gh = {
        'id': gh_id,
        'name': name,
        'culture': culture_id,
        'status': 'OK',
        'compartments': ["C1", "C2", "C3", "C4"] # Compartiments initiaux par défaut
    }
    data['greenhouses'].append(new_gh)
    save_data(data)
    return new_gh

def update_greenhouse(gh_id, update_data):
    """
    Met à jour le nom ou la culture assignée à une serre existante.
    """
    data = load_data()
    for g in data.get('greenhouses', []):
        if g['id'] == gh_id:
            if 'culture' in update_data:
                g['culture'] = update_data['culture']
            if 'name' in update_data:
                g['name'] = update_data['name']
            save_data(data)
            return g
    return None

def delete_greenhouse(gh_id):
    """
    Retire définitivement une serre du fichier JSON.
    """
    data = load_data()
    initial_len = len(data.get('greenhouses', []))
    data['greenhouses'] = [g for g in data.get('greenhouses', []) if g['id'] != gh_id]
    if len(data['greenhouses']) < initial_len:
        save_data(data)
        return True
    return False

def add_compartment(gh_id, comp_id):
    """
    Ajoute un compartiment à la liste des compartiments actifs d'une serre.
    """
    data = load_data()
    for g in data.get('greenhouses', []):
        if g['id'] == gh_id:
            comps = g.get('compartments', ["C1", "C2", "C3", "C4"])
            comp_id = comp_id.upper().strip()
            if comp_id not in comps:
                comps.append(comp_id)
                g['compartments'] = comps
                save_data(data)
                return True
    return False

def delete_compartment(gh_id, comp_id):
    """
    Supprime un compartiment spécifique de la serre.
    """
    data = load_data()
    for g in data.get('greenhouses', []):
        if g['id'] == gh_id:
            comps = g.get('compartments', ["C1", "C2", "C3", "C4"])
            comp_id = comp_id.upper().strip()
            if comp_id in comps:
                comps.remove(comp_id)
                g['compartments'] = comps
                save_data(data)
                return True
    return False
