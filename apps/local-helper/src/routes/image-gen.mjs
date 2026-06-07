import { generateHuggingFaceImage, getHuggingFaceImageStatus } from "../services/huggingface-image.mjs";
import { readJson, sendJson } from "../utils/http.mjs";

export async function handleImageGenStatus(_req, res, origin) {
  sendJson(res, 200, getHuggingFaceImageStatus(), origin);
}

export async function handleImageGenGenerate(req, res, origin) {
  const body = await readJson(req);
  const result = await generateHuggingFaceImage({
    prompt: typeof body.prompt === "string" ? body.prompt : "",
    apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
    model: typeof body.model === "string" ? body.model : undefined,
  });

  if (!result.ok) {
    sendJson(res, result.message === "HUGGINGFACE_API_KEY_REQUIRED" ? 400 : 502, result, origin);
    return;
  }

  sendJson(res, 200, result, origin);
}
