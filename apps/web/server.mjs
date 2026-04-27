import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.MIVA_WEB_PORT || 5173);
const PUBLIC_DIR = fileURLToPath(new URL("./public/", import.meta.url));

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(PUBLIC_DIR, pathname);
    const content = await readFile(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  } catch {
    res.writeHead(404, {
      "content-type": "text/plain; charset=utf-8"
    });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`MiVA Web demo listening on http://localhost:${PORT}`);
});
