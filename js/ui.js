function showSection(sectionId) {
    // Remover clase active de todos los botones
    document.querySelectorAll('.sidebar button').forEach(button => {
        button.classList.remove('active');
        // Obtener el ID de sección del onclick del botón
        const buttonSectionId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (buttonSectionId === sectionId) {
            button.classList.add('active');
        }
    });

    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar la sección seleccionada
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
}

function renderTimeTable(module, weekDays, timeSlots) {
    let table = '<table class="schedule-table"><thead><tr><th>Hora</th>';
    weekDays.forEach(day => {
        table += `<th>${day.name}</th>`;
    });
    table += '</tr></thead><tbody>';
    
    timeSlots.forEach(slot => {
        table += `<tr><td>${slot.start} - ${slot.end}</td>`;
        weekDays.forEach(day => {
            const isSelected = module.timeSlots.some(ts => 
                ts.dayId === day.id && ts.slotId === slot.id
            );
            table += `<td class="schedule-cell${isSelected ? ' selected' : ''}" 
                         data-day="${day.id}" 
                         data-slot="${slot.id}"
                         onclick="toggleTimeSlot(this)"></td>`;
        });
        table += '</tr>';
    });
    
    table += '</tbody></table>';
    return table;
}

function toggleTimeSlot(cell) {
    cell.classList.toggle('selected');
}

// Cargar la sección inicial al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    showSection('teachers'); // Cambia 'teachers' por la sección que desees mostrar inicialmente
});
