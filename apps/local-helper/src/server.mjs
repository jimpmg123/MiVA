import http from "node:http";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HELPER_PORT, OLLAMA_BASE_URL } from "./config.mjs";
import { getOllamaStatus } from "./services/ollama.mjs";
import { handleChat } from "./routes/chat.mjs";
import {
  handleClawCodeInstall,
  handleClawCodeRun,
  handleClawCodeStatus,
  handleClawCodeWorkspace,
} from "./routes/claw-code.mjs";
import { handleDaisoRun, handleDaisoStatus } from "./routes/daiso.mjs";
import { handleImageGenGenerate, handleImageGenStatus } from "./routes/image-gen.mjs";
import { handleDocumentAnalyze } from "./routes/documents.mjs";
import {
  handleCatalog,
  handleModelDelete,
  handleModelPull,
  handleModelPullCancel,
  handleModels,
  handleOllamaInstall,
  handleOllamaStart
} from "./routes/ollama.mjs";
import { handleVoiceInstallKokoro, handleVoiceStart, handleVoiceStatus, handleVoiceTts } from "./routes/voice.mjs";
import { readJson, sendJson, serveStatic, writeCorsHeaders } from "./utils/http.mjs";

const DEBUG_LOG_PATH = path.resolve(
  fileURLToPath(new URL("../../../debug-e45fd0.log", import.meta.url))
);

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    writeCorsHeaders(res, origin);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "miva-local-helper",
        port: HELPER_PORT
      }, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/ollama/status") {
      sendJson(res, 200, await getOllamaStatus(), origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/ollama/start") {
      await handleOllamaStart(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/ollama/install") {
      await handleOllamaInstall(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/catalog/models") {
      handleCatalog(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/models") {
      await handleModels(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/voice/status") {
      await handleVoiceStatus(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/claw-code/status") {
      await handleClawCodeStatus(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/claw-code/install") {
      await handleClawCodeInstall(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/claw-code/workspace") {
      await handleClawCodeWorkspace(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/claw-code/run") {
      await handleClawCodeRun(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/daiso/status") {
      await handleDaisoStatus(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/daiso/run") {
      await handleDaisoRun(req, res, origin);
      return;
    }

    if (req.method === "GET" && url.pathname === "/image-gen/status") {
      await handleImageGenStatus(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/image-gen/generate") {
      await handleImageGenGenerate(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/voice/start") {
      await handleVoiceStart(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/voice/install-kokoro") {
      await handleVoiceInstallKokoro(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/voice/tts") {
      await handleVoiceTts(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/documents/analyze") {
      await handleDocumentAnalyze(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/debug/client-log") {
      const entry = await readJson(req);
      try {
        appendFileSync(DEBUG_LOG_PATH, `${JSON.stringify({
          ...entry,
          timestamp: entry.timestamp || Date.now()
        })}\n`);
      } catch {
        // ignore debug logging failures
      }
      sendJson(res, 204, {}, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/models/delete") {
      await handleModelDelete(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/models/pull/cancel") {
      await handleModelPullCancel(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/models/pull") {
      await handleModelPull(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/chat") {
      await handleChat(req, res, origin);
      return;
    }

    if (await serveStatic(req, res, url)) {
      return;
    }

    sendJson(res, 404, {
      error: "NOT_FOUND",
      path: url.pathname
    }, origin);
  } catch (error) {
    sendJson(res, 500, {
      error: "LOCAL_HELPER_ERROR",
      message: error.message
    }, origin);
  }
});

server.listen(HELPER_PORT, () => {
  console.log(`MiVA Local Helper listening on http://localhost:${HELPER_PORT}`);
  console.log(`Ollama base URL: ${OLLAMA_BASE_URL}`);
});
