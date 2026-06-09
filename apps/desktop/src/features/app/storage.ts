import { invokeCommand, isTauriRuntime } from "../../app/tauri";
import type { AppMode } from "../../types";

const APP_PREFERENCES_STORAGE_KEY = "miva.appPreferences.v1";

export type PersistedAppMode = Extract<AppMode, "studio" | "runtime" | "history" | "library">;

export type AppPreferences = {
  setupCompleted: boolean;
  lastAppMode: PersistedAppMode;
  setupCompletedAt: string | null;
};

export const defaultAppPreferences: AppPreferences = {
  setupCompleted: false,
  lastAppMode: "studio",
  setupCompletedAt: null,
};

function normalizeAppPreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== "object") {
    return defaultAppPreferences;
  }

  const prefs = value as Partial<AppPreferences>;
  const lastAppMode = prefs.lastAppMode;
  const normalizedLastAppMode: PersistedAppMode =
    lastAppMode === "runtime" || lastAppMode === "history" || lastAppMode === "library" ? lastAppMode : "studio";

  return {
    setupCompleted: prefs.setupCompleted === true,
    lastAppMode: normalizedLastAppMode,
    setupCompletedAt: typeof prefs.setupCompletedAt === "string" ? prefs.setupCompletedAt : null,
  };
}

export async function loadAppPreferences() {
  if (isTauriRuntime()) {
    const prefs = await invokeCommand<unknown>("load_app_preferences");
    return normalizeAppPreferences(prefs);
  }

  const stored = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
  if (!stored) {
    return defaultAppPreferences;
  }

  try {
    return normalizeAppPreferences(JSON.parse(stored));
  } catch {
    return defaultAppPreferences;
  }
}

export async function saveAppPreferences(preferences: AppPreferences) {
  const normalized = normalizeAppPreferences(preferences);

  if (isTauriRuntime()) {
    const saved = await invokeCommand<unknown>("save_app_preferences", { preferences: normalized });
    return normalizeAppPreferences(saved);
  }

  window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function markSetupCompleted(lastAppMode: PersistedAppMode = "studio") {
  const current = await loadAppPreferences();
  return saveAppPreferences({
    ...current,
    setupCompleted: true,
    lastAppMode,
    setupCompletedAt: new Date().toISOString(),
  });
}

export async function updateLastAppMode(lastAppMode: PersistedAppMode) {
  const current = await loadAppPreferences();
  if (!current.setupCompleted) {
    return current;
  }

  return saveAppPreferences({
    ...current,
    lastAppMode,
  });
}
