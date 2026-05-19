// State
let greenhouses = [];
let selectedId = 'S1';
let mqttData = {};
let history = [];
let chartInstance = null;
let chartInterval = null;

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

// Select Greenhouse
function selectGreenhouse(id) {
    selectedId = id;
    
    // Highlight in bar
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

    // Reset averages elements
    updateDOMVal('avg-TA', '--');
    updateDOMVal('avg-TS', '--');
    updateDOMVal('avg-HA', '--');
    updateDOMVal('avg-HS', '--');

    // Render compartments
    renderCompartments();
    
    // Clear chart history and restart intervals
    history = [];
    if (chartInterval) clearInterval(chartInterval);
    initChart();
    
    // Chart loop
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

// Update Chart Data (Average of all compartments)
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
        // Dummy fallback to keep graph moving if no live messages
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

    // Update Chart.js Instance
    if (chartInstance) {
        chartInstance.data.labels = history.map(h => h.time);
        chartInstance.data.datasets[0].data = history.map(h => h.TA);
        chartInstance.data.datasets[1].data = history.map(h => h.TS);
        chartInstance.data.datasets[2].data = history.map(h => h.HA);
        chartInstance.data.datasets[3].data = history.map(h => h.HS);
        chartInstance.update();
    }
}

// Connect to MQTT Broker via Websockets on 9001
function initMQTT() {
    console.log("Connexion au broker MQTT...");
    const client = mqtt.connect('ws://localhost:9001');

    client.on('connect', () => {
        console.log('MQTT Connecté au broker.');
        client.subscribe('nsele/sensors/#');
        client.subscribe('nsele/actuators/#');
    });

    client.on('message', (topic, payload) => {
        try {
            const msg = JSON.parse(payload.toString());
            console.log(`MQTT Recu sur [${topic}]:`, msg);
            
            const parts = topic.split('/');
            if (parts.length >= 4 && parts[3] === 'averages') {
                const ghId = parts[2];
                if (ghId === selectedId) {
                    updateAveragesUI(msg);
                }
                return; // Ne pas mélanger avec les données brutes de compartiments
            }

            mqttData = { ...mqttData, ...msg };
            refreshSensorUI();
        } catch (e) {
            console.warn("Erreur parsing MQTT payload:", e);
        }
    });

    client.on('error', (err) => {
        console.error('MQTT Erreur de connexion:', err);
    });
}

// Start
window.onload = () => {
    fetchGreenhouses();
    initMQTT();
};
