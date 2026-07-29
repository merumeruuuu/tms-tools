document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', () => {
            const path = card.getAttribute('data-path');
            if (path) window.location.href = path;
        });
    });
});