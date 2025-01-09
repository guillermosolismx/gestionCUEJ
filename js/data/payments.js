document.addEventListener('DOMContentLoaded', function() {
    console.log('Payments script loaded');

    function loadPayments() {
        fetch('/data/payments.json')
            .then(response => response.json())
            .then(data => {
                renderPayments(data.payments || []);
            })
            .catch(error => {
                console.error('Error loading payments:', error);
            });
    }

    function renderPayments(payments) {
        const paymentsTableBody = document.getElementById('paymentsTableBody');
        paymentsTableBody.innerHTML = '';

        // Ordenar los pagos de mayor a menor por id
        payments.sort((a, b) => b.id.localeCompare(a.id));

        payments.forEach(payment => {
            const date = new Date(payment.date);
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Ajustar la fecha para la zona horaria local
            const formattedDate = date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

            const row = document.createElement('tr');
            if (payment.toggled) {
                row.classList.add('toggled');
            }
            row.innerHTML = `
                <td>${payment.id}</td>
                <td>${formattedDate}</td>
                <td>${payment.beneficiary}</td>
                <td>${payment.concept}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td style="display: none;">${payment.rowId}</td> <!-- Ocultar la columna rowId -->
                <td>
                    <button class="btn btn-view" onclick="openNotesModal('${payment.id}', '${payment.notes}')">><</button>
                    <button class="btn btn-delete" onclick="togglePaymentRow(this, '${payment.id}')">-</button>
                </td>
            `;
            paymentsTableBody.appendChild(row);
        });
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount);
    }

    // Función para abrir el modal de notas
    function openNotesModal(id, notes) {
        document.getElementById('notesContent').value = notes;
        document.getElementById('notesModal').dataset.id = id;
        document.getElementById('notesModal').style.display = 'flex';
    }

    // Función para cerrar el modal de notas
    function closeNotesModal() {
        document.getElementById('notesModal').style.display = 'none';
    }

    // Función para guardar las notas editadas
    function saveNotes() {
        const id = document.getElementById('notesModal').dataset.id;
        const newNotes = document.getElementById('notesContent').value;

        fetch('/data/payments.json')
            .then(response => response.json())
            .then(data => {
                const payments = data.payments.map(payment => {
                    if (payment.id === id) {
                        payment.notes = newNotes;
                    }
                    return payment;
                });

                return fetch('/data/payments.json', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ payments })
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Notes updated:', data);
                closeNotesModal();
                loadPayments();
            })
            .catch(error => {
                console.error('Error updating notes:', error);
            });
    }

    // Función para tachar y cambiar el color de las celdas al dar click en "-"
    function togglePaymentRow(button, id) {
        const row = button.closest('tr');

        fetch('/data/payments.json')
            .then(response => response.json())
            .then(data => {
                const payments = data.payments.map(payment => {
                    if (payment.id === id) {
                        payment.toggled = !payment.toggled;
                    }
                    return payment;
                });

                return fetch('/data/payments.json', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ payments })
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Payment toggled:', data);
                row.classList.toggle('toggled');
            })
            .catch(error => {
                console.error('Error toggling payment:', error);
            });
    }

    // Función para actualizar el visualizador en tiempo real
    function updatePayments() {
        fetch('/data/payments.json')
            .then(response => response.json())
            .then(data => {
                renderPayments(data.payments || []);
            })
            .catch(error => {
                console.error('Error updating payments:', error);
            });
    }

    // Función para abrir el modal de ReportePDF
    function openReportModal() {
        document.getElementById('reportModal').style.display = 'flex';
    }

    // Función para cerrar el modal de ReportePDF
    function closeReportModal() {
        document.getElementById('reportModal').style.display = 'none';
    }

    // Función para exportar el reporte a PDF
    function exportReportToPDF() {
        const dateRange = document.getElementById('reportDateRange').value.split(' - ');
        const excludeCanceled = document.getElementById('excludeCanceled').checked;

        const startDate = new Date(dateRange[0]);
        const endDate = new Date(dateRange[1]);

        fetch('/data/payments.json')
            .then(response => response.json())
            .then(data => {
                const filteredPayments = data.payments.filter(payment => {
                    const paymentDate = new Date(payment.date);
                    const isInRange = paymentDate >= startDate && paymentDate <= endDate;
                    const isNotCanceled = excludeCanceled ? !payment.toggled : true;
                    return isInRange && isNotCanceled;
                });

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const printDate = new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                // Cargar la imagen y agregarla al PDF
                const img = new Image();
                img.src = '/data/images/banner_schedules.png';
                img.onload = function() {
                    doc.addImage(img, 'PNG', 10, 10, 190, 30);

                    doc.setFontSize(18);
                    doc.setTextColor(28, 30, 82); // Color del texto
                    doc.text('Reporte de Pagos', 14, 50);
                    doc.setFontSize(12);
                    doc.text(`Rango de Fechas: ${dateRange[0]} a ${dateRange[1]}`, 14, 60); // Agregar el rango de fechas

                    const headers = [["CONS", "FECHA", "BENEFICIARIO", "CONCEPTO", "MONTO", "NOTAS"]];
                    const rows = filteredPayments.map(payment => [
                        payment.id,
                        new Date(payment.date).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
                        payment.beneficiary,
                        payment.concept,
                        formatCurrency(payment.amount),
                        payment.notes
                    ]);

                    doc.autoTable({
                        startY: 70,
                        head: headers,
                        body: rows,
                        headStyles: { fillColor: [28, 30, 82], textColor: [254, 255, 255] }, // Colores del encabezado
                        bodyStyles: { fillColor: [245, 245, 245], textColor: [28, 30, 82] } // Colores del cuerpo
                    });

                    // Agregar pie de página con la fecha y hora de impresión
                    doc.setFontSize(10);
                    doc.text(`Fecha de impresión: ${printDate}`, 14, doc.internal.pageSize.height - 10);

                    doc.save('reporte_pagos.pdf');
                    closeReportModal();
                };
            })
            .catch(error => {
                console.error('Error exporting report to PDF:', error);
            });
    }

    // Cargar los pagos al iniciar
    loadPayments();

    // Actualizar el visualizador cada 5 segundos
    setInterval(updatePayments, 5000);

    // Exportar las funciones si es necesario
    window.openNotesModal = openNotesModal;
    window.closeNotesModal = closeNotesModal;
    window.saveNotes = saveNotes;
    window.togglePaymentRow = togglePaymentRow;
    window.openReportModal = openReportModal;
    window.closeReportModal = closeReportModal;
    window.exportReportToPDF = exportReportToPDF;
});
