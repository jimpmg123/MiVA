export const CLOUD_API_URL = "http://127.0.0.1:4000";
const WEB_AUTH_STORAGE_KEY = "miva.web.auth.v1";

export type ProviderId = "ollama" | "openai" | "gemini";
export type ServiceStatus = "checking" | "connected" | "offline";
export type AssistantProfileStatus = "draft" | "finalized";
export type AssistantProfileSource = "desktop-setup" | "web-console" | "api";
export type AuthRole = "guest" | "user" | "admin";
export type CalendarActionMode = "draftOnly" | "confirmBeforeAction" | "connectedActions";
export type WorkspaceToolPolicy = "disabled" | "askFirst" | "connectedOnly";
export type CodingCapability = "chatOnly" | "codeExplain" | "codeEdit" | "clawCode";
export type CodingProviderPolicy = "localAllowed" | "cloudRecommended" | "cloudRequired";
export type CodingAccessMode = "readOnly" | "fileEdits" | "shellCommands";
export type ApiKeyProviderId = "openai" | "gemini" | "anthropic" | "custom";
export type ApiKeyStatus = "notConfigured" | "configured" | "verified" | "error";
export type UsageMode = "local" | "cloud";

export interface PromptSettings {
  persona: string;
  roleGoal: string;
  responseRules: string[];
  scheduleRules: {
    mode: CalendarActionMode;
    timezone: string;
    reminderPreference: string;
  };
  workspaceRules: {
    googleWorkspace: WorkspaceToolPolicy;
    calendar: WorkspaceToolPolicy;
    gmail: WorkspaceToolPolicy;
    drive: WorkspaceToolPolicy;
  };
  coding?: {
    capability: CodingCapability;
    providerPolicy: CodingProviderPolicy;
    localExperimental: boolean;
    accessMode: CodingAccessMode;
    workspaceAllowlistRequired: boolean;
  };
  safetyRules: string[];
}

export interface AssistantPromptConfig {
  profileId?: string | null;
  systemPrompt?: string;
  settings?: PromptSettings;
  variables?: Record<string, unknown>;
  overrides?: {
    persona?: string | null;
    instructions?: string[];
    guardrails?: string[];
  };
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Exclude<AuthRole, "guest">;
  locale: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  isNewUser?: boolean;
}

export interface AssistantProfile {
  id: string;
  name: string;
  description: string;
  useCase: string;
  answerStyle: string;
  priority: string;
  languageUse: string;
  localMode: string;
  provider: ProviderId;
  model: string;
  futureFeatures: string[];
  isDefault: boolean;
  status: AssistantProfileStatus;
  source: AssistantProfileSource;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  prompt?: AssistantPromptConfig;
  capabilities?: {
    coding?: {
      capability: CodingCapability;
      providerPolicy: CodingProviderPolicy;
      localExperimental: boolean;
      accessMode: CodingAccessMode;
      workspaceAllowlistRequired: boolean;
    };
    [key: string]: unknown;
  };
}

export type AssistantProfileDraft = Omit<
  AssistantProfile,
  "id" | "status" | "source" | "createdAt" | "updatedAt" | "completedAt"
> & {
  id?: string;
  status?: AssistantProfileStatus;
  source?: AssistantProfileSource;
  completedAt?: string | null;
};

export interface AdminTopItem {
  name: string;
  count: number;
}

export interface UsageEvent {
  id: string;
  type: string;
  value: string;
  createdAt: string;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
  };
  devices: {
    total: number;
    connected: number;
  };
  assistantProfiles: {
    total: number;
    finalized: number;
    useCases: AdminTopItem[];
    localModes: AdminTopItem[];
    codingCapabilities?: AdminTopItem[];
    statuses: AdminTopItem[];
  };
  providers: AdminTopItem[];
  models: AdminTopItem[];
  recentEvents: UsageEvent[];
}

export interface ApiKeyRecord {
  id: string;
  provider: ApiKeyProviderId;
  label: string;
  maskedKey: string;
  status: ApiKeyStatus;
  lastValidatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyDraft {
  id?: string;
  provider: ApiKeyProviderId;
  label: string;
  key: string;
}

export interface UsageSummary {
  totals: {
    events: number;
    localEvents: number;
    cloudEvents: number;
    estimatedInputChars: number;
    estimatedOutputChars: number;
    averageLatencyMs: number;
  };
  byProvider: AdminTopItem[];
  byModel: AdminTopItem[];
  recentEvents: Array<{
    id: string;
    mode: UsageMode;
    provider: string;
    model: string;
    assistantProfileId?: string | null;
    inputChars: number;
    outputChars: number;
    durationMs: number;
    success: boolean;
    createdAt: string;
  }>;
}

export interface LocalUsageEventDraft {
  deviceId?: string;
  assistantProfileId?: string | null;
  mode: UsageMode;
  provider: string;
  model: string;
  inputChars?: number;
  outputChars?: number;
  durationMs?: number;
  success?: boolean;
  createdAt?: string;
}

export interface CloudState {
  status: ServiceStatus;
  profiles: AssistantProfile[];
  adminStats: AdminStats | null;
  apiKeys: ApiKeyRecord[];
  usageSummary: UsageSummary | null;
  error?: string;
  lastChecked: Date | null;
}

export const initialCloudState: CloudState = {
  status: "checking",
  profiles: [],
  adminStats: null,
  apiKeys: [],
  usageSummary: null,
  lastChecked: null,
};

function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(WEB_AUTH_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved) as { token?: unknown };
    return typeof parsed.token === "string" && parsed.token ? parsed.token : null;
  } catch {
    return null;
  }
}

function shouldAttachCloudAuth(url: string) {
  return url.startsWith(CLOUD_API_URL);
}

function buildRequestHeaders(url: string, initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  if (shouldAttachCloudAuth(url) && !headers.has("authorization")) {
    const token = getStoredAuthToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: buildRequestHeaders(url, init?.headers),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export async function checkCloudApi() {
  return fetchJson<{ ok: boolean; service: string; note?: string }>(`${CLOUD_API_URL}/health`);
}

export async function login(email: string, password: string) {
  return fetchJson<AuthResponse>(`${CLOUD_API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithGoogleCredential(credential: string) {
  return fetchJson<AuthResponse>(`${CLOUD_API_URL}/auth/google`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ credential }),
  });
}

export async function completeDesktopDeviceLogin(deviceCode: string, token: string) {
  return fetchJson<{ status: string }>(`${CLOUD_API_URL}/auth/device/complete`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ deviceCode, token }),
  });
}

export async function getAssistantProfiles() {
  return fetchJson<{ profiles: AssistantProfile[] }>(`${CLOUD_API_URL}/assistant-profiles`);
}

export async function getAssistantProfile(profileId: string) {
  return fetchJson<{ profile: AssistantProfile }>(`${CLOUD_API_URL}/assistant-profiles/${encodeURIComponent(profileId)}`);
}

export async function createAssistantProfile(profile: AssistantProfileDraft) {
  return fetchJson<{ profile: AssistantProfile }>(`${CLOUD_API_URL}/assistant-profiles`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(profile),
  });
}

export async function deleteAssistantProfile(profileId: string) {
  return fetchJson<{ ok: boolean; profile: AssistantProfile }>(`${CLOUD_API_URL}/assistant-profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });
}

export async function finalizeAssistantProfile(profileId: string) {
  return fetchJson<{ profile: AssistantProfile }>(`${CLOUD_API_URL}/assistant-profiles/${profileId}/finalize`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
  });
}

export async function getAdminStats() {
  return fetchJson<AdminStats>(`${CLOUD_API_URL}/admin/stats`);
}

export async function getApiKeys() {
  return fetchJson<{ keys: ApiKeyRecord[] }>(`${CLOUD_API_URL}/api-keys`);
}

export async function saveApiKey(key: ApiKeyDraft) {
  return fetchJson<{ key: ApiKeyRecord }>(`${CLOUD_API_URL}/api-keys`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(key),
  });
}

export async function testApiKey(keyId: string) {
  return fetchJson<{ key: ApiKeyRecord }>(`${CLOUD_API_URL}/api-keys/${encodeURIComponent(keyId)}/test`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
  });
}

export async function getUsageSummary() {
  return fetchJson<UsageSummary>(`${CLOUD_API_URL}/usage/summary`);
}

export async function recordLocalUsageEvents(events: LocalUsageEventDraft[]) {
  return fetchJson<{ ok: boolean; accepted: number }>(`${CLOUD_API_URL}/usage/local-events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ events }),
  });
}

export async function recordUsageEvent(type: string, value: string) {
  return fetchJson<{ ok: boolean }>(`${CLOUD_API_URL}/usage-events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ type, value }),
  });
}
