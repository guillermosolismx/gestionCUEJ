document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');

    // Define the showSection function
    function showSection(sectionId) {
        console.log('showSection called with:', sectionId);
        // Implementation of showSection
        var sections = document.querySelectorAll('section');
        sections.forEach(function(section) {
            section.style.display = section.id === sectionId ? 'block' : 'none';
        });
    }

    // Example usage of showSection
    showSection('home');

    // ...existing code...
});

// Ensure no other code is calling showSection before it is defined
// ...existing code...
