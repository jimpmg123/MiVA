import { getDemoProviderKey } from "../../../../packages/shared/src/demo-env.mjs";

export const DEFAULT_HF_IMAGE_MODEL = "stabilityai/stable-diffusion-2-1";
const HF_INFERENCE_BASE = "https://api-inference.huggingface.co/models";
const MAX_LOADING_RETRIES = 2;
const LOADING_RETRY_MS = 8000;

function resolveApiKey(overrideKey) {
  if (typeof overrideKey === "string" && overrideKey.trim()) {
    return overrideKey.trim();
  }

  const fromEnv = process.env.HUGGINGFACE_API_KEY || "";
  if (fromEnv) {
    return fromEnv;
  }

  return getDemoProviderKey("huggingface");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload?.error) {
      return String(payload.error);
    }
    if (payload?.estimated_time) {
      return `Model is loading. Try again in about ${Math.ceil(Number(payload.estimated_time))} seconds.`;
    }
    return JSON.stringify(payload);
  }

  const text = await response.text().catch(() => "");
  return text || `HTTP ${response.status}`;
}

export async function generateHuggingFaceImage({
  prompt,
  apiKey,
  model = DEFAULT_HF_IMAGE_MODEL,
}) {
  const resolvedPrompt = String(prompt || "").trim();
  if (!resolvedPrompt) {
    return {
      ok: false,
      message: "IMAGE_PROMPT_REQUIRED",
    };
  }

  const resolvedKey = resolveApiKey(apiKey);
  if (!resolvedKey) {
    return {
      ok: false,
      message: "HUGGINGFACE_API_KEY_REQUIRED",
      hint: "Add a Hugging Face API token in Settings or HUGGINGFACE_API_KEY in demo.env.",
    };
  }

  const endpoint = `${HF_INFERENCE_BASE}/${model}`;
  let lastError = "Image generation failed.";

  for (let attempt = 0; attempt <= MAX_LOADING_RETRIES; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${resolvedKey}`,
        "content-type": "application/json",
        accept: "image/png,image/jpeg,application/json",
      },
      body: JSON.stringify({ inputs: resolvedPrompt }),
    });

    if (response.status === 503 && attempt < MAX_LOADING_RETRIES) {
      lastError = await readErrorMessage(response);
      await sleep(LOADING_RETRY_MS);
      continue;
    }

    if (!response.ok) {
      lastError = await readErrorMessage(response);
      return {
        ok: false,
        message: lastError,
        model,
      };
    }

    const mimeType = (response.headers.get("content-type") || "image/png").split(";")[0].trim();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      return {
        ok: false,
        message: "Hugging Face returned an empty image response.",
        model,
      };
    }

    return {
      ok: true,
      prompt: resolvedPrompt,
      model,
      mimeType,
      imageBase64: buffer.toString("base64"),
    };
  }

  return {
    ok: false,
    message: lastError,
    model,
  };
}

export function getHuggingFaceImageStatus() {
  const hasKey = Boolean(resolveApiKey(""));
  return {
    available: hasKey,
    model: DEFAULT_HF_IMAGE_MODEL,
    provider: "huggingface",
    endpoint: HF_INFERENCE_BASE,
  };
}
