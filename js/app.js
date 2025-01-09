document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM fully loaded and parsed');

    function showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('visible');
        });

        // Mostrar la sección seleccionada
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('visible');
        }

        // Actualizar el indicador activo en el sidebar
        document.querySelectorAll('.sidebar .btn').forEach(button => {
            if (button.getAttribute('data-section') === sectionId) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    window.showSection = showSection;

    try {
        if (typeof window.careerManager !== 'undefined') {
            await window.careerManager.loadCareers();
        }
        
        if (typeof window.teacherManager !== 'undefined') {
            await window.teacherManager.loadTeachers();
        }
        
        if (typeof window.scheduleManager !== 'undefined') {
            await window.scheduleManager.loadScheduleData();
        }

        if (typeof window.assignmentManager !== 'undefined') {
            await window.assignmentManager.loadAssignments();
        }

        if (typeof window.calculationManager !== 'undefined') {
            await window.calculationManager.loadAssignments();
            await window.calculationManager.loadTeachers();
        }

        // Inicializar el datepicker para la sección de cálculo
        $('#calculationDateRange').daterangepicker({
            locale: {
                format: 'YYYY-MM-DD'
            }
        }, function(start, end, label) {
            if (window.calculationManager) {
                window.calculationManager.updateTeacherSelect(start.toDate(), end.toDate());
            }
        });
    } catch (error) {
        console.error('Initialization error:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error al inicializar la aplicación', 'error');
        }
    }

    // Inicializar la primera sección visible
    showSection(); // Cambia 'teachers' por la sección que quieras mostrar inicialmente
});
