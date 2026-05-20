import sqlite3
import os

# Déterminer le chemin absolu de la base de données serre.db
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'serre.db')

def init_history_db():
    """
    Initialise la table historique dans SQLite si elle n'existe pas déjà.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historique (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        serre TEXT,
        compartiment TEXT,
        type_evenement TEXT, -- 'capteur' ou 'actionneur'
        valeur_ta REAL,
        valeur_ts REAL,
        valeur_ha REAL,
        valeur_hs REAL,
        actionneur TEXT, -- 'pump' ou 'cooling'
        action TEXT -- 'on' ou 'off'
    )
    """)
    conn.commit()
    conn.close()
    print(f"[BDD HISTORIQUE] Base de données initialisée à : {DB_PATH}")

def log_sensor_event(serre, compartiment, ta, ts, ha, hs):
    """
    Enregistre les données reçues d'un capteur dans l'historique.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO historique (serre, compartiment, type_evenement, valeur_ta, valeur_ts, valeur_ha, valeur_hs)
        VALUES (?, ?, 'capteur', ?, ?, ?, ?)
        """, (serre, compartiment, ta, ts, ha, hs))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[BDD HISTORIQUE] Erreur d'écriture capteur : {e}")

def log_actuator_event(serre, actionneur, action):
    """
    Enregistre le changement d'état d'un actionneur dans l'historique.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO historique (serre, type_evenement, actionneur, action)
        VALUES (?, 'actionneur', ?, ?)
        """, (serre, actionneur, action))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[BDD HISTORIQUE] Erreur d'écriture actionneur : {e}")

def get_history_logs(serre_filter=None, type_filter=None, limit=500):
    """
    Récupère la liste des événements enregistrés, avec filtres optionnels.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = "SELECT * FROM historique WHERE 1=1"
        params = []
        
        if serre_filter:
            query += " AND serre = ?"
            params.append(serre_filter)
            
        if type_filter:
            query += " AND type_evenement = ?"
            params.append(type_filter)
            
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        logs = []
        for r in rows:
            logs.append({
                'id': r['id'],
                'timestamp': r['timestamp'],
                'serre': r['serre'],
                'compartiment': r['compartiment'],
                'type_evenement': r['type_evenement'],
                'ta': r['valeur_ta'],
                'ts': r['valeur_ts'],
                'ha': r['valeur_ha'],
                'hs': r['valeur_hs'],
                'actionneur': r['actionneur'],
                'action': r['action']
            })
        conn.close()
        return logs
    except Exception as e:
        print(f"[BDD HISTORIQUE] Erreur de lecture : {e}")
        return []

def clear_history_db():
    """
    Vide complètement la table historique.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM historique")
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"[BDD HISTORIQUE] Erreur lors du nettoyage de l'historique : {e}")
        return False
