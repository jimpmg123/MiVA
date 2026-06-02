import type { AuthSession, AuthUser, ProviderKeyState } from "../../types";

const PROVIDER_KEYS_STORAGE_KEY = "miva.providerKeys.v1";
const AUTH_STORAGE_KEY = "miva.desktop.auth.v1";
const DEVICE_STORAGE_KEY = "miva.desktop.deviceId.v1";

export const emptyProviderKeys: ProviderKeyState = {
  openai: "",
  gemini: "",
  groq: "",
};

export function loadProviderKeys(): ProviderKeyState {
  if (typeof window === "undefined") {
    return emptyProviderKeys;
  }

  try {
    const saved = window.localStorage.getItem(PROVIDER_KEYS_STORAGE_KEY);
    if (!saved) {
      return emptyProviderKeys;
    }

    const parsed = JSON.parse(saved) as Partial<ProviderKeyState>;
    return {
      openai: typeof parsed.openai === "string" ? parsed.openai : "",
      gemini: typeof parsed.gemini === "string" ? parsed.gemini : "",
      groq: typeof parsed.groq === "string" ? parsed.groq : "",
    };
  } catch {
    return emptyProviderKeys;
  }
}

export function saveProviderKeysToStorage(keys: ProviderKeyState) {
  window.localStorage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export function clearProviderKeysStorage() {
  window.localStorage.removeItem(PROVIDER_KEYS_STORAGE_KEY);
}

export function normalizeAuthSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as Partial<AuthSession>;
  const user = session.user as Partial<AuthUser> | undefined;
  if (
    typeof session.token !== "string" ||
    !user ||
    typeof user.id !== "string" ||
    typeof user.email !== "string" ||
    typeof user.displayName !== "string" ||
    (user.role !== "user" && user.role !== "admin")
  ) {
    return null;
  }

  return {
    token: session.token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      locale: typeof user.locale === "string" ? user.locale : "en",
    },
  };
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    return normalizeAuthSession(JSON.parse(saved));
  } catch {
    return null;
  }
}

export function saveAuthSessionToStorage(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSessionStorage() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function loadOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "device_desktop_local";
  }

  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const nextId = `device_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
  window.localStorage.setItem(DEVICE_STORAGE_KEY, nextId);
  return nextId;
}
