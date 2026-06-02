export async function getGroqAnswer({ model, messages, apiKey }) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
    throw new Error(data?.error?.message || `Groq returned HTTP ${response.status}`);
  }

  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  return answer.trim();
}
