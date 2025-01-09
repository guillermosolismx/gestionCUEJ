async function fetchData(endpoint) {
    try {
        const response = await fetch(`/data/${endpoint}`);
        if (!response.ok) {
            if (response.status === 404) {
                return endpoint === 'schedules.json' ? { schedules: [] } : {};
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return endpoint === 'schedules.json' ? { schedules: [] } : {};
    }
}

async function saveData(endpoint, data) {
    try {
        const response = await fetch(`/data/${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar los datos');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error saving ${endpoint}:`, error);
        showNotification(`Error al guardar los datos: ${error.message}`, 'error');
        throw error;
    }
}

// Cargar datos al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('API functions loaded');
});
