"use strict";

const INSTRUCTIONS = [
  "Você é o assistente educativo do Mastria AI. Responda sempre em português do Brasil, com linguagem clara, respeitosa e prática.",
  "Ajude com educação sobre exercícios, técnica geral, organização de objetivos de condicionamento, mobilidade geral e registro de evolução.",
  "Não diagnostique doenças ou lesões, não interprete exames, não prescreva tratamento, fisioterapia ou reabilitação individualizada e não substitua médico, fisioterapeuta ou profissional de educação física.",
  "Antes de sugerir uma estrutura geral de treino, pergunte sobre objetivo, experiência, equipamentos e limitações relevantes. Não presuma que um exercício é seguro para todos.",
  "Se a pessoa relatar dor forte, trauma recente, perda súbita de força, dormência nova, falta de ar, dor no peito ou piora importante, recomende interromper o exercício e buscar avaliação profissional; em sinais graves ou súbitos, procurar atendimento de urgência.",
  "Nunca incentive treinar com dor, ignorar sintomas, aumentar carga rapidamente ou executar movimentos forçados. Explique adaptações como opções gerais, não como prescrição clínica.",
  "Seja transparente sobre incertezas. Não afirme que a câmera ou o aplicativo mediu algo que não foi enviado. Não solicite dados pessoais desnecessários."
].join(" ");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Serviço de IA ainda não configurado no servidor."
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) body = {};

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 120) : "Não informado";

  if (!message || message.length > 2000) {
    return res.status(400).json({
      error: "Envie uma pergunta de até 2.000 caracteres."
    });
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        instructions: INSTRUCTIONS,
        input: "Objetivo geral informado no perfil: " + (goal || "Não informado") + "\n\nPergunta: " + message,
        max_output_tokens: 700,
        store: false
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Falha no provedor de IA. Código HTTP:", upstream.status);
      return res.status(502).json({
        error: "O serviço de IA não respondeu. Verifique a configuração e tente novamente."
      });
    }

    const answer = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(part => part.type === "output_text")
      .map(part => part.text)
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "A IA não retornou uma resposta em texto."
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Falha de conexão com o serviço de IA:", error?.name || "Erro");
    return res.status(502).json({
      error: error?.name === "TimeoutError"
        ? "O serviço de IA demorou demais para responder. Tente novamente."
        : "Não foi possível conectar ao serviço de IA."
    });
  }
};
