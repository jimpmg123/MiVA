import { getDaisoStatus, runDaisoRequest } from "../services/daiso.mjs";
import { readJson, sendJson } from "../utils/http.mjs";

export async function handleDaisoStatus(req, res, origin) {
  sendJson(res, 200, await getDaisoStatus(), origin);
}

export async function handleDaisoRun(req, res, origin) {
  const payload = await readJson(req);
  sendJson(res, 200, await runDaisoRequest(payload), origin);
}
