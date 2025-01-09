document.addEventListener("DOMContentLoaded", () => {
    const assignmentsList = document.getElementById("assignmentsList");

    // Inicializar el datepicker
    $('#importDate').daterangepicker({
        locale: {
            format: 'YYYY-MM-DD'
        }
    });

    // Habilitar el botón de importar asignaciones
    document.querySelector('.btn-import-assignments').addEventListener('click', function() {
        assignmentManager.importAssignments();
    });

    // Eliminar el botón de visualizar asignaciones
    // document.querySelector('.btn-view-assignments').addEventListener('click', function() {
    //     assignmentManager.viewAssignments();
    // });

    const WEEK_DAYS = [
        { id: '0', name: 'Domingo' },
        { id: '1', name: 'Lunes' },
        { id: '2', name: 'Martes' },
        { id: '3', name: 'Miércoles' },
        { id: '4', name: 'Jueves' },
        { id: '5', name: 'Viernes' },
        { id: '6', name: 'Sábado' }
    ];

    window.assignmentManager = {
        importAssignments: async function() {
            const assignmentsList = document.getElementById("assignmentsList");
            const dateRange = $('#importDate').val().split(' - ');
            const startDate = new Date(dateRange[0]);
            const endDate = new Date(dateRange[1]);
            endDate.setDate(endDate.getDate() + 1); // Asegurar que endDate se considere como día válido

            console.log('Rango de fechas seleccionado:', startDate, endDate);

            try {
                const [schedulesResponse, teachersResponse, careersResponse] = await Promise.all([
                    fetch('data/schedules.json'),
                    fetch('data/teachers.json'),
                    fetch('data/careers.json')
                ]);

                if (!schedulesResponse.ok) throw new Error(`Error al cargar el archivo JSON de horarios: ${schedulesResponse.statusText}`);
                if (!teachersResponse.ok) throw new Error(`Error al cargar el archivo JSON de profesores: ${teachersResponse.statusText}`);
                if (!careersResponse.ok) throw new Error(`Error al cargar el archivo JSON de carreras: ${careersResponse.statusText}`);

                const schedulesData = await schedulesResponse.json();
                const teachersData = await teachersResponse.json();
                const careersData = await careersResponse.json();
                console.log('Datos cargados:', { schedulesData, teachersData, careersData });

                const results = calculateAssignments(schedulesData.schedules, teachersData.teachers, careersData.careers, startDate, endDate);
                renderAssignments(results);
            } catch (error) {
                console.error("Error cargando las asignaciones:", error);
                assignmentsList.innerHTML = `<p class="error">No se pudieron cargar las asignaciones.</p>`;
            }
        },
        // Eliminar la función viewAssignments
        // viewAssignments: async function() {
        //     try {
        //         const response = await fetch('data/assignments.json');
        //         if (!response.ok) throw new Error(`Error al cargar los datos de asignaciones: ${response.statusText}`);
        //         const assignmentsData = await response.json();

        //         const assignmentsList = document.getElementById("assignmentsDataView");
        //         assignmentsList.innerHTML = ''; // Limpiar contenido previo

        //         const table = document.createElement('table');
        //         table.className = 'assignments-table';
        //         table.innerHTML = `
        //             <thead>
        //                 <tr>
        //                     <th>Profesor</th>
        //                     <th>Carrera</th>
        //                     <th>Materia</th>
        //                     <th>Fechas</th>
        //                     <th>Total Horas</th>
        //                     <th>Acciones</th>
        //                 </tr>
        //             </thead>
        //             <tbody>
        //                 ${assignmentsData.assignments.map((assignment, index) => `
        //                     <tr>
        //                         <td>${assignment.teacherName}</td>
        //                         <td>${assignment.careerName}</td>
        //                         <td>${assignment.subjectName}</td>
        //                         <td>${assignment.classDates.join(', ')}</td>
        //                         <td>${assignment.totalHours}</td>
        //                         <td><button class="btn btn-small btn-delete" onclick="assignmentManager.deleteAssignment('${assignment.id}')">ELIMINAR</button></td>
        //                     </tr>
        //                 `).join('')}
        //             </tbody>
        //         `;

        //         assignmentsList.appendChild(table);
        //     } catch (error) {
        //         console.error("Error al visualizar las asignaciones:", error);
        //         const assignmentsList = document.getElementById("assignmentsDataView");
        //         assignmentsList.innerHTML = `<p class="error">No se pudieron cargar las asignaciones.</p>`;
        //     }
        // },
        loadAssignments: function() {
            // Implementar la lógica para cargar las asignaciones si es necesario
            console.log('Cargando asignaciones...');
        },
        deleteAssignment: async function(id) {
            try {
                console.log(`Intentando eliminar asignación con ID: ${id}`); // Log para depuración
                const response = await fetch(`http://localhost:3001/data/assignments/${encodeURIComponent(id)}.json`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error(`Error al eliminar la asignación: ${response.statusText}`);

                // Volver a cargar la vista de datos
                assignmentManager.viewAssignments();
            } catch (error) {
                console.error('Error al eliminar la asignación:', error);
                showNotification('Error al eliminar la asignación', 'error');
            }
        }
    };

    // Función para calcular las asignaciones
    function calculateAssignments(schedules, teachers, careers, startDate, endDate) {
        const results = [];

        schedules.forEach(schedule => {
            schedule.modules.forEach(module => {
                const moduleStartDate = new Date(module.startDate);
                const moduleEndDate = new Date(module.endDate);

                // Verificar si el rango de fechas seleccionado está dentro del rango de fechas del módulo
                if (startDate <= moduleEndDate && endDate >= moduleStartDate) {
                    module.subjects.forEach(subject => {
                        console.log('selectedDays:', schedule.selectedDays); // Agregar mensaje de consola
                        const validDates = getValidDates(schedule.selectedDays, startDate, endDate, moduleStartDate, moduleEndDate);
                        const teacher = teachers.find(t => t.id === subject.teacherId);
                        const career = careers.find(c => c.id === schedule.careerId);
                        const dayNames = schedule.selectedDays ? schedule.selectedDays.map(day => {
                            const weekDay = WEEK_DAYS.find(d => d.id === day.toString());
                            return weekDay ? weekDay.name : 'N/A';
                        }).join(', ') : 'N/A';
                        const dayCounts = countDays(schedule.selectedDays, startDate, endDate);
                        const matchingDates = getMatchingDates(schedule.selectedDays, startDate, endDate);
                        const classDates = getClassDates(matchingDates, schedule.nonWorkingDays, moduleStartDate, moduleEndDate);
                        const totalHours = calculateTotalHours(classDates, subject.startTime, subject.endTime);
                        results.push({
                            teacherName: teacher ? teacher.name : 'Desconocido',
                            subjectName: subject.name,
                            careerName: career ? career.name : 'Desconocida',
                            startTime: subject.startTime,
                            endTime: subject.endTime,
                            dayNames: dayNames,
                            dayCounts: dayCounts,
                            matchingDates: matchingDates,
                            validDates: validDates,
                            classDates: classDates,
                            totalHours: totalHours,
                            nonWorkingDays: schedule.nonWorkingDays
                        });
                    });
                }
            });
        });

        // Agrupar resultados por profesor y carrera
        const groupedResults = results.reduce((acc, result) => {
            if (!acc[result.teacherName]) {
                acc[result.teacherName] = {};
            }
            if (!acc[result.teacherName][result.careerName]) {
                acc[result.teacherName][result.careerName] = [];
            }
            acc[result.teacherName][result.careerName].push(result);
            return acc;
        }, {});

        console.log('Resultados agrupados:', groupedResults);
        return groupedResults;
    }

    // Función para contar los días de la semana en el rango de fechas
    function countDays(selectedDays, startDate, endDate) {
        const daysOfWeek = selectedDays ? selectedDays.map(day => parseInt(day)) : [];
        const dayCounts = {};

        daysOfWeek.forEach(day => {
            dayCounts[day] = 0;
        });

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            if (daysOfWeek.includes(date.getDay())) {
                dayCounts[date.getDay()]++;
            }
        }

        return dayCounts;
    }

    // Función para obtener las fechas que coinciden con los días seleccionados en el rango de fechas
    function getMatchingDates(selectedDays, startDate, endDate) {
        const daysOfWeek = selectedDays ? selectedDays.map(day => parseInt(day)) : [];
        const matchingDates = [];

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const currentDate = new Date(date); // Crear una nueva instancia de Date para evitar modificar la original
            currentDate.setHours(0, 1, 0, 0); // Establecer la hora a 00:01
            if (daysOfWeek.includes(currentDate.getDay())) {
                matchingDates.push(currentDate.toISOString().split('T')[0]);
            }
        }

        // Asegurarse de incluir el endDate si es un día válido
        const endDateInstance = new Date(endDate);
        endDateInstance.setHours(0, 1, 0, 0);
        if (daysOfWeek.includes(endDateInstance.getDay())) {
            matchingDates.push(endDateInstance.toISOString().split('T')[0]);
        }

        return matchingDates;
    }

    // Función para obtener las fechas válidas dentro del rango de fechas del módulo
    function getValidDates(selectedDays, startDate, endDate, moduleStartDate, moduleEndDate) {
        const daysOfWeek = selectedDays ? selectedDays.map(day => parseInt(day)) : [];
        const validDates = [];

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const currentDate = new Date(date); // Crear una nueva instancia de Date para evitar modificar la original
            currentDate.setHours(0, 1, 0, 0); // Establecer la hora a 00:01
            if (currentDate >= moduleStartDate && currentDate <= moduleEndDate && daysOfWeek.includes(currentDate.getDay())) {
                validDates.push(currentDate.toISOString().split('T')[0]);
            }
        }

        // Asegurarse de incluir el endDate si es un día válido
        const endDateInstance = new Date(endDate);
        endDateInstance.setHours(0, 1, 0, 0);
        if (daysOfWeek.includes(endDateInstance.getDay())) {
            validDates.push(endDateInstance.toISOString().split('T')[0]);
        }

        return validDates;
    }

    // Función para obtener las fechas de clases excluyendo días no laborales y fuera del rango del módulo
    function getClassDates(matchingDates, nonWorkingDays, moduleStartDate, moduleEndDate) {
        const uniqueDates = new Set();
        return matchingDates.filter(date => {
            const currentDate = new Date(date);
            const isValid = currentDate >= moduleStartDate && currentDate <= moduleEndDate && !nonWorkingDays.includes(date) && !uniqueDates.has(date);
            if (isValid) {
                uniqueDates.add(date);
            }
            return isValid;
        });
    }

    // Función para calcular las horas totales
    function calculateTotalHours(classDates, startTime, endTime) {
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);
        const hoursPerDay = endHour - startHour;
        return classDates.length * hoursPerDay;
    }

    // Función para renderizar las asignaciones
    function renderAssignments(groupedResults) {
        const assignmentsList = document.getElementById("assignmentsList");
        assignmentsList.innerHTML = ''; // Limpiar contenido previo

        const table = document.createElement('table');
        table.className = 'assignments-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Materia</th>
                    <th>Hora Inicio</th>
                    <th>Hora Fin</th>
                    <th>Días</th>
                    <!-- Ocultar columnas Repeticiones y Fechas -->
                    <!-- <th>Repeticiones</th> -->
                    <!-- <th>Fechas</th> -->
                    <th>Fechas de clases</th>
                    <th>Total de Horas</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(groupedResults).map(([teacherName, careers]) => `
                    <tr>
                        <td colspan="6">
                            <strong>${teacherName}</strong>
                        </td>
                    </tr>
                    ${Object.entries(careers).map(([careerName, results]) => `
                        <tr>
                            <td colspan="6">
                                <em>${careerName}</em>
                            </td>
                        </tr>
                        ${results.map(result => `
                            <tr>
                                <td>${result.subjectName}</td>
                                <td>${result.startTime}</td>
                                <td>${result.endTime}</td>
                                <td>${result.dayNames}</td>
                                <!-- Ocultar columnas Repeticiones y Fechas -->
                                <!-- <td>${Object.entries(result.dayCounts).map(([day, count]) => `${WEEK_DAYS.find(d => d.id === day.toString()).name}: ${count}`).join(', ')}</td> -->
                                <!-- <td>${result.matchingDates.join(', ')}</td> -->
                                <td>${result.classDates.join(', ')}</td>
                                <td>${result.totalHours}</td>
                            </tr>
                        `).join('')}
                    `).join('')}
                    <tr>
                        <td colspan="6" style="text-align: right;">
                            <button class="btn btn-small btn-export" onclick='exportCalculation("${teacherName}", ${JSON.stringify(careers)})'>Exportar cálculo</button>
                            <button class="btn btn-small btn-pdf" onclick='generatePDF("${teacherName}", ${JSON.stringify(careers)})'>PropuestaPDF</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        assignmentsList.appendChild(table);
    }

    // Función para generar el PDF
    window.generatePDF = async function(teacherName, careers) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Colores definidos en el CSS
        const primaryColor = '#1c1e52';
        const secondaryColor = '#f3af1d';
        const textColor = '#feffff';

        // Función para formatear fechas
        function formatDate(dateString) {
            const date = new Date(dateString);
            date.setDate(date.getDate() + 1); // Ajustar la fecha para que coincida con la visualización en pantalla
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        }

        // Cargar la imagen
        const imgData = await fetch('data/images/banner_schedules.png')
            .then(response => response.blob())
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }));

        // Agregar la imagen al PDF
        doc.addImage(imgData, 'PNG', 10, 10, 190, 30);

        // Estilos del PDF
        doc.setTextColor(primaryColor);
        doc.setFontSize(16);
        doc.text(`Propuesta de Carga Docente`, 10, 50);
        doc.setFontSize(14);
        doc.text(`para `, 10, 60);
        doc.setFont('helvetica', 'bold');
        doc.text(`${teacherName}`, 20, 60);
        doc.setFont('helvetica', 'normal');

        let y = 70;
        const pageHeight = doc.internal.pageSize.height;
        const marginBottom = 20;
        const nonWorkingDaysSet = new Set();

        Object.entries(careers).forEach(([careerName, results]) => {
            doc.setFontSize(14);
            doc.setTextColor(secondaryColor);
            doc.text(`${careerName}`, 10, y);
            y += 10;

            results.forEach(result => {
                if (y + 60 > pageHeight - marginBottom) {
                    doc.addPage();
                    y = 20; // Reiniciar la posición y en la nueva página
                }
                doc.setFontSize(12);
                doc.setFillColor(primaryColor);
                doc.setTextColor(textColor);
                doc.rect(10, y - 5, 190, 10, 'F'); // Fondo azul oscuro
                doc.text(`${result.subjectName}`, 20, y); // Agregar sangría de 1.0 al nombre de la materia
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(primaryColor);
                doc.text(`Hora Inicio: ${result.startTime}`, 10, y + 10);
                doc.text(`Hora Fin: ${result.endTime}`, 10, y + 18); // Reducir 1px entre Hora de Inicio y Hora Fin
                doc.text(`Días: ${result.dayNames}`, 10, y + 25);
                doc.text(`Fechas de clases:`, 10, y + 30);
                doc.text(`${result.classDates.map(formatDate).join(', ')}`, 20, y + 35);
                doc.text(`Total de Horas: ${result.totalHours}`, 10, y + 43);
                if (result.nonWorkingDays && result.nonWorkingDays.length > 0) {
                    result.nonWorkingDays.forEach(date => nonWorkingDaysSet.add(date));
                }
                y += 81;
            });
        });

        // Agregar "Días No Laborales" al final del PDF
        if (nonWorkingDaysSet.size > 0) {
            if (y + 20 > pageHeight - marginBottom) {
                doc.addPage();
                y = 20; // Reiniciar la posición y en la nueva página
            }
            doc.setDrawColor(0, 0, 0);
            doc.line(10, y, 200, y); // Línea divisoria
            y += 10;
            doc.setTextColor(secondaryColor);
            doc.text(`Días No Laborales:`, 10, y);
            doc.setTextColor(primaryColor);
            doc.text(`${Array.from(nonWorkingDaysSet).map(formatDate).join(', ')}`, 20, y + 10);
        }

        // Agregar fecha y hora de impresión en el pie de página
        const printDate = new Date();
        const formattedPrintDate = `${printDate.getDate().toString().padStart(2, '0')}-${(printDate.getMonth() + 1).toString().padStart(2, '0')}-${printDate.getFullYear()} ${printDate.getHours().toString().padStart(2, '0')}:${printDate.getMinutes().toString().padStart(2, '0')}`;
        doc.setFontSize(10);
        doc.text(`Fecha de impresión: ${formattedPrintDate}`, 10, doc.internal.pageSize.height - 10);

        doc.save(`${teacherName}_Propuesta.pdf`);
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerText = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Función para exportar el cálculo
    window.exportCalculation = async function(teacherName, careers) {
        function generateAlphanumericId() {
            return Math.random().toString(36).substr(2, 9);
        }

        const data = Object.entries(careers).flatMap(([careerName, results]) => 
            results.map(result => ({
                id: generateAlphanumericId(), // Generar un ID alfanumérico único
                teacherName: teacherName,
                careerName: careerName,
                subjectName: result.subjectName,
                classDates: result.classDates,
                totalHours: result.totalHours
            }))
        );

        try {
            const response = await fetch('http://localhost:3001/data/assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Error al exportar los datos: ${response.statusText}`);
            }

            console.log('Datos exportados correctamente');
            showNotification('Exportación exitosa');
        } catch (error) {
            console.error('Error al exportar los datos:', error);
            showNotification('Error al exportar los datos', 'error');
        }
    };
});
