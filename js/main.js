/**
 * main.js - Portafolio de Julian
 * Manejador principal: Renderizado seguro de proyectos y navegacion accesible.
 */

/**
 * Validador estricto de URLs para mitigar XSS y ataques basados en protocolos peligrosos.
 * Solo permite https:// y http://.
 */
function isSafeUrl(url) {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    return /^https?:\/\/\S+$/i.test(trimmed);
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

const DEFAULT_IMAGE = 'repeating-linear-gradient(45deg, #181420, #181420 10px, #1e1929 10px, #1e1929 20px)';

// Iconos SVG seguros (hardcoded y controlados)
const ICONS = {
    github: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`,
    demo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`
};

/** Solo rutas assets/img/<nombre>.(png|jpg|jpeg|webp|svg) sin caracteres que rompan url(). */
function isSafeImagePath(p) {
    return typeof p === 'string' && /^assets\/img\/[\w.-]+\.(png|jpe?g|webp|svg)$/i.test(p) && !p.includes('..');
}

/** Crea la fila de botones; devuelve null si ningun enlace es valido (sin botones rotos). */
function buildLinks(items, ownerTitle) {
    const valid = items.filter(l => {
        if (!l.url) return false;
        if (!isSafeUrl(l.url)) {
            console.warn(`[Seguridad] URL insegura bloqueada para ${ownerTitle}:`, l.url);
            return false;
        }
        return true;
    });
    if (!valid.length) return null;
    const linksDiv = document.createElement('div');
    linksDiv.className = 'project-links';
    valid.forEach(link => {
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.setAttribute('aria-label', `${link.label} de ${ownerTitle}`);
        anchor.innerHTML = `${escapeHTML(link.label)} ${ICONS[link.type] || ICONS.demo}`;
        linksDiv.appendChild(anchor);
    });
    return linksDiv;
}

/** Tarjeta comun (reutiliza .project-card) para proyectos y certificaciones. */
function buildCard({ title, desc, image, tech, links }) {
    const card = document.createElement('article');
    card.className = 'project-card';

    const imgDiv = document.createElement('div');
    imgDiv.className = 'project-image';
    imgDiv.style.background = isSafeImagePath(image) ? `url("${image}") center / cover` : DEFAULT_IMAGE;
    imgDiv.setAttribute('aria-label', `Imagen de previsualizacion de ${escapeHTML(title)}`);
    card.appendChild(imgDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'project-content';

    const h = document.createElement('h3');
    h.className = 'project-title';
    h.textContent = title;
    contentDiv.appendChild(h);

    const p = document.createElement('p');
    p.className = 'project-desc';
    p.textContent = desc;
    contentDiv.appendChild(p);

    if (Array.isArray(tech) && tech.length) {
        const techDiv = document.createElement('div');
        techDiv.className = 'project-tech';
        tech.forEach(t => {
            const tag = document.createElement('span');
            tag.className = 'tech-tag';
            tag.textContent = String(t);
            techDiv.appendChild(tag);
        });
        contentDiv.appendChild(techDiv);
    }

    const linksDiv = buildLinks(links, title);
    if (linksDiv) contentDiv.appendChild(linksDiv);

    card.appendChild(contentDiv);
    return card;
}

function formatDate(d) {
    const m = /^(\d{4})-(\d{2})/.exec(d || '');
    if (!m) return String(d || '');
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${meses[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

function renderProjects() {
    const grid = document.getElementById('projects-grid');
    const data = window.portfolioData && window.portfolioData.projects;
    if (!grid || !Array.isArray(data)) return;
    grid.replaceChildren(...data.map(pr => buildCard({
        title: pr.title || 'Proyecto',
        desc: pr.desc || '',
        image: pr.image,
        tech: pr.tech,
        links: [
            { label: 'Repositorio', url: pr.repo, type: 'github' },
            { label: 'Demo', url: pr.demo, type: 'demo' }
        ]
    })));
}

function renderCerts() {
    const grid = document.getElementById('certs-grid');
    const data = window.portfolioData && window.portfolioData.certifications;
    if (!grid || !Array.isArray(data)) return;
    const show = data.length > 0;
    document.getElementById('certificaciones').hidden = !show;
    document.getElementById('nav-certs').hidden = !show;
    grid.replaceChildren(...data.map(c => buildCard({
        title: c.name || 'Certificacion',
        desc: `${c.issuer || ''} · ${formatDate(c.date)}`,
        tech: [],
        links: [{ label: 'Verificar', url: c.verifyUrl, type: 'demo' }]
    })));
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
        renderCerts();
        initNavigation();
    });
} else {
    renderProjects();
    renderCerts();
    initNavigation();
}
