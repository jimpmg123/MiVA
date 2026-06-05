import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function resolveDemoEnvPath() {
  const sharedDir = fileURLToPath(new URL(".", import.meta.url));
  return path.resolve(sharedDir, "../../../apps/local-helper/demo.env");
}

export function parseEnvContent(content) {
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [rawKey, ...rawValueParts] = trimmed.split("=");
    const key = rawKey.trim();
    const value = rawValueParts.join("=").trim().replace(/^["']|["']$/g, "");
    if (key) {
      values[key] = value;
    }
  }

  return values;
}

export function loadDemoEnv() {
  const envPath = resolveDemoEnvPath();
  if (!existsSync(envPath)) {
    return {};
  }

  return parseEnvContent(readFileSync(envPath, "utf8"));
}

const providerEnvKeys = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

export function getDemoProviderKey(provider) {
  const envKey = providerEnvKeys[provider];
  if (!envKey) {
    return "";
  }

  return loadDemoEnv()[envKey] || "";
}

export function applyDemoEnv(processEnv = process.env) {
  for (const [key, value] of Object.entries(loadDemoEnv())) {
    if (key && (processEnv[key] === undefined || processEnv[key] === "")) {
      processEnv[key] = value;
    }
  }
}
