class FormatManager {
    constructor() {
        this.formats = [];
    }

    async loadFormats() {
        try {
            const response = await fetch('http://0.0.0.0:3001/data/formats.json');
            const data = await response.json();
            this.formats = data.formats || [];
            this.renderFormatsList();
        } catch (error) {
            console.error('Error loading formats:', error);
            showNotification('Error al cargar los formatos', 'error');
        }
    }

    renderFormatsList() {
        const formatsList = document.getElementById('formatsList');
        if (!formatsList) return;

        if (!this.formats || this.formats.length === 0) {
            formatsList.innerHTML = '<p>No hay formatos guardados</p>';
            return;
        }

        formatsList.innerHTML = this.formats.map(format => `
            <div class="format-item">
                <div class="format-info">
                    <h3>${format.name}</h3>
                    <p>${format.content}</p>
                </div>
                <div class="format-actions">
                    <button class="btn btn-edit" onclick="formatManager.editFormat('${format.id}')">Editar</button>
                    <button class="btn btn-delete" onclick="formatManager.deleteFormat('${format.id}')">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    async saveFormat() {
        const formatName = document.getElementById('formatName').value;
        const formatContent = document.getElementById('formatContent').value;

        if (!formatName || !formatContent) {
            showNotification('Por favor complete todos los campos', 'error');
            return;
        }

        const newFormat = {
            id: crypto.randomUUID(),
            name: formatName,
            content: formatContent
        };

        this.formats.push(newFormat);
        await this.saveFormats();
        this.renderFormatsList();
        showNotification('Formato guardado exitosamente', 'success');
    }

    async saveFormats() {
        try {
            const dataToSend = { formats: this.formats };
            const response = await fetch('http://0.0.0.0:3001/data/formats.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Formats saved successfully:', result);
            return result;
        } catch (error) {
            console.error('Error saving formats:', error);
            showNotification('Error al guardar los formatos', 'error');
            throw error;
        }
    }

    async deleteFormat(formatId) {
        this.formats = this.formats.filter(format => format.id !== formatId);
        await this.saveFormats();
        this.renderFormatsList();
        showNotification('Formato eliminado exitosamente', 'success');
    }

    editFormat(formatId) {
        const format = this.formats.find(f => f.id === formatId);
        if (!format) {
            showNotification('Formato no encontrado', 'error');
            return;
        }

        document.getElementById('formatName').value = format.name;
        document.getElementById('formatContent').value = format.content;
        document.getElementById('saveFormatButton').onclick = () => this.updateFormat(formatId);
    }

    async updateFormat(formatId) {
        const formatName = document.getElementById('formatName').value;
        const formatContent = document.getElementById('formatContent').value;

        const formatIndex = this.formats.findIndex(f => f.id === formatId);
        if (formatIndex === -1) {
            showNotification('Formato no encontrado', 'error');
            return;
        }

        this.formats[formatIndex] = { id: formatId, name: formatName, content: formatContent };
        await this.saveFormats();
        this.renderFormatsList();
        showNotification('Formato actualizado exitosamente', 'success');
    }
}

// Inicializar el manejador de formatos y hacerlo globalmente disponible
window.formatManager = new FormatManager();
window.formatManager.loadFormats();
