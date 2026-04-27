import http from "node:http";

const PORT = Number(process.env.MIVA_API_PORT || 4000);

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "miva-api",
      note: "Placeholder API. Replace with NestJS when backend domain work starts."
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/catalog/models") {
    sendJson(res, 200, {
      models: [
        {
          id: "llama3.2-3b",
          ollamaName: "llama3.2:3b",
          label: "Low-spec test",
          category: "lightweight"
        },
        {
          id: "qwen3-4b",
          ollamaName: "qwen3:4b",
          label: "Korean recommended",
          category: "lightweight"
        },
        {
          id: "gemma3-4b",
          ollamaName: "gemma3:4b",
          label: "Light general model",
          category: "lightweight"
        },
        {
          id: "phi3-mini",
          ollamaName: "phi3:mini",
          label: "Tiny fallback",
          category: "ultralight"
        }
      ]
    });
    return;
  }

  sendJson(res, 404, {
    error: "NOT_FOUND",
    path: url.pathname
  });
});

server.listen(PORT, () => {
  console.log(`MiVA API placeholder listening on http://localhost:${PORT}`);
});

