"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].map(m => ({ attributes: m[1], source: m[2] }));

test("a página inicial e as áreas principais existem em português", () => {
  assert.match(html, /<html lang="pt-BR">/);
  for (const id of ["home", "training", "library", "admin", "userPlans"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /data-view="home"/);
  assert.match(html, /data-view="library"/);
});

test("todos os scripts embutidos têm sintaxe válida", () => {
  assert.ok(scripts.length >= 2, "esperava os scripts principais");
  const regularScripts = scripts.filter(script => !/\btype=["']module["']/i.test(script.attributes));
  regularScripts.forEach((script, index) => new vm.Script(script.source, { filename: "index-script-" + index + ".js" }));
  const moduleScripts = scripts.filter(script => /\btype=["']module["']/i.test(script.attributes));
  assert.ok(moduleScripts.length >= 1, "esperava o módulo responsável pelo avatar 3D");
  assert.match(moduleScripts[0].source, /from ['"]https:\/\/esm\.sh\/three/);
});

test("a biblioteca expandida preserva os 132 exercícios e alertas de segurança", () => {
  assert.match(html, /const exercises=\[/);
  assert.match(html, /const extraExercises=\[/);
  assert.match(html, /exercises\.push\(\.\.\.extraExercises\)/);
  assert.match(html, /Não treine com dor aguda|interrompa se houver dor/i);
  for (const name of ["Agachamento com apoio", "Marcha sentada para iliopsoas", "Abdominal curto", "Prancha lateral na parede", "Mobilidade cervical de rotação curta"]) {
    assert.ok(html.includes(name), "exercício ausente: " + name);
  }
});

test("o registro de treino valida séries, repetições e carga", () => {
  assert.match(html, /function saveWorkout\(\)/);
  assert.match(html, /sets<1\|\|sets>20/);
  assert.match(html, /reps<1\|\|reps>100/);
});

test("a câmera fica dentro do treino e é solicitada ao iniciar a sessão", () => {
  assert.match(html, /id="trainingCamera"/);
  assert.doesNotMatch(html, /id="camera"/);
  assert.match(html, /async function startVirtualTraining\(\)[\s\S]{0,500}startMastriaCamera\(\)/);
  assert.match(html, /function stopMastriaCamera/);
  assert.match(html, /getUserMedia/);
  assert.match(html, /window\.isSecureContext/);
  assert.match(html, /visibilitychange/);
  assert.doesNotMatch(html, /onclick=["'][^"']*startMastriaCamera/);
});

test("a parceria entre Mastria e HeroesFit é apresentada claramente na página inicial", () => {
  assert.match(html, /ALIANÇA DE MOVIMENTO, SAÚDE E DESEMPENHO/);
  assert.match(html, /MASTRIA/);
  assert.match(html, /HEROESFIT/);
  assert.match(html, /a HeroesFit fortalece a jornada de treino/);
  assert.match(html, /a Mastria Massoterapia agrega cuidado corporal/);
});

test("a câmera fica no topo do treino e o avatar aparece ao lado em telas móveis", () => {
  assert.match(html, /training-live-top/);
  assert.match(html, /training-live-grid/);
  assert.match(html, /training-live-camera/);
  assert.match(html, /training-live-avatar/);
  assert.match(html, /ANATOMIA MUSCULAR/);
  assert.equal((html.match(/id="mastriaVideo"/g) || []).length, 1);
  assert.equal((html.match(/id="mastriaCanvas"/g) || []).length, 1);
  assert.match(html, /mastriaFacing='user'/);
});

test("o avatar acompanha famílias de movimento e todos os 132 exercícios têm classificação", () => {
  assert.match(html, /function exerciseMotionMeta\(e\)/);
  assert.match(html, /function setAvatarMovement\(meta\)/);
  assert.match(html, /setAvatarMovement\(motion\)/);
  const first = html.indexOf("const exercises=[");
  const extraStartMarker = html.indexOf("const extraExercises=[", first);
  const firstEnd = html.lastIndexOf("];", extraStartMarker);
  const extraStart = extraStartMarker + "const extraExercises=[".length;
  const extraEnd = html.indexOf("];", extraStart);
  assert.ok(first >= 0 && firstEnd > first && extraEnd > extraStart);
  const source = html.slice(first, firstEnd) + html.slice(extraStart, extraEnd);
  const entries = [...source.matchAll(/\["([^"]+)","([^"]+)","[^"]*"\]/g)];
  assert.equal(entries.length, 132);
  const fnSource = html.match(/function exerciseMotionMeta\(e\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(fnSource, "mapa de movimentos ausente");
  const classify = vm.runInNewContext("(" + fnSource + ")");
  const allowed = new Set(["squat","hinge","bridge","calf","push","row","raise","curl","triceps","march","walk","core","hip","mobility","neutral"]);
  for (const entry of entries) {
    const meta = classify([entry[1], entry[2], ""]);
    assert.ok(allowed.has(meta.move), "movimento inválido em " + entry[1]);
    assert.ok(meta.label && meta.muscles && meta.cue, "orientação incompleta em " + entry[1]);
    assert.match(html, new RegExp("move-" + meta.move));
  }
  assert.equal(classify(["Agachamento com peso corporal","Membros inferiores"]).move, "squat");
  assert.equal(classify(["Remada com elástico","Costas"]).move, "row");
  assert.equal(classify(["Ponte de quadril","Quadril"]).move, "bridge");
  assert.equal(classify(["Bird-dog","Tronco"]).move, "core");
});

test("a instrutora humana 3D texturizada e articulada está integrada ao treino", () => {
  assert.match(html, /id="mastria3DCanvas"/);
  assert.match(html, /GLTFLoader/);
  assert.match(html, /run-maya-3d-person-animated-eebf24b9/);
  assert.match(html, /window\.setMastria3DExercise/);
  assert.match(html, /function fallback\(err\)/);
});

test("o painel administrativo cria e publica treinos locais para a tela inicial", () => {
  for (const item of ["function showAdmin()", "function adminAddExercise()", "function adminSavePlan()", "function renderAdmin()", "function renderUserPlans()", "localStorage"]) {
    assert.ok(html.includes(item), "recurso ausente: " + item);
  }
  assert.match(html, /sincronização entre aparelhos exige autenticação e banco de dados/i);
});

test("o assistente usa o serviço seguro sem inserir chave secreta no navegador", () => {
  assert.match(html, /fetch\(['"]\/api\/chat['"]/);
  assert.match(html, /OPENAI_API_KEY/);
  assert.doesNotMatch(html, /sk-[A-Za-z0-9]{20,}/);
});

test("o arquivo da API usa método POST, valida a entrada e não armazena conversas", () => {
  const api = fs.readFileSync("api/chat.js", "utf8");
  new vm.Script(api, { filename: "api/chat.js" });
  assert.match(api, /req\.method !== "POST"/);
  assert.match(api, /message\.length > 2000/);
  assert.match(api, /api\.openai\.com\/v1\/responses/);
  assert.match(api, /store: false/);
  assert.match(api, /process\.env\.OPENAI_API_KEY/);
});
