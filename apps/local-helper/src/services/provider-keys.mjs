import { getDemoProviderKey } from "../../../../packages/shared/src/demo-env.mjs";
import { getProviderEnvKey } from "../extensions/providers.mjs";

export function getProviderApiKey(provider, overrideKey) {
  if (typeof overrideKey === "string" && overrideKey.trim()) {
    return overrideKey.trim();
  }

  const envKey = getProviderEnvKey(provider);
  const fromEnv = envKey ? process.env[envKey] || "" : "";
  if (fromEnv) {
    return fromEnv;
  }

  return getDemoProviderKey(provider);
}
