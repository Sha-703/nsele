// Elements
const ghDetailTitle = document.getElementById('gh-detail-title');
const infoId = document.getElementById('info-id');
const infoName = document.getElementById('info-name');
const infoCulture = document.getElementById('info-culture');
const infoStatus = document.getElementById('info-status');

const thresholdTempAir = document.getElementById('threshold-temp-air');
const thresholdHumSol = document.getElementById('threshold-hum-sol');
const thresholdHumAir = document.getElementById('threshold-hum-air');

const deleteBtn = document.getElementById('delete-gh-btn');
const toast = document.getElementById('toast-message');

// Compartments Elements
const compartmentsList = document.getElementById('compartments-list');
const addCompForm = document.getElementById('add-compartment-form');
const compIdInput = document.getElementById('comp-id-input');

function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.background = isError ? '#b91c1c' : '#065f46';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Fetch details on load
async function fetchGreenhouseDetail() {
    try {
        // Fetch greenhouse details
        const ghResponse = await fetch(`/api/greenhouses/${CURRENT_GH_ID}`);
        if (!ghResponse.ok) throw new Error("Serre introuvable");
        const gh = await ghResponse.json();

        // Fetch cultures list to find threshold details
        const cultResponse = await fetch('/api/cultures');
        const cultures = await cultResponse.json();
        const cult = cultures.find(c => c.id === gh.culture_id || c.name === gh.culture);

        // Populate Greenhouse Info
        ghDetailTitle.textContent = `Détails de la Serre : ${gh.name}`;
        infoId.textContent = gh.id;
        infoName.textContent = gh.name;
        infoCulture.textContent = gh.culture;
        infoStatus.textContent = gh.status;
        infoStatus.style.color = gh.status === 'OK' ? '#059669' : '#d97706';

        // Populate Thresholds
        if (cult) {
            thresholdTempAir.textContent = `${cult.min_temp_air}°C à ${cult.max_temp_air}°C`;
            thresholdHumSol.textContent = `${cult.min_hum_sol}% à ${cult.max_hum_sol}%`;
            thresholdHumAir.textContent = `${cult.min_hum_air}% à ${cult.max_hum_air}%`;
        } else {
            thresholdTempAir.textContent = "Non configuré";
            thresholdHumSol.textContent = "Non configuré";
            thresholdHumAir.textContent = "Non configuré";
        }

        // Render Compartments List
        renderCompartmentsList(gh.compartments || []);
    } catch (err) {
        console.error(err);
        showToast("Erreur lors de la récupération des détails de la serre", true);
    }
}

// Render Compartments in Detail view
function renderCompartmentsList(comps) {
    compartmentsList.innerHTML = '';
    if (comps.length === 0) {
        compartmentsList.innerHTML = '<li style="color: #64748b; font-style: italic; padding: 12px 0;">Aucun compartiment configuré.</li>';
        return;
    }

    comps.forEach(compId => {
        const li = document.createElement('li');
        li.className = 'comp-item';
        li.innerHTML = `
            <span><strong>${compId}</strong></span>
            <button class="btn-delete-comp" onclick="deleteCompartment('${compId}')">Supprimer</button>
        `;
        compartmentsList.appendChild(li);
    });
}

// Action: Add Compartment
addCompForm.onsubmit = async (e) => {
    e.preventDefault();
    const compId = compIdInput.value.trim().toUpperCase();
    if (!compId) return;

    try {
        const response = await fetch(`/api/greenhouses/${CURRENT_GH_ID}/compartments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: compId })
        });
        const resData = await response.json();
        
        if (!response.ok) throw new Error(resData.error || "Erreur lors de l'ajout");

        showToast(`Compartiment "${compId}" ajouté !`, false);
        compIdInput.value = '';
        fetchGreenhouseDetail();
    } catch (err) {
        showToast(err.message, true);
    }
};

// Action: Delete Compartment
async function deleteCompartment(compId) {
    const confirmed = confirm(`Supprimer le compartiment "${compId}" ?`);
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/greenhouses/${CURRENT_GH_ID}/compartments/${compId}`, {
            method: 'DELETE'
        });
        const resData = await response.json();

        if (!response.ok) throw new Error(resData.error || "Erreur lors de la suppression");

        showToast(`Compartiment "${compId}" supprimé !`, false);
        fetchGreenhouseDetail();
    } catch (err) {
        showToast(err.message, true);
    }
}
window.deleteCompartment = deleteCompartment;

// Click handler: Delete Greenhouse
deleteBtn.onclick = async () => {
    const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer la serre "${CURRENT_GH_ID}" ? Cette action est irréversible.`);
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/greenhouses/${CURRENT_GH_ID}`, {
            method: 'DELETE'
        });
        const resData = await response.json();

        if (!response.ok) throw new Error(resData.error || "Erreur de suppression");

        showToast("Serre supprimée avec succès ! Redirection...", false);
        
        setTimeout(() => {
            window.location.href = '/settings';
        }, 1500);
    } catch (err) {
        showToast(err.message, true);
    }
};

// Start
window.onload = fetchGreenhouseDetail;
