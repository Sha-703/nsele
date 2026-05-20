// Éléments DOM
const filterSerre = document.getElementById('filter-serre');
const filterType = document.getElementById('filter-type');
const filterLimit = document.getElementById('filter-limit');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnClearHistory = document.getElementById('btn-clear-history');
const historyTableBody = document.getElementById('history-table-body');

// Variables d'état
let currentLogs = [];

// Formater la date SQLite en affichage local plus convivial
function formatTimestamp(tsString) {
    if (!tsString) return '--';
    // Le format SQLite par défaut est 'YYYY-MM-DD HH:MM:SS'
    // On remplace l'espace par un T pour créer une date JS valide
    const isoString = tsString.replace(' ', 'T');
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return tsString; // Retourner la chaîne brute si invalide
    
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Récupérer et charger l'historique depuis l'API Flask
async function loadHistory() {
    try {
        const serreVal = filterSerre.value;
        const typeVal = filterType.value;
        const limitVal = filterLimit.value;
        
        let url = `/api/history?limit=${limitVal}`;
        if (serreVal) url += `&serre=${serreVal}`;
        if (typeVal) url += `&type=${typeVal}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Impossible de charger les logs");
        
        currentLogs = await response.json();
        renderHistoryTable();
    } catch (err) {
        console.error("Erreur de récupération de l'historique :", err);
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #ef4444; padding: 30px;">
                    ⚠️ Erreur lors du chargement des données. Veuillez rafraîchir la page.
                </td>
            </tr>
        `;
    }
}

// Générer le HTML du tableau à partir des données reçues
function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    
    if (currentLogs.length === 0) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #64748b; padding: 40px;">
                    Aucun enregistrement trouvé pour ces critères de recherche.
                </td>
            </tr>
        `;
        return;
    }
    
    currentLogs.forEach(log => {
        const row = document.createElement('tr');
        
        // Formater le type avec un badge
        let typeBadge = '';
        let detailsHtml = '';
        
        if (log.type_evenement === 'capteur') {
            typeBadge = '<span class="badge-type badge-sensor">Mesure</span>';
            detailsHtml = `
                <div class="sensor-vals-grid">
                    <span class="sensor-val-pill">🌡️ T.Air: ${log.ta !== null ? log.ta + '°C' : '--'}</span>
                    <span class="sensor-val-pill">🌱 T.Sol: ${log.ts !== null ? log.ts + '°C' : '--'}</span>
                    <span class="sensor-val-pill">💧 H.Air: ${log.ha !== null ? log.ha + '%' : '--'}</span>
                    <span class="sensor-val-pill">🪴 H.Sol: ${log.hs !== null ? log.hs + '%' : '--'}</span>
                </div>
            `;
        } else if (log.type_evenement === 'actionneur') {
            typeBadge = '<span class="badge-type badge-actuator">Action</span>';
            const actionneurNom = log.actionneur === 'pump' ? 'Pompe d\'Arrosage' : 'Ventilation (Cooling)';
            const actionLabel = log.action === 'on' ? 'Démarrée 🟢' : 'Arrêtée 🔴';
            detailsHtml = `<strong>${actionneurNom}</strong> -> ${actionLabel}`;
        }
        
        row.innerHTML = `
            <td>${formatTimestamp(log.timestamp)}</td>
            <td><strong>${log.serre}</strong></td>
            <td>${log.compartiment || '--'}</td>
            <td>${typeBadge}</td>
            <td>${detailsHtml}</td>
        `;
        
        historyTableBody.appendChild(row);
    });
}

// Exporter les données actuelles au format CSV
function exportToCSV() {
    if (currentLogs.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
    }
    
    // Définir les en-têtes
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date_Heure,Serre,Compartiment,Type_Evenement,Temp_Air,Temp_Sol,Hum_Air,Hum_Sol,Actionneur,Action\n";
    
    // Parcourir chaque ligne
    currentLogs.forEach(log => {
        const rowData = [
            log.timestamp,
            log.serre,
            log.compartiment || "",
            log.type_evenement,
            log.ta !== null ? log.ta : "",
            log.ts !== null ? log.ts : "",
            log.ha !== null ? log.ha : "",
            log.hs !== null ? log.hs : "",
            log.actionneur || "",
            log.action || ""
        ];
        // Échapper les valeurs pour éviter les erreurs de format CSV
        const rowString = rowData.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
        csvContent += rowString + "\n";
    });
    
    // Créer un élément de téléchargement caché et simuler le clic
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nsele_historique_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Vider l'historique dans la base de données
async function clearHistory() {
    const confirmation = confirm("Êtes-vous absolument sûr de vouloir vider l'historique complet ? Cette action est irréversible.");
    if (!confirmation) return;
    
    try {
        const response = await fetch('/api/history', { method: 'DELETE' });
        if (!response.ok) throw new Error("Erreur de suppression");
        
        const result = await response.json();
        alert(result.message);
        loadHistory(); // Recharger le tableau (qui sera vide)
    } catch (err) {
        console.error("Erreur lors de la suppression de l'historique :", err);
        alert("Impossible de vider l'historique. Veuillez réessayer.");
    }
}

// Liaison des événements de filtres
filterSerre.onchange = loadHistory;
filterType.onchange = loadHistory;
filterLimit.onchange = loadHistory;
btnExportCsv.onclick = exportToCSV;
btnClearHistory.onclick = clearHistory;

// Chargement initial
window.onload = () => {
    loadHistory();
};
