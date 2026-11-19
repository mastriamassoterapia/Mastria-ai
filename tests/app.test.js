const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');

test('todos os identificadores usados pelo JavaScript existem na interface', () => {
  const ids = new Set([...html.matchAll(/\\bid=["']([^"']+)["']/g)].map(m => m[1]));
  const refs = [...html.matchAll(/getElementById\\(["']([^"']+)["']\\)/g)].map(m => m[1]);
  const missing = [...new Set(refs.filter(id => !ids.has(id)))];
  assert.deepEqual(missing, []);
});

test('todos os botões declarados chamam funções existentes', () => {
  const functions = new Set([...html.matchAll(/(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)\\s*\\(/g)].map(m => m[1]));
  const handlers = [...html.matchAll(/onclick=["']([^"']+)["']/g)].map(m => m[1]);
  const called = new Set(handlers.flatMap(h => [...h.matchAll(/([A-Za-z_$][\\w$]*)\\s*\\(/g)].map(m => m[1])));
  const builtins = new Set(['show', 'Number', 'String']);
  const missing = [...called].filter(name => !functions.has(name) && !builtins.has(name));
  assert.deepEqual(missing, []);
});

test('scripts clássicos têm sintaxe válida', () => {
  const scripts = [...html.matchAll(/<script(?![^>]*type=["']module["'])[^>]*>([\\s\\S]*?)<\\/script>/gi)];
  assert.ok(scripts.length > 0, 'nenhum script clássico encontrado');
  for (const [i, script] of scripts.entries()) {
    if (!script[1].trim()) continue;
    assert.doesNotThrow(() => new vm.Script(script[1]), 'script clássico ' + i + ' contém erro de sintaxe');
  }
});

test('professora 3D local não depende do modelo externo que falhava', () => {
  assert.match(html, /function buildMastriaTeacher\\s*\\(/);
  assert.match(html, /window\\.mastria3DReady\\s*=\\s*true/);
  assert.match(html, /window\\.setMastria3DExercise/);
  assert.doesNotMatch(html, /innerscene\\.com\\/api\\/library/);
});

test('áreas principais do aplicativo continuam presentes', () => {
  for (const id of ['home', 'training', 'library', 'assistant', 'profile', 'admin', 'checkin']) {
    assert.match(html, new RegExp('id=["\\']' + id + '["\\']'));
  }
});
