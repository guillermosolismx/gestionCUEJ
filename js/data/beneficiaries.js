document.addEventListener('DOMContentLoaded', function() {
    console.log('Beneficiaries script loaded');

    const beneficiaryManager = {
        beneficiaries: [],
        currentEditIndex: null,

        loadBeneficiaries() {
            fetch('/data/beneficiaries.json')
                .then(response => response.json())
                .then(data => {
                    this.beneficiaries = data.beneficiaries || [];
                    this.renderBeneficiaries();
                })
                .catch(error => {
                    console.error('Error loading beneficiaries:', error);
                });
        },

        addBeneficiary(name) {
            if (name.trim() === '') return;
            const id = this.generateUniqueId();
            this.beneficiaries.push({ id, name });
            this.renderBeneficiaries();
            this.saveBeneficiaries();
            this.showNotification('Beneficiario agregado exitosamente', 'success');
        },

        removeBeneficiary(index) {
            this.beneficiaries.splice(index, 1);
            this.renderBeneficiaries();
            this.saveBeneficiaries();
            this.showNotification('Beneficiario eliminado exitosamente', 'success');
        },

        editBeneficiary(index, newName) {
            if (newName.trim() === '') return;
            this.beneficiaries[index].name = newName;
            this.renderBeneficiaries();
            this.saveBeneficiaries();
            this.showNotification('Nombre del beneficiario editado', 'success');
        },

        renderBeneficiaries() {
            const beneficiaryList = document.getElementById('beneficiaryList');
            beneficiaryList.innerHTML = '';
            this.beneficiaries.forEach((beneficiary, index) => {
                const li = document.createElement('li');
                li.className = 'beneficiary-item';
                li.innerHTML = `
                    ${beneficiary.name}
                    <div>
                        <button class="btn btn-edit" onclick="beneficiaryManager.showEditModal(${index}, '${beneficiary.name}')">Editar</button>
                        <button class="btn btn-delete" onclick="beneficiaryManager.removeBeneficiary(${index})">Eliminar</button>
                    </div>
                `;
                beneficiaryList.appendChild(li);
            });
        },

        showEditModal(index, currentName) {
            this.currentEditIndex = index;
            document.getElementById('editBeneficiaryName').value = currentName;
            document.getElementById('editBeneficiaryModal').style.display = 'flex';
        },

        closeEditModal() {
            document.getElementById('editBeneficiaryModal').style.display = 'none';
        },

        saveBeneficiaryEdit() {
            const newName = document.getElementById('editBeneficiaryName').value;
            if (newName !== null) {
                this.editBeneficiary(this.currentEditIndex, newName);
                this.closeEditModal();
            }
        },

        saveBeneficiaries() {
            // Enviar los datos al servidor para guardarlos en data/beneficiaries.json
            fetch('/data/beneficiaries.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ beneficiaries: this.beneficiaries })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Beneficiaries saved:', data);
            })
            .catch(error => {
                console.error('Error saving beneficiaries:', error);
            });
        },

        generateUniqueId() {
            return 'id-' + Math.random().toString(36).substr(2, 9);
        },

        showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerText = message;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    };

    // Cargar los beneficiarios al iniciar
    beneficiaryManager.loadBeneficiaries();

    // Exportar el objeto beneficiaryManager si es necesario
    window.beneficiaryManager = beneficiaryManager;
    window.closeEditBeneficiaryModal = beneficiaryManager.closeEditModal.bind(beneficiaryManager);
    window.saveBeneficiaryEdit = beneficiaryManager.saveBeneficiaryEdit.bind(beneficiaryManager);
});
