import { requestLocalHelper } from "../localHelper/client";

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
  return requestLocalHelper<ImageGenStatus>("/image-gen/status");
}

export function generateImageRequest(input: {
  prompt: string;
  apiKey?: string;
  model?: string;
}) {
  return requestLocalHelper<ImageGenResult>("/image-gen/generate", {
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
