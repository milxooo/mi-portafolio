#!/usr/bin/env node
// Consola local para agregar/listar/eliminar proyectos y certificaciones.
// Solo modulos nativos de Node (>=18). No es un servidor: edita data/*.js en tu PC.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');

const ROOT = path.resolve(__dirname, '..');
const KINDS = {
  proyectos: { file: 'proyectos.js', key: 'projects', label: 'proyecto', titleField: 'title' },
  certificaciones: { file: 'certificaciones.js', key: 'certifications', label: 'certificacion', titleField: 'name' },
};

// ---------- validadores (devuelven null si es valido, o el mensaje de error) ----------
const required = (v) => (String(v || '').trim() ? null : 'Este campo es obligatorio.');
const httpUrl = (v) => (/^https?:\/\/[^\s"<>]+$/i.test(v) ? null : 'Debe ser un enlace http:// o https:// sin espacios.');
const date = (v) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(v);
  return m && +m[2] >= 1 && +m[2] <= 12 ? null : 'Usa el formato AAAA-MM o AAAA-MM-DD (ej. 2025-06).';
};
const imagePath = (v, root = ROOT) => {
  if (!/^assets\/img\/[\w.-]+\.(png|jpe?g|webp|svg)$/i.test(v) || v.includes('..')) {
    return 'Debe ser assets/img/<nombre>.png|jpg|webp|svg';
  }
  return fs.existsSync(path.join(root, v)) ? null : `No existe el archivo ${v}.`;
};
const optional = (fn) => (v, ...r) => (v ? fn(v, ...r) : null);
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

// ---------- lectura / escritura de data/*.js ----------
function readItems(dataDir, kind) {
  const k = KINDS[kind];
  const file = path.join(dataDir, k.file);
  if (!fs.existsSync(file)) return [];
  const m = /=\s*(\[[\s\S]*\]);\s*$/.exec(fs.readFileSync(file, 'utf8'));
  if (!m) throw new Error(`${k.file}: formato no reconocido (no lo edites a mano).`);
  return JSON.parse(m[1]);
}

function writeItems(dataDir, kind, items) {
  const k = KINDS[kind];
  const body = `// Generado por \`npm run agregar\`. Solo JSON valido entre el "=" y el ";" final.\n` +
    `window.portfolioData = window.portfolioData || {};\n` +
    `window.portfolioData.${k.key} = ${JSON.stringify(items, null, 2)};\n`;
  const file = path.join(dataDir, k.file);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file + '.tmp', body); // escritura atomica: nunca deja el archivo a medias
  fs.renameSync(file + '.tmp', file);
}

function addItem(dataDir, kind, item) {
  const items = readItems(dataDir, kind);
  const base = slug(item[KINDS[kind].titleField]);
  let id = base;
  for (let n = 2; items.some((i) => i.id === id); n++) id = `${base}-${n}`;
  items.push({ id, ...item });
  writeItems(dataDir, kind, items);
  return id;
}

function removeItem(dataDir, kind, id) {
  const items = readItems(dataDir, kind);
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  writeItems(dataDir, kind, next);
  return true;
}

// ---------- interaccion ----------
async function ask(io, prompt, validators = [], { optionalField = false } = {}) {
  for (;;) {
    const v = (await io.question(prompt + (optionalField ? ' (opcional, Enter para omitir): ' : ': '))).trim();
    if (!v && optionalField) return '';
    const err = [required, ...validators].map((fn) => fn(v)).find(Boolean);
    if (!err) return v;
    io.write(`  ✗ ${err}\n`);
  }
}

async function addProject(io, dataDir, root) {
  const title = await ask(io, 'Titulo');
  const desc = await ask(io, 'Descripcion');
  const tech = [...new Set((await ask(io, 'Tecnologias separadas por coma')).split(',').map((t) => t.trim()).filter(Boolean))];
  if (!tech.length) throw new Error('Se requiere al menos una tecnologia.');
  const repo = await ask(io, 'Enlace al repositorio de GitHub (http/https)', [httpUrl]);
  const demo = await ask(io, 'Enlace a demo', [httpUrl], { optionalField: true });
  const image = await ask(io, 'Imagen (ruta assets/img/...)', [(v) => imagePath(v, root)], { optionalField: true });
  return addItem(dataDir, 'proyectos', { title, desc, tech, repo, demo, image });
}

async function addCert(io, dataDir) {
  const name = await ask(io, 'Nombre de la certificacion');
  const issuer = await ask(io, 'Entidad emisora');
  const d = await ask(io, 'Fecha (AAAA-MM)', [date]);
  io.write('  ⚠ La URL de verificacion sera PUBLICA. Si contiene tu numero de credencial o datos personales, omitela.\n');
  const verifyUrl = await ask(io, 'Enlace de verificacion', [httpUrl], { optionalField: true });
  return addItem(dataDir, 'certificaciones', { name, issuer, date: d, verifyUrl });
}

function list(io, dataDir) {
  for (const [kind, k] of Object.entries(KINDS)) {
    const items = readItems(dataDir, kind);
    io.write(`\n${kind.toUpperCase()} (${items.length})\n`);
    items.forEach((i, n) => io.write(`  ${n + 1}. [${i.id}] ${i[k.titleField]}\n`));
  }
}

async function remove(io, dataDir) {
  const kind = (await ask(io, 'Tipo (1=proyecto, 2=certificacion)', [(v) => (['1', '2'].includes(v) ? null : 'Elige 1 o 2.')])) === '1' ? 'proyectos' : 'certificaciones';
  const items = readItems(dataDir, kind);
  if (!items.length) return io.write('  No hay entradas.\n');
  items.forEach((i, n) => io.write(`  ${n + 1}. ${i[KINDS[kind].titleField]}\n`));
  const n = Number(await ask(io, 'Numero a eliminar', [(v) => (+v >= 1 && +v <= items.length ? null : 'Numero fuera de rango.')]));
  const target = items[n - 1];
  const ok = (await ask(io, `Eliminar "${target[KINDS[kind].titleField]}"? (s/N)`, [], { optionalField: true })).toLowerCase();
  if (ok === 's') { removeItem(dataDir, kind, target.id); io.write('  Eliminado.\n'); } else io.write('  Cancelado.\n');
}

async function run(io, { dataDir = path.join(ROOT, 'data'), root = ROOT } = {}) {
  for (;;) {
    const op = (await io.question('\n1) Agregar proyecto  2) Agregar certificacion  3) Listar  4) Eliminar  0) Salir\n> ')).trim();
    try {
      if (op === '1') io.write(`  ✓ Guardado: ${await addProject(io, dataDir, root)}\n`);
      else if (op === '2') io.write(`  ✓ Guardado: ${await addCert(io, dataDir)}\n`);
      else if (op === '3') list(io, dataDir);
      else if (op === '4') await remove(io, dataDir);
      else if (op === '0') return;
      else io.write('  Opcion invalida.\n');
    } catch (e) {
      io.write(`  ✗ ${e.message}\n`);
    }
  }
}

if (require.main === module) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const io = { question: (p) => rl.question(p), write: (s) => process.stdout.write(s) };
  run(io).then(() => { rl.close(); console.log('Recuerda revisar `git diff` antes de subir los cambios.'); });
}

module.exports = { required, httpUrl, date, imagePath, optional, slug, readItems, writeItems, addItem, removeItem, run, KINDS };
