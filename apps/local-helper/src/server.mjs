import http from "node:http";
import { HELPER_PORT, OLLAMA_BASE_URL } from "./config.mjs";
import { getOllamaStatus } from "./services/ollama.mjs";
import { handleChat } from "./routes/chat.mjs";
import {
  handleCatalog,
  handleModelPull,
  handleModels,
  handleOllamaInstall,
  handleOllamaStart
} from "./routes/ollama.mjs";
import { handleVoiceStart, handleVoiceStatus, handleVoiceTts } from "./routes/voice.mjs";
import { sendJson, serveStatic, writeCorsHeaders } from "./utils/http.mjs";

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

    if (req.method === "POST" && url.pathname === "/voice/start") {
      await handleVoiceStart(req, res, origin);
      return;
    }

    if (req.method === "POST" && url.pathname === "/voice/tts") {
      await handleVoiceTts(req, res, origin);
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
