import {
  getClawCodeStatus,
  installClawCode,
  runClawCodeAgent,
  updateClawCodeWorkspace,
} from "../services/claw-code.mjs";
import { readJson, sendJson } from "../utils/http.mjs";

export async function handleClawCodeStatus(req, res, origin) {
  sendJson(res, 200, await getClawCodeStatus(), origin);
}

export async function handleClawCodeInstall(req, res, origin) {
  const payload = await readJson(req);
  const result = await installClawCode({
    workspaceRoot: typeof payload.workspaceRoot === "string" ? payload.workspaceRoot : null,
  });
  sendJson(res, 200, result, origin);
}

export async function handleClawCodeWorkspace(req, res, origin) {
  const payload = await readJson(req);
  if (typeof payload.workspaceRoot !== "string" || !payload.workspaceRoot.trim()) {
    sendJson(res, 400, { error: "WORKSPACE_REQUIRED" }, origin);
    return;
  }

  const result = await updateClawCodeWorkspace(payload.workspaceRoot.trim());
  sendJson(res, 200, result, origin);
}

export async function handleClawCodeRun(req, res, origin) {
  const payload = await readJson(req);
  const result = await runClawCodeAgent({
    prompt: typeof payload.prompt === "string" ? payload.prompt : "",
    profile: payload.profile,
    apiKey: typeof payload.apiKey === "string" ? payload.apiKey : "",
    messages: Array.isArray(payload.messages) ? payload.messages : [],
    locale: payload.locale === "en" ? "en" : "ko",
    workspaceRoot: typeof payload.workspaceRoot === "string" ? payload.workspaceRoot : null,
  });
  sendJson(res, 200, result, origin);
}
