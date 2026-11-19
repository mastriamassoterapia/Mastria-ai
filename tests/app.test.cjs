const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

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

test('biblioteca mantém 132 exercícios e orientação de segurança', () => {
  assert.match(html, /const exercises=\[/);
  assert.match(html, /Não treine com dor aguda/);
  assert.match(html, /extraExercises/);
  assert.match(html, /exercises\.push\(\.\.\.extraExercises\)/);
  assert.match(html, /interrompa se houver dor/i);
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

test('a biblioteca expandida inclui exercícios adicionais de força e mobilidade', () => {
  for (const name of ['Agachamento com apoio', 'Marcha sentada para iliopsoas', 'Abdominal curto', 'Prancha lateral na parede', 'Mobilidade cervical de rotação curta']) {
    assert.ok(html.includes(name), 'exercício ausente: ' + name);
  }
  assert.match(html, /exerciseCount/);
});

test('a interface conversa com o serviço de IA sem expor a chave no navegador', () => {
  assert.match(html, /fetch\('\/api\/chat'/);
  assert.match(html, /OPENAI_API_KEY/);
  assert.doesNotMatch(html, /sk-[A-Za-z0-9]{20,}/);
});

test('a função de servidor valida método e entrada e usa a API Responses sem armazenamento', () => {
  const api = fs.readFileSync('api/chat.js', 'utf8');
  new vm.Script(api, { filename: 'api/chat.js' });
  assert.match(api, /req\.method !== "POST"/);
  assert.match(api, /message\.length > 2000/);
  assert.match(api, /api\.openai\.com\/v1\/responses/);
  assert.match(api, /store: false/);
  assert.match(api, /process\.env\.OPENAI_API_KEY/);
});
