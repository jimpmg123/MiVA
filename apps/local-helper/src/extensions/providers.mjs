import {
  allowedProviderIds,
  buildProviderCapabilityInstructions,
  providerManifests,
} from "../../../../packages/shared/src/index.js";

export { allowedProviderIds, buildProviderCapabilityInstructions, providerManifests };

export function getProviderManifest(provider) {
  return providerManifests[provider] || null;
}

export function isProviderAllowed(provider) {
  return Boolean(getProviderManifest(provider));
}

export function getProviderDefaultModel(provider) {
  const manifest = getProviderManifest(provider);
  const envDefault = manifest?.defaultModelEnvKey ? process.env[manifest.defaultModelEnvKey] : null;
  return envDefault || manifest?.defaultModel || providerManifests.ollama.defaultModel;
}

export function getProviderEnvKey(provider) {
  const auth = getProviderManifest(provider)?.auth;
  return auth?.type === "apiKey" ? auth.envKey : null;
}
