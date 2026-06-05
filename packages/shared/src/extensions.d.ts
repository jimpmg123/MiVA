export type SharedProviderId = "ollama" | "openai" | "gemini" | "groq";
export type SharedCloudProviderId = Exclude<SharedProviderId, "ollama">;
export type SharedProviderMode = "local" | "cloud";

export type SharedLocalizedText = {
  ko: string;
  en: string;
};

export type SharedCloudModelInfo = {
  id: string;
  provider: SharedCloudProviderId;
  label: string;
  category: string;
  summary: SharedLocalizedText;
  bestFor: SharedLocalizedText;
  status: SharedLocalizedText;
};

export type SharedProviderAuthManifest =
  | {
      type: "none";
    }
  | {
      type: "apiKey";
      envKey: string;
      label: string;
      placeholder: string;
      helpUrl: string;
    };

export type SharedProviderManifest = {
  id: SharedProviderId;
  label: string;
  mode: SharedProviderMode;
  icon: string;
  auth: SharedProviderAuthManifest;
  defaultModel?: string;
  defaultModelEnvKey?: string;
  capabilities: string[];
};

export type SharedCloudProviderManifest = SharedProviderManifest & {
  id: SharedCloudProviderId;
  mode: "cloud";
  auth: Extract<SharedProviderAuthManifest, { type: "apiKey" }>;
  defaultModel: string;
  defaultModelEnvKey: string;
  models: SharedCloudModelInfo[];
};

export type SharedToolManifest = {
  id: "googleWorkspace" | "daisoCli";
  title: string;
  label: string;
  icon: string;
  description: string;
  role: string;
  features: string[];
  auth: {
    type: "none" | "oauth" | "localRuntime";
  };
  capabilities: string[];
  confirmation: {
    writeActions: "none" | "required";
  };
  prompt: {
    enabled: string[];
    disabled: string[];
  };
};

export const cloudModelCatalog: SharedCloudModelInfo[];
export const cloudProviderManifests: SharedCloudProviderManifest[];
export const providerManifestList: SharedProviderManifest[];
export const providerManifests: Record<SharedProviderId, SharedProviderManifest>;
export const providerMeta: Record<SharedProviderId, { label: string; mode: SharedProviderMode; icon: string }>;
export const allowedProviderIds: SharedProviderId[];
export const toolManifestList: SharedToolManifest[];
export const toolManifests: Record<SharedToolManifest["id"], SharedToolManifest>;

export function getProviderManifest(provider: string): SharedProviderManifest | null;
export function isProviderAllowed(provider: string): boolean;
export function getProviderDefaultModel(provider: string): string;
export function getProviderEnvKey(provider: string): string | null;
export function getToolManifest(toolId: string): SharedToolManifest | null;
export function buildProviderCapabilityInstructions(provider: string): string[];
export function buildToolCapabilityInstructions(toolConnections?: Record<string, unknown>): string[];
