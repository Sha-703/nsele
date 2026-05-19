// State
let greenhouses = [];
let cultures = [];

// Elements - Tables
const ghTableBody = document.getElementById('greenhouses-table-body');
const cultTableBody = document.getElementById('cultures-table-body');

// Elements - Selectors
const ghCultureSelect = document.getElementById('gh-culture-select');
const assignGhSelect = document.getElementById('assign-gh-select');
const assignCultureSelect = document.getElementById('assign-culture-select');
const cultureSelector = document.getElementById('culture-selector');

// Elements - Forms
const createGhForm = document.getElementById('create-gh-form');
const assignCultureForm = document.getElementById('assign-culture-form');
const cultureForm = document.getElementById('culture-form');

// Elements - Inputs for Culture
const cultureIdInput = document.getElementById('culture-id');
const cultureNameInput = document.getElementById('culture-name');
const minHumSol = document.getElementById('min-hum-sol');
const maxHumSol = document.getElementById('max-hum-sol');
const minTempAir = document.getElementById('min-temp-air');
const maxTempAir = document.getElementById('max-temp-air');
const minHumAir = document.getElementById('min-hum-air');
const maxHumAir = document.getElementById('max-hum-air');
const minTempSol = document.getElementById('min-temp-sol');
const maxTempSol = document.getElementById('max-temp-sol');
const cultureSubmitBtn = document.getElementById('culture-submit-btn');

// Elements - Toast
const toast = document.getElementById('toast-message');

// Show notification
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.background = isError ? '#b91c1c' : '#065f46';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Fetch all data
async function fetchData() {
    try {
        const [ghRes, cultRes] = await Promise.all([
            fetch('/api/greenhouses'),
            fetch('/api/cultures')
        ]);
        
        if (!ghRes.ok || !cultRes.ok) throw new Error('API Error');
        
        greenhouses = await ghRes.json();
        cultures = await cultRes.json();
        
        renderUI();
    } catch (e) {
        console.error(e);
        showToast("Erreur lors de la récupération des données", true);
    }
}

// Render tables and dropdown lists
function renderUI() {
    // 1. Render Greenhouses Table
    ghTableBody.innerHTML = '';
    greenhouses.forEach(gh => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><a href="/greenhouse/${gh.id}" style="color: #065f46; text-decoration: underline; font-weight: bold;">${gh.id}</a></td>
            <td>${gh.name}</td>
            <td><span class="badge">${gh.culture}</span></td>
        `;
        ghTableBody.appendChild(tr);
    });

    // 2. Render Cultures Table
    cultTableBody.innerHTML = '';
    cultures.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>Sol: ${c.min_hum_sol}% - ${c.max_hum_sol}%</td>
            <td>Air: ${c.min_temp_air}°C - ${c.max_temp_air}°C</td>
        `;
        cultTableBody.appendChild(tr);
    });

    // 3. Populate Greenhouse Culture Options
    ghCultureSelect.innerHTML = '';
    assignCultureSelect.innerHTML = '';
    cultures.forEach(c => {
        const opt1 = document.createElement('option');
        opt1.value = c.id;
        opt1.textContent = c.name;
        ghCultureSelect.appendChild(opt1);

        const opt2 = opt1.cloneNode(true);
        assignCultureSelect.appendChild(opt2);
    });

    // 4. Populate Greenhouse Assign Options
    assignGhSelect.innerHTML = '';
    greenhouses.forEach(gh => {
        const opt = document.createElement('option');
        opt.value = gh.id;
        opt.textContent = `${gh.name} (${gh.culture})`;
        assignGhSelect.appendChild(opt);
    });

    // 5. Populate Culture Selector for editing
    const selectedVal = cultureSelector.value;
    cultureSelector.innerHTML = '<option value="NEW">-- Nouvelle Culture --</option>';
    cultures.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        cultureSelector.appendChild(opt);
    });
    cultureSelector.value = selectedVal;
}

// Culture selector change handler
cultureSelector.onchange = () => {
    const val = cultureSelector.value;
    if (val === 'NEW') {
        // Reset inputs
        cultureIdInput.value = '';
        cultureIdInput.disabled = false;
        cultureNameInput.value = '';
        minHumSol.value = '30';
        maxHumSol.value = '70';
        minTempAir.value = '18';
        maxTempAir.value = '30';
        minHumAir.value = '50';
        maxHumAir.value = '80';
        minTempSol.value = '15';
        maxTempSol.value = '25';
        cultureSubmitBtn.textContent = 'Créer la Culture';
    } else {
        // Populate inputs with selected crop settings
        const cult = cultures.find(c => c.id === val);
        if (cult) {
            cultureIdInput.value = cult.id;
            cultureIdInput.disabled = true; // Cannot edit raw ID
            cultureNameInput.value = cult.name;
            minHumSol.value = cult.min_hum_sol;
            maxHumSol.value = cult.max_hum_sol;
            minTempAir.value = cult.min_temp_air;
            maxTempAir.value = cult.max_temp_air;
            minHumAir.value = cult.min_hum_air;
            maxHumAir.value = cult.max_hum_air;
            minTempSol.value = cult.min_temp_sol;
            maxTempSol.value = cult.max_temp_sol;
            cultureSubmitBtn.textContent = 'Enregistrer les modifications';
        }
    }
};

// Form submission: Create Greenhouse
createGhForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('gh-id-input').value;
    const name = document.getElementById('gh-name-input').value;
    const culture = ghCultureSelect.value;

    try {
        const response = await fetch('/api/greenhouses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, culture })
        });
        
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Erreur lors de la création');
        
        showToast(`Serre "${name}" créée avec succès !`);
        createGhForm.reset();
        fetchData();
    } catch (err) {
        showToast(err.message, true);
    }
};

// Form submission: Assign Culture to Greenhouse
assignCultureForm.onsubmit = async (e) => {
    e.preventDefault();
    const ghId = assignGhSelect.value;
    const cultureId = assignCultureSelect.value;

    try {
        const response = await fetch(`/api/greenhouses/${ghId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ culture: cultureId })
        });
        
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Erreur de modification');
        
        showToast(`Culture mise à jour pour la serre !`);
        fetchData();
    } catch (err) {
        showToast(err.message, true);
    }
};

// Form submission: Create or Edit Culture
cultureForm.onsubmit = async (e) => {
    e.preventDefault();
    const isNew = cultureSelector.value === 'NEW';
    const cId = cultureIdInput.value;
    const cName = cultureNameInput.value;
    
    const payload = {
        id: cId,
        name: cName,
        min_hum_sol: minHumSol.value,
        max_hum_sol: maxHumSol.value,
        min_temp_air: minTempAir.value,
        max_temp_air: maxTempAir.value,
        min_hum_air: minHumAir.value,
        max_hum_air: maxHumAir.value,
        min_temp_sol: minTempSol.value,
        max_temp_sol: maxTempSol.value
    };

    try {
        let response;
        if (isNew) {
            response = await fetch('/api/cultures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(`/api/cultures/${cId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Erreur API');

        showToast(isNew ? `Culture "${cName}" créée avec succès !` : `Culture "${cName}" modifiée !`);
        if (isNew) {
            cultureForm.reset();
            cultureSelector.value = 'NEW';
            cultureIdInput.disabled = false;
            cultureSubmitBtn.textContent = 'Créer la Culture';
        }
        fetchData();
    } catch (err) {
        showToast(err.message, true);
    }
};

// On load
window.onload = fetchData;
