class ScheduleManager {
    constructor() {
        this.schedules = [];
        this.weekDays = WEEK_DAYS;  // Usar constante global
        this.initialized = false;
        this.cycles = this.generateCycles();
    }

    generateCycles(startYear = new Date().getFullYear(), endYear = startYear + 2) {
        const cycles = [];
        for (let year = startYear; year <= endYear; year++) {
            for (let period = 1; period <= 3; period++) {
                cycles.push({
                    id: `${year}-${period}`,
                    name: `${year}-${period}`,  // Formato cambiado a "año-ciclo"
                    year: year,
                    period: period
                });
            }
        }
        return cycles;
    }

    async loadScheduleData() {
        console.log('Iniciando carga de datos de horarios');
        try {
            const response = await fetch('http://localhost:3001/data/scheduleConfig.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Datos de configuración cargados:', data);
            
            this.weekDays = data.weekDays || WEEK_DAYS; // Usar WEEK_DAYS como fallback
            this.initialized = true;
            
            await this.renderScheduleConfig();
            console.log('Configuración de horarios renderizada');
            
        } catch (error) {
            console.error('Error loading schedule data:', error);
            showNotification('Error al cargar los datos de horarios', 'error');
        }
    }

    async renderScheduleConfig() {
        console.log('Renderizando configuración de horarios');
        const scheduleConfig = document.getElementById('scheduleConfig');
        if (!scheduleConfig) {
            console.error('No se encontró el elemento scheduleConfig');
            return;
        }

        // Botón para crear nuevo horario
        const createButton = document.createElement('button');
        createButton.className = 'btn';
        createButton.textContent = 'Crear Nuevo Horario';
        createButton.onclick = () => this.showCreateScheduleModal();

        // Contenedor para la lista de horarios
        const schedulesList = document.createElement('div');
        schedulesList.id = 'schedulesList';
        schedulesList.className = 'schedules-list';

        // Limpiar y agregar elementos
        scheduleConfig.innerHTML = '';
        scheduleConfig.appendChild(createButton);
        scheduleConfig.appendChild(schedulesList);

        // Cargar horarios existentes
        await this.loadSchedules();
    }

    async loadSchedules() {
        try {
            const response = await fetch('http://localhost:3001/data/schedules.json');
            const data = await response.json();
            this.schedules = data.schedules || [];
            this.renderSchedulesList();
        } catch (error) {
            console.error('Error loading schedules:', error);
            showNotification('Error al cargar los horarios', 'error');
        }
    }

    async renderSchedulesList() {
        const schedulesList = document.getElementById('schedulesList');
        if (!schedulesList) return;

        schedulesList.innerHTML = this.schedules.map(schedule => `
            <div class="schedule-item collapsed"> <!-- Añadir clase 'collapsed' -->
                <div class="schedule-header">
                    <h3>
                        <span class="collapse-indicator">▶</span> <!-- Cambiar a '▶' -->
                        ${schedule.careerName} - ${schedule.gradeName} (${schedule.cycleName})
                    </h3>
                    <div class="button-group">
                        <button class="btn btn-edit" onclick="scheduleManager.editSchedule('${schedule.id}')">
                            Editar
                        </button>
                        <button class="btn btn-delete" onclick="scheduleManager.deleteSchedule('${schedule.id}')">
                            Eliminar
                        </button>
                        <button class="btn btn-print" onclick="scheduleManager.printSchedulePDF('${schedule.id}')">
                            PrintPDF
                        </button>
                    </div>
                </div>
                <div class="modules-container">
                    ${this.renderModules(schedule.modules)}
                </div>
            </div>
        `).join('');

        // Agregar eventos para colapsar/expandir
        this.addCollapseListeners();
    }

    async printSchedulePDF(scheduleId) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (!schedule) {
            console.error('Horario no encontrado');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yOffset = 20;

        // Agregar imagen de banner
        const bannerImage = new Image();
        bannerImage.src = 'data/images/banner_schedules.png';
        bannerImage.onload = () => {
            doc.addImage(bannerImage, 'PNG', 10, 10, 190, 30);
            yOffset += 40; // Ajustar el desplazamiento vertical después de la imagen

            // Colores y estilos
            const primaryColor = '#1c1e52';
            const secondaryColor = '#f3af1d';
            const textColor = '#000000'; // Cambiar a negro para mejor visibilidad
            const highlightColor = '#1c1e52'; // Azul oscuro para resaltado
            const highlightTextColor = '#feffff'; // Blanco para texto resaltado
            const lineHeight = 10;

            // Título del horario
            doc.setFontSize(18);
            doc.setTextColor(primaryColor);
            let title = `Horario: ${schedule.careerName} - ${schedule.gradeName} (${schedule.cycleName})`;
            let titleWidth = doc.getTextWidth(title);
            while (titleWidth > 190) {
                doc.setFontSize(doc.getFontSize() - 1);
                titleWidth = doc.getTextWidth(title);
            }
            doc.text(title, 10, yOffset);
            yOffset += lineHeight * 2;

            // Iterar sobre los módulos
            schedule.modules.forEach((module, index) => {
                doc.setFontSize(16);
                doc.setTextColor(secondaryColor);
                doc.text(`Módulo ${index + 1}: ${moment(module.startDate).format('DD-MM-YYYY')} - ${moment(module.endDate).format('DD-MM-YYYY')}`, 10, yOffset);
                yOffset += lineHeight;

                module.subjects.forEach((subject, subIndex) => {
                    // Resaltar la materia
                    doc.setFillColor(highlightColor);
                    doc.rect(10, yOffset - 8, 190, 10, 'F');
                    doc.setFontSize(14);
                    doc.setTextColor(highlightTextColor);
                    doc.text(`  ${subject.name}`, 10, yOffset);
                    yOffset += lineHeight / 2;
                    doc.setFontSize(12);
                    doc.setTextColor(textColor);
                    doc.text(`  Horario: ${subject.startTime} - ${subject.endTime}`, 10, yOffset + 1); // Mover 1px más abajo
                    yOffset += lineHeight / 2;
                    doc.text(`  Docente: ${window.teacherManager.teachers.find(t => t.id === subject.teacherId)?.name || 'N/A'}`, 10, yOffset + 1); // Mover 1px más abajo
                    yOffset += lineHeight;
                });

                yOffset += lineHeight; // Añadir espacio entre módulos
            });

            // Agregar días no laborales
            if (schedule.nonWorkingDays && schedule.nonWorkingDays.length > 0) {
                yOffset += lineHeight; // Añadir espacio antes de los días no laborales
                doc.setFontSize(16);
                doc.setTextColor(primaryColor);
                doc.text('Días No Laborales:', 10, yOffset);
                yOffset += lineHeight;

                schedule.nonWorkingDays.forEach(day => {
                    doc.setFontSize(12);
                    doc.setTextColor(textColor);
                    doc.text(`  - ${moment(day).format('DD-MM-YYYY')}`, 10, yOffset);
                    yOffset += lineHeight / 2;
                });
            }

            // Agregar fecha y hora de impresión en el pie de página
            const printDate = new Date();
            const formattedPrintDate = `${printDate.getDate().toString().padStart(2, '0')}-${(printDate.getMonth() + 1).toString().padStart(2, '0')}-${printDate.getFullYear()} ${printDate.getHours().toString().padStart(2, '0')}:${printDate.getMinutes().toString().padStart(2, '0')}`;
            doc.setFontSize(10);
            doc.text(`Fecha de impresión: ${formattedPrintDate}`, 10, doc.internal.pageSize.height - 10);

            // Guardar el PDF
            doc.save(`${schedule.careerName}-${schedule.gradeName}-${schedule.cycleName}.pdf`);
        };
    }

    renderModules(modules) {
        return modules.map((module, index) => `
            <div class="module-item" data-index="${index + 1}">
                <div class="module-header">
                    <h4>Módulo ${index + 1}</h4>
                    <div>
                        ${module.startDate} - ${module.endDate}
                    </div>
                </div>
                <div class="module-content">
                    <div class="module-subjects-preview">
                        <h5>Materias:</h5>
                        <ul>
                            ${module.subjects.map(subject => `
                                <li>
                                    <div>Horario: ${subject.startTime} - ${subject.endTime}</div>
                                    <div>Materia: ${subject.name}</div>
                                    <div>Profesor: ${window.teacherManager.teachers.find(t => t.id === subject.teacherId)?.name || 'N/A'}</div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ${this.renderTimeSlots(module.timeSlots)}
                </div>
            </div>
        `).join('');
    }

    renderTimeSlots(timeSlots) {
        return `
            <div class="time-slots">
                ${timeSlots.map(slot => `
                    <div class="time-slot">
                        ${slot.day}: ${slot.startTime} - ${slot.endTime}
                    </div>
                `).join('')}
            </div>
        `;
    }

    addCollapseListeners() {
        document.querySelectorAll('.schedule-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (!e.target.closest('.button-group')) {
                    const item = header.closest('.schedule-item');
                    item.classList.toggle('collapsed');
                    const indicator = header.querySelector('.collapse-indicator');
                    indicator.textContent = item.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
        });
    }

    showCreateScheduleModal() {
        console.log('Mostrando modal de creación de horario');
        const modal = document.getElementById('createScheduleModal');
        if (!modal) {
            console.error('No se encontró el modal de creación de horario');
            return;
        }

        // Llenar selectores
        const careerSelect = modal.querySelector('#scheduleCareer');
        const gradeSelect = modal.querySelector('#scheduleGrade');
        const cycleSelect = modal.querySelector('#scheduleCycle');
        
        if (careerSelect && gradeSelect && cycleSelect) {
            // Llenar carreras
            careerSelect.innerHTML = '<option value="">Seleccione una carrera</option>' +
                window.careerManager.careers.map(career => 
                    `<option value="${career.id}">${career.name}</option>`
                ).join('');

            // Llenar ciclos
            cycleSelect.innerHTML = '<option value="">Seleccione un ciclo</option>' +
                this.cycles.map(cycle => 
                    `<option value="${cycle.id}">${cycle.name}</option>`
                ).join('');

            // Evento change para actualizar grados cuando se selecciona una carrera
            careerSelect.onchange = () => {
                const selectedCareer = window.careerManager.careers.find(
                    career => career.id === careerSelect.value
                );

                if (selectedCareer && selectedCareer.grades) {
                    gradeSelect.innerHTML = '<option value="">Seleccione un grado</option>' +
                        selectedCareer.grades.map(grade => 
                            `<option value="${grade.id}">${grade.name}</option>`
                        ).join('');
                    gradeSelect.disabled = false;
                } else {
                    gradeSelect.innerHTML = '<option value="">Seleccione un grado</option>';
                    gradeSelect.disabled = true;
                }
            };

            // Inicializar el select de grados como deshabilitado
            gradeSelect.innerHTML = '<option value="">Seleccione un grado</option>';
            gradeSelect.disabled = true;
        }

        // Llenar los días de la semana
        const weekdaysContainer = modal.querySelector('.weekdays-selector');
        if (weekdaysContainer) {
            weekdaysContainer.innerHTML = this.weekDays.map(day => `
                <div class="weekday-item">
                    <input type="checkbox" id="day-${day.id}" value="${day.id}">
                    <label for="day-${day.id}">${day.name}</label>
                </div>
            `).join('');
        }

        // Agregar evento al botón Cancelar
        const cancelButton = modal.querySelector('[data-action="cancel"]');
        if (cancelButton) {
            cancelButton.onclick = () => this.closeCreateScheduleModal();
        }

        // Agregar evento al botón Agregar Módulo
        const addModuleButton = modal.querySelector('.btn-add-module');
        if (addModuleButton) {
            addModuleButton.onclick = () => this.addNewModule();
        }

        // Agregar evento al botón Crear
        const createButton = modal.querySelector('[data-action="confirm"]');
        if (createButton) {
            createButton.onclick = () => this.confirmCreateSchedule();
        }

        // Agregar evento al botón Agregar Día No Laboral
        const addNonWorkingDayButton = modal.querySelector('.btn-add-non-working-day');
        if (addNonWorkingDayButton) {
            addNonWorkingDayButton.onclick = () => this.addNonWorkingDay();
        }

        modal.style.display = 'flex';
    }

    addNonWorkingDay(isEdit = false) {
        const containerId = isEdit ? 'editNonWorkingDaysContainer' : 'nonWorkingDaysContainer';
        const nonWorkingDaysContainer = document.getElementById(containerId);
        if (!nonWorkingDaysContainer) return;

        const datePickerId = `non-working-day-${crypto.randomUUID()}`;
        const datePickerElement = document.createElement('div');
        datePickerElement.className = 'non-working-day-picker-container';
        datePickerElement.innerHTML = `
            <input type="text" id="${datePickerId}" class="non-working-day-picker" placeholder="Seleccione un día no laboral">
            <button type="button" class="btn btn-delete" onclick="scheduleManager.removeNonWorkingDay('${datePickerId}')">Eliminar</button>
        `;

        nonWorkingDaysContainer.appendChild(datePickerElement);

        // Inicializar el datepicker
        $(`#${datePickerId}`).daterangepicker({
            singleDatePicker: true,
            locale: {
                format: 'YYYY-MM-DD'
            }
        });
    }

    removeNonWorkingDay(datePickerId) {
        const datePickerElement = document.getElementById(datePickerId);
        if (datePickerElement) {
            datePickerElement.parentElement.remove();
        }
    }

    async addNewModule(isEdit = false) {
        const modulesList = document.getElementById(isEdit ? 'editModulesList' : 'modulesList');
        if (!modulesList) return;

        const moduleId = crypto.randomUUID();
        const moduleIndex = modulesList.children.length + 1;
        
        const moduleElement = document.createElement('div');
        moduleElement.className = 'module-item';
        moduleElement.id = `module-${moduleId}`;
        moduleElement.setAttribute('data-index', moduleIndex);
        moduleElement.innerHTML = `
            <div class="module-header">
                <h4>Módulo ${moduleIndex}</h4>
                <button class="btn btn-delete" onclick="scheduleManager.removeModule('${moduleId}')">Eliminar</button>
            </div>
            <div class="module-dates">
                <input type="text" class="module-date-range" id="date-range-${moduleId}" placeholder="Seleccione el rango de fechas">
            </div>
            <div class="module-subjects">
                <h4>Materias</h4>
                <ul id="subjects-list-${moduleId}" class="sortable-list"></ul>
                <button class="btn btn-add-subject" onclick="scheduleManager.addSubjectToModule('${moduleId}')">Agregar Materia</button>
            </div>
        `;
        
        modulesList.appendChild(moduleElement);

        // Inicializar el daterangepicker
        $(`#date-range-${moduleId}`).daterangepicker({
            locale: {
                format: 'YYYY-MM-DD'
            }
        });

        // Inicializar sortable
        this.initializeSortable(`#subjects-list-${moduleId}`);

        // Cargar materias dependientes de la carrera/grado
        await this.loadSubjectsForModule(moduleId, isEdit);
    }

    initializeSortable(selector) {
        $(selector).sortable({
            placeholder: "sortable-placeholder",
            update: function(event, ui) {
                // Actualizar el orden de las materias después de reorganizar
                const sortedIDs = $(this).sortable("toArray", { attribute: "data-subject-id" });
                console.log("Nuevo orden de materias:", sortedIDs);
            }
        });
    }

    async loadSubjectsForModule(moduleId, isEdit) {
        const careerSelect = document.getElementById(isEdit ? 'editScheduleCareer' : 'scheduleCareer');
        const gradeSelect = document.getElementById(isEdit ? 'editScheduleGrade' : 'scheduleGrade');
        const subjectsList = document.getElementById(`subjects-list-${moduleId}`);

        if (!careerSelect || !gradeSelect || !subjectsList) return;

        const selectedCareer = window.careerManager.careers.find(c => c.id === careerSelect.value);
        const selectedGrade = selectedCareer?.grades.find(g => g.id === gradeSelect.value);

        const timeOptions = `
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
        `;

        if (selectedGrade && selectedGrade.subjects) {
            subjectsList.innerHTML = selectedGrade.subjects.map(subject => `
                <li data-subject-id="${subject.id}">
                    <div>${subject.name}</div>
                    <div>
                        <label>Hora de inicio:</label>
                        <select class="subject-start-time">${timeOptions}</select>
                    </div>
                    <div>
                        <label>Hora de fin:</label>
                        <select class="subject-end-time">${timeOptions}</select>
                    </div>
                    <div>
                        <label>Profesor:</label>
                        <select class="subject-teacher">
                            <option value="">Seleccione un docente</option>
                            ${window.teacherManager.teachers.map(teacher => 
                                `<option value="${teacher.id}">${teacher.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <button class="btn-delete" onclick="scheduleManager.removeSubjectFromModule('${moduleId}', '${subject.id}')">Eliminar</button>
                </li>
            `).join('');
        }
    }

    removeSubjectFromModule(moduleId, subjectId) {
        const subjectsList = document.getElementById(`subjects-list-${moduleId}`);
        if (!subjectsList) return;

        const subjectItem = subjectsList.querySelector(`li[data-subject-id="${subjectId}"]`);
        if (subjectItem) {
            subjectItem.remove();
        }
    }

    removeModule(moduleId) {
        const module = document.getElementById(`module-${moduleId}`);
        if (module) {
            module.remove();
        }
    }

    closeCreateScheduleModal() {
        const modal = document.getElementById('createScheduleModal');
        const gradeSelect = document.getElementById('scheduleGrade');
        
        // Limpiar y resetear los selects
        document.getElementById('scheduleCareer').value = '';
        gradeSelect.value = '';
        gradeSelect.disabled = true;
        document.getElementById('scheduleCycle').value = '';
        
        // Limpiar módulos
        document.getElementById('modulesList').innerHTML = '';
        
        // Desmarcar checkboxes de días
        document.querySelectorAll('.weekday-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        modal.style.display = 'none';
    }

    async saveSchedule(scheduleData) {
        try {
            const response = await fetch('http://localhost:3001/data/schedules.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    schedules: [...this.schedules, scheduleData]
                })
            });

            if (!response.ok) {
                throw new Error('Error al guardar el horario');
            }

            this.schedules.push(scheduleData);
            await this.renderSchedulesList();
            return true;
        } catch (error) {
            console.error('Error saving schedule:', error);
            showNotification('Error al guardar el horario', 'error');
            throw error;
        }
    }

    createScheduleObject(formData, modules) {
        const selectedCareer = window.careerManager.careers.find(c => c.id === formData.careerId);
        const selectedGrade = selectedCareer?.grades.find(g => g.id === formData.gradeId); // Corregir variable `c` a `g`
        const selectedCycle = this.cycles.find(c => c.id === formData.cycleId);

        if (!selectedCareer || !selectedGrade || !selectedCycle) {
            throw new Error('Datos de carrera, grado o ciclo no válidos');
        }

        return {
            id: crypto.randomUUID(),
            careerId: formData.careerId,
            gradeId: formData.gradeId,
            cycleId: formData.cycleId,
            careerName: selectedCareer.name,
            gradeName: selectedGrade.name,
            cycleName: selectedCycle.name,
            selectedDays: formData.selectedDays,
            nonWorkingDays: formData.nonWorkingDays, // Añadir días no laborales
            modules: modules,
            createdAt: new Date().toISOString()
        };
    }

    async processModules() {
        const moduleElements = document.querySelectorAll('#modulesList .module-item');
        const modules = [];

        for (const moduleElement of moduleElements) {
            const dateRangeInput = moduleElement.querySelector('.module-date-range');
            if (!dateRangeInput || !dateRangeInput.value) {
                throw new Error('Fechas de módulo incompletas');
            }

            const picker = $(dateRangeInput).data('daterangepicker');
            if (!picker) {
                throw new Error('Error al obtener el selector de fechas');
            }

            const subjectsList = moduleElement.querySelector(`#subjects-list-${moduleElement.id.replace('module-', '')}`);
            const subjects = Array.from(subjectsList.querySelectorAll('li')).map(subjectItem => {
                const startTime = subjectItem.querySelector('.subject-start-time').value;
                const endTime = subjectItem.querySelector('.subject-end-time').value;
                const hoursCount = this.calculateHoursCount(startTime, endTime);
                const subjectName = subjectItem.querySelector('div').textContent.trim();

                return {
                    id: subjectItem.getAttribute('data-subject-id'),
                    name: subjectName, // Asegurarse de incluir el nombre de la materia
                    startTime: startTime,
                    endTime: endTime,
                    teacherId: subjectItem.querySelector('.subject-teacher').value,
                    hoursCount: hoursCount // Añadir el contador de horas
                };
            });

            const selectedDays = Array.from(document.querySelectorAll('.weekday-item input:checked')).map(input => input.value);
            const dayCount = this.calculateDayCount(picker.startDate, picker.endDate, selectedDays);

            modules.push({
                id: moduleElement.id.replace('module-', ''),
                startDate: picker.startDate.format('YYYY-MM-DD'),
                endDate: picker.endDate.format('YYYY-MM-DD'),
                subjects: subjects,
                timeSlots: [],
                dayCount: dayCount // Añadir el contador de días
            });
        }

        return modules;
    }

    calculateHoursCount(startTime, endTime) {
        const start = moment(startTime, 'HH:mm');
        const end = moment(endTime, 'HH:mm');
        return end.diff(start, 'hours', true); // Calcular la diferencia en horas
    }

    calculateDayCount(startDate, endDate, selectedDays) {
        let count = 0;
        const start = moment(startDate);
        const end = moment(endDate);

        while (start <= end) {
            if (selectedDays.includes(start.day().toString())) {
                count++;
            }
            start.add(1, 'days');
        }

        return count;
    }

    async confirmCreateSchedule() {
        try {
            const formData = {
                careerId: document.getElementById('scheduleCareer').value,
                gradeId: document.getElementById('scheduleGrade').value,
                cycleId: document.getElementById('scheduleCycle').value,
                selectedDays: Array.from(document.querySelectorAll('.weekday-item input:checked'))
                    .map(input => input.value),
                nonWorkingDays: Array.from(document.querySelectorAll('.non-working-day-picker'))
                    .map(input => input.value)
            };

            if (!formData.careerId || !formData.gradeId || !formData.cycleId || formData.selectedDays.length === 0) {
                throw new Error('Por favor complete todos los campos requeridos');
            }

            const moduleElements = document.querySelectorAll('#modulesList .module-item');
            if (moduleElements.length === 0) {
                throw new Error('Debe agregar al menos un módulo');
            }

            const modules = await this.processModules();  // Ahora usando this.processModules
            const newSchedule = this.createScheduleObject(formData, modules);
            
            await this.saveSchedule(newSchedule);
            this.closeCreateScheduleModal();
            showNotification('Horario creado exitosamente', 'success');
        } catch (error) {
            console.error('Error al crear horario:', error);
            showNotification(error.message, 'error');
        }
    }

    async editSchedule(scheduleId) {
        try {
            // Buscar el horario a editar
            const schedule = this.schedules.find(s => s.id === scheduleId);
            if (!schedule) {
                throw new Error('Horario no encontrado');
            }

            const modal = document.getElementById('editScheduleModal');
            if (!modal) return;

            // Llenar los selectores con los datos existentes
            const careerSelect = document.getElementById('editScheduleCareer');
            const gradeSelect = document.getElementById('editScheduleGrade');
            const cycleSelect = document.getElementById('editScheduleCycle');

            // Llenar carreras
            careerSelect.innerHTML = '<option value="">Seleccione una carrera</option>' +
                window.careerManager.careers.map(career => 
                    `<option value="${career.id}" ${career.id === schedule.careerId ? 'selected' : ''}>
                        ${career.name}
                    </option>`
                ).join('');

            // Llenar grados de la carrera seleccionada
            const selectedCareer = window.careerManager.careers.find(c => c.id === schedule.careerId);
            if (selectedCareer && selectedCareer.grades) {
                gradeSelect.innerHTML = '<option value="">Seleccione un grado</option>' +
                    selectedCareer.grades.map(grade => 
                        `<option value="${grade.id}" ${grade.id === schedule.gradeId ? 'selected' : ''}>
                            ${grade.name}
                        </option>`
                    ).join('');
                gradeSelect.disabled = false;
            }

            // Llenar ciclos
            cycleSelect.innerHTML = '<option value="">Seleccione un ciclo</option>' +
                this.cycles.map(cycle => 
                    `<option value="${cycle.id}" ${cycle.id === schedule.cycleId ? 'selected' : ''}>
                        ${cycle.name}
                    </option>`
                ).join('');

            // Marcar los días seleccionados
            const weekdaysSelector = document.getElementById('editWeekdaysSelector');
            weekdaysSelector.innerHTML = this.weekDays.map(day => `
                <div class="weekday-item">
                    <input type="checkbox" 
                           id="edit-day-${day.id}" 
                           value="${day.id}"
                           ${schedule.selectedDays.includes(day.id) ? 'checked' : ''}>
                    <label for="edit-day-${day.id}">${day.name}</label>
                </div>
            `).join('');

            // Llenar módulos existentes
            const modulesList = document.getElementById('editModulesList');
            modulesList.innerHTML = '';
            const timeOptions = `
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
            `;
            schedule.modules.forEach((module, index) => {
                const moduleElement = document.createElement('div');
                moduleElement.className = 'module-item';
                moduleElement.id = `module-${module.id}`;
                moduleElement.setAttribute('data-index', index + 1);
                moduleElement.innerHTML = `
                    <div class="module-header">
                        <h4>Módulo ${index + 1}</h4>
                        <button class="btn btn-delete" onclick="scheduleManager.removeModule('${module.id}')">
                            Eliminar
                        </button>
                    </div>
                    <div class="module-dates">
                        <input type="text" class="module-date-range" id="date-range-${module.id}" 
                               value="${module.startDate} - ${module.endDate}">
                    </div>
                    <div class="module-subjects">
                        <h4>Materias</h4>
                        <ul id="subjects-list-${module.id}">
                            ${(module.subjects || []).map(subject => `
                                <li data-subject-id="${subject.id}">
                                    <div>${subject.name}</div>
                                    <div>
                                        <label>Hora de inicio:</label>
                                        <select class="subject-start-time">${timeOptions}</select>
                                    </div>
                                    <div>
                                        <label>Hora de fin:</label>
                                        <select class="subject-end-time">${timeOptions}</select>
                                    </div>
                                    <div>
                                        <label>Profesor:</label>
                                        <select class="subject-teacher">
                                            <option value="">Seleccione un docente</option>
                                            ${window.teacherManager.teachers.map(teacher => 
                                                `<option value="${teacher.id}" ${teacher.id === subject.teacherId ? 'selected' : ''}>
                                                    ${teacher.name}
                                                </option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <button class="btn-delete" onclick="scheduleManager.removeSubjectFromModule('${module.id}', '${subject.id}')">Eliminar</button>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
                modulesList.appendChild(moduleElement);

                // Inicializar daterangepicker para este módulo
                $(`#date-range-${module.id}`).daterangepicker({
                    startDate: module.startDate,
                    endDate: module.endDate,
                    locale: {
                        format: 'YYYY-MM-DD'
                    }
                });

                // Establecer los valores de hora de inicio y fin
                module.subjects.forEach(subject => {
                    const subjectElement = document.querySelector(`li[data-subject-id="${subject.id}"]`);
                    if (subjectElement) {
                        subjectElement.querySelector('.subject-start-time').value = subject.startTime;
                        subjectElement.querySelector('.subject-end-time').value = subject.endTime;
                    }
                });
            });

            // Guardar el ID del horario que se está editando
            modal.setAttribute('data-schedule-id', scheduleId);

            // Llenar los días no laborales
            const nonWorkingDaysContainer = document.getElementById('editNonWorkingDaysContainer');
            nonWorkingDaysContainer.innerHTML = '';
            schedule.nonWorkingDays.forEach(day => {
                const datePickerId = `non-working-day-${crypto.randomUUID()}`;
                const datePickerElement = document.createElement('div');
                datePickerElement.className = 'non-working-day-picker-container';
                datePickerElement.innerHTML = `
                    <input type="text" id="${datePickerId}" class="non-working-day-picker" value="${day}">
                    <button type="button" class="btn btn-delete" onclick="scheduleManager.removeNonWorkingDay('${datePickerId}')">Eliminar</button>
                `;
                nonWorkingDaysContainer.appendChild(datePickerElement);
                $(`#${datePickerId}`).daterangepicker({
                    singleDatePicker: true,
                    locale: {
                        format: 'YYYY-MM-DD'
                    }
                });
            });

            // Mostrar el modal
            modal.style.display = 'flex';

        } catch (error) {
            console.error('Error al editar horario:', error);
            showNotification(error.message, 'error');
        }
    }

    async saveScheduleEdit() {
        try {
            const modal = document.getElementById('editScheduleModal');
            const scheduleId = modal.getAttribute('data-schedule-id');
            
            const formData = {
                careerId: document.getElementById('editScheduleCareer').value,
                gradeId: document.getElementById('editScheduleGrade').value,
                cycleId: document.getElementById('editScheduleCycle').value,
                selectedDays: Array.from(document.querySelectorAll('#editWeekdaysSelector input:checked'))
                    .map(input => input.value)
            };

            if (!formData.careerId || !formData.gradeId || !formData.cycleId || formData.selectedDays.length === 0) {
                throw new Error('Por favor complete todos los campos requeridos');
            }

            // Procesar módulos
            const moduleElements = document.querySelectorAll('#editModulesList .module-item');
            const modules = [];

            for (const moduleElement of moduleElements) {
                const moduleId = moduleElement.id.replace('module-', '');
                const dateRangeInput = moduleElement.querySelector('.module-date-range');
                const picker = $(dateRangeInput).data('daterangepicker');

                const subjectsList = moduleElement.querySelector(`#subjects-list-${moduleId}`);
                const subjects = Array.from(subjectsList.querySelectorAll('li')).map(subjectItem => {
                    const startTime = subjectItem.querySelector('.subject-start-time').value;
                    const endTime = subjectItem.querySelector('.subject-end-time').value;
                    const hoursCount = this.calculateHoursCount(startTime, endTime);
                    const subjectName = subjectItem.querySelector('div').textContent.trim();

                    return {
                        id: subjectItem.getAttribute('data-subject-id'),
                        name: subjectName,
                        startTime: startTime,
                        endTime: endTime,
                        teacherId: subjectItem.querySelector('.subject-teacher').value,
                        hoursCount: hoursCount
                    };
                });

                modules.push({
                    id: moduleId,
                    startDate: picker.startDate.format('YYYY-MM-DD'),
                    endDate: picker.endDate.format('YYYY-MM-DD'),
                    subjects: subjects,
                    timeSlots: []
                });
            }

            // Obtener los días no laborales
            const nonWorkingDays = Array.from(document.querySelectorAll('#editNonWorkingDaysContainer .non-working-day')).map(input => input.value);

            // Actualizar el horario
            const updatedSchedule = {
                ...this.schedules.find(s => s.id === scheduleId),
                ...formData,
                modules: modules,
                nonWorkingDays: nonWorkingDays
            };

            // Actualizar nombres basados en las selecciones
            const selectedCareer = window.careerManager.careers.find(c => c.id === formData.careerId);
            const selectedGrade = selectedCareer?.grades.find(g => g.id === formData.gradeId);
            const selectedCycle = this.cycles.find(c => c.id === formData.cycleId);

            updatedSchedule.careerName = selectedCareer?.name || '';
            updatedSchedule.gradeName = selectedGrade?.name || '';
            updatedSchedule.cycleName = selectedCycle?.name || '';

            // Actualizar en el array local
            const index = this.schedules.findIndex(s => s.id === scheduleId);
            if (index !== -1) {
                this.schedules[index] = updatedSchedule;
            }

            // Guardar en el servidor
            await fetch('http://localhost:3001/data/schedules.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ schedules: this.schedules })
            });

            // Actualizar la vista
            this.renderSchedulesList();
            this.closeEditScheduleModal();
            showNotification('Horario actualizado exitosamente', 'success');

        } catch (error) {
            console.error('Error al guardar cambios:', error);
            showNotification(error.message, 'error');
        }
    }

    closeEditScheduleModal() {
        const modal = document.getElementById('editScheduleModal');
        modal.style.display = 'none';
        modal.removeAttribute('data-schedule-id');
        // Limpiar módulos
        document.getElementById('editModulesList').innerHTML = '';
    }

    async deleteSchedule(scheduleId) {
        try {
            this.schedules = this.schedules.filter(schedule => schedule.id !== scheduleId);
            await this.saveSchedules();
            this.renderSchedulesList();
            showNotification('Horario eliminado exitosamente', 'success');
        } catch (error) {
            console.error('Error al eliminar el horario:', error);
            showNotification('Error al eliminar el horario', 'error');
        }
    }

    async saveSchedules() {
        try {
            await fetch('http://localhost:3001/data/schedules.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ schedules: this.schedules })
            });
        } catch (error) {
            console.error('Error al guardar los horarios:', error);
            throw error;
        }
    }

    // ... otros métodos necesarios
}

// Inicializar el manejador de horarios y hacerlo globalmente disponible
window.scheduleManager = new ScheduleManager();

// Hacer el método closeCreateScheduleModal disponible globalmente
window.closeCreateScheduleModal = () => {
    if (window.scheduleManager) {
        window.scheduleManager.closeCreateScheduleModal();
    }
};

// Hacer el método confirmCreateSchedule disponible globalmente
window.confirmCreateSchedule = () => {
    if (window.scheduleManager) {
        window.scheduleManager.confirmCreateSchedule();
    }
};

// Hacer los métodos disponibles globalmente
window.closeEditScheduleModal = () => window.scheduleManager.closeEditScheduleModal();
window.saveScheduleEdit = () => window.scheduleManager.saveScheduleEdit();

// Cargar horarios al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    scheduleManager.loadScheduleData();
});
