import { GEMINI_DEFAULT_MODEL } from "../config.mjs";
import { allowedProviderIds, getProviderDefaultModel, isProviderAllowed } from "../extensions/providers.mjs";
import { buildSystemPrompt, getLastUserMessage, normalizeChatMessages } from "../prompt.mjs";
import { getGeminiAnswerWithFallback, streamGeminiAnswerWithFallback } from "../services/gemini.mjs";
import { getGroqAnswer, streamGroqAnswer } from "../services/groq.mjs";
import {
  getAllowedModelNames,
  getInstalledModels,
  getOllamaAnswer,
  getOllamaStatus,
  isAllowedModel,
  isModelInstalled,
  ollamaFetch
} from "../services/ollama.mjs";
import { getOpenAiAnswer, streamOpenAiAnswer } from "../services/openai.mjs";
import { hasExplicitActionConfirmation } from "../services/action-confirmation.mjs";
import { getProviderApiKey } from "../services/provider-keys.mjs";
import { buildWorkspaceActionContext, buildWorkspaceContext } from "../services/workspace.mjs";
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

function normalizeImageAttachments(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attachment) => ({
      name: typeof attachment?.name === "string" ? attachment.name : "image",
      mimeType: typeof attachment?.mimeType === "string" ? attachment.mimeType : "",
      data: typeof attachment?.data === "string" ? attachment.data.trim() : "",
    }))
    .filter((attachment) => attachment.mimeType.startsWith("image/") && attachment.data.length > 0);
}

export async function handleChat(req, res, origin) {
  const body = await readJson(req);
  const imageAttachments = normalizeImageAttachments(body.imageAttachments);
  let provider = typeof body.provider === "string" ? body.provider : "ollama";
  let model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : getProviderDefaultModel(provider);

  if (imageAttachments.length > 0) {
    provider = "gemini";
    model = GEMINI_DEFAULT_MODEL;
  }
  const locale = body.locale === "en" ? "en" : "ko";

  if (!isProviderAllowed(provider)) {
    sendJson(res, 400, {
      error: "PROVIDER_NOT_ALLOWED",
      allowedProviders: allowedProviderIds
    }, origin);
    return;
  }

  const systemPrompt = buildSystemPrompt({ locale, provider, model, profile: body.profile });
  const messages = normalizeChatMessages(body, systemPrompt);
  const lastUserMessage = getLastUserMessage(messages);
  if (!lastUserMessage) {
    sendJson(res, 400, {
      error: "MESSAGES_REQUIRED"
    }, origin);
    return;
  }
  const workspacePrompt = [
    ...messages
      .filter((message) => message.role === "user")
      .slice(-3)
      .map((message) => message.content),
    typeof body.prompt === "string" ? body.prompt : "",
  ].join("\n\n");
  const latestUserPrompt = String(lastUserMessage.content || "").trim();
  const workspaceActionPrompt = hasExplicitActionConfirmation(latestUserPrompt)
    ? workspacePrompt
    : latestUserPrompt;

  const apiKey = provider === "ollama" ? "" : getProviderApiKey(provider, body.apiKey);
  if (provider !== "ollama" && !apiKey) {
    sendProviderMissingKey(res, origin, provider);
    return;
  }

  const workspaceContext = await buildWorkspaceContext({
    prompt: workspacePrompt,
    profile: body.profile,
    authToken: typeof body.authToken === "string" ? body.authToken : "",
  });
  const workspaceActionContext = await buildWorkspaceActionContext({
    prompt: workspaceActionPrompt,
    profile: body.profile,
    authToken: typeof body.authToken === "string" ? body.authToken : "",
    provider,
    model,
    apiKey,
    locale,
    workspaceContext,
  });
  if (workspaceActionContext?.type === "direct-answer") {
    sendJson(res, 200, {
      ok: true,
      provider,
      model,
      answer: workspaceActionContext.answer
    }, origin);
    return;
  }
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
  if (typeof body.toolContext === "string" && body.toolContext.trim()) {
    messages.splice(1, 0, {
      role: "system",
      content: [
        "Connected local tool context:",
        body.toolContext.trim(),
        "This tool context was produced by MiVA before the model response. Use it when it directly answers the user request.",
      ].join("\n")
    });
  }
  if (imageAttachments.length > 0) {
    messages.splice(1, 0, {
      role: "system",
      content: [
        "The user attached one or more images to this request.",
        "MiVA sends attached images to Gemini 2.5 for vision analysis.",
        "Describe what you see accurately and answer the user's latest message.",
      ].join("\n"),
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

  let answer;
  let responseModel = model;
  let fallback = null;

  if (body.stream === true) {
    if (provider === "openai") {
      await streamOpenAiAnswer({ res, origin, model, messages, apiKey });
      return;
    }

    if (provider === "groq") {
      await streamGroqAnswer({ res, origin, model, messages, apiKey });
      return;
    }

    await streamGeminiAnswerWithFallback({
      res,
      origin,
      model,
      messages,
      systemPrompt,
      apiKey,
      imageAttachments,
    });
    return;
  }

  if (provider === "openai") {
    answer = await getOpenAiAnswer({ model, messages, apiKey });
  } else if (provider === "groq") {
    answer = await getGroqAnswer({ model, messages, apiKey });
  } else {
    const geminiResult = await getGeminiAnswerWithFallback({
      model,
      messages,
      systemPrompt,
      apiKey,
      imageAttachments,
    });
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
