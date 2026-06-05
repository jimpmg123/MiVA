export async function getOpenAiAnswer({ model, messages, apiKey }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4
    }),
    signal: AbortSignal.timeout(1000 * 60 * 3)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI returned HTTP ${response.status}`);
  }

  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("OpenAI returned an empty response.");
  }

  return answer.trim();
}

export async function streamOpenAiAnswer({ res, origin, model, messages, apiKey }) {
  const { beginNdjsonStream, pipeOpenAiCompatibleSse, writeStreamDone, writeStreamError } = await import("../utils/chat-stream.mjs");
  beginNdjsonStream(res, origin);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      stream: true,
    }),
    signal: AbortSignal.timeout(1000 * 60 * 10),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    writeStreamError(res, data?.error?.message || `OpenAI returned HTTP ${response.status}`);
    writeStreamDone(res);
    return;
  }

  await pipeOpenAiCompatibleSse(response, res);
}
