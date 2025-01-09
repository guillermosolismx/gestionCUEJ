document.addEventListener('DOMContentLoaded', function() {
    console.log('Schedule Payments script loaded');
    
    // Función para mostrar la sección de programación de pagos
    function showPaymentSchedule() {
        fetch('/data/schedulepayments.json')
            .then(response => response.json())
            .then(data => {
                document.getElementById('initialBalance').value = formatCurrency(data.initialBalance || 0);
                document.getElementById('totalAmount').value = formatCurrency(data.totalAmount || 0);
                document.getElementById('finalBalance').value = formatCurrency(data.finalBalance || 0);
                renderPayments(data.payments || []);
                renderScholarPayments(data.scholarpayments || []);
            })
            .catch(error => {
                console.error('Error loading payments:', error);
            });
    }

    // Función para generar un ID único
    function generateUniqueId() {
        return 'id-' + Math.random().toString(36).substr(2, 9);
    }

    // Función para añadir una nueva fila a la tabla de pagos
    function addPaymentRow() {
        const tableBody = document.getElementById('paymentTable').querySelector('tbody');
        const newRow = document.createElement('tr');
        const uniqueId = generateUniqueId();

        getBeneficiaryOptions().then(options => {
            newRow.innerHTML = `
                <td>
                    <select onchange="savePayments()">
                        <option value="">Seleccione un beneficiario</option>
                        ${options}
                    </select>
                </td>
                <td><input type="text" placeholder="Concepto de pago" oninput="savePayments()"></td>
                <td><input type="text" placeholder="Monto" oninput="updateTotals(); savePayments();" onblur="formatCurrencyInput(this)"></td>
                <td>
                    <button class="btn btn-delete" onclick="removePaymentRow(this, '${uniqueId}')">-</button>
                    <button class="btn btn-add" onclick="openAddPaymentModal(this)">+</button>
                </td>
            `;
            newRow.dataset.id = uniqueId; // Asignar el ID único a la fila
            tableBody.appendChild(newRow);
            savePayments();
        });
    }

    // Función para renderizar los pagos en la tabla
    function renderPayments(payments) {
        const tableBody = document.getElementById('paymentTable').querySelector('tbody');
        tableBody.innerHTML = '';
        payments.forEach(payment => {
            getBeneficiaryOptions(payment.beneficiary).then(options => {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td>
                        <select onchange="savePayments()">
                            <option value="">Seleccione un beneficiario</option>
                            ${options}
                        </select>
                    </td>
                    <td><input type="text" placeholder="Concepto de pago" value="${payment.concept}" oninput="savePayments()"></td>
                    <td><input type="text" placeholder="Monto" value="${formatCurrency(payment.amount)}" oninput="updateTotals(); savePayments();" onblur="formatCurrencyInput(this)"></td>
                    <td>
                        <button class="btn btn-delete" onclick="removePaymentRow(this)">-</button>
                        <button class="btn btn-add" onclick="openAddPaymentModal(this)">+</button>
                    </td>
                `;
                tableBody.appendChild(newRow);
            });
        });
    }

    // Función para renderizar los pagos de scholarpayments en la tabla
    function renderScholarPayments(scholarPayments) {
        const tableBody = document.getElementById('scholarPaymentsTable').querySelector('tbody');
        tableBody.innerHTML = '';

        // Agrupar los pagos por maestro
        const groupedPayments = scholarPayments.reduce((acc, payment) => {
            if (payment.teacherName) {
                const teacherName = payment.teacherName.trim();
                if (!acc[teacherName]) {
                    acc[teacherName] = [];
                }
                acc[teacherName].push(payment);
            }
            return acc;
        }, {});

        // Renderizar los pagos agrupados por maestro
        Object.keys(groupedPayments).forEach(teacherName => {
            const teacherPayments = groupedPayments[teacherName];
            const teacherRow = document.createElement('tr');
            teacherRow.innerHTML = `
                <td colspan="6" style="background-color: #f3f3f3; font-weight: bold;">${teacherName}</td>
            `;
            tableBody.appendChild(teacherRow);

            teacherPayments.forEach(payment => {
                const subjects = payment.subjects ? payment.subjects.map(subject => `<li>${subject}</li>`).join('') : '';
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td>${payment.careerName}</td>
                    <td><ul>${subjects}</ul></td>
                    <td>${payment.totalHours}</td>
                    <td>${formatCurrency(payment.totalPf)}</td>
                    <td><input type="checkbox" ${payment.topay ? 'checked' : ''} onchange="updateScholarPaymentTopay(this, '${teacherName}', '${payment.careerName}', '${payment.subjects.join(', ')}')"></td> <!-- Checkbox para "A pagar" -->
                    <td>
                        <button class="btn btn-delete" onclick="removeScholarPaymentRow(this, '${teacherName}', '${payment.careerName}', '${payment.subjects.join(', ')}')">-</button>
                        <button class="btn btn-add" onclick="openAddScholarPaymentModal(this)">+</button>
                    </td>
                `;
                tableBody.appendChild(newRow);
            });
        });
    }

    // Función para actualizar el campo "topay" de scholarPayments
    function updateScholarPaymentTopay(checkbox, teacherName, careerName, subjects) {
        fetch('/data/schedulepayments.json')
            .then(response => response.json())
            .then(data => {
                const scholarPayments = data.scholarpayments.map(payment => {
                    if (payment.teacherName.trim() === teacherName.trim() && payment.careerName === careerName && payment.subjects.join(', ') === subjects) {
                        payment.topay = checkbox.checked;
                    }
                    return payment;
                });
                data.scholarpayments = scholarPayments;
                return fetch('/data/schedulepayments.json', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Scholar payments updated:', data);
                updateTotals(); // Actualizar los totales después de cambiar el estado del checkbox
            })
            .catch(error => {
                console.error('Error updating scholar payments:', error);
            });
    }

    // Función para obtener las opciones de beneficiarios
    function getBeneficiaryOptions(selectedBeneficiary = '') {
        return fetch('/data/beneficiaries.json')
            .then(response => response.json())
            .then(data => {
                if (!data.beneficiaries) return '';
                return data.beneficiaries.map(beneficiary => 
                    `<option value="${beneficiary.name}" ${beneficiary.name === selectedBeneficiary ? 'selected' : ''}>${beneficiary.name}</option>`
                ).join('');
            })
            .catch(error => {
                console.error('Error loading beneficiaries:', error);
                return '';
            });
    }

    // Función para eliminar una fila de la tabla de pagos
    function removePaymentRow(button, id) {
        const row = button.closest('tr');
        row.remove();
        updateTotals();
        savePayments();
    }

    // Función para eliminar una fila de la tabla de scholarPayments
    function removeScholarPaymentRow(button, teacherName, careerName, subjects) {
        const row = button.closest('tr');
        row.remove();
        fetch('/data/schedulepayments.json')
            .then(response => response.json())
            .then(data => {
                const scholarPayments = data.scholarpayments.filter(payment => !(payment.teacherName.trim() === teacherName.trim() && payment.careerName === careerName && payment.subjects.join(', ') === subjects));
                data.scholarpayments = scholarPayments;
                return fetch('/data/schedulepayments.json', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Scholar payment removed:', data);
                updateTotals(); // Actualizar los totales después de eliminar una fila
            })
            .catch(error => {
                console.error('Error removing scholar payment:', error);
            });
    }

    // Función para actualizar los totales
    function updateTotals() {
        const tableRows = document.getElementById('paymentTable').querySelectorAll('tbody tr');
        let totalAmount = 0;

        tableRows.forEach(row => {
            const amount = parseFloat(row.querySelector('input[placeholder="Monto"]').value.replace(/[^0-9.-]+/g,"")) || 0;
            totalAmount += amount;
        });

        // Sumar los montos de scholarPayments donde topay es true
        const scholarRows = document.getElementById('scholarPaymentsTable').querySelectorAll('tbody tr');
        scholarRows.forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                const totalPfElement = row.querySelector('td:nth-child(4)');
                if (totalPfElement) {
                    const totalPf = parseFloat(totalPfElement.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                    totalAmount += totalPf;
                }
            }
        });

        document.getElementById('totalAmount').value = formatCurrency(totalAmount);

        const initialBalance = parseFloat(document.getElementById('initialBalance').value.replace(/[^0-9.-]+/g,"")) || 0;
        const finalBalance = initialBalance - totalAmount;
        document.getElementById('finalBalance').value = formatCurrency(finalBalance);

        savePayments();
    }

    // Función para guardar los pagos en schedulepayments.json
    function savePayments() {
        const tableRows = document.getElementById('paymentTable').querySelectorAll('tbody tr');
        const payments = [];

        tableRows.forEach(row => {
            const beneficiary = row.querySelector('select').value;
            const concept = row.querySelector('input[placeholder="Concepto de pago"]').value;
            const amount = parseFloat(row.querySelector('input[placeholder="Monto"]').value.replace(/[^0-9.-]+/g,"")) || 0;
            const id = row.dataset.id; // Obtener el ID único de la fila

            payments.push({ id, beneficiary, concept, amount });
        });

        const scholarRows = document.getElementById('scholarPaymentsTable').querySelectorAll('tbody tr');
        const scholarPayments = [];

        scholarRows.forEach(row => {
            const careerNameElement = row.querySelector('td:nth-child(1)');
            const subjectsElement = row.querySelector('td:nth-child(2)');
            const totalHoursElement = row.querySelector('td:nth-child(3)');
            const totalPfElement = row.querySelector('td:nth-child(4)');
            const checkbox = row.querySelector('input[type="checkbox"]');

            if (careerNameElement && subjectsElement && totalHoursElement && totalPfElement && checkbox) {
                const teacherName = row.previousElementSibling ? row.previousElementSibling.textContent.trim() : '';
                const careerName = careerNameElement.textContent.trim();
                const subjects = Array.from(subjectsElement.querySelectorAll('ul li')).map(li => li.textContent.trim());
                const totalHours = parseFloat(totalHoursElement.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                const totalPf = parseFloat(totalPfElement.textContent.replace(/[^0-9.-]+/g,"")) || 0;
                const topay = checkbox.checked;

                scholarPayments.push({ teacherName, careerName, subjects, totalHours, totalPf, topay });
            }
        });

        const initialBalance = parseFloat(document.getElementById('initialBalance').value.replace(/[^0-9.-]+/g,"")) || 0;
        const totalAmount = parseFloat(document.getElementById('totalAmount').value.replace(/[^0-9.-]+/g,"")) || 0;
        const finalBalance = parseFloat(document.getElementById('finalBalance').value.replace(/[^0-9.-]+/g,"")) || 0;

        // Enviar los datos al servidor para guardarlos en data/schedulepayments.json
        fetch('/data/schedulepayments.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ initialBalance, totalAmount, finalBalance, payments, scholarpayments: scholarPayments })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Payments saved:', data);
        })
        .catch(error => {
            console.error('Error saving payments:', error);
        });
    }

    // Función para exportar la información a PDF
    function exportToPDF() {
        fetch('/data/schedulepayments.json')
            .then(response => response.json())
            .then(data => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
                const printDate = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                // Cargar la imagen y agregarla al PDF
                const img = new Image();
                img.src = '/data/images/banner_schedules.png';
                img.onload = function() {
                    doc.addImage(img, 'PNG', 10, 10, 190, 30);

                    doc.setFontSize(18);
                    doc.setTextColor(28, 30, 82); // Color del texto
                    doc.text('Programación de Pagos', 14, 50);
                    doc.setFontSize(12);
                    doc.text(`Fecha: ${today}`, 14, 60);
                    doc.text(`Total de Montos a pagar: ${formatCurrency(data.totalAmount)}`, 14, 70);
                    doc.text(`Saldo Inicial: ${formatCurrency(data.initialBalance)}`, 14, 80);
                    doc.text(`Saldo Final: ${formatCurrency(data.finalBalance)}`, 14, 90);

                    const headers = [["Beneficiario", "Concepto de Pago", "Monto"]];
                    const rows = data.payments.map(payment => [payment.beneficiary, payment.concept, formatCurrency(payment.amount)]);

                    doc.autoTable({
                        startY: 100,
                        head: headers,
                        body: rows,
                        headStyles: { fillColor: [28, 30, 82], textColor: [254, 255, 255] }, // Colores del encabezado
                        bodyStyles: { fillColor: [245, 245, 245], textColor: [28, 30, 82] } // Colores del cuerpo
                    });

                    // Agregar scholarPayments al PDF si el checkbox está habilitado
                    const scholarHeaders = [["Nombre del Maestro", "Carrera", "Materias", "Horas", "Total"]];
                    const scholarRows = data.scholarpayments
                        .filter(payment => payment.topay)
                        .map(payment => [
                            payment.teacherName,
                            payment.careerName,
                            payment.subjects.join(', '),
                            payment.totalHours,
                            formatCurrency(payment.totalPf)
                        ]);

                    if (scholarRows.length > 0) {
                        doc.autoTable({
                            startY: doc.lastAutoTable.finalY + 10,
                            head: scholarHeaders,
                            body: scholarRows,
                            headStyles: { fillColor: [28, 30, 82], textColor: [254, 255, 255] }, // Colores del encabezado
                            bodyStyles: { fillColor: [245, 245, 245], textColor: [28, 30, 82] } // Colores del cuerpo
                        });
                    }

                    // Agregar pie de página con la fecha y hora de impresión
                    doc.setFontSize(10);
                    doc.text(`Fecha de impresión: ${printDate}`, 14, doc.internal.pageSize.height - 10);

                    doc.save('schedulepayments.pdf');
                };
            })
            .catch(error => {
                console.error('Error exporting to PDF:', error);
            });
    }

    // Función para formatear los montos con separación de miles y símbolo de moneda
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount);
    }

    // Función para formatear el input de texto como moneda
    function formatCurrencyInput(input) {
        let value = input.value.replace(/[^0-9.]/g, '');
        if (value) {
            value = parseFloat(value).toFixed(2);
            input.value = formatCurrency(value);
        } else {
            input.value = formatCurrency(0);
        }
    }

    // Función para abrir el modal de agregar pago
    function openAddPaymentModal(button) {
        const row = button.closest('tr');
        const beneficiary = row.querySelector('select').value;
        const concept = row.querySelector('input[placeholder="Concepto de pago"]').value;
        const amount = row.querySelector('input[placeholder="Monto"]').value;
        const rowId = row.dataset.id; // Obtener el ID de la fila

        fetch('/data/payments.json', {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
            .then(response => response.json())
            .then(data => {
                const lastPayment = data.payments[data.payments.length - 1];
                const lastId = lastPayment ? parseInt(lastPayment.id.split('-')[0]) : 0;
                const nextCons = (lastId + 1).toString().padStart(3, '0'); // Asegurar que tenga 3 dígitos
                const currentYear = new Date().getFullYear();
                document.getElementById('paymentCons').value = `${nextCons}-${currentYear}`;
                document.getElementById('paymentDate').value = '';
                document.getElementById('paymentNotes').value = '';
                document.getElementById('paymentConcept').value = concept; // Establecer el concepto
                document.getElementById('paymentAmount').value = amount; // Establecer el monto
                document.getElementById('paymentRowId').value = rowId; // Establecer el ID de la fila
                document.getElementById('addPaymentModal').style.display = 'flex';

                // Asegurarse de que el select de beneficiarios esté disponible
                getBeneficiaryOptions().then(options => {
                    const selectElement = document.getElementById('paymentBeneficiary');
                    selectElement.innerHTML = `<option value="">Seleccione un beneficiario</option>${options}`;
                    selectElement.value = beneficiary; // Establecer el beneficiario seleccionado
                });
            })
            .catch(error => {
                console.error('Error loading payments:', error);
            });
    }

    // Función para cerrar el modal de agregar pago
    function closeAddPaymentModal() {
        document.getElementById('addPaymentModal').style.display = 'none';
    }

    // Función para agregar un pago desde el modal en scholarPayments
    function addScholarPayment() {
        const concept = document.getElementById('paymentConcept').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value.replace(/[^0-9.-]+/g,"")) || 0;

        if (concept && amount) {
            const tableBody = document.getElementById('scholarPaymentsTable').querySelector('tbody');
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>
                    <select onchange="savePayments()">
                        <option value="">Seleccione un beneficiario</option>
                        ${options}
                    </select>
                </td>
                <td><input type="text" placeholder="Concepto de pago" value="${concept}" oninput="savePayments()"></td>
                <td><input type="text" placeholder="Monto" value="${formatCurrency(amount)}" oninput="updateTotals(); savePayments();" onblur="formatCurrencyInput(this)"></td>
                <td>
                    <button class="btn btn-delete" onclick="removeScholarPaymentRow(this)">-</button>
                    <button class="btn btn-add" onclick="openAddPaymentModal()">+</button>
                </td>
            `;
            tableBody.appendChild(newRow);
            closeAddPaymentModal();
            savePayments();
        }
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Función para agregar un pago desde el modal
    function addPaymentto() {
        const cons = document.getElementById('paymentCons').value;
        const date = document.getElementById('paymentDate').value;
        const beneficiary = document.getElementById('paymentBeneficiary').value;
        const concept = document.getElementById('paymentConcept').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value.replace(/[^0-9.-]+/g,"")) || 0;
        const notes = document.getElementById('paymentNotes').value;
        const rowId = document.getElementById('paymentRowId').value; // Obtener el ID de la fila

        if (cons && date && beneficiary && concept && amount) {
            const newPayment = {
                id: cons,
                date: date,
                beneficiary: beneficiary,
                concept: concept,
                amount: amount,
                notes: notes,
                toggled: false,
                rowId: rowId // Agregar el ID de la fila al nuevo pago
            };

            fetch('/data/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newPayment)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Payment added:', data);
                closeAddPaymentModal();
                showPaymentSchedule();
                showNotification('Pago agregado exitosamente');

                // Paso adicional: eliminar la fila correspondiente en schedulepayments.json
                return fetch('/data/schedulepayments.json')
                    .then(response => response.json())
                    .then(scheduleData => {
                        const updatedPayments = scheduleData.payments.filter(payment => payment.id !== rowId);
                        scheduleData.payments = updatedPayments;
                        return fetch('/data/schedulepayments.json', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(scheduleData)
                        });
                    });
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Schedule payment row deleted:', data);
                showPaymentSchedule();
            })
            .catch(error => {
                console.error('Error adding payment:', error);
                showNotification('Error al agregar el pago', 'error');
            });
        } else {
            console.error('Invalid input data');
            showNotification('Datos de entrada inválidos', 'error');
        }
    }

    // Exportar las funciones si es necesario
    window.showPaymentSchedule = showPaymentSchedule;
    window.addPaymentRow = addPaymentRow;
    window.savePayments = savePayments;
    window.updateTotals = updateTotals;
    window.removePaymentRow = removePaymentRow;
    window.removeScholarPaymentRow = removeScholarPaymentRow; // Exportar la función
    window.formatCurrencyInput = formatCurrencyInput; // Asegúrate de exportar la función
    window.updateScholarPaymentTopay = updateScholarPaymentTopay; // Exportar la función
    window.openAddPaymentModal = openAddPaymentModal;
    window.closeAddPaymentModal = closeAddPaymentModal;
    window.addScholarPayment = addScholarPayment;
    window.addPaymentto = addPaymentto; // Exportar la nueva función

    // Cambiar el texto del botón "guardar pagos" por "Solicitar autorización"
    document.querySelector('.btn-save-payments').textContent = 'Solicitar autorización';
    document.querySelector('.btn-save-payments').onclick = exportToPDF;

    // Cargar los pagos al iniciar
    showPaymentSchedule();

    // Formatear el input de "Saldo Inicial" al perder el foco
    document.getElementById('initialBalance').addEventListener('blur', function() {
        formatCurrencyInput(this);
    });
});
