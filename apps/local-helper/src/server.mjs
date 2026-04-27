import http from "node:http";

const HELPER_PORT = Number(process.env.MIVA_HELPER_PORT || 43110);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const allowedModels = new Set([
  "qwen3:4b",
  "llama3.2:3b",
  "gemma3:4b",
  "phi3:mini"
]);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

function sendJson(res, statusCode, data, origin) {
  const body = JSON.stringify(data, null, 2);
  writeCorsHeaders(res, origin);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function writeCorsHeaders(res, origin) {
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("access-control-allow-origin", origin);
  }
  res.setHeader("vary", "origin");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,x-miva-token");
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function ollamaFetch(path, options = {}) {
  return fetch(`${OLLAMA_BASE_URL}${path}`, options);
}

async function getOllamaStatus() {
  try {
    const response = await ollamaFetch("/api/tags");
    return {
      running: response.ok,
      status: response.status,
      baseUrl: OLLAMA_BASE_URL
    };
  } catch (error) {
    return {
      running: false,
      baseUrl: OLLAMA_BASE_URL,
      error: error.message
    };
  }
}

function isAllowedModel(model) {
  return typeof model === "string" && allowedModels.has(model);
}

async function handleModels(req, res, origin) {
  const response = await ollamaFetch("/api/tags");
  if (!response.ok) {
    sendJson(res, 502, {
      error: "OLLAMA_UNAVAILABLE",
      message: "Ollama did not return the installed model list.",
      status: response.status
    }, origin);
    return;
  }

  const data = await response.json();
  sendJson(res, 200, {
    models: data.models || [],
    allowedModels: Array.from(allowedModels)
  }, origin);
}

async function handleModelPull(req, res, origin) {
  const { model } = await readJson(req);
  if (!isAllowedModel(model)) {
    sendJson(res, 400, {
      error: "MODEL_NOT_ALLOWED",
      allowedModels: Array.from(allowedModels)
    }, origin);
    return;
  }

  const response = await ollamaFetch("/api/pull", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      name: model,
      stream: true
    })
  });

  writeCorsHeaders(res, origin);
  res.writeHead(response.ok ? 200 : 502, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache"
  });

  if (!response.body) {
    res.end(JSON.stringify({ error: "NO_STREAM" }) + "\n");
    return;
  }

  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}

async function handleChat(req, res, origin) {
  const body = await readJson(req);
  const model = body.model || "llama3.2:3b";

  if (!isAllowedModel(model)) {
    sendJson(res, 400, {
      error: "MODEL_NOT_ALLOWED",
      allowedModels: Array.from(allowedModels)
    }, origin);
    return;
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    sendJson(res, 400, {
      error: "MESSAGES_REQUIRED"
    }, origin);
    return;
  }

  const response = await ollamaFetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    })
  });

  writeCorsHeaders(res, origin);
  res.writeHead(response.ok ? 200 : 502, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache"
  });

  if (!response.body) {
    res.end(JSON.stringify({ error: "NO_STREAM" }) + "\n");
    return;
  }

  for await (const chunk of response.body) {
    res.write(chunk);
  }
  res.end();
}

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

    if (req.method === "GET" && url.pathname === "/models") {
      await handleModels(req, res, origin);
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

