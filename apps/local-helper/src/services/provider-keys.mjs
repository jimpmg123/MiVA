import { getProviderEnvKey } from "../extensions/providers.mjs";

export function getProviderApiKey(provider, overrideKey) {
  if (typeof overrideKey === "string" && overrideKey.trim()) {
    return overrideKey.trim();
  }

  const envKey = getProviderEnvKey(provider);
  return envKey ? process.env[envKey] || "" : "";
}
