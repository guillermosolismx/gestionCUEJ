function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Funciones específicas para el modal de edición de profesores
function showEditModal(teacherId) {
    const teacher = teacherManager.teachers.find(t => t.id === teacherId);
    if (teacher) {
        teacherManager.currentTeacherEdit = teacherId;
        document.getElementById('editTeacherName').value = teacher.name;
        openModal('editTeacherModal');
    }
}

function closeEditModal() {
    teacherManager.currentTeacherEdit = null;
    document.getElementById('editTeacherName').value = '';
    closeModal('editTeacherModal');
}

function saveTeacherEdit() {
    const newName = document.getElementById('editTeacherName').value.trim();
    if (!newName) {
        showNotification('El nombre no puede estar vacío', 'error');
        return;
    }

    const teacherIndex = teacherManager.teachers.findIndex(t => t.id === teacherManager.currentTeacherEdit);
    if (teacherIndex !== -1) {
        teacherManager.teachers[teacherIndex].name = newName;
        teacherManager.saveTeachers();
        closeEditModal();
        showNotification('Profesor actualizado exitosamente', 'success');
    }
}

// Funciones para el modal de horarios
function showCreateScheduleModal() {
    openModal('createScheduleModal');
    initializeScheduleForm();
}

function closeCreateScheduleModal() {
    closeModal('createScheduleModal');
    resetScheduleForm();
}

// Event Listeners para cerrar modales al hacer clic fuera
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});
