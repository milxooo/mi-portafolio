'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const a = require('./agregar.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'agregar-'));

test('httpUrl solo acepta http/https', () => {
  assert.strictEqual(a.httpUrl('https://github.com/x/y'), null);
  assert.strictEqual(a.httpUrl('http://a.dev'), null);
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.dev', 'https://a b', '//a.dev', 'mailto:a@b.c']) {
    assert.ok(a.httpUrl(bad), bad);
  }
});

test('required y date validan', () => {
  assert.ok(a.required('   '));
  assert.strictEqual(a.date('2025-06'), null);
  assert.strictEqual(a.date('2025-06-30'), null);
  assert.ok(a.date('2025-13'));
  assert.ok(a.date('junio 2025'));
});

test('imagePath exige assets/img/ y que exista', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'assets/img'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets/img/a.png'), 'x');
  assert.strictEqual(a.imagePath('assets/img/a.png', root), null);
  assert.ok(a.imagePath('assets/img/no.png', root));
  assert.ok(a.imagePath('../etc/passwd', root));
  assert.ok(a.imagePath('assets/img/../a.png', root));
  assert.ok(a.imagePath('https://x.dev/a.png', root));
});

test('agregar, leer, ids unicos y eliminar', () => {
  const dir = tmp();
  const id1 = a.addItem(dir, 'proyectos', { title: 'Mi App', desc: 'd', tech: ['JS'], repo: '', demo: '', image: '' });
  const id2 = a.addItem(dir, 'proyectos', { title: 'Mi App', desc: 'd', tech: ['JS'], repo: '', demo: '', image: '' });
  assert.deepStrictEqual([id1, id2], ['mi-app', 'mi-app-2']);
  assert.strictEqual(a.readItems(dir, 'proyectos').length, 2);
  assert.ok(a.removeItem(dir, 'proyectos', 'mi-app'));
  assert.ok(!a.removeItem(dir, 'proyectos', 'no-existe'));
  assert.deepStrictEqual(a.readItems(dir, 'proyectos').map((i) => i.id), ['mi-app-2']);
});

test('el archivo generado es JS valido y expone window.portfolioData', () => {
  const dir = tmp();
  a.addItem(dir, 'certificaciones', { name: 'Cert "X"', issuer: 'Ent', date: '2025-06', verifyUrl: '' });
  const window = {};
  new Function('window', fs.readFileSync(path.join(dir, 'certificaciones.js'), 'utf8'))(window);
  assert.strictEqual(window.portfolioData.certifications[0].name, 'Cert "X"');
});

test('archivo corrupto se rechaza sin sobrescribir', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'proyectos.js'), 'basura');
  assert.throws(() => a.addItem(dir, 'proyectos', { title: 'x' }));
  assert.strictEqual(fs.readFileSync(path.join(dir, 'proyectos.js'), 'utf8'), 'basura');
});

test('flujo completo por consola: reintenta entradas invalidas y guarda certificacion', async () => {
  const dir = tmp();
  const answers = ['2', 'AWS CP', '', 'Amazon', 'ayer', '2025-06', 'javascript:x', '', '0'];
  const out = [];
  await a.run({ question: async () => answers.shift(), write: (s) => out.push(s) }, { dataDir: dir, root: dir });
  const items = a.readItems(dir, 'certificaciones');
  assert.strictEqual(items.length, 1);
  assert.deepStrictEqual([items[0].issuer, items[0].date], ['Amazon', '2025-06']);
  assert.ok(out.join('').includes('PUBLICA'));
});
