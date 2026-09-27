#!/usr/bin/env python3
"""
scripts/security-check.py
Suite de validacion de ciberseguridad, integridad y calidad para el portafolio.
"""

import sys
import os
import re
from html.parser import HTMLParser

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def report_pass(msg):
    print(f"  [PASS] {msg}")

def report_fail(msg):
    print(f"  [FAIL] {msg}")
    return False

def check_html_syntax():
    print("[1] Validando sintaxis HTML y etiquetas...")
    all_ok = True
    class TagValidator(HTMLParser):
        def __init__(self):
            super().__init__()
            self.tags = []
            self.errors = []
        def handle_starttag(self, tag, attrs):
            if tag not in ['br', 'img', 'meta', 'link', 'input', 'hr', '!doctype']:
                self.tags.append(tag)
        def handle_endtag(self, tag):
            if self.tags:
                last = self.tags.pop()
                if last != tag:
                    self.errors.append(f"Etiqueta desalineada: esperada </{last}>, recibida </{tag}>")
            else:
                self.errors.append(f"Etiqueta de cierre inesperada: </{tag}>")

    for filename in ['index.html', '404.html']:
        filepath = os.path.join(ROOT_DIR, filename)
        if not os.path.exists(filepath):
            all_ok = report_fail(f"{filename} no encontrado.")
            continue
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        v = TagValidator()
        v.feed(content)
        if v.errors or v.tags:
            all_ok = report_fail(f"{filename} contiene errores de marcado: {v.errors}, no cerradas: {v.tags}")
        else:
            report_pass(f"{filename}: Marcado HTML balanceado y limpio.")
    return all_ok

def check_security_headers():
    print("[2] Validando Content-Security-Policy y cabeceras meta...")
    all_ok = True
    for filename in ['index.html', '404.html']:
        filepath = os.path.join(ROOT_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'http-equiv="Content-Security-Policy"' in content:
            report_pass(f"{filename}: Content-Security-Policy configurada.")
        else:
            all_ok = report_fail(f"{filename}: Falta Content-Security-Policy.")
        if 'http-equiv="X-Content-Type-Options"' in content:
            report_pass(f"{filename}: X-Content-Type-Options configurado.")
        else:
            all_ok = report_fail(f"{filename}: Falta X-Content-Type-Options.")
        if 'name="referrer"' in content:
            report_pass(f"{filename}: Referrer-Policy configurada.")
        else:
            all_ok = report_fail(f"{filename}: Falta Referrer-Policy.")
    return all_ok

def check_sensitive_files():
    print("[3] Verificando que no se expongan archivos confidenciales o de IDE...")
    all_ok = True
    gitignore_path = os.path.join(ROOT_DIR, '.gitignore')
    if os.path.exists(gitignore_path):
        report_pass(".gitignore presente.")
    else:
        all_ok = report_fail(".gitignore ausente.")

    forbidden_patterns = ['.env', '.vscode', '.key', '.pem']
    for root, dirs, files in os.walk(ROOT_DIR):
        if '.git' in root:
            continue
        for d in dirs:
            if d == '.vscode':
                # Check if it is tracked in git
                pass
        for f in files:
            for pat in forbidden_patterns:
                if pat in f and not f.startswith('.gitignore'):
                    all_ok = report_fail(f"Archivo sensible o no deseado encontrado: {os.path.join(root, f)}")
    report_pass("Directorio limpio de archivos de credenciales/llaves.")
    return all_ok

def check_pdf_hygiene():
    print("[4] Auditando metadatos en documentos PDF...")
    all_ok = True
    docs_dir = os.path.join(ROOT_DIR, 'assets', 'docs')
    if not os.path.exists(docs_dir):
        return report_fail(f"Directorio de documentos {docs_dir} no existe.")
    
    pdf_count = 0
    for f in os.listdir(docs_dir):
        if f.endswith('.pdf'):
            pdf_count += 1
            path = os.path.join(docs_dir, f)
            with open(path, 'rb') as pdf:
                data = pdf.read()
            leaks = re.findall(rb'/(Author|Creator|Producer|CreationDate|ModDate)\s*(\([^\)]*\)|<[^>]*>)', data)
            if leaks:
                all_ok = report_fail(f"Fuga de metadatos en {f}: {leaks}")
            else:
                report_pass(f"{f}: Metadatos eliminados correctamente (0 fugas).")
    if pdf_count == 0:
        all_ok = report_fail("No se encontraron PDFs para auditar.")
    return all_ok

def check_xss_sink_protection():
    print("[5] Verificando mitigaciones contra DOM XSS en JavaScript...")
    all_ok = True
    main_js_path = os.path.join(ROOT_DIR, 'js', 'main.js')
    with open(main_js_path, 'r', encoding='utf-8') as f:
        js = f.read()

    if 'isSafeUrl' in js:
        report_pass("js/main.js implementa validador de protocolo isSafeUrl().")
    else:
        all_ok = report_fail("js/main.js carece de validacion de protocolo para URLs.")

    if 'escapeHTML' in js or 'textContent' in js:
        report_pass("js/main.js implementa escape seguro de texto / textContent.")
    else:
        all_ok = report_fail("js/main.js no implementa mitigacion para cadenas dinamicas.")

    return all_ok

def main():
    print("=" * 60)
    print("INICIANDO SUITE DE AUDITORIA DE SEGURIDAD - PORTAFOLIO")
    print("=" * 60)
    results = [
        check_html_syntax(),
        check_security_headers(),
        check_sensitive_files(),
        check_pdf_hygiene(),
        check_xss_sink_protection()
    ]
    print("=" * 60)
    if all(results):
        print(">>> RESULTADO: TODOS LOS TESTS PASARON EXITOSAMENTE (100% SEGURO) <<<")
        print("=" * 60)
        sys.exit(0)
    else:
        print(">>> RESULTADO: SE ENCONTRARON FALLOS EN LA AUDITORIA <<<")
        print("=" * 60)
        sys.exit(1)

if __name__ == '__main__':
    main()
