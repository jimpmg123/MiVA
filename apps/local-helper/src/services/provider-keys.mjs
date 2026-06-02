export function getProviderApiKey(provider, overrideKey) {
  if (typeof overrideKey === "string" && overrideKey.trim()) {
    return overrideKey.trim();
  }

  if (provider === "openai") {
    return process.env.OPENAI_API_KEY || "";
  }

  if (provider === "gemini") {
    return process.env.GEMINI_API_KEY || "";
  }

  if (provider === "groq") {
    return process.env.GROQ_API_KEY || "";
  }

  return "";
}
