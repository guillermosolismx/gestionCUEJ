document.addEventListener('DOMContentLoaded', function() {
    const schedulePlusContainer = document.getElementById('schedulePlusConfig');

    const schedulePlusHTML = `
        <div class="schedule-plus-container">
            <div class="schedule-plus-header">
                <h2>Maestría en Sistema Acusatorio y Juicios Penales Orales</h2>
            </div>
            <form class="schedule-plus-form">
                <div class="form-group">
                    <label for="schedulePlusGrade">Seleccione Grado</label>
                    <select id="schedulePlusGrade">
                        <option value="">Seleccione un grado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="schedulePlusCycle">Seleccione Ciclo</label>
                    <select id="schedulePlusCycle">
                        <option value="">Seleccione un ciclo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="schedulePlusWeekdays">Seleccione Días de la Semana</label>
                    <div class="weekdays-selector" id="schedulePlusWeekdays">
                        <!-- Se llenará dinámicamente con JS -->
                    </div>
                </div>
            </form>
            <table class="schedule-plus-table">
                <thead>
                    <tr>
                        <th>Materia</th>
                        <th>Hora Inicio - Fin</th>
                        <th>Profesor</th>
                        <th>Fechas</th>
                    </tr>
                </thead>
                <tbody id="schedulePlusTableBody" class="sortable">
                    <!-- Las filas se generarán dinámicamente -->
                </tbody>
            </table>
        </div>
    `;

    schedulePlusContainer.innerHTML = schedulePlusHTML;

    // Obtener los grados de la Maestría en Sistema Acusatorio y Juicios Penales Orales
    fetch('/data/careers.json')
        .then(response => response.json())
        .then(data => {
            const career = data.careers.find(c => c.name === 'Maestría en Sistema Acusatorio y Juicios Penales Orales');
            const grades = career.grades;

            const gradeSelect = document.getElementById('schedulePlusGrade');
            grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade.id;
                option.textContent = grade.name;
                gradeSelect.appendChild(option);
            });

            gradeSelect.addEventListener('change', function() {
                const selectedGrade = grades.find(grade => grade.id === gradeSelect.value);
                const subjects = selectedGrade ? selectedGrade.subjects.map(subject => subject.name) : [];

                const tableBody = document.getElementById('schedulePlusTableBody');
                tableBody.innerHTML = '';

                subjects.forEach(subject => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${subject}</td>
                        <td>
                            <select class="time-select">
                                <option value="08:00">08:00</option>
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="13:00">13:00</option>
                                <option value="14:00">14:00</option>
                                <option value="15:00">15:00</option>
                                <option value="16:00">16:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>
                                <option value="20:00">20:00</option>
                                <option value="21:00">21:00</option>
                            </select>
                            <select class="time-select">
                                <option value="08:00">08:00</option>
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="13:00">13:00</option>
                                <option value="14:00">14:00</option>
                                <option value="15:00">15:00</option>
                                <option value="16:00">16:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>
                                <option value="20:00">20:00</option>
                                <option value="21:00">21:00</option>
                            </select>
                        </td>
                        <td>
                            <select class="professor-select">
                                <option value="">Seleccione un docente:</option>
                                <!-- Los profesores se llenarán dinámicamente -->
                            </select>
                        </td>
                        <td>
                            <div class="dates-container">
                                <input type="text" class="datepicker">
                                <button type="button" class="btn btn-delete" onclick="removeDate(this)">Eliminar</button>
                            </div>
                            <button type="button" class="btn btn-add-date" onclick="addDate(this)">Agregar Fecha</button>
                        </td>
                    `;

                    tableBody.appendChild(row);
                });

                // Inicializar datepickers
                $('.datepicker').datepicker({
                    dateFormat: 'yy-mm-dd'
                });

                // Inicializar sortable
                initializeSortable();

                // Llenar los profesores
                fillProfessors();
            });

            // Inicializar sortable
            initializeSortable();
        })
        .catch(error => console.error('Error al cargar los datos de carreras:', error));

    // Obtener los ciclos desde schedules.js
    const cycles = window.scheduleManager.cycles;
    const cycleSelect = document.getElementById('schedulePlusCycle');
    cycles.forEach(cycle => {
        const option = document.createElement('option');
        option.value = cycle.id;
        option.textContent = cycle.name;
        cycleSelect.appendChild(option);
    });

    // Llenar los días de la semana
    const weekdaysContainer = document.getElementById('schedulePlusWeekdays');
    if (weekdaysContainer) {
        weekdaysContainer.innerHTML = window.scheduleManager.weekDays.map(day => `
            <div class="weekday-item">
                <input type="checkbox" id="day-${day.id}" value="${day.id}">
                <label for="day-${day.id}">${day.name}</label>
            </div>
        `).join('');
    }

    // Inicializar sortable
    function initializeSortable() {
        $('.sortable').sortable({
            placeholder: "sortable-placeholder",
            update: function(event, ui) {
                // Actualizar el orden de las materias después de reorganizar
                const sortedIDs = $(this).sortable("toArray", { attribute: "data-subject-id" });
                console.log("Nuevo orden de materias:", sortedIDs);
            }
        });
    }

    // Llenar los profesores desde teachers.json
    function fillProfessors() {
        fetch('/data/teachers.json')
            .then(response => response.json())
            .then(data => {
                const professors = data.teachers;
                const professorSelects = document.querySelectorAll('.professor-select');
                professorSelects.forEach(select => {
                    select.innerHTML = '<option value="">Seleccione un docente:</option>' + professors.map(prof => `<option value="${prof.id}">${prof.name}</option>`).join('');
                });
            })
            .catch(error => console.error('Error al cargar los datos de profesores:', error));
    }

    // Función para agregar una nueva fecha
    window.addDate = function(button) {
        const datesContainer = button.previousElementSibling;
        const newDateContainer = document.createElement('div');
        newDateContainer.className = 'dates-container';
        newDateContainer.innerHTML = `
            <input type="text" class="datepicker">
            <button type="button" class="btn btn-delete" onclick="removeDate(this)">Eliminar</button>
        `;
        datesContainer.appendChild(newDateContainer);

        // Inicializar el nuevo datepicker
        $(newDateContainer.querySelector('.datepicker')).datepicker({
            dateFormat: 'yy-mm-dd'
        });
    };

    // Función para eliminar una fecha
    window.removeDate = function(button) {
        const dateContainer = button.parentElement;
        dateContainer.remove();
    };

    // Función para exportar los datos de SchedulePlus
    window.exportSchedulePlusData = function() {
        const schedulePlusData = {
            id: generateUUID(),
            careerId: '',
            gradeId: '',
            cycleId: '',
            careerName: 'Maestría en Sistema Acusatorio y Juicios Penales Orales',
            gradeName: '',
            cycleName: '',
            selectedDays: [],
            nonWorkingDays: [],
            modules: [],
            createdAt: new Date().toISOString()
        };

        // Obtener los grados seleccionados
        const gradeSelect = document.getElementById('schedulePlusGrade');
        const selectedGrade = gradeSelect.options[gradeSelect.selectedIndex];
        schedulePlusData.gradeId = selectedGrade.value;
        schedulePlusData.gradeName = selectedGrade.text;

        // Obtener los ciclos seleccionados
        const cycleSelect = document.getElementById('schedulePlusCycle');
        const selectedCycle = cycleSelect.options[cycleSelect.selectedIndex];
        schedulePlusData.cycleId = selectedCycle.value;
        schedulePlusData.cycleName = selectedCycle.text;

        // Obtener los días de la semana seleccionados
        const weekdaysContainer = document.getElementById('schedulePlusWeekdays');
        const selectedWeekdays = Array.from(weekdaysContainer.querySelectorAll('input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
        schedulePlusData.selectedDays.push(...selectedWeekdays);

        // Obtener las materias y sus detalles
        const tableBody = document.getElementById('schedulePlusTableBody');
        const rows = tableBody.querySelectorAll('tr');
        const subjects = [];
        rows.forEach(row => {
            const subject = {
                id: generateUUID(),
                name: row.cells[0].textContent,
                startTime: row.cells[1].querySelectorAll('select')[0].value,
                endTime: row.cells[1].querySelectorAll('select')[1].value,
                teacherId: row.cells[2].querySelector('select').value,
                hoursCount: calculateHours(row.cells[1].querySelectorAll('select')[0].value, row.cells[1].querySelectorAll('select')[1].value)
            };
            subjects.push(subject);
        });

        // Crear 3 módulos con las materias
        for (let i = 0; i < 3; i++) {
            const module = {
                id: generateUUID(),
                startDate: '',
                endDate: '',
                subjects: subjects,
                timeSlots: [],
                dayCount: selectedWeekdays.length
            };
            schedulePlusData.modules.push(module);
        }

        // Exportar los datos a pruebas.json
        fetch('/data/pruebas.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(schedulePlusData)
        })
        .then(response => {
            if (response.ok) {
                alert('Datos guardados exitosamente en pruebas.json');
            } else {
                alert('Error al guardar los datos');
            }
        })
        .catch(error => {
            console.error('Error al guardar los datos:', error);
            alert('Error al guardar los datos');
        });
    };

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function calculateHours(startTime, endTime) {
        const start = moment(startTime, 'HH:mm');
        const end = moment(endTime, 'HH:mm');
        return end.diff(start, 'hours');
    }
});
