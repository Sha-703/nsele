let greenhouses = [];
const ghSelect = document.getElementById('greenhouse-select');
const cultSelect = document.getElementById('culture-select');
const settingsForm = document.getElementById('settings-form');
const successMessage = document.getElementById('success-message');

// Fetch greenhouses list on load
async function fetchGreenhouses() {
    try {
        const response = await fetch('/api/greenhouses');
        if (!response.ok) throw new Error('API Error');
        greenhouses = await response.json();
        renderGreenhouses();
    } catch (error) {
        console.error("Erreur de récupération des serres:", error);
    }
}

// Render options in select dropdown
function renderGreenhouses() {
    ghSelect.innerHTML = '';
    greenhouses.forEach(gh => {
        const option = document.createElement('option');
        option.value = gh.id;
        option.textContent = `${gh.name} (Actuel: ${gh.culture})`;
        ghSelect.appendChild(option);
    });
}

// Form Submit Handler
settingsForm.onsubmit = async (event) => {
    event.preventDefault();
    const selectedId = ghSelect.value;
    const newCulture = cultSelect.value;

    try {
        const response = await fetch(`/api/greenhouses/${selectedId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ culture: newCulture })
        });

        if (!response.ok) throw new Error('Update Error');
        const result = await response.json();

        if (result.status === 'updated') {
            successMessage.textContent = `Culture mise à jour pour la serre ${selectedId} !`;
            successMessage.style.display = 'block';
            
            setTimeout(() => {
                successMessage.style.display = 'none';
                window.location.href = '/'; // Rediriger vers le dashboard
            }, 1500);
        }
    } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        successMessage.textContent = "Erreur de mise à jour. Réessayez.";
        successMessage.style.color = "#b91c1c";
        successMessage.style.display = 'block';
    }
};

window.onload = fetchGreenhouses;
