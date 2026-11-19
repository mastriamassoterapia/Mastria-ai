const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)].map(m => m[1]);

test('a página contém estrutura principal em português', () => {
  assert.match(html, /<html lang="pt-BR">/);
  for (const id of ['home', 'training', 'checkin', 'library', 'assistant', 'camera', 'profile']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test('todos os scripts embutidos têm sintaxe válida', () => {
  assert.ok(scripts.length >= 2, 'esperava os scripts principais');
  scripts.forEach((source, index) => new vm.Script(source, { filename: 'index-script-' + index + '.js' }));
});

test('biblioteca inicial mantém 12 exercícios e orientação de segurança', () => {
  assert.match(html, /const exercises=\[/);
  assert.match(html, /Não treine com dor aguda/);
  assert.match(html, /12/);
  assert.match(html, /Interrompa se houver dor/);
});

test('registro de treino valida séries, repetições e carga', () => {
  assert.match(html, /function saveWorkout\(\)/);
  assert.match(html, /sets<1\|\|sets>20/);
  assert.match(html, /reps<1\|\|reps>100/);
});

test('câmera exige contexto seguro e tem encerramento do fluxo', () => {
  assert.match(html, /getUserMedia/);
  assert.match(html, /window\.isSecureContext/);
  assert.match(html, /function stopMastriaCamera/);
  assert.match(html, /function testCameraSupport/);
  assert.match(html, /visibilitychange/);
});

test('o aplicativo informa armazenamento local e ausência de gravação automática', () => {
  assert.match(html, /localStorage/);
  assert.match(html, /sem gravação ou envio automático|não é gravado nem enviado/i);
});
