import http from "node:http";
import { lightweightModels } from "../../../packages/shared/src/index.js";

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
      models: lightweightModels
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
