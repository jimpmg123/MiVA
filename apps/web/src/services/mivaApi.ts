export const CLOUD_API_URL = "http://127.0.0.1:4000";

export type ProviderId = "ollama" | "openai" | "gemini";
export type ServiceStatus = "checking" | "connected" | "offline";
export type AssistantProfileStatus = "draft" | "finalized";
export type AssistantProfileSource = "desktop-setup" | "web-console" | "api";
export type AuthRole = "guest" | "user" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Exclude<AuthRole, "guest">;
  locale: string;
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
    statuses: AdminTopItem[];
  };
  providers: AdminTopItem[];
  models: AdminTopItem[];
  recentEvents: UsageEvent[];
}

export interface CloudState {
  status: ServiceStatus;
  profiles: AssistantProfile[];
  adminStats: AdminStats | null;
  error?: string;
  lastChecked: Date | null;
}

export const initialCloudState: CloudState = {
  status: "checking",
  profiles: [],
  adminStats: null,
  lastChecked: null,
};

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

export async function checkCloudApi() {
  return fetchJson<{ ok: boolean; service: string; note?: string }>(`${CLOUD_API_URL}/health`);
}

export async function login(email: string, password: string) {
  return fetchJson<{ user: AuthUser; token: string }>(`${CLOUD_API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function getAssistantProfiles() {
  return fetchJson<{ profiles: AssistantProfile[] }>(`${CLOUD_API_URL}/assistant-profiles`);
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

export async function recordUsageEvent(type: string, value: string) {
  return fetchJson<{ ok: boolean }>(`${CLOUD_API_URL}/usage-events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ type, value }),
  });
}
