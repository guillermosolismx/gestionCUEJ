class CareerManager {
    constructor() {
        this.careers = [];
        this.expandedStates = {
            careers: new Set(),
            grades: new Set()
        };
    }

    // Añadir métodos para mantener el estado
    saveExpandedState() {
        document.querySelectorAll('.career-item').forEach(career => {
            const careerId = career.id.replace('career-', '');
            if (!career.classList.contains('collapsed')) {
                this.expandedStates.careers.add(careerId);
            }
        });

        document.querySelectorAll('.grade-item').forEach(grade => {
            const gradeId = grade.id.replace('grade-', '');
            if (!grade.classList.contains('collapsed')) {
                this.expandedStates.grades.add(gradeId);
            }
        });
    }

    restoreExpandedState() {
        this.expandedStates.careers.forEach(careerId => {
            const careerElement = document.getElementById(`career-${careerId}`);
            if (careerElement) {
                careerElement.classList.remove('collapsed');
                const button = careerElement.querySelector('.collapse-btn');
                if (button) button.textContent = '-';
            }
        });

        this.expandedStates.grades.forEach(gradeId => {
            const gradeElement = document.getElementById(`grade-${gradeId}`);
            if (gradeElement) {
                gradeElement.classList.remove('collapsed');
                const button = gradeElement.querySelector('.collapse-btn');
                if (button) button.textContent = '-';
            }
        });
    }

    async loadCareers() {
        try {
            this.saveExpandedState(); // Guardar estado antes de actualizar
            const response = await fetch('http://localhost:3001/data/careers.json');
            const data = await response.json();
            this.careers = data.careers || [];
            this.renderCareers();
            this.restoreExpandedState(); // Restaurar estado después de renderizar
        } catch (error) {
            console.error('Error loading careers:', error);
            showNotification('Error al cargar las carreras', 'error');
        }
    }

    async saveCareer(careerData) {
        try {
            const response = await fetch('http://localhost:3001/data/careers.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ careers: careerData })
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            await this.loadCareers();
            showNotification('Datos guardados exitosamente', 'success');
        } catch (error) {
            console.error('Error saving careers:', error);
            showNotification('Error al guardar los datos', 'error');
        }
    }

    renderCareers() {
        const list = document.getElementById('careerList');
        if (!list) return;

        list.innerHTML = this.careers.map(career => `
            <div class="career-item collapsed" id="career-${career.id}">
                <div class="form-inline">
                    <div class="career-header" onclick="careerManager.toggleCareer('${career.id}', event)">
                        <button class="collapse-btn" onclick="event.stopPropagation()">+</button>
                        <h3>${career.name}</h3>
                    </div>
                    <button class="btn btn-delete" onclick="careerManager.deleteCareer('${career.id}')">Eliminar Carrera</button>
                    <button class="btn btn-calculate" onclick="careerManager.openCalculationModal('${career.id}')">Base Cálculo</button>
                </div>
                <div class="career-content">
                    <div class="form-inline">
                        <input type="text" id="grade-${career.id}" placeholder="Nombre del grado">
                        <button class="btn" onclick="careerManager.addGrade('${career.id}')">Agregar Grado</button>
                    </div>
                    <div class="grades-list" id="grades-${career.id}">
                        ${this.renderGrades(career.grades || [], career.id)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderGrades(grades, careerId) {
        return grades.map(grade => `
            <div class="grade-item collapsed" id="grade-${grade.id}">
                <div class="form-inline">
                    <div class="grade-header" onclick="careerManager.toggleGrade('${grade.id}', event)">
                        <button class="collapse-btn" onclick="event.stopPropagation()">+</button>
                        <h4>${grade.name}</h4>
                    </div>
                    <button class="btn btn-small btn-delete" onclick="careerManager.deleteGrade('${careerId}', '${grade.id}')">
                        Eliminar
                    </button>
                </div>
                <div class="grade-content">
                    <div class="form-inline">
                        <input type="text" id="subject-${grade.id}" placeholder="Nombre de la materia">
                        <button class="btn btn-small" onclick="careerManager.addSubject('${careerId}', '${grade.id}', event)">
                            Agregar Materia
                        </button>
                    </div>
                    <ul class="subject-list">
                        ${(grade.subjects || []).map(subject => `
                            <li class="subject-item">
                                ${subject.name}
                                <button class="btn btn-small btn-delete" 
                                        onclick="careerManager.deleteSubject('${careerId}', '${grade.id}', '${subject.id}')">
                                    Eliminar
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    }

    // Métodos para manejar carreras
    async addCareer() {
        const nameInput = document.getElementById('careerName');
        const name = nameInput.value.trim();
        
        if (!name) {
            showNotification('Por favor ingrese el nombre de la carrera', 'error');
            return;
        }

        const newCareer = {
            id: crypto.randomUUID(),
            name: name,
            grades: []
        };

        this.careers.push(newCareer);
        await this.saveCareer(this.careers);
        nameInput.value = '';
    }

    async deleteCareer(careerId) {
        this.careers = this.careers.filter(c => c.id !== careerId);
        await this.saveCareer(this.careers);
    }

    // Métodos para manejar grados
    async addGrade(careerId) {
        const gradeInput = document.getElementById(`grade-${careerId}`);
        const gradeName = gradeInput.value.trim();
        
        if (!gradeName) {
            showNotification('Por favor ingrese el nombre del grado', 'error');
            return;
        }

        const career = this.careers.find(c => c.id === careerId);
        if (career) {
            career.grades.push({
                id: crypto.randomUUID(),
                name: gradeName,
                subjects: []
            });
            await this.saveCareer(this.careers);
            gradeInput.value = '';
            this.expandCareer(careerId); // Expandir la carrera al agregar un grado
        }
    }

    async deleteGrade(careerId, gradeId) {
        const career = this.careers.find(c => c.id === careerId);
        if (career) {
            career.grades = career.grades.filter(g => g.id !== gradeId);
            await this.saveCareer(this.careers);
        }
    }

    // Métodos para manejar materias
    async addSubject(careerId, gradeId, event) {
        event.preventDefault(); // Prevenir el comportamiento por defecto del formulario

        const subjectInput = document.getElementById(`subject-${gradeId}`);
        const subjectName = subjectInput.value.trim();
        
        if (!subjectName) {
            showNotification('Por favor ingrese el nombre de la materia', 'error');
            return;
        }

        const career = this.careers.find(c => c.id === careerId);
        if (!career) return;

        const grade = career.grades.find(g => g.id === gradeId);
        if (grade) {
            grade.subjects.push({
                id: crypto.randomUUID(),
                name: subjectName
            });
            await this.saveCareer(this.careers);
            subjectInput.value = '';
            this.expandCareer(careerId); // Expandir la carrera al agregar una materia
            this.expandGrade(gradeId); // Expandir el grado al agregar una materia

            // Llevar el scroll hasta abajo después de la actualización
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    async deleteSubject(careerId, gradeId, subjectId) {
        const career = this.careers.find(c => c.id === careerId);
        if (!career) return;

        const grade = career.grades.find(g => g.id === gradeId);
        if (grade) {
            grade.subjects = grade.subjects.filter(s => s.id !== subjectId);
            await this.saveCareer(this.careers);
        }
    }

    // Métodos para manejar colapso/expansión
    toggleCareer(careerId, event) {
        // Prevenir que el clic se propague si viene del botón de eliminar
        if (event && event.target.classList.contains('btn-delete')) {
            return;
        }

        const careerElement = document.getElementById(`career-${careerId}`);
        if (!careerElement) return;
        
        const button = careerElement.querySelector('.collapse-btn');
        const isCollapsed = careerElement.classList.contains('collapsed');
        
        if (isCollapsed) {
            careerElement.classList.remove('collapsed');
            button.textContent = '-';
            this.expandedStates.careers.add(careerId);
        } else {
            careerElement.classList.add('collapsed');
            button.textContent = '+';
            this.expandedStates.careers.delete(careerId);
        }
    }

    toggleGrade(gradeId, event) {
        // Prevenir que el clic se propague si viene del botón de eliminar
        if (event && event.target.classList.contains('btn-delete')) {
            return;
        }

        const gradeElement = document.getElementById(`grade-${gradeId}`);
        if (!gradeElement) return;
        
        const button = gradeElement.querySelector('.collapse-btn');
        const isCollapsed = gradeElement.classList.contains('collapsed');
        
        if (isCollapsed) {
            gradeElement.classList.remove('collapsed');
            button.textContent = '-';
            this.expandedStates.grades.add(gradeId);
        } else {
            gradeElement.classList.add('collapsed');
            button.textContent = '+';
            this.expandedStates.grades.delete(gradeId);
        }
    }

    expandCareer(careerId) {
        const careerElement = document.getElementById(`career-${careerId}`);
        if (careerElement && careerElement.classList.contains('collapsed')) {
            careerElement.classList.remove('collapsed');
            const button = careerElement.querySelector('.collapse-btn');
            if (button) button.textContent = '-';
        }
    }

    expandGrade(gradeId) {
        const gradeElement = document.getElementById(`grade-${gradeId}`);
        if (gradeElement && gradeElement.classList.contains('collapsed')) {
            gradeElement.classList.remove('collapsed');
            const button = gradeElement.querySelector('.collapse-btn');
            if (button) button.textContent = '-';
        }
    }

    openCalculationModal(careerId) {
        const modal = document.getElementById('calculationModal');
        const career = this.careers.find(c => c.id === careerId);
        if (career) {
            const paymentInput = document.getElementById('paymentPerHour');
            paymentInput.value = career.payperhour || '$0.00';
            modal.style.display = 'flex';
            modal.dataset.careerId = careerId;
        }
    }

    closeCalculationModal() {
        const modal = document.getElementById('calculationModal');
        modal.style.display = 'none';
    }

    async saveCalculation() {
        const modal = document.getElementById('calculationModal');
        const careerId = modal.dataset.careerId;
        const paymentInput = document.getElementById('paymentPerHour');
        const paymentPerHour = parseFloat(paymentInput.value.replace(/[^0-9.]/g, ''));

        if (isNaN(paymentPerHour) || paymentPerHour < 0) {
            showNotification('Por favor ingrese un pago por hora válido', 'error');
            return;
        }

        const career = this.careers.find(c => c.id === careerId);
        if (career) {
            career.payperhour = `$${paymentPerHour.toFixed(2)}`;
            await this.saveCareer(this.careers);
            this.closeCalculationModal();
        }
    }
}

// Inicializar y hacer disponible globalmente
window.careerManager = new CareerManager();

// Cargar carreras al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    careerManager.loadCareers();
});
