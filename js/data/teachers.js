const teacherManager = {
    teachers: [],
    currentTeacherEdit: null,

    async loadTeachers() {
        try {
            const data = await fetchData('teachers.json');
            this.teachers = Array.isArray(data.teachers) ? data.teachers : [];
            this.updateTeacherList();
        } catch (error) {
            console.error('Error loading teachers:', error);
            showNotification('Error al cargar los profesores', 'error');
        }
    },

    async saveTeachers() {
        await saveData('teachers.json', { teachers: this.teachers });
        this.updateTeacherList();
    },

    async addTeacher() {
        const nameInput = document.getElementById('teacherName');
        const teacherName = nameInput.value.trim();
        
        if (!teacherName) {
            showNotification('Por favor ingrese un nombre válido', 'error');
            return;
        }

        const newTeacher = {
            id: crypto.randomUUID(),
            name: teacherName
        };

        this.teachers.push(newTeacher);
        await this.saveTeachers();
        
        // Limpiar el input
        nameInput.value = '';
        showNotification('Profesor agregado exitosamente', 'success');
    },

    editTeacher(id) {
        const teacher = this.teachers.find(t => t.id === id);
        if (teacher) {
            document.getElementById('editTeacherName').value = teacher.name;
            document.getElementById('editTeacherModal').style.display = 'flex';
            document.getElementById('editTeacherModal').setAttribute('data-teacher-id', id);
        }
    },

    saveTeacherEdit() {
        const id = document.getElementById('editTeacherModal').getAttribute('data-teacher-id');
        const newName = document.getElementById('editTeacherName').value;
        const teacher = this.teachers.find(t => t.id === id);
        if (teacher) {
            teacher.name = newName;
            this.saveTeachers();
            this.updateTeacherList();
            this.closeEditModal();
        }
    },

    closeEditModal() {
        document.getElementById('editTeacherModal').style.display = 'none';
        document.getElementById('editTeacherModal').removeAttribute('data-teacher-id');
    },

    async deleteTeacher(id) {
        this.teachers = this.teachers.filter(t => t.id !== id);
        await this.saveTeachers();
        showNotification('Profesor eliminado exitosamente', 'success');
    },

    updateTeacherList() {
        const list = document.getElementById('teacherList');
        if (!list) return;
        
        list.innerHTML = this.teachers.map(teacher => `
            <li class="teacher-item">
                <span>${teacher.name}</span>
                <div class="button-group">
                    <button class="btn btn-small btn-edit" onclick="teacherManager.editTeacher('${teacher.id}')">
                        Editar
                    </button>
                    <button class="btn btn-small btn-delete" onclick="teacherManager.deleteTeacher('${teacher.id}')">
                        Eliminar
                    </button>
                </div>
            </li>
        `).join('');
    }
};

// Hacer teacherManager disponible globalmente
window.teacherManager = teacherManager;

// Hacer addTeacher disponible globalmente
window.addTeacher = function() {
    teacherManager.addTeacher();
};

// Hacer closeEditModal disponible globalmente
window.closeEditModal = function() {
    teacherManager.closeEditModal();
};

// Hacer saveTeacherEdit disponible globalmente
window.saveTeacherEdit = function() {
    teacherManager.saveTeacherEdit();
};

// Event Handlers
document.getElementById('teacherForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('teacherName');
    await teacherManager.addTeacher(nameInput.value);
    nameInput.value = '';
});

document.addEventListener('DOMContentLoaded', () => {
    teacherManager.loadTeachers();
});
