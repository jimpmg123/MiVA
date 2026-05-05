import { invokeCommand, isTauriRuntime } from "../../app/tauri";
import type { LocalAssistantProfile, LocalAssistantProfileStore } from "../../types";

const ASSISTANT_PROFILE_STORAGE_KEY = "miva.assistantProfiles.v1";

export const LOCAL_PROFILE_SCHEMA_VERSION = 1;

export const emptyAssistantProfileStore: LocalAssistantProfileStore = {
  schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
  activeProfileId: null,
  profiles: [],
  updatedAt: null,
};

export function normalizeAssistantProfileStore(value: unknown): LocalAssistantProfileStore {
  if (!value || typeof value !== "object") {
    return emptyAssistantProfileStore;
  }

  const store = value as Partial<LocalAssistantProfileStore>;
  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    activeProfileId: typeof store.activeProfileId === "string" ? store.activeProfileId : null,
    profiles: Array.isArray(store.profiles) ? store.profiles.filter(Boolean) as LocalAssistantProfile[] : [],
    updatedAt: typeof store.updatedAt === "string" ? store.updatedAt : null,
  };
}

export async function loadLocalAssistantProfileStore() {
  if (isTauriRuntime()) {
    const store = await invokeCommand<unknown>("load_assistant_profile_store");
    return normalizeAssistantProfileStore(store);
  }

  const stored = window.localStorage.getItem(ASSISTANT_PROFILE_STORAGE_KEY);
  if (!stored) {
    return emptyAssistantProfileStore;
  }

  try {
    return normalizeAssistantProfileStore(JSON.parse(stored));
  } catch {
    return emptyAssistantProfileStore;
  }
}

export async function saveLocalAssistantProfileStore(store: LocalAssistantProfileStore) {
  const normalized = normalizeAssistantProfileStore(store);
  if (isTauriRuntime()) {
    const saved = await invokeCommand<unknown>("save_assistant_profile_store", { store: normalized });
    return normalizeAssistantProfileStore(saved);
  }

  window.localStorage.setItem(ASSISTANT_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
