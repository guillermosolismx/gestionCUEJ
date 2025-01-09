function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function generateCycles(year = new Date().getFullYear()) {
    const cycles = [];
    for (let period = 1; period <= 3; period++) {
        cycles.push({
            id: `${year}-${period}`,
            year: year.toString(),
            period: period.toString(),
            name: `${year}-${period}`
        });
    }
    return cycles;
}
