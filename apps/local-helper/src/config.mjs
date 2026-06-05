import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyDemoEnv } from "../../../packages/shared/src/demo-env.mjs";
import { lightweightModels } from "../../../packages/shared/src/index.js";

function loadEnvFile(fileName) {
  const envPath = fileURLToPath(new URL(`../${fileName}`, import.meta.url));

  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [rawKey, ...rawValueParts] = trimmed.split("=");
      const key = rawKey.trim();
      const value = rawValueParts.join("=").trim().replace(/^["']|["']$/g, "");
      if (key && (process.env[key] === undefined || process.env[key] === "")) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional env files are loaded best-effort.
  }
}

applyDemoEnv();
loadEnvFile(".env");

export const HELPER_PORT = Number(process.env.MIVA_HELPER_PORT || 43110);
export const CLOUD_API_URL = process.env.MIVA_CLOUD_API_URL || "http://127.0.0.1:4000";
export const VOICE_WORKER_HOST = process.env.MIVA_VOICE_WORKER_HOST || "127.0.0.1";
export const VOICE_WORKER_PORT = Number(process.env.MIVA_VOICE_WORKER_PORT || 43120);
export const VOICE_WORKER_BASE_URL = `http://${VOICE_WORKER_HOST}:${VOICE_WORKER_PORT}`;
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const OPENAI_DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";
export const GEMINI_DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash";
export const GROQ_DEFAULT_MODEL = process.env.GROQ_DEFAULT_MODEL || "llama-3.1-8b-instant";
export const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-2.5-flash,gemini-2.5-flash-lite")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
export const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));

export const modelCatalog = lightweightModels;
export const allowedModels = new Set(modelCatalog.map((model) => model.ollamaName));

export const allowedOrigins = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://localhost:1421",
  "http://127.0.0.1:1421",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "tauri://localhost",
  `http://localhost:${HELPER_PORT}`,
  `http://127.0.0.1:${HELPER_PORT}`
]);
