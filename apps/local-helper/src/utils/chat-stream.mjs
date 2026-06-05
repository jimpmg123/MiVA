import { writeCorsHeaders } from "./http.mjs";

export function beginNdjsonStream(res, origin) {
  writeCorsHeaders(res, origin);
  res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache",
  });
}

export function writeStreamDelta(res, content) {
  if (!content) {
    return;
  }

  res.write(`${JSON.stringify({ message: { role: "assistant", content } })}\n`);
}

export function writeStreamError(res, message) {
  res.write(`${JSON.stringify({ error: message })}\n`);
}

export function writeStreamDone(res, payload = {}) {
  res.write(`${JSON.stringify({ done: true, ...payload })}\n`);
  res.end();
}

export async function pipeOpenAiCompatibleSse(response, res) {
  if (!response.body) {
    writeStreamError(res, "No stream body returned.");
    writeStreamDone(res);
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      let data;
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = data?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length) {
        answer += delta;
        writeStreamDelta(res, delta);
      }
    }
  }

  writeStreamDone(res, { answer: answer.trim() });
  return answer.trim();
}

export async function pipeGeminiSse(response, res) {
  if (!response.body) {
    writeStreamError(res, "No stream body returned.");
    writeStreamDone(res);
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      let data;
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join("");

      if (typeof delta === "string" && delta.length) {
        answer += delta;
        writeStreamDelta(res, delta);
      }
    }
  }

  writeStreamDone(res, { answer: answer.trim() });
  return answer.trim();
}
