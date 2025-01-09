import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(__dirname));

// Configurar CORS
const allowedOrigins = ['http://localhost:3001', 'http://127.0.0.1:3001'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'PUT', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// Función auxiliar para leer/escribir archivos
async function handleJsonFile(filePath, operation, data = null) {
    try {
        const fullPath = path.join(__dirname, 'data', filePath);
        
        // Verificar si el directorio existe
        const dirPath = path.dirname(fullPath);
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }

        if (operation === 'read') {
            try {
                const content = await fs.readFile(fullPath, 'utf8');
                return JSON.parse(content);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // Si el archivo no existe, crear uno nuevo con estructura vacía
                    const defaultData = { [filePath.replace('.json', '')]: [] };
                    await fs.writeFile(fullPath, JSON.stringify(defaultData, null, 2));
                    return defaultData;
                }
                throw error;
            }
        } else if (operation === 'write' && data) {
            // Asegurarse de que los datos tengan la estructura correcta
            const fileData = typeof data === 'object' ? data : { [filePath.replace('.json', '')]: data };
            await fs.writeFile(fullPath, JSON.stringify(fileData, null, 2));
            return fileData;
        }
    } catch (error) {
        console.error(`Error handling file ${filePath}:`, error);
        throw error;
    }
}

// Validación de datos
function validateData(type, data) {
    switch (type) {
        case 'teachers':
            return Array.isArray(data.teachers) && data.teachers.every(t => 
                t.id && typeof t.name === 'string' && t.name.length > 0
            );
        case 'subjects':
            return Array.isArray(data.subjects) && data.subjects.every(s => 
                s.id && typeof s.name === 'string' && s.name.length > 0
            );
        case 'careers':
            return Array.isArray(data.careers) && data.careers.every(c => 
                c.id && typeof c.name === 'string' && c.name.length > 0 &&
                Array.isArray(c.grades) && c.grades.every(g =>
                    g.id && typeof g.name === 'string' && g.name.length > 0 &&
                    Array.isArray(g.subjects)
                )
            );
        case 'schedules':
            return Array.isArray(data.schedules) && data.schedules.every(s => 
                s.id && typeof s.careerId === 'string' && s.careerId.length > 0 &&
                typeof s.gradeId === 'string' && s.gradeId.length > 0 &&
                typeof s.careerName === 'string' && s.careerName.length > 0 &&
                typeof s.gradeName === 'string' && s.gradeName.length > 0 &&
                typeof s.cycleId === 'string' && s.cycleId.length > 0 &&
                typeof s.cycleName === 'string' && s.cycleName.length > 0 &&
                Array.isArray(s.selectedDays) && s.selectedDays.length > 0 &&
                Array.isArray(s.modules) && s.modules.every(m =>
                    m.id && typeof m.startDate === 'string' && m.startDate.length > 0 &&
                    typeof m.endDate === 'string' && m.endDate.length > 0 &&
                    Array.isArray(m.timeSlots)
                )
            );
        case 'assignments':
            return Array.isArray(data.assignments) && data.assignments.every(a => 
                a.id && typeof a.scheduleId === 'string' && 
                typeof a.scheduleName === 'string' && 
                Array.isArray(a.gridData)
            );
        default:
            return true; // Cambiado de false a true para ser más permisivo
    }
}

// Modificar el endpoint GET para manejar mejor los errores
app.get('/data/:file', async (req, res) => {
    try {
        const data = await handleJsonFile(`${req.params.file}`, 'read');
        console.log('Datos leídos:', data); // Para depuración
        res.json(data);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: 'Error reading file', details: error.message });
    }
});

// Endpoint mejorado para guardar archivos
app.put('/data/:file', async (req, res) => {
    try {
        const fileName = req.params.file;
        const data = req.body;

        // Validar el formato de los datos
        if (!validateData(fileName.replace('.json', ''), data)) {
            console.error('Datos inválidos:', data); // Para depuración
            return res.status(400).json({ error: 'Invalid data format' });
        }

        // Guardar los datos en el archivo correspondiente
        await handleJsonFile(fileName, 'write', data);
        res.json({ success: true });
    } catch (error) {
        console.error('Error writing file:', error);
        res.status(500).json({ error: 'Error writing file', details: error.message });
    }
});

// Crear carpeta data si no existe
const ensureDataFolder = async () => {
    const dataPath = path.join(__dirname, 'data');
    try {
        await fs.access(dataPath);
    } catch {
        await fs.mkdir(dataPath);
    }
    
    // Crear archivos JSON iniciales si no existen
    const initialFiles = {
        'teachers.json': { teachers: [] },
        'subjects.json': { subjects: [] },
        'careers.json': { careers: [] },
        'assignments.json': { assignments: [] },
        'schedules.json': { schedules: [] },
        'scheduleConfig.json': {
            weekDays: [
                { id: '6', name: 'Sábado' },
                { id: '5', name: 'Viernes' },
                { id: '4', name: 'Jueves' },
                { id: '3', name: 'Miércoles' },
                { id: '2', name: 'Martes' },
                { id: '1', name: 'Lunes' },
                { id: '0', name: 'Domingo' }
            ]
            // Eliminados los timeSlots ya que se manejan desde el ScheduleManager
        }
    };

    for (const [fileName, initialData] of Object.entries(initialFiles)) {
        const filePath = path.join(dataPath, fileName);
        try {
            await fs.access(filePath);
        } catch {
            await handleJsonFile(fileName, 'write', initialData);
        }
    }
};

// Endpoint para manejar solicitudes POST a assignments.json
app.post('/data/assignments', async (req, res) => {
    try {
        const data = req.body;
        const filePath = path.join(__dirname, 'data', 'assignments.json');

        // Leer el contenido actual del archivo
        const currentData = await handleJsonFile('assignments.json', 'read');

        // Agregar los nuevos datos al contenido actual
        currentData.assignments.push(...data);

        // Escribir el contenido actualizado en el archivo
        await fs.writeFile(filePath, JSON.stringify(currentData, null, 2));
        res.send('Data saved successfully');
    } catch (err) {
        console.error('Error writing to file', err);
        res.status(500).send('Error writing to file');
    }
});

// Endpoint para manejar solicitudes DELETE a assignments.json
app.delete('/data/assignments/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id); // Asegúrate de que el ID sea un número
        console.log(`Eliminando asignación con ID: ${id}`); // Log para depuración
        const filePath = path.join(__dirname, 'data', 'assignments.json');

        // Leer el contenido actual del archivo
        const currentData = await handleJsonFile('assignments.json', 'read');
        console.log('Datos actuales:', currentData); // Log para depuración

        // Filtrar los datos para eliminar la asignación con el id especificado
        const updatedAssignments = currentData.assignments.filter(assignment => assignment.id !== id);
        console.log('Datos actualizados:', updatedAssignments); // Log para depuración

        // Escribir el contenido actualizado en el archivo
        await fs.writeFile(filePath, JSON.stringify({ assignments: updatedAssignments }, null, 2));
        res.send('Assignment deleted successfully');
    } catch (err) {
        console.error('Error deleting assignment', err);
        res.status(500).send('Error deleting assignment');
    }
});

// Ruta para obtener los beneficiarios
app.get('/data/beneficiaries.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'beneficiaries.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading beneficiaries.json:', err);
            return res.status(500).send('Error reading beneficiaries.json');
        }
        res.send(data);
    });
});

// Ruta para guardar los beneficiarios
app.put('/data/beneficiaries.json', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'beneficiaries.json');
        const beneficiariesData = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, beneficiariesData, 'utf8');
        res.send({ message: 'Beneficiaries saved successfully' });
    } catch (err) {
        console.error('Error writing to beneficiaries.json:', err);
        res.status(500).send('Error saving beneficiaries');
    }
});

// Ruta para guardar los pagos
app.put('/data/schedulepayments.json', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'schedulepayments.json');
        const paymentsData = JSON.stringify(req.body, null, 2);
        await fs.writeFile(filePath, paymentsData, 'utf8');
        res.send({ message: 'Payments saved successfully' });
    } catch (err) {
        console.error('Error writing to schedulepayments.json:', err);
        res.status(500).send('Error saving payments');
    }
});

// Endpoint para manejar solicitudes POST a payments.json
app.post('/data/payments', async (req, res) => {
    try {
        const newPayment = req.body;
        const filePath = path.join(__dirname, 'data', 'payments.json');

        // Leer el contenido actual del archivo
        const currentData = await handleJsonFile('payments.json', 'read');

        // Agregar el nuevo pago al contenido actual
        currentData.payments.push(newPayment);

        // Escribir el contenido actualizado en el archivo
        await fs.writeFile(filePath, JSON.stringify(currentData, null, 2));
        res.json({ message: 'Payment added successfully' });
    } catch (err) {
        console.error('Error writing to file', err);
        res.status(500).send('Error writing to file');
    }
});

// Endpoint para eliminar una fila en schedulepayments.json basado en el ID
app.delete('/data/schedulepayments/:id', async (req, res) => {
    try {
        const id = decodeURIComponent(req.params.id); // Decodificar el ID
        const filePath = path.join(__dirname, 'data', 'schedulepayments.json');

        // Leer el contenido actual del archivo
        const currentData = await handleJsonFile('schedulepayments.json', 'read');

        // Filtrar los datos para eliminar la fila con el id especificado
        const updatedPayments = currentData.payments.filter(payment => payment.id !== id);
        currentData.payments = updatedPayments;

        // Escribir el contenido actualizado en el archivo
        await fs.writeFile(filePath, JSON.stringify(currentData, null, 2));
        res.send('Payment row deleted successfully');
    } catch (err) {
        console.error('Error deleting payment row', err);
        res.status(500).send('Error deleting payment row');
    }
});

// Ruta para guardar los pagos
app.put('/data/scholarpayments.json', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'data', 'scholarpayments.json');
        const newPaymentsData = req.body.scholarpayments;

        // Leer el contenido actual del archivo
        const currentData = await handleJsonFile('scholarpayments.json', 'read');

        // Actualizar solo los campos necesarios
        const updatedPayments = currentData.scholarpayments.map(payment => {
            const newPayment = newPaymentsData.find(p => p.id === payment.id);
            return newPayment ? { ...payment, ...newPayment } : payment;
        });

        // Escribir el contenido actualizado en el archivo
        await fs.writeFile(filePath, JSON.stringify({ scholarpayments: updatedPayments }, null, 2));
        res.send({ message: 'Payments saved successfully' });
    } catch (err) {
        console.error('Error writing to scholarpayments.json:', err);
        res.status(500).send('Error saving payments');
    }
});

// Endpoint para eliminar una fila en scholarpayments.json basado en el ID
app.delete('/data/scholarpayments/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filePath = path.join(__dirname, 'data', 'scholarpayments.json');

        // Leer el contenido actual del archivo
        const currentData = await handleJsonFile('scholarpayments.json', 'read');

        // Filtrar los datos para eliminar la fila con el id especificado
        const updatedPayments = currentData.scholarpayments.filter(payment => payment.id !== id);
        currentData.scholarpayments = updatedPayments;

        console.log('Updated Payments Data:', currentData); // Log para depuración

        // Escribir el contenido actualizado en el archivo
        await fs.writeFile(filePath, JSON.stringify(currentData, null, 2));
        res.send('Payment row deleted successfully');
    } catch (err) {
        console.error('Error deleting payment row', err);
        res.status(500).send('Error deleting payment row');
    }
});

// Ruta para exportar datos a schedulesplus.json
app.post('/data/schedulesplus.json', (req, res) => {
    const filePath = path.join(__dirname, 'data', 'schedulesplus.json');
    const newData = req.body;

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer el archivo:', err);
            return res.status(500).send('Error al leer el archivo');
        }

        let jsonData;
        try {
            jsonData = JSON.parse(data);
        } catch (parseErr) {
            console.error('Error al parsear el archivo JSON:', parseErr);
            return res.status(500).send('Error al parsear el archivo JSON');
        }

        jsonData.schedules.push(newData);

        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error('Error al escribir en el archivo:', writeErr);
                return res.status(500).send('Error al escribir en el archivo');
            }

            res.send('Datos guardados exitosamente');
        });
    });
});

app.listen(PORT, async () => {
    await ensureDataFolder();
    console.log(`Server running at http://localhost:${PORT}`);
});
