// State
let greenhouses = [];
let selectedGhId = '';

// Elements
const ghSelect = document.getElementById('commands-gh-select');
const cultureNameEl = document.getElementById('commands-culture-name');
const pumpStatusEl = document.getElementById('status-pump');
const coolingStatusEl = document.getElementById('status-cooling');
const toast = document.getElementById('toast-message');

function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.background = isError ? '#b91c1c' : '#065f46';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Fetch Greenhouses List
async function fetchGreenhouses() {
    try {
        const response = await fetch('/api/greenhouses');
        if (!response.ok) throw new Error('API Error');
        greenhouses = await response.json();
        
        populateGreenhouseSelect();
    } catch (e) {
        console.error(e);
        showToast("Erreur lors du chargement des serres", true);
    }
}

// Populate Greenhouse dropdown
function populateGreenhouseSelect() {
    ghSelect.innerHTML = '';
    if (greenhouses.length === 0) {
        ghSelect.innerHTML = '<option value="">-- Aucune serre disponible --</option>';
        cultureNameEl.textContent = '--';
        return;
    }

    greenhouses.forEach(gh => {
        const opt = document.createElement('option');
        opt.value = gh.id;
        opt.textContent = `${gh.name} (${gh.id})`;
        ghSelect.appendChild(opt);
    });

    selectedGhId = greenhouses[0].id;
    updateSelectedGreenhouseInfo();
}

// Update displayed crop
function updateSelectedGreenhouseInfo() {
    const gh = greenhouses.find(g => g.id === selectedGhId);
    if (gh) {
        cultureNameEl.textContent = gh.culture;
    } else {
        cultureNameEl.textContent = '--';
    }
    // On reset les badges au chargement de la serre car l'état réel viendra de MQTT
    updateActuatorBadge('pump', 'off');
    updateActuatorBadge('cooling', 'off');
}

// Dropdown change handler
ghSelect.onchange = (e) => {
    selectedGhId = e.target.value;
    updateSelectedGreenhouseInfo();
};

// Update Badge UI helper
function updateActuatorBadge(actuator, state) {
    const el = actuator === 'pump' ? pumpStatusEl : coolingStatusEl;
    if (!el) return;

    if (state === 'on') {
        el.textContent = 'Actif';
        el.className = 'badge-status status-on';
    } else {
        el.textContent = 'Arrêté';
        el.className = 'badge-status status-off';
    }
}

// Send Command via API
async function sendActuatorCommand(actuator, state) {
    if (!selectedGhId) {
        showToast("Veuillez sélectionner une serre", true);
        return;
    }

    const payload = {};
    payload[actuator] = state; // e.g. { pump: "on" } or { cooling: "off" }

    try {
        const response = await fetch(`/api/greenhouses/${selectedGhId}/commands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: payload })
        });
        const resData = await response.json();
        
        if (!response.ok) throw new Error(resData.error || "Erreur d'actionnement");

        showToast(`Commande manuelle envoyée avec succès : ${actuator} -> ${state}`);
        updateActuatorBadge(actuator, state);
    } catch (err) {
        showToast(err.message, true);
    }
}

// Connect to MQTT to update states in real-time
function initMQTT() {
    console.log("Connexion au broker MQTT...");
    const client = mqtt.connect('ws://localhost:9001');

    client.on('connect', () => {
        console.log('MQTT Connecté au broker pour la page de commandes.');
        client.subscribe('nsele/actuators/#');
    });

    client.on('message', (topic, payload) => {
        try {
            const msg = JSON.parse(payload.toString());
            // Exemple topic : nsele/actuators/S1 ou nsele/actuators/S1/C1
            const parts = topic.split('/');
            if (parts.length >= 3) {
                const ghId = parts[2];
                // Si la commande concerne la serre activement sélectionnée
                if (ghId === selectedGhId) {
                    if (msg.pump !== undefined) {
                        updateActuatorBadge('pump', msg.pump);
                    }
                    if (msg.cooling !== undefined) {
                        updateActuatorBadge('cooling', msg.cooling);
                    }
                }
            }
        } catch (e) {
            console.warn("Erreur parsing MQTT payload:", e);
        }
    });

    client.on('error', (err) => {
        console.error('MQTT Erreur de connexion:', err);
    });
}

// Attach functions to window namespace so inline onclick calls work
window.sendActuatorCommand = sendActuatorCommand;

// Start
window.onload = () => {
    fetchGreenhouses();
    initMQTT();
};
