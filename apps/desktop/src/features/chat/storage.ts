import { invokeCommand, isTauriRuntime } from "../../app/tauri";
import type { ChatMessage, RuntimeMemorySummary } from "../../types";

const LEGACY_RUNTIME_CHAT_STORAGE_KEY = "miva.runtimeChat.v1";
const CHAT_HISTORY_SCHEMA_VERSION = 1;

export type RuntimeChatStore = {
  schemaVersion: typeof CHAT_HISTORY_SCHEMA_VERSION;
  conversations: Record<string, ChatMessage[]>;
  summaries: Record<string, RuntimeMemorySummary>;
  updatedAt: string | null;
};

export const emptyRuntimeChatStore: RuntimeChatStore = {
  schemaVersion: CHAT_HISTORY_SCHEMA_VERSION,
  conversations: {},
  summaries: {},
  updatedAt: null,
};

function legacyRuntimeChatStorageKey(assistantId: string) {
  return `${LEGACY_RUNTIME_CHAT_STORAGE_KEY}.${encodeURIComponent(assistantId || "default")}`;
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((message) => (
    message &&
    typeof message === "object" &&
    ((message as ChatMessage).role === "user" || (message as ChatMessage).role === "assistant") &&
    typeof (message as ChatMessage).content === "string"
  )) as ChatMessage[];
}

function normalizeSummary(value: unknown): RuntimeMemorySummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const summary = value as Partial<RuntimeMemorySummary>;
  if (typeof summary.content !== "string" || !summary.content.trim()) {
    return null;
  }

  return {
    content: summary.content.trim(),
    updatedAt: typeof summary.updatedAt === "string" ? summary.updatedAt : new Date().toISOString(),
    provider: summary.provider === "openai" || summary.provider === "gemini" || summary.provider === "ollama"
      ? summary.provider
      : "ollama",
    model: typeof summary.model === "string" ? summary.model : "",
    sourceMessageCount: Number.isFinite(Number(summary.sourceMessageCount)) ? Math.max(0, Math.round(Number(summary.sourceMessageCount))) : 0,
    estimatedTokens: Number.isFinite(Number(summary.estimatedTokens)) ? Math.max(0, Math.round(Number(summary.estimatedTokens))) : 0,
  };
}

export function normalizeRuntimeChatStore(value: unknown): RuntimeChatStore {
  if (!value || typeof value !== "object") {
    return emptyRuntimeChatStore;
  }

  const source = value as Partial<RuntimeChatStore>;
  const conversations: Record<string, ChatMessage[]> = {};
  const summaries: Record<string, RuntimeMemorySummary> = {};
  if (source.conversations && typeof source.conversations === "object") {
    Object.entries(source.conversations).forEach(([assistantId, messages]) => {
      const normalized = normalizeMessages(messages);
      if (assistantId && normalized.length) {
        conversations[assistantId] = normalized;
      }
    });
  }
  if (source.summaries && typeof source.summaries === "object") {
    Object.entries(source.summaries).forEach(([assistantId, summary]) => {
      const normalized = normalizeSummary(summary);
      if (assistantId && normalized) {
        summaries[assistantId] = normalized;
      }
    });
  }

  return {
    schemaVersion: CHAT_HISTORY_SCHEMA_VERSION,
    conversations,
    summaries,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
  };
}

function loadLegacyRuntimeChatMessages(assistantId: string): ChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(legacyRuntimeChatStorageKey(assistantId));
    if (saved) {
      return normalizeMessages(JSON.parse(saved));
    }

    const legacySaved = window.localStorage.getItem(LEGACY_RUNTIME_CHAT_STORAGE_KEY);
    return legacySaved ? normalizeMessages(JSON.parse(legacySaved)) : [];
  } catch {
    return [];
  }
}

export async function loadRuntimeChatStore(activeAssistantId?: string): Promise<RuntimeChatStore> {
  if (isTauriRuntime()) {
    const store = normalizeRuntimeChatStore(await invokeCommand<unknown>("load_chat_history_store"));
    if (activeAssistantId && !store.conversations[activeAssistantId]) {
      const legacyMessages = loadLegacyRuntimeChatMessages(activeAssistantId);
      if (legacyMessages.length) {
        const migratedStore = {
          ...store,
          conversations: {
            ...store.conversations,
            [activeAssistantId]: legacyMessages,
          },
          updatedAt: new Date().toISOString(),
        };
        return normalizeRuntimeChatStore(await invokeCommand<unknown>("save_chat_history_store", { store: migratedStore }));
      }
    }
    return store;
  }

  const messages = activeAssistantId ? loadLegacyRuntimeChatMessages(activeAssistantId) : [];
  return normalizeRuntimeChatStore({
    ...emptyRuntimeChatStore,
    conversations: activeAssistantId && messages.length ? { [activeAssistantId]: messages } : {},
    summaries: {},
  });
}

export async function saveRuntimeChatMessages(
  store: RuntimeChatStore,
  assistantId: string,
  messages: ChatMessage[],
): Promise<RuntimeChatStore> {
  const nextStore = normalizeRuntimeChatStore({
    ...store,
    conversations: {
      ...store.conversations,
      [assistantId]: normalizeMessages(messages),
    },
    updatedAt: new Date().toISOString(),
  });

  if (isTauriRuntime()) {
    return normalizeRuntimeChatStore(await invokeCommand<unknown>("save_chat_history_store", { store: nextStore }));
  }

  window.localStorage.setItem(legacyRuntimeChatStorageKey(assistantId), JSON.stringify(nextStore.conversations[assistantId] ?? []));
  return nextStore;
}

export async function saveRuntimeMemorySummary(
  store: RuntimeChatStore,
  assistantId: string,
  summary: RuntimeMemorySummary,
): Promise<RuntimeChatStore> {
  const nextStore = normalizeRuntimeChatStore({
    ...store,
    summaries: {
      ...store.summaries,
      [assistantId]: summary,
    },
    updatedAt: new Date().toISOString(),
  });

  if (isTauriRuntime()) {
    return normalizeRuntimeChatStore(await invokeCommand<unknown>("save_chat_history_store", { store: nextStore }));
  }

  return nextStore;
}

export async function deleteRuntimeChatMessages(store: RuntimeChatStore, assistantId: string): Promise<RuntimeChatStore> {
  const conversations = { ...store.conversations };
  const summaries = { ...store.summaries };
  delete conversations[assistantId];
  delete summaries[assistantId];

  const nextStore = normalizeRuntimeChatStore({
    ...store,
    conversations,
    summaries,
    updatedAt: new Date().toISOString(),
  });

  if (isTauriRuntime()) {
    return normalizeRuntimeChatStore(await invokeCommand<unknown>("delete_runtime_chat_messages", { assistantId }));
  }

  window.localStorage.removeItem(legacyRuntimeChatStorageKey(assistantId));
  return nextStore;
}

export async function deleteRuntimeChatMessagesForAssistant(assistantId: string): Promise<RuntimeChatStore> {
  const store = await loadRuntimeChatStore(assistantId);
  return deleteRuntimeChatMessages(store, assistantId);
}
