/**
 * main.js
 * 
 * Funcionalidad de navegación con scroll suave.
 * Calcula automáticamente la altura del header para un offset adecuado
 * al navegar mediante los enlaces internos del portafolio.
 */
document.addEventListener('DOMContentLoaded', () => {
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    const header = document.querySelector('header');

    internalLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement && header) {
                // Calculamos la altura del header dinámicamente
                const headerHeight = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                
                // Offset de la posición menos la altura del header
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
