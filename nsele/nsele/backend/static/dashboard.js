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
        
        if (greenhouses.length > 0) {
            renderGreenhouseBar();
            selectGreenhouse(selectedId || greenhouses[0].id);
            loadingCard.style.display = 'none';
            dashboardContent.style.display = 'grid';
        }
    } catch (error) {
        console.error("Erreur de récupération des serres :", error);
        loadingCard.textContent = "Erreur de connexion au backend. Veuillez actualiser.";
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

// Render Compartments
function renderCompartments() {
    compartmentsContainer.innerHTML = '';
    for (let i = 1; i <= 4; i++) {
        const compId = `C${i}`;
        const card = document.createElement('article');
        card.className = 'card compartment-card';
        card.innerHTML = `
            <div class="card-header" style="margin-bottom: 12px;">
                <h3>Compartiment ${i}</h3>
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
            
            <div class="controls-row">
                <button type="button" class="btn-primary" onclick="sendCommand('${selectedId}', '${compId}', 'arrosage')">💧 Arrosage</button>
                <button type="button" class="btn-secondary" onclick="sendCommand('${selectedId}', '${compId}', 'cooling')">❄️ Cooling</button>
            </div>
        `;
        compartmentsContainer.appendChild(card);
    }
}

// Update single DOM element safely
function updateDOMVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// Refresh all values on screen
function refreshSensorUI() {
    for (let i = 1; i <= 4; i++) {
        const compId = `C${i}`;
        updateDOMVal(`${selectedId}-${compId}-TA`, getVal('TA', compId));
        updateDOMVal(`${selectedId}-${compId}-TS`, getVal('TS', compId));
        updateDOMVal(`${selectedId}-${compId}-HA`, getVal('HA', compId));
        updateDOMVal(`${selectedId}-${compId}-HS`, getVal('HS', compId));
    }
}

// Update Chart Data (Average of all 4 compartments)
function updateChartData() {
    let TA = 0, TS = 0, HA = 0, HS = 0, count = 0;
    for (let i = 1; i <= 4; i++) {
        const compId = `C${i}`;
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
    }

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

// Send Command to Backend API
function sendCommand(ghId, compId, action) {
    const payload = action === 'arrosage' ? { pump: 'on' } : { cooling: 'on' };
    
    fetch(`/api/greenhouses/${ghId}/commands`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            compId: compId,
            command: payload
        })
    })
    .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
    })
    .then(data => {
        console.log('Commande relayee par le backend :', data);
        const badge = document.getElementById(`${ghId}-${compId}-status`);
        if (badge) {
            badge.textContent = action === 'arrosage' ? 'Arrosage...' : 'Refroidissement...';
            badge.style.background = action === 'arrosage' ? '#d1fae5' : '#dbeafe';
            badge.style.color = action === 'arrosage' ? '#065f46' : '#1e40af';
            
            setTimeout(() => {
                badge.textContent = 'Actif';
                badge.style.background = '#ede9fe';
                badge.style.color = '#5b21b6';
            }, 3000);
        }
    })
    .catch(error => {
        console.error("Erreur d'envoi de la commande :", error);
    });
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
