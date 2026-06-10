import type { CloudModelInfo, CloudProviderId, ProviderId, ProviderMode } from "../../types";

export type ProviderCapability = "chat" | "streaming" | "toolContext" | "localRuntime";

export type ProviderAuthManifest =
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

export type ProviderManifest = {
  id: ProviderId;
  label: string;
  mode: ProviderMode;
  icon: string;
  auth: ProviderAuthManifest;
  defaultModel?: string;
  capabilities: ProviderCapability[];
};

export type CloudProviderManifest = ProviderManifest & {
  id: CloudProviderId;
  mode: "cloud";
  auth: Extract<ProviderAuthManifest, { type: "apiKey" }>;
  defaultModel: string;
  models: CloudModelInfo[];
};

export type ProviderMetaRecord = Record<ProviderId, { label: string; mode: ProviderMode; icon: string }>;

export type ToolConnectionKey = "googleWorkspace";

export type ToolCapability =
  | "readContext"
  | "writeAction"
  | "localCommand"
  | "oauth"
  | "confirmationRequired";

export type ToolManifest = {
  id: ToolConnectionKey;
  title: string;
  label: string;
  icon: string;
  description: string;
  role: string;
  features: string[];
  auth: {
    type: "none" | "oauth" | "localRuntime";
  };
  capabilities: ToolCapability[];
  confirmation: {
    writeActions: "none" | "required";
  };
};
