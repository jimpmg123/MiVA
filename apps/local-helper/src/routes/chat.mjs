import { GEMINI_DEFAULT_MODEL, OPENAI_DEFAULT_MODEL } from "../config.mjs";
import { buildSystemPrompt, getLastUserMessage, normalizeChatMessages } from "../prompt.mjs";
import { getGeminiAnswerWithFallback } from "../services/gemini.mjs";
import {
  getAllowedModelNames,
  getInstalledModels,
  getOllamaAnswer,
  getOllamaStatus,
  isAllowedModel,
  isModelInstalled,
  ollamaFetch
} from "../services/ollama.mjs";
import { getOpenAiAnswer } from "../services/openai.mjs";
import { getProviderApiKey } from "../services/provider-keys.mjs";
import { buildWorkspaceContext } from "../services/workspace.mjs";
import { readJson, sendJson, writeCorsHeaders } from "../utils/http.mjs";
import { sendOllamaUnavailable } from "./ollama.mjs";

function sendProviderMissingKey(res, origin, provider) {
  sendJson(res, 400, {
    error: "PROVIDER_KEY_REQUIRED",
    provider,
    message: `${provider} API key is required. Set it in apps/local-helper/.env or pass an app override key.`
  }, origin);
}

async function sendOllamaStream(res, origin, model, messages) {
  const response = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    }),
    signal: AbortSignal.timeout(1000 * 60 * 10)
  });

  writeCorsHeaders(res, origin);
  res.writeHead(response.ok ? 200 : 502, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache"
  });

  if (!response.body) {
    res.end(JSON.stringify({ error: "NO_STREAM" }) + "\n");
    return;
  }

  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}

export async function handleChat(req, res, origin) {
  const body = await readJson(req);
  const provider = typeof body.provider === "string" ? body.provider : "ollama";
  const model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : provider === "openai"
        ? OPENAI_DEFAULT_MODEL
        : provider === "gemini"
          ? GEMINI_DEFAULT_MODEL
          : "llama3.2:3b";
  const locale = body.locale === "en" ? "en" : "ko";

  if (!["ollama", "openai", "gemini"].includes(provider)) {
    sendJson(res, 400, {
      error: "PROVIDER_NOT_ALLOWED",
      allowedProviders: ["ollama", "openai", "gemini"]
    }, origin);
    return;
  }

  const systemPrompt = buildSystemPrompt({ locale, provider, model, profile: body.profile });
  const messages = normalizeChatMessages(body, systemPrompt);
  if (!getLastUserMessage(messages)) {
    sendJson(res, 400, {
      error: "MESSAGES_REQUIRED"
    }, origin);
    return;
  }

  const workspaceContext = await buildWorkspaceContext({
    prompt: body.prompt,
    profile: body.profile,
  });
  if (typeof body.memorySummary === "string" && body.memorySummary.trim()) {
    messages.splice(1, 0, {
      role: "system",
      content: [
        "Rolling summary memory for this assistant:",
        body.memorySummary.trim(),
        "Use this summary only as background context. The user's latest message has priority."
      ].join("\n")
    });
  }
  if (workspaceContext) {
    messages.splice(1, 0, {
      role: "system",
      content: workspaceContext,
    });
  }

  if (provider === "ollama") {
    if (!isAllowedModel(model)) {
      sendJson(res, 400, {
        error: "MODEL_NOT_ALLOWED",
        allowedModels: getAllowedModelNames()
      }, origin);
      return;
    }

    const status = await getOllamaStatus();
    if (!status.running) {
      sendOllamaUnavailable(res, origin, status);
      return;
    }

    const installed = await getInstalledModels();
    if (!isModelInstalled(model, installed.models)) {
      sendJson(res, 409, {
        error: "MODEL_NOT_INSTALLED",
        message: `${model} is not installed yet.`,
        model
      }, origin);
      return;
    }

    if (body.stream === true) {
      await sendOllamaStream(res, origin, model, messages);
      return;
    }

    const answer = await getOllamaAnswer(model, messages);
    sendJson(res, 200, {
      ok: true,
      provider,
      model,
      answer
    }, origin);
    return;
  }

  const apiKey = getProviderApiKey(provider, body.apiKey);
  if (!apiKey) {
    sendProviderMissingKey(res, origin, provider);
    return;
  }

  let answer;
  let responseModel = model;
  let fallback = null;

  if (provider === "openai") {
    answer = await getOpenAiAnswer({ model, messages, apiKey });
  } else {
    const geminiResult = await getGeminiAnswerWithFallback({ model, messages, systemPrompt, apiKey });
    answer = geminiResult.answer;
    responseModel = geminiResult.model;

    if (geminiResult.model !== model) {
      fallback = {
        requestedModel: model,
        usedModel: geminiResult.model,
        attemptedModels: geminiResult.attemptedModels
      };
    }
  }

  sendJson(res, 200, {
    ok: true,
    provider,
    model: responseModel,
    requestedModel: responseModel === model ? undefined : model,
    fallback,
    answer
  }, origin);
}
