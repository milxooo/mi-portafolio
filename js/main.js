/**
 * main.js - Portafolio de Julian
 * Manejador principal: Renderizado seguro de proyectos y navegacion accesible.
 */

// Registro global de proyectos y funcion de registro blindada
window.projectsRegistry = window.projectsRegistry || [];
window.registerProject = function(project) {
    window.projectsRegistry.push(project);
    if (document.readyState !== 'loading') {
        renderProjects();
    }
};

/**
 * Validador estricto de URLs para mitigar XSS y ataques basados en protocolos peligrosos.
 * Solo permite https://, http://, rutas relativas (./ o /) y enlaces mailto:.
 */
function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    return /^(https?:\/\/|\.\/|\/|mailto:)/i.test(trimmed) && !/^(javascript|data|vbscript):/i.test(trimmed);
}

/**
 * Escapa caracteres HTML especiales para evitar inyecciones al insertar cadenas.
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Renderizado dinamico y seguro de tarjetas de proyectos en el DOM.
 */
function renderProjects() {
    const grid = document.getElementById('projects-grid');
    if (!grid || !Array.isArray(window.projectsRegistry)) return;

    // Limpiar para evitar duplicados si se llama de forma reactiva
    grid.innerHTML = '';

    // Iconos SVG seguros (Hardcoded y controlados)
    const githubIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`;
    const demoIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
    const pdfIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

    window.projectsRegistry.forEach(project => {
        const card = document.createElement('article');
        card.className = 'project-card';

        // Contenedor visual / Imagen
        const imgDiv = document.createElement('div');
        imgDiv.className = 'project-image';
        if (project.image && typeof project.image === 'string') {
            imgDiv.style.background = project.image;
        }
        imgDiv.setAttribute('aria-label', `Imagen de previsualizacion del proyecto ${escapeHTML(project.title || '')}`);
        card.appendChild(imgDiv);

        // Contenido
        const contentDiv = document.createElement('div');
        contentDiv.className = 'project-content';

        const title = document.createElement('h3');
        title.className = 'project-title';
        title.textContent = project.title || 'Proyecto';
        contentDiv.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'project-desc';
        desc.textContent = project.desc || '';
        contentDiv.appendChild(desc);

        // Tags tecnologicos
        if (Array.isArray(project.tech)) {
            const techDiv = document.createElement('div');
            techDiv.className = 'project-tech';
            project.tech.forEach(tech => {
                const tag = document.createElement('span');
                tag.className = 'tech-tag';
                tag.textContent = String(tech);
                techDiv.appendChild(tag);
            });
            contentDiv.appendChild(techDiv);
        }

        // Enlaces seguros
        if (Array.isArray(project.links)) {
            const linksDiv = document.createElement('div');
            linksDiv.className = 'project-links';

            project.links.forEach(link => {
                if (!isSafeUrl(link.url)) {
                    console.warn(`[Seguridad] URL insegura bloqueada para el proyecto ${project.title}:`, link.url);
                    return;
                }

                const anchor = document.createElement('a');
                anchor.href = link.url;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.setAttribute('aria-label', `${escapeHTML(link.label || 'Enlace')} del proyecto ${escapeHTML(project.title || '')}`);

                // Soporte para forzar descarga segura en PDFs
                if (link.download || link.type === 'pdf') {
                    anchor.setAttribute('download', link.download || '');
                }

                // Asignacion de icono segun el tipo
                let iconSvg = pdfIcon;
                if (link.type === 'github') iconSvg = githubIcon;
                else if (link.type === 'demo') iconSvg = demoIcon;

                anchor.innerHTML = `${escapeHTML(link.label || 'Ver')} ${iconSvg}`;
                linksDiv.appendChild(anchor);
            });

            contentDiv.appendChild(linksDiv);
        }

        card.appendChild(contentDiv);
        grid.appendChild(card);
    });
}

function initNavigation() {
    const internalLinks = document.querySelectorAll('a[href^="#"]');
    const header = document.querySelector('header');

    internalLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId) return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerHeight = header ? header.offsetHeight : 0;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Inicializacion segura y reactiva
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        renderProjects();
        initNavigation();
    });
} else {
    renderProjects();
    initNavigation();
}
