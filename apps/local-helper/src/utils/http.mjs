import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { allowedOrigins, PUBLIC_DIR } from "../config.mjs";

const staticContentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ico": "image/x-icon"
};

export function writeCorsHeaders(res, origin) {
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("access-control-allow-origin", origin);
  }
  res.setHeader("vary", "origin");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,x-miva-token");
}

export function sendJson(res, statusCode, data, origin) {
  const body = JSON.stringify(data, null, 2);
  writeCorsHeaders(res, origin);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

export async function serveStatic(req, res, url) {
  if (req.method !== "GET") {
    return false;
  }

  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolve(PUBLIC_DIR, `.${decodeURIComponent(pathname)}`);
  const root = resolve(PUBLIC_DIR);

  if (!filePath.startsWith(root)) {
    sendJson(res, 403, {
      error: "FORBIDDEN"
    }, req.headers.origin);
    return true;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "content-type": staticContentTypes[extname(filePath)] || "application/octet-stream",
      "content-length": content.length
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
