const LOCAL_HELPER_BASE_URL = "http://127.0.0.1:43110";

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${LOCAL_HELPER_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || data?.hint || `HTTP ${response.status}`);
  }

  return data as T;
}

export type ImageGenStatus = {
  available: boolean;
  model: string;
  provider: string;
  endpoint: string;
};

export type ImageGenResult = {
  ok: true;
  prompt: string;
  model: string;
  mimeType: string;
  imageBase64: string;
};

export function getImageGenStatus() {
  return readJson<ImageGenStatus>("/image-gen/status");
}

export function generateImageRequest(input: {
  prompt: string;
  apiKey?: string;
  model?: string;
}) {
  return readJson<ImageGenResult>("/image-gen/generate", {
    method: "POST",
    body: JSON.stringify({
      prompt: input.prompt,
      apiKey: input.apiKey?.trim() || undefined,
      model: input.model,
    }),
  });
}

export function toImageDataUrl(mimeType: string, imageBase64: string) {
  return `data:${mimeType};base64,${imageBase64}`;
}
