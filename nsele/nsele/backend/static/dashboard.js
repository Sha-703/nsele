// State
let greenhouses = [];
let selectedId = 'S1';
let mqttData = {};
let history = [];
let chartInstance = null;
let chartInterval = null;
let mqttClient = null;  // Client MQTT global

// Elements
const greenhouseBar = document.getElementById('greenhouse-bar');
const dashboardContent = document.getElementById('dashboard-content');
const loadingCard = document.getElementById('loading-card');
const emptyCard = document.getElementById('empty-card');
const ghTitle = document.getElementById('gh-title');
const ghCulture = document.getElementById('gh-culture');
const compartmentsContainer = document.getElementById('compartments-container');

// Init Chart.js
function initChart() {
    const ctx = document.getElementById('sensorChart').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temp. Air (°C)',
                    data: [],
                    borderColor: '#f59e42',
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Temp. Sol (°C)',
                    data: [],
                    borderColor: '#eab308',
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Humidité Air (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    tension: 0.3,
                    fill: false,
                },
                {
                    label: 'Humidité Sol (%)',
                    data: [],
                    borderColor: '#10b981',
                    tension: 0.3,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { x: { display: true }, y: { display: true } }
        }
    });
}

// Fetch Greenhouses List
async function fetchGreenhouses() {
    try {
        const response = await fetch('/api/greenhouses');
        if (!response.ok) throw new Error('Erreur API');
        greenhouses = await response.json();
        
        loadingCard.style.display = 'none';
        
        if (greenhouses.length > 0) {
            emptyCard.style.display = 'none';
            dashboardContent.style.display = 'grid';
            renderGreenhouseBar();
            selectGreenhouse(selectedId || greenhouses[0].id);
        } else {
            emptyCard.style.display = 'block';
            dashboardContent.style.display = 'none';
            greenhouseBar.innerHTML = '<div style="color: rgba(255,255,255,0.7); font-style: italic; padding: 10px 16px;">Aucune serre configurée</div>';
        }
    } catch (error) {
        console.error("Erreur de récupération des serres :", error);
        loadingCard.textContent = "Erreur de connexion au backend. Veuillez actualiser.";
        loadingCard.style.display = 'block';
    }
}

// Render Greenhouse Bar
function renderGreenhouseBar() {
    greenhouseBar.innerHTML = '';
    greenhouses.forEach(gh => {
        const ghItem = document.createElement('div');
        ghItem.className = `gh-item ${selectedId === gh.id ? 'selected' : ''}`;
        ghItem.onclick = () => selectGreenhouse(gh.id);
        ghItem.innerHTML = `
            <span class="gh-name">${gh.name}</span>
            <span class="gh-culture">${gh.culture}</span>
        `;
        greenhouseBar.appendChild(ghItem);
    });
}

// Récupérer le dernier état connu depuis le backend
async function fetchLatestState(ghId) {
    try {
        const response = await fetch(`/api/greenhouses/${ghId}/latest-state`);
        if (!response.ok) throw new Error("Erreur lors de la récupération de l'état");
        const state = await response.json();
        
        console.log("📥 Dernier état connu reçu :", state);
        
        // Charger les dernières données brutes des capteurs dans mqttData
        if (state.sensor_data) {
            Object.keys(state.sensor_data).forEach(compId => {
                const compSensors = state.sensor_data[compId];
                // compSensors est sous la forme {"TA": 24.5, "TS": 20.1, ...}
                // On doit reconstruire la clé composite attendue par le frontend (ex: S1C1TA)
                Object.keys(compSensors).forEach(sensor => {
                    const key = `${ghId}${compId}${sensor}`;
                    mqttData[key] = compSensors[sensor];
                });
            });
        }
        
        // Rafraîchir l'affichage des compartiments
        refreshSensorUI();
        
        // Mettre à jour l'affichage des moyennes
        if (state.averages) {
            updateAveragesUI(state.averages);
        }

        // Charger l'historique des moyennes pour le graphique
        if (state.history && state.history.length > 0) {
            history = state.history.map(h => ({
                time: h.time,
                TA: h.TA,
                TS: h.TS,
                HA: h.HA,
                HS: h.HS
            }));
            renderChartUI();
        }
    } catch (err) {
        console.warn("⚠️ Impossible de charger l'état initial :", err);
    }
}

// Sélectionner une serre
async function selectGreenhouse(id) {
    selectedId = id;
    
    // Mettre en surbrillance dans la barre de sélection
    document.querySelectorAll('.gh-item').forEach((item, index) => {
        if (greenhouses[index].id === selectedId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    const currentGh = greenhouses.find(g => g.id === selectedId);
    if (currentGh) {
        ghTitle.textContent = currentGh.name;
        ghCulture.textContent = currentGh.culture;
    }

    // Réinitialiser les éléments de moyennes
    updateDOMVal('avg-TA', '--');
    updateDOMVal('avg-TS', '--');
    updateDOMVal('avg-HA', '--');
    updateDOMVal('avg-HS', '--');

    // Afficher les compartiments
    renderCompartments();
    
    // Réinitialiser l'historique du graphique et redémarrer les intervalles
    history = [];
    if (chartInterval) clearInterval(chartInterval);
    initChart();
    
    // Charger le dernier état connu depuis le serveur
    await fetchLatestState(selectedId);
    
    // Boucle de mise à jour du graphique
    chartInterval = setInterval(updateChartData, 2500);
}

// Helper to get formatted sensor value
function getVal(sensor, compId) {
    const key = `${selectedId}${compId}${sensor}`;
    return mqttData[key] !== undefined ? mqttData[key] : '--';
}

// Render Compartments (without control buttons)
function renderCompartments() {
    compartmentsContainer.innerHTML = '';
    const currentGh = greenhouses.find(g => g.id === selectedId);
    const comps = currentGh && currentGh.compartments ? currentGh.compartments : [];
    
    if (comps.length === 0) {
        compartmentsContainer.innerHTML = '<div class="card" style="grid-column: span 2; text-align: center; padding: 40px; color: #64748b;">Aucun compartiment configuré pour cette serre. Rendez-vous dans les paramètres pour en ajouter !</div>';
        return;
    }
    
    comps.forEach(compId => {
        const card = document.createElement('article');
        card.className = 'card compartment-card';
        card.innerHTML = `
            <div class="card-header" style="margin-bottom: 12px;">
                <h3>Compartiment ${compId}</h3>
                <span class="badge" id="${selectedId}-${compId}-status">Actif</span>
            </div>
            
            <div class="sensors-grid">
                <div class="sensor-item">
                    <span class="sensor-icon">🌡️</span>
                    <div class="sensor-info">
                        <span class="sensor-label">Temp. Air</span>
                        <span class="sensor-val"><span id="${selectedId}-${compId}-TA">${getVal('TA', compId)}</span> °C</span>
                    </div>
                </div>
                <div class="sensor-item">
                    <span class="sensor-icon">🌱</span>
                    <div class="sensor-info">
                        <span class="sensor-label">Temp. Sol</span>
                        <span class="sensor-val"><span id="${selectedId}-${compId}-TS">${getVal('TS', compId)}</span> °C</span>
                    </div>
                </div>
                <div class="sensor-item">
                    <span class="sensor-icon">💧</span>
                    <div class="sensor-info">
                        <span class="sensor-label">Hum. Air</span>
                        <span class="sensor-val"><span id="${selectedId}-${compId}-HA">${getVal('HA', compId)}</span> %</span>
                    </div>
                </div>
                <div class="sensor-item">
                    <span class="sensor-icon">🪴</span>
                    <div class="sensor-info">
                        <span class="sensor-label">Hum. Sol</span>
                        <span class="sensor-val"><span id="${selectedId}-${compId}-HS">${getVal('HS', compId)}</span> %</span>
                    </div>
                </div>
            </div>
        `;
        compartmentsContainer.appendChild(card);
    });
}

// Update single DOM element safely
function updateDOMVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Refresh all values on screen
function refreshSensorUI() {
    const currentGh = greenhouses.find(g => g.id === selectedId);
    const comps = currentGh && currentGh.compartments ? currentGh.compartments : [];
    
    let sumTA = 0, countTA = 0;
    let sumTS = 0, countTS = 0;
    let sumHA = 0, countHA = 0;
    let sumHS = 0, countHS = 0;

    comps.forEach(compId => {
        const valTA = getVal('TA', compId);
        const valTS = getVal('TS', compId);
        const valHA = getVal('HA', compId);
        const valHS = getVal('HS', compId);

        updateDOMVal(`${selectedId}-${compId}-TA`, valTA);
        updateDOMVal(`${selectedId}-${compId}-TS`, valTS);
        updateDOMVal(`${selectedId}-${compId}-HA`, valHA);
        updateDOMVal(`${selectedId}-${compId}-HS`, valHS);

        if (valTA !== '--') { sumTA += parseFloat(valTA); countTA++; }
        if (valTS !== '--') { sumTS += parseFloat(valTS); countTS++; }
        if (valHA !== '--') { sumHA += parseFloat(valHA); countHA++; }
        if (valHS !== '--') { sumHS += parseFloat(valHS); countHS++; }
    });

    // Mettre à jour la carte des moyennes de la serre sur le frontend
    updateDOMVal('avg-TA', countTA > 0 ? (sumTA / countTA).toFixed(1) : '--');
    updateDOMVal('avg-TS', countTS > 0 ? (sumTS / countTS).toFixed(1) : '--');
    updateDOMVal('avg-HA', countHA > 0 ? (sumHA / countHA).toFixed(1) : '--');
    updateDOMVal('avg-HS', countHS > 0 ? (sumHS / countHS).toFixed(1) : '--');
}

// Update Averages Card (fallback ou déclenchement direct depuis MQTT)
function updateAveragesUI(msg) {
    updateDOMVal('avg-TA', msg.TA !== undefined ? msg.TA : '--');
    updateDOMVal('avg-TS', msg.TS !== undefined ? msg.TS : '--');
    updateDOMVal('avg-HA', msg.HA !== undefined ? msg.HA : '--');
    updateDOMVal('avg-HS', msg.HS !== undefined ? msg.HS : '--');
}

// Rafraîchir l'affichage du graphique à partir de l'historique en mémoire
function renderChartUI() {
    if (chartInstance) {
        chartInstance.data.labels = history.map(h => h.time);
        chartInstance.data.datasets[0].data = history.map(h => h.TA);
        chartInstance.data.datasets[1].data = history.map(h => h.TS);
        chartInstance.data.datasets[2].data = history.map(h => h.HA);
        chartInstance.data.datasets[3].data = history.map(h => h.HS);
        chartInstance.update();
    }
}

// Mettre à jour les données du graphique (Moyenne de tous les compartiments)
function updateChartData() {
    const currentGh = greenhouses.find(g => g.id === selectedId);
    const comps = currentGh && currentGh.compartments ? currentGh.compartments : [];
    
    let TA = 0, TS = 0, HA = 0, HS = 0, count = 0;
    comps.forEach(compId => {
        const keyTA = `${selectedId}${compId}TA`;
        const keyTS = `${selectedId}${compId}TS`;
        const keyHA = `${selectedId}${compId}HA`;
        const keyHS = `${selectedId}${compId}HS`;
        
        if (mqttData[keyTA] !== undefined) {
            TA += parseFloat(mqttData[keyTA]);
            TS += parseFloat(mqttData[keyTS]);
            HA += parseFloat(mqttData[keyHA]);
            HS += parseFloat(mqttData[keyHS]);
            count++;
        }
    });

    let pt;
    const timeStr = new Date().toLocaleTimeString();
    if (count > 0) {
        pt = { time: timeStr, TA: TA / count, TS: TS / count, HA: HA / count, HS: HS / count };
    } else {
        // Fallback pour faire bouger le graphique s'il n'y a pas encore de données reçues
        pt = { 
            time: timeStr, 
            TA: 26 + Math.random() * 2, 
            TS: 22 + Math.random(), 
            HA: 65 + Math.random() * 4, 
            HS: 45 + Math.random() * 5 
        };
    }

    history.push(pt);
    if (history.length > 20) {
        history.shift();
    }

    renderChartUI();
}

// Connect to Flask SSE stream instead of MQTT WS
function initSSE() {
    console.log("Connexion au flux de données temps réel SSE...");
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (!data || !data.topic || !data.payload) return;

            const topic = data.topic;
            const msg = data.payload;
            
            console.log(`✅ Message reçu via SSE [${topic}]:`, msg);
            
            const parts = topic.split('/');
            if (parts.length >= 4 && parts[3] === 'averages') {
                const ghId = parts[2];
                if (ghId === selectedId) {
                    updateAveragesUI(msg);
                }
                return;
            }

            mqttData = { ...mqttData, ...msg };
            refreshSensorUI();
        } catch (e) {
            console.warn("❌ Erreur parsing message SSE:", e);
        }
    };

    eventSource.onerror = (err) => {
        console.error("❌ Erreur de connexion SSE:", err);
    };
}

// Start
window.onload = () => {
    fetchGreenhouses();
    initSSE();
};
