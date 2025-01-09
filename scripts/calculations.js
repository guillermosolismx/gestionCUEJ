// ...existing code...

function refreshAssignments() {
    // ...existing code...
    fetch('/path/to/assignments.json')
        .then(response => response.json())
        .then(data => {
            if (data.assignments.length === 0) {
                alert('No hay asignaciones por calcular.');
            } else {
                alert('Se actualizaron las asignaciones y cálculos.');
                // ...existing code...
            }
        })
        .catch(error => {
            console.error('Error al cargar las asignaciones:', error);
        });
    // ...existing code...
}

// ...existing code...
