import { readJson, sendJson } from "../utils/http.mjs";
import { analyzeDocument } from "../services/voice-worker.mjs";

export async function handleDocumentAnalyze(req, res, origin) {
  const payload = await readJson(req);
  sendJson(res, 200, await analyzeDocument(payload), origin);
}
