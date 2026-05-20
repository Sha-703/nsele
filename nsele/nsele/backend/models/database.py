import sqlite3

# création/connexion à la base
connexion = sqlite3.connect("serre.db")

# les tables seront crees ici
table_historique ="""

CREATE TABLE historique_actionneurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actionneur_id INTEGER,
    ancien_etat TEXT,
    nouvel_etat TEXT,
    date_action DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (actionneur_id)
    REFERENCES actionneurs(id)
);

"""

table_serre ="""
CREATE TABLE IF NOT EXISTS serres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    description TEXT,
    culture_id INTEGER,
    compartiment INTEGER,
    FOREIGN KEY (culture_id)
    REFERENCES cultures(id),
    FOREIGN KEY (compartiment)
    REFERENCES compartiment(id)
);
"""
tables_mesures ="""
CREATE TABLE mesures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serre_id INTEGER,
    temperature_air REAL,
    humidite_air REAL,
    temperature_sol REAL,
    humidite_sol REAL,
    quantite_eau REAL,
    date_mesure DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (serre_id)
    REFERENCES serres(id)
);
"""
tabele_actionneurs ="""
CREATE TABLE actionneurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serre_id INTEGER,
    nom TEXT NOT NULL,
    type TEXT,
    etat TEXT DEFAULT 'OFF',

    FOREIGN KEY (serre_id)
    REFERENCES serres(id)
);

"""
table_culture ="""
CREATE TABLE IF NOT EXISTS cultures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    description TEXT,
    temperature_sol_min REAL,
    temperature_sol_max REAL,
    temperature_air_min REAL,
    temperature_air_max REAL,
    humidite_sol_min REAL,
    humidite_sol_max REAL,
    humidite_air_min REAL,
    humidite_air_max REAL,
    duree_culture INTEGER,
    debut_culture DATE,
    fin_culture DATE,
    consommation_eau REAL,
    taux_eclairement REAL
);
"""

table_compartiment ="""
CREATE TABLE IF NOT EXISTS compartiment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_controleur TEXT NOT NULL,
    temperature_sol REAL,
    humidite_sol REAL,
    temperature_air REAL,
    humidite_air REAL,
    heure_mise_a_jour DATETIME
);
"""



# création du curseur
curseur = connexion.cursor() # Le curseur est utilisé pour exécuter des commandes SQL sur la base de données
print("Base de données créée avec succès !")
# création des tables dans le bon ordre pour les clés étrangères
curseur.execute(table_culture)
curseur.execute(table_compartiment)
curseur.execute(table_serre)
curseur.execute(tables_mesures)
curseur.execute(tabele_actionneurs)
connexion.commit()
print("nous avons creer les tables")
# fermeture
connexion.close()