# Modèle de serre (Greenhouse)
class Greenhouse:
    def __init__(self, id, name, culture, status='OK'):
        self.id = id
        self.name = name
        self.culture = culture
        self.status = status

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'culture': self.culture,
            'status': self.status
        }

# Stockage en mémoire (à remplacer par une vraie DB)
# Nous utilisons la nomenclature S1 à S4 pour les 4 serres.
# Chaque serre est ensuite divisée en compartiments (C1 à C4) gérés côté frontend et capteurs.
greenhouses = [
    Greenhouse('S1', 'Serre 1', 'Tomates'),
    Greenhouse('S2', 'Serre 2', 'Laitue'),
    Greenhouse('S3', 'Serre 3', 'Poivrons'),
    Greenhouse('S4', 'Serre 4', 'Aubergines')
]

def get_all_greenhouses():
    return [g.to_dict() for g in greenhouses]

def update_greenhouse(gh_id, data):
    for g in greenhouses:
        if g.id == gh_id:
            if 'culture' in data:
                g.culture = data['culture']
            return g.to_dict()
    return None
