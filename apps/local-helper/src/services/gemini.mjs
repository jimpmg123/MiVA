import { GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODELS } from "../config.mjs";

function toGeminiContents(messages) {
  const contents = [];

  for (const message of messages) {
    if (message.role === "system") {
      contents.push({
        role: "user",
        parts: [{
          text: [
            "MiVA runtime context follows. Use it as authoritative context for the user's request.",
            message.content,
          ].join("\n\n"),
        }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Understood. I will use this MiVA runtime context when answering." }],
      });
      continue;
    }

    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    });
  }

  return contents;
}

class ProviderHttpError extends Error {
  constructor(provider, statusCode, providerStatus, message) {
    super(message);
    this.name = "ProviderHttpError";
    this.provider = provider;
    this.statusCode = statusCode;
    this.providerStatus = providerStatus;
  }
}

class ProviderEmptyResponseError extends Error {
  constructor(provider, message) {
    super(message);
    this.name = "ProviderEmptyResponseError";
    this.provider = provider;
  }
}

function getGeminiModelAttempts(model) {
  const requestedModel = typeof model === "string" && model.trim() ? model.trim() : GEMINI_DEFAULT_MODEL;
  const fallbackIndex = GEMINI_FALLBACK_MODELS.indexOf(requestedModel);

  if (fallbackIndex >= 0) {
    return GEMINI_FALLBACK_MODELS.slice(fallbackIndex);
  }

  return [
    requestedModel,
    ...GEMINI_FALLBACK_MODELS.filter((fallbackModel) => fallbackModel !== requestedModel)
  ];
}

function shouldFallbackGemini(error) {
  if (error instanceof ProviderEmptyResponseError) {
    return true;
  }

  if (!(error instanceof ProviderHttpError)) {
    return false;
  }

  return (
    error.statusCode === 429 ||
    error.statusCode === 503 ||
    error.providerStatus === "RESOURCE_EXHAUSTED" ||
    error.providerStatus === "UNAVAILABLE"
  );
}

async function getGeminiAnswer({ model, messages, systemPrompt, apiKey }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.4
        }
      }),
      signal: AbortSignal.timeout(1000 * 60 * 3)
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderHttpError(
      "gemini",
      response.status,
      data?.error?.status,
      data?.error?.message || `Gemini returned HTTP ${response.status}`
    );
  }

  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!answer) {
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason ? ` finishReason=${candidate.finishReason}.` : "";
    const blockReason = data?.promptFeedback?.blockReason ? ` blockReason=${data.promptFeedback.blockReason}.` : "";
    const safety = Array.isArray(candidate?.safetyRatings)
      ? ` safety=${candidate.safetyRatings.map((rating) => `${rating.category}:${rating.probability}`).join(", ")}.`
      : "";
    throw new ProviderEmptyResponseError("gemini", `Gemini returned an empty response.${finishReason}${blockReason}${safety}`.trim());
  }

  return answer;
}

export async function getGeminiAnswerWithFallback({ model, messages, systemPrompt, apiKey }) {
  const attemptedModels = getGeminiModelAttempts(model);
  const errors = [];

  for (const candidateModel of attemptedModels) {
    try {
      const answer = await getGeminiAnswer({
        model: candidateModel,
        messages,
        systemPrompt,
        apiKey
      });

      return {
        answer,
        model: candidateModel,
        requestedModel: model,
        attemptedModels
      };
    } catch (error) {
      errors.push({
        model: candidateModel,
        message: error?.message || "Unknown Gemini error"
      });

      if (!shouldFallbackGemini(error) || candidateModel === attemptedModels.at(-1)) {
        throw error;
      }
    }
  }

  const lastError = errors.at(-1);
  throw new Error(`Gemini fallback models failed. Last error: ${lastError?.message || "Unknown error"}`);
}
