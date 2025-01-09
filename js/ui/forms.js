// ...existing code...

// Example usage of showSection
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section');
        if (sectionId) {
            showSection(sectionId);
        }
    });
});

// ...existing code...
