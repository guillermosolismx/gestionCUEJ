// ...existing code...
window.viewAssignmentsData = async function() {
    try {
        const [assignmentsResponse, careersResponse] = await Promise.all([
            fetch('data/assignments.json'),
            fetch('data/careers.json')
        ]);

        if (!assignmentsResponse.ok) throw new Error(`Error al cargar los datos de asignaciones: ${assignmentsResponse.statusText}`);
        if (!careersResponse.ok) throw new Error(`Error al cargar los datos de carreras: ${careersResponse.statusText}`);

        const assignmentsData = await assignmentsResponse.json();
        const careersData = await careersResponse.json();

        // Agrupar asignaciones por profesor y carrera, y realizar cálculos
        const groupedAssignments = assignmentsData.assignments.reduce((acc, assignment) => {
            if (!acc[assignment.teacherName]) {
                acc[assignment.teacherName] = {};
            }
            if (!acc[assignment.teacherName][assignment.careerName]) {
                acc[assignment.teacherName][assignment.careerName] = [];
            }
            acc[assignment.teacherName][assignment.careerName].push(assignment);
            return acc;
        }, {});

        const calculations = Object.entries(groupedAssignments).map(([teacherName, careers]) => {
            return {
                teacherName,
                careers: Object.entries(careers).map(([careerName, assignments]) => {
                    return {
                        careerName,
                        assignments: assignments.map(assignment => {
                            const career = careersData.careers.find(c => c.name === assignment.careerName);
                            const paymentPerHour = career ? parseFloat(career.payperhour.replace('$', '')) : 0;
                            const subtotal = assignment.totalHours * paymentPerHour;
                            const iva = subtotal * 0.16;
                            const isrRetPm = subtotal * 0.10;
                            const isrRetResico = subtotal * 0.0125;
                            const ivaRet = subtotal * 0.1066666;
                            const totalPm = ((subtotal + iva) - isrRetPm) - ivaRet;
                            const totalResico = ((subtotal + iva) - isrRetResico) - ivaRet;
                            return {
                                subjectName: assignment.subjectName,
                                classDates: assignment.classDates,
                                totalHours: assignment.totalHours,
                                paymentPerHour: career ? career.payperhour : 'N/A',
                                subtotal: subtotal.toFixed(2),
                                iva: iva.toFixed(2),
                                isrRetPm: isrRetPm.toFixed(2),
                                isrRetResico: isrRetResico.toFixed(2),
                                ivaRet: ivaRet.toFixed(2),
                                totalPm: totalPm.toFixed(2),
                                totalResico: totalResico.toFixed(2)
                            };
                        })
                    };
                })
            };
        });

        // Exportar cálculos a calculations.json
        await fetch('data/calculations.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ calculations })
        });

        // Previsualizar los datos calculados
        const table = document.getElementById("teacherLoadTable");
        table.innerHTML = ''; // Limpiar contenido previo
        table.innerHTML = `
            <tr>
                <th>Maestro</th>
                <th>Carrera</th>
                <th>Materia</th>
                <th>Fechas</th>
                <th>Total Horas</th>
                <th>Pago por Hora</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>ISR RET PF</th>
                <th>ISR RET RESICO</th>
                <th>IVA RET</th>
                <th>TOTAL PF</th>
                <th>TOTAL RESICO</th>
            </tr>
        `;

        calculations.forEach(calc => {
            const teacherRow = table.insertRow();
            teacherRow.innerHTML = `
                <td colspan="13"><strong>${calc.teacherName}</strong></td>
            `;
            calc.careers.forEach(career => {
                const careerRow = table.insertRow();
                careerRow.innerHTML = `
                    <td colspan="13" style="padding-left: 20px;"><strong>${career.careerName}</strong></td>
                `;
                career.assignments.forEach(assignment => {
                    const row = table.insertRow();
                    row.innerHTML = `
                        <td></td>
                        <td></td>
                        <td>${assignment.subjectName}</td>
                        <td>${assignment.classDates.join(', ')}</td>
                        <td>${assignment.totalHours}</td>
                        <td>${assignment.paymentPerHour}</td>
                        <td>$${assignment.subtotal}</td>
                        <td>$${assignment.iva}</td>
                        <td>$${assignment.isrRetPm}</td>
                        <td>$${assignment.isrRetResico}</td>
                        <td>$${assignment.ivaRet}</td>
                        <td>$${assignment.totalPm}</td>
                        <td>$${assignment.totalResico}</td>
                    `;
                });
            });
            const buttonRow = table.insertRow();
            buttonRow.innerHTML = `
                <td colspan="13" style="text-align: right;">
                    <button class="btn" onclick="calculateTeacher('${calc.teacherName}')">Cálculo</button>
                <button class="btn" onclick="scheduleTeacher('${calc.teacherName}')">Programar</button>
                    <button class="btn btn-delete" onclick="deleteAssignments('${calc.teacherName}')">Eliminar</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error al visualizar los datos:', error);
        // ...existing code de manejo de error...
    }
}

window.calculateTeacher = function(teacherName) {
    fetch('data/calculations.json')
        .then(response => response.json())
        .then(async data => {
            const teacherData = data.calculations.find(calc => calc.teacherName.trim() === teacherName.trim());
            if (teacherData) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                const primaryColor = '#1c1e52';
                const secondaryColor = '#f3af1d';
                const textColor = '#1c1e52';
                const backgroundColor = '#feffff';

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

                doc.setFontSize(18);
                doc.setTextColor(primaryColor);
                doc.text('Cálculo Carga Académica', 14, 50);
                doc.setFontSize(12);
                doc.text(`Docente: ${teacherData.teacherName}`, 14, 60);

                let y = 70;
                const pageHeight = doc.internal.pageSize.height;
                const marginBottom = 20;

                teacherData.careers.forEach(career => {
                    doc.setFontSize(14);
                    doc.setTextColor(secondaryColor);
                    doc.text(`${career.careerName}`, 14, y);
                    y += 6; // Acortar el espacio
                    doc.setFontSize(10);
                    doc.setTextColor(textColor);
                    let subtotalSum = 0;
                    let ivaSum = 0;
                    let isrRetPfSum = 0;
                    let ivaRetSum = 0;
                    let totalPfSum = 0;
                    let isrRetResicoSum = 0;
                    let totalResicoSum = 0;
                    career.assignments.forEach(assignment => {
                        if (y + 60 > pageHeight - marginBottom) {
                            doc.addPage();
                            y = 20; // Reiniciar la posición y en la nueva página
                        }
                        doc.setFillColor(primaryColor);
                        doc.setTextColor('#ffffff');
                        doc.rect(14, y - 4, 182, 8, 'F');
                        doc.text(`${assignment.subjectName}`, 15, y);
                        y += 8; // Añadir una pequeña separación
                        doc.setTextColor(textColor);
                        doc.text(`Fechas: \t${assignment.classDates.map(date => new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')).join(', ')}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`Total Horas: \t${assignment.totalHours}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`Pago por Hora: \t${assignment.paymentPerHour}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`Subtotal: \t$${assignment.subtotal}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`IVA: \t$${assignment.iva}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`ISR RET PF: \t$${assignment.isrRetPm}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`ISR RET RESICO: \t$${assignment.isrRetResico}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`IVA RET: \t$${assignment.ivaRet}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`TOTAL PF: \t$${assignment.totalPm}`, 14, y);
                        y += 5; // Reducir interlineado
                        doc.text(`TOTAL RESICO: \t$${assignment.totalResico}`, 14, y);
                        y += 10;
                        subtotalSum += parseFloat(assignment.subtotal);
                        ivaSum += parseFloat(assignment.iva);
                        isrRetPfSum += parseFloat(assignment.isrRetPm);
                        ivaRetSum += parseFloat(assignment.ivaRet);
                        totalPfSum += parseFloat(assignment.totalPm);
                        isrRetResicoSum += parseFloat(assignment.isrRetResico);
                        totalResicoSum += parseFloat(assignment.totalResico);
                    });

                    // Línea divisoria
                    if (y + 20 > pageHeight - marginBottom) {
                        doc.addPage();
                        y = 20; // Reiniciar la posición y en la nueva página
                    }
                    doc.setDrawColor(0);
                    doc.line(14, y, 196, y);
                    y += 6;

                    // Subtotales
                    doc.setFontSize(12);
                    doc.setTextColor(primaryColor);
                    doc.text(`SUBTOTALES: \t$${subtotalSum.toFixed(2)}`, 14, y);
                    y += 6;

                    // Total IVA
                    doc.text(`TOTAL IVA: \t$${ivaSum.toFixed(2)}`, 14, y);
                    y += 6;

                    // Línea divisoria
                    if (y + 20 > pageHeight - marginBottom) {
                        doc.addPage();
                        y = 20; // Reiniciar la posición y en la nueva página
                    }
                    doc.setDrawColor(0);
                    doc.line(14, y, 196, y);
                    y += 10;

                    // Texto adicional
                    doc.setFontSize(6);
                    doc.setTextColor(textColor);
                    doc.text('En caso de facturar como Persona física con actividad empresarial:', 14, y);
                    y += 6;

                    // Total ISR RET PF
                    doc.setFontSize(12);
                    doc.setTextColor(primaryColor);
                    doc.text(`TOTAL ISR RET PF: \t$${isrRetPfSum.toFixed(2)}`, 14, y);
                    y += 6;

                    // Total IVA RET
                    doc.text(`TOTAL IVA RET: \t$${ivaRetSum.toFixed(2)}`, 14, y);
                    y += 6;

                    // Totales PF
                    doc.text(`TOTALES PF: \t$${totalPfSum.toFixed(2)}`, 14, y);
                    y += 10;

                    // Texto adicional
                    doc.setFontSize(6);
                    doc.setTextColor(textColor);
                    doc.text('En caso de facturar como RESICO:', 14, y);
                    y += 6;

                    // Total ISR RET RESICO
                    doc.setFontSize(12);
                    doc.setTextColor(primaryColor);
                    doc.text(`TOTAL ISR RET RESICO: \t$${isrRetResicoSum.toFixed(2)}`, 14, y);
                    y += 6;

                    // Total IVA RET
                    doc.text(`TOTAL IVA RET: \t$${ivaRetSum.toFixed(2)}`, 14, y);
                    y += 6;

                    // Totales RESICO
                    doc.text(`TOTALES RESICO: \t$${totalResicoSum.toFixed(2)}`, 14, y);
                    y += 10;
                });

                    // Nueva página para datos de facturación
                    doc.addPage();
                    doc.setFontSize(12);
                    doc.setTextColor(textColor);
                    doc.text('Datos para facturación', 14, 22);
                    doc.text('USO DEL CFDI: GASTOS EN GENERAL G 03', 14, 32);
                    doc.text('CLAVE SAT DEL SERVICIO: 86141501', 14, 42);
                    doc.text('CONCEPTO: SERVICIOS EDUCATIVOS', 14, 52);
                    doc.text('FORMA DE PAGO: 03 TRANSFERENCIA ELECTRONICA', 14, 62);
                    doc.text('METODO DE PAGO: PUE (PAGO EN UNA SOLA EXHIBICION)', 14, 72);
                    doc.text('ESCUELA DE ESTUDIOS JURÍDICOS Y FISCALES CISNEROS RICO SC',14,82);
                    doc.text('RFC: EEJ110317LGA',14,92);
                    doc.text('CP 53100       Ley General de Personas Morales',14,102);
                    doc.text('Enviar su factura y datos bancarios a proveedoresver@cuej.edu.mx',14,112);
                    
                    // Fecha de impresión              
                const printDate = new Date().toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).replace(/\//g, '-');
                doc.setFontSize(10);
                doc.setTextColor(textColor);
                doc.text(`Fecha de impresión: ${printDate}`, 14, doc.internal.pageSize.height - 10);

                doc.save('Calculo_Carga_Docentes.pdf');
            } else {
                console.error('No se encontraron datos para el profesor:', teacherName);
            }
        })
        .catch(error => console.error('Error al generar el PDF:', error));
};

// Función para eliminar asignaciones
window.deleteAssignments = async function(teacherName) {
    try {
        const response = await fetch('data/assignments.json');
        if (!response.ok) throw new Error(`Error al cargar los datos de asignaciones: ${response.statusText}`);
        const assignmentsData = await response.json();

        const updatedAssignments = assignmentsData.assignments.filter(assignment => assignment.teacherName.trim() !== teacherName.trim());

        await fetch('data/assignments.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ assignments: updatedAssignments })
        });

        showNotification('Asignaciones eliminadas correctamente', 'success');
        viewAssignmentsData(); // Refrescar la vista
    } catch (error) {
        console.error('Error al eliminar las asignaciones:', error);
        showNotification('Error al eliminar las asignaciones', 'error');
    }
};

// Función para programar pagos
async function scheduleTeacher(teacherName) {
    function generateAlphanumericId() {
        return Math.random().toString(36).substr(2, 9);
    }

    try {
        const response = await fetch('data/calculations.json');
        if (!response.ok) throw new Error(`Error al cargar los datos de cálculos: ${response.statusText}`);
        const calculationsData = await response.json();

        const teacherData = calculationsData.calculations.find(calc => calc.teacherName.trim() === teacherName.trim());
        if (!teacherData) throw new Error('No se encontraron datos para el profesor');

        const scholarPayments = teacherData.careers.map(career => {
            const totalHours = career.assignments.reduce((sum, assignment) => sum + assignment.totalHours, 0);
            const totalPf = career.assignments.reduce((sum, assignment) => sum + parseFloat(assignment.totalPm), 0);

            return {
                id: generateAlphanumericId(), // Generar un ID alfanumérico único
                teacherName: teacherData.teacherName,
                careerName: career.careerName,
                subjects: career.assignments.map(assignment => assignment.subjectName),
                topay: false, // Añadido el campo topay
                totalHours: totalHours,
                totalPf: totalPf.toFixed(2)
            };
        });

        console.log('Scholar Payments:', scholarPayments); // Log para depuración

        await saveScholarPayments(scholarPayments);
        showNotification('Programación de pagos guardada exitosamente', 'success');
    } catch (error) {
        console.error('Error al programar el pago:', error);
        showNotification('Error al programar el pago', 'error');
    }
}

async function saveScholarPayments(scholarPayments) {
    try {
        const response = await fetch('data/scholarpayments.json');
        if (!response.ok) throw new Error(`Error al cargar los datos de pagos: ${response.statusText}`);
        const paymentsData = await response.json();

        paymentsData.scholarpayments = paymentsData.scholarpayments || [];
        paymentsData.scholarpayments.push(...scholarPayments);

        console.log('Payments Data to Save:', paymentsData); // Log para depuración

        await fetch('data/scholarpayments.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentsData)
        });

        console.log('Scholar payments saved:', paymentsData);
    } catch (error) {
        console.error('Error saving scholar payments:', error);
    }
}
// ...existing code...
