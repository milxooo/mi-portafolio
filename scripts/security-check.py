#!/usr/bin/env python3
"""
scripts/security-check.py
Controles basicos de seguridad e integridad para el portafolio.
Aprobarlos NO demuestra que el sitio sea seguro: solo detecta errores comunes.
Cada check recibe `root` y devuelve (errores, avisos) para poder probarlo.
"""

import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGES = ['index.html', '404.html']
VOID = {'br', 'img', 'meta', 'link', 'input', 'hr'}
SECRET_PATTERNS = [
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'gh[pousr]_[A-Za-z0-9]{36,}'),
    re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(r'(?i)(?:api[_-]?key|secret|token|password)\s*[:=]\s*["\'][^"\'\s]{12,}["\']'),
]


def read(root, rel):
    with open(os.path.join(root, rel), encoding='utf-8') as f:
        return f.read()


def tracked_files(root):
    """Archivos rastreados por git; si no es un repo, todos menos .git (aviso aparte)."""
    try:
        out = subprocess.run(['git', '-C', root, 'ls-files'], capture_output=True, text=True, check=True).stdout
        return [p for p in out.split('\n') if p], True
    except (subprocess.CalledProcessError, FileNotFoundError):
        found = []
        for d, dirs, files in os.walk(root):
            dirs[:] = [x for x in dirs if x != '.git']
            found += [os.path.relpath(os.path.join(d, f), root) for f in files]
        return found, False


def check_html_syntax(root):
    errors = []

    class V(HTMLParser):
        def __init__(self):
            super().__init__()
            self.stack, self.errs = [], []

        def handle_starttag(self, tag, attrs):
            if tag not in VOID:
                self.stack.append(tag)

        def handle_endtag(self, tag):
            if not self.stack:
                self.errs.append(f'cierre inesperado </{tag}>')
            elif (last := self.stack.pop()) != tag:
                self.errs.append(f'esperada </{last}>, recibida </{tag}>')

    for page in PAGES:
        if not os.path.exists(os.path.join(root, page)):
            errors.append(f'{page} no encontrado')
            continue
        v = V()
        v.feed(read(root, page))
        if v.errs or v.stack:
            errors.append(f'{page}: marcado desbalanceado {v.errs} sin cerrar {v.stack}')
    return errors, []


def check_meta_policies(root):
    """CSP en <meta> solo con directivas que funcionan ahi; nosniff/frame-ancestors no."""
    errors = []
    for page in PAGES:
        html = read(root, page)
        m = re.search(r'http-equiv="Content-Security-Policy"\s+content="([^"]*)"', html)
        if not m:
            errors.append(f'{page}: falta Content-Security-Policy')
        elif 'frame-ancestors' in m.group(1):
            errors.append(f'{page}: frame-ancestors no funciona en <meta>; quitalo (ver SECURITY.md)')
        if 'http-equiv="X-Content-Type-Options"' in html:
            errors.append(f'{page}: X-Content-Type-Options en <meta> es ignorado por los navegadores')
        if 'name="referrer"' not in html:
            errors.append(f'{page}: falta meta referrer')
    return errors, []


def check_sensitive_files(root):
    errors, warnings = [], []
    files, is_git = tracked_files(root)
    if not is_git:
        warnings.append('no es un repositorio git: se reviso el arbol de archivos completo')
    for p in files:
        base = os.path.basename(p)
        if (base == '.env' or base.startswith('.env.') or base.endswith(('.pem', '.key', '.cert'))
                or p == '.vscode' or p.startswith('.vscode/') or p.startswith('.idea/')):
            errors.append(f'archivo sensible o de IDE rastreado: {p}')
        full = os.path.join(root, p)
        if not os.path.isfile(full):
            continue
        try:
            text = read(root, p)
        except (UnicodeDecodeError, OSError):
            continue
        for pat in SECRET_PATTERNS:
            if pat.search(text):
                errors.append(f'posible secreto en {p} (patron {pat.pattern[:20]}...)')
    if os.path.isdir(os.path.join(root, '.vscode')) and is_git:
        ignored = subprocess.run(['git', '-C', root, 'check-ignore', '-q', '.vscode/x'], capture_output=True).returncode == 0
        if not ignored:
            errors.append('.vscode existe y no esta ignorado por git')
        else:
            warnings.append('.vscode existe localmente (ignorado por git, no se sube)')
    return errors, warnings


def check_external_links(root):
    """Todo enlace externo debe abrir con noopener noreferrer."""
    errors = []

    class A(HTMLParser):
        def __init__(self):
            super().__init__()
            self.bad = []

        def handle_starttag(self, tag, attrs):
            d = dict(attrs)
            if tag == 'a' and d.get('target') == '_blank':
                rel = (d.get('rel') or '').split()
                if 'noopener' not in rel or 'noreferrer' not in rel:
                    self.bad.append(d.get('href'))

    for page in PAGES:
        a = A()
        a.feed(read(root, page))
        errors += [f'{page}: enlace target=_blank sin noopener noreferrer: {h}' for h in a.bad]
    js = read(root, 'js/main.js')
    if not re.search(r"\.rel\s*=\s*'noopener noreferrer'", js):
        errors.append('js/main.js: los enlaces generados no fijan rel="noopener noreferrer"')
    return errors, []


def check_js_sinks(root):
    errors = []
    js = read(root, 'js/main.js')
    for sink in ('eval(', 'document.write', 'new Function'):
        if sink in js:
            errors.append(f'js/main.js usa {sink}')
    if 'function isSafeUrl' not in js:
        errors.append('js/main.js no define isSafeUrl')
    # innerHTML solo con texto escapado o constantes
    for line in js.splitlines():
        if 'innerHTML' in line and 'escapeHTML' not in line:
            errors.append(f'innerHTML sin escapeHTML: {line.strip()[:70]}')
    return errors, []


def load_data(root, name):
    text = read(root, f'data/{name}.js')
    m = re.search(r'=\s*(\[.*\]);\s*$', text, re.S)
    if not m:
        raise ValueError(f'data/{name}.js: formato no reconocido')
    return json.loads(m.group(1))


def check_data_files(root):
    """Los datos deben ser JSON valido y los enlaces solo http/https."""
    errors = []
    url_fields = {'proyectos': ('repo', 'demo'), 'certificaciones': ('verifyUrl',)}
    for name, fields in url_fields.items():
        try:
            items = load_data(root, name)
        except (OSError, ValueError) as e:
            errors.append(f'data/{name}.js ilegible: {e}')
            continue
        for it in items:
            for f in fields:
                url = it.get(f, '')
                if url and not re.match(r'^https?://\S+$', url, re.I):
                    errors.append(f'data/{name}.js: {f} no es http/https: {url[:40]}')
    return errors, []


CHECKS = [
    ('Sintaxis HTML', check_html_syntax),
    ('Politicas en <meta>', check_meta_policies),
    ('Archivos sensibles y secretos', check_sensitive_files),
    ('Enlaces externos', check_external_links),
    ('Sinks XSS en JS', check_js_sinks),
    ('Archivos de datos', check_data_files),
]


def main(root=ROOT_DIR):
    print('CONTROLES BASICOS DE SEGURIDAD - PORTAFOLIO')
    failed = False
    for i, (title, fn) in enumerate(CHECKS, 1):
        errors, warnings = fn(root)
        print(f'[{i}] {title}')
        for w in warnings:
            print(f'  [AVISO] {w}')
        for e in errors:
            print(f'  [FAIL] {e}')
        if not errors:
            print('  [PASS]')
        failed |= bool(errors)
    print('=' * 60)
    if failed:
        print('RESULTADO: hay controles fallidos')
        return 1
    print('RESULTADO: controles basicos aprobados (no es una garantia de seguridad)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
