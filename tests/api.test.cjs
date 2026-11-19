"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const handler = require("../api/chat.js");

function responseMock() {
  return {
    code: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test("recusa métodos diferentes de POST", async () => {
  const res = responseMock();
  await handler({ method: "GET" }, res);
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, "POST");
});

test("informa quando a chave do servidor não está configurada", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const res = responseMock();
  await handler({ method: "POST", body: { message: "Olá" } }, res);
  assert.equal(res.code, 503);
  assert.match(res.payload.error, /não configurado/);
  if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
});

test("rejeita mensagem vazia ou maior que 2.000 caracteres", async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "chave-de-teste";
  try {
    for (const message of ["", "x".repeat(2001)]) {
      const res = responseMock();
      await handler({ method: "POST", body: { message } }, res);
      assert.equal(res.code, 400);
    }
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test("envia a pergunta à API Responses sem armazenamento e devolve a resposta", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = global.fetch;
  process.env.OPENAI_API_KEY = "chave-de-teste";
  let request;
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({
        output: [{ type: "message", content: [{ type: "output_text", text: "Olá! Vamos começar com segurança." }] }]
      })
    };
  };

  try {
    const res = responseMock();
    await handler({ method: "POST", body: { message: "Como começo?", goal: "Mobilidade" } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.payload.answer, "Olá! Vamos começar com segurança.");
    assert.equal(request.url, "https://api.openai.com/v1/responses");
    assert.equal(request.options.headers.Authorization, "Bearer chave-de-teste");
    assert.equal(request.body.store, false);
    assert.equal(request.body.model, "gpt-5.5");
    assert.match(request.body.input, /Como começo\?/);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("não expõe detalhes do provedor quando a API retorna erro", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = global.fetch;
  process.env.OPENAI_API_KEY = "chave-de-teste";
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: "invalid_api_key" }) });

  try {
    const res = responseMock();
    await handler({ method: "POST", body: { message: "Teste" } }, res);
    assert.equal(res.code, 502);
    assert.doesNotMatch(JSON.stringify(res.payload), /invalid_api_key|chave-de-teste/);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
