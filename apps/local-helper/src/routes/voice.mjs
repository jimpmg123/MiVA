import { sendJson } from "../utils/http.mjs";
import { getVoiceWorkerStatus, startVoiceWorker } from "../services/voice-worker.mjs";

export async function handleVoiceStatus(req, res, origin) {
  sendJson(res, 200, await getVoiceWorkerStatus(), origin);
}

export async function handleVoiceStart(req, res, origin) {
  sendJson(res, 200, await startVoiceWorker(), origin);
}
