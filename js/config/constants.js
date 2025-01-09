const WEEK_DAYS = [
    { id: '1', name: 'Lunes' },
    { id: '2', name: 'Martes' },
    { id: '3', name: 'Miércoles' },
    { id: '4', name: 'Jueves' },
    { id: '5', name: 'Viernes' },
    { id: '6', name: 'Sábado' },
    { id: '0', name: 'Domingo' }
];

const BASE_URL = 'http://localhost:3001'; // Asegúrate de que el puerto coincida

const API_ENDPOINTS = {
    teachers: `${BASE_URL}/data/teachers.json`,
    careers: `${BASE_URL}/data/careers.json`,
    schedules: `${BASE_URL}/data/schedules.json`,
    scheduleConfig: `${BASE_URL}/data/scheduleConfig.json`,
    assignments: `${BASE_URL}/data/assignments.json`
};

// Exportar las constantes para uso global
window.WEEK_DAYS = WEEK_DAYS;
window.API_ENDPOINTS = API_ENDPOINTS;

// Cargar las constantes al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Constantes cargadas:', { WEEK_DAYS, API_ENDPOINTS });
});
