function addNewModule(isEdit = false) {
    const modulesList = isEdit ? document.getElementById('editModulesList') : document.getElementById('modulesList');
    const moduleId = Date.now().toString();
    const moduleIndex = modulesList.children.length + 1;
    
    const moduleElement = createModuleElement(moduleId, moduleIndex, isEdit);
    modulesList.appendChild(moduleElement);
    initializeDateRangePicker(moduleId, isEdit);
}

function createModuleElement(moduleId, moduleIndex, isEdit) {
    const element = document.createElement('div');
    element.className = 'module-item';
    element.id = `${isEdit ? 'edit-' : ''}module-${moduleId}`;
    element.setAttribute('data-index', moduleIndex);
    element.innerHTML = `
        <div class="module-header">
            <h4>Módulo ${moduleIndex}</h4>
            <button type="button" class="btn btn-delete" onclick="removeModule('${moduleId}', ${isEdit})">Eliminar</button>
        </div>
        <div class="module-dates">
            <input type="text" class="module-date-range" id="${isEdit ? 'edit-' : ''}date-range-${moduleId}" placeholder="Seleccione el rango de fechas">
        </div>
    `;
    return element;
}

function initializeDateRangePicker(moduleId, isEdit) {
    $(`#${isEdit ? 'edit-' : ''}date-range-${moduleId}`).daterangepicker({
        locale: {
            format: 'YYYY-MM-DD',
            separator: ' - ',
            applyLabel: 'Aplicar',
            cancelLabel: 'Cancelar',
            fromLabel: 'Desde',
            toLabel: 'Hasta',
            weekLabel: 'S',
            customRangeLabel: 'Rango Personalizado',
            daysOfWeek: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
            monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        },
        autoUpdateInput: true,
        showDropdowns: true,
        minYear: 2025,
        maxYear: 2026,
        startDate: moment(),
        endDate: moment().add(7, 'days'),
        opens: 'right',
        drops: 'down'
    });
}

function removeModule(moduleId, isEdit = false) {
    const module = document.getElementById(`${isEdit ? 'edit-' : ''}module-${moduleId}`);
    if (module) {
        module.remove();
    }
}
