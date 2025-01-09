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

    async addTeacher(name) {
        if (!name.trim()) {
            showNotification('Por favor ingrese el nombre del profesor', 'error');
            return;
        }

        const teacher = {
            id: Date.now().toString(),
            name: name.trim()
        };

        this.teachers.push(teacher);
        await this.saveTeachers();
        return teacher;
    },

    async saveTeachers() {
        await saveData('teachers.json', { teachers: this.teachers });
        this.updateTeacherList();
    },

    updateTeacherList() {
        const list = document.getElementById('teacherList');
        if (!list) return;
        
        list.innerHTML = this.teachers.map(teacher => `
            <li class="teacher-item">
                <span>${teacher.name}</span>
                <div class="button-group">
                    <button class="btn btn-small btn-edit" onclick="teacherManager.showEditModal('${teacher.id}')">
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
