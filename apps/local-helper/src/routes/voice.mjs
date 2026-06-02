import { readJson, sendJson } from "../utils/http.mjs";
import { getVoiceWorkerStatus, installKokoroDependencies, startVoiceWorker, synthesizeVoice } from "../services/voice-worker.mjs";

export async function handleVoiceStatus(req, res, origin) {
  sendJson(res, 200, await getVoiceWorkerStatus(), origin);
}

export async function handleVoiceStart(req, res, origin) {
  sendJson(res, 200, await startVoiceWorker(), origin);
}

export async function handleVoiceInstallKokoro(req, res, origin) {
  sendJson(res, 200, await installKokoroDependencies(), origin);
}

export async function handleVoiceTts(req, res, origin) {
  const payload = await readJson(req);
  sendJson(res, 200, await synthesizeVoice(payload), origin);
}
