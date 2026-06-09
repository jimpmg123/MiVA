import { invokeCommand, isTauriRuntime } from "../../app/tauri";
import type { ChatMessage, RuntimeMemorySummary, RuntimeStoredConversation } from "../../types";

const LEGACY_RUNTIME_CHAT_STORAGE_KEY = "miva.runtimeChat.v1";
const CHAT_HISTORY_SCHEMA_VERSION = 2;

export type RuntimeChatStore = {
  schemaVersion: typeof CHAT_HISTORY_SCHEMA_VERSION;
  conversations: Record<string, RuntimeStoredConversation>;
  activeConversationIds: Record<string, string>;
  summaries: Record<string, RuntimeMemorySummary>;
  updatedAt: string | null;
};

export const emptyRuntimeChatStore: RuntimeChatStore = {
  schemaVersion: CHAT_HISTORY_SCHEMA_VERSION,
  conversations: {},
  activeConversationIds: {},
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

  return value.flatMap((message) => {
    if (
      !message ||
      typeof message !== "object" ||
      (((message as ChatMessage).role !== "user" && (message as ChatMessage).role !== "assistant")) ||
      typeof (message as ChatMessage).content !== "string"
    ) {
      return [];
    }

    const source = message as ChatMessage;
    const normalized: ChatMessage = {
      role: source.role,
      content: source.content,
      createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
      provider: source.provider,
      model: source.model,
      latencyMs: source.latencyMs,
      uiAction: source.uiAction ?? undefined,
    };

    if (Array.isArray(source.images) && source.images.length > 0) {
      normalized.images = source.images.filter((image) => (
        image &&
        typeof image === "object" &&
        typeof image.dataUrl === "string" &&
        image.dataUrl.startsWith("data:")
      ));
    }

    return [normalized];
  });
}

function createConversationTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content.trim();
  return firstUserMessage ? firstUserMessage.slice(0, 56) : "New chat";
}

export function createRuntimeConversationId(assistantId: string) {
  return `runtime_${assistantId}_${Date.now()}`;
}

function normalizeConversation(conversationId: string, value: unknown): RuntimeStoredConversation | null {
  if (Array.isArray(value)) {
    const messages = normalizeMessages(value);
    if (!messages.length) {
      return null;
    }

    const now = new Date().toISOString();
    return {
      id: `runtime_${conversationId}_current`,
      assistantId: conversationId,
      title: createConversationTitle(messages),
      messages,
      createdAt: messages[0]?.createdAt ?? now,
      updatedAt: messages[messages.length - 1]?.createdAt ?? now,
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<RuntimeStoredConversation>;
  const messages = normalizeMessages(source.messages);
  if (!source.id || !source.assistantId || !messages.length) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: source.id,
    assistantId: source.assistantId,
    assistantName: typeof source.assistantName === "string" ? source.assistantName : undefined,
    title: typeof source.title === "string" && source.title.trim() ? source.title.trim() : createConversationTitle(messages),
    messages,
    createdAt: typeof source.createdAt === "string" ? source.createdAt : messages[0]?.createdAt ?? now,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : messages[messages.length - 1]?.createdAt ?? now,
    modelLabel: typeof source.modelLabel === "string" ? source.modelLabel : undefined,
  };
}

function normalizeSummary(value: unknown): RuntimeMemorySummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const summary = value as Partial<RuntimeMemorySummary>;
  const pinnedMemory = typeof summary.pinnedMemory === "string" && summary.pinnedMemory.trim()
    ? summary.pinnedMemory.trim()
    : null;
  const sessionSummary = typeof summary.sessionSummary === "string" && summary.sessionSummary.trim()
    ? summary.sessionSummary.trim()
    : null;
  const content = typeof summary.content === "string" && summary.content.trim()
    ? summary.content.trim()
    : [
        pinnedMemory ? `Pinned memory:\n${pinnedMemory}` : "",
        sessionSummary ? `Compacted current conversation:\n${sessionSummary}` : "",
      ].filter(Boolean).join("\n\n");

  if (!content) {
    return null;
  }

  return {
    content,
    pinnedMemory: pinnedMemory ?? undefined,
    sessionSummary: sessionSummary ?? undefined,
    compactedMessageCount: Number.isFinite(Number(summary.compactedMessageCount))
      ? Math.max(0, Math.round(Number(summary.compactedMessageCount)))
      : 0,
    updatedAt: typeof summary.updatedAt === "string" ? summary.updatedAt : new Date().toISOString(),
    provider: summary.provider === "openai" || summary.provider === "gemini" || summary.provider === "groq" || summary.provider === "ollama"
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
  const conversations: Record<string, RuntimeStoredConversation> = {};
  const activeConversationIds: Record<string, string> = {};
  const summaries: Record<string, RuntimeMemorySummary> = {};
  if (source.conversations && typeof source.conversations === "object") {
    Object.entries(source.conversations).forEach(([conversationId, conversation]) => {
      const normalized = normalizeConversation(conversationId, conversation);
      if (normalized) {
        conversations[normalized.id] = normalized;
        const currentActiveId = activeConversationIds[normalized.assistantId];
        const currentActive = currentActiveId ? conversations[currentActiveId] : null;
        if (!currentActive || normalized.updatedAt > currentActive.updatedAt) {
          activeConversationIds[normalized.assistantId] = normalized.id;
        }
      }
    });
  }
  if (source.activeConversationIds && typeof source.activeConversationIds === "object") {
    Object.entries(source.activeConversationIds).forEach(([assistantId, conversationId]) => {
      if (
        typeof conversationId === "string" &&
        conversations[conversationId] &&
        conversations[conversationId].assistantId === assistantId
      ) {
        activeConversationIds[assistantId] = conversationId;
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
    activeConversationIds,
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
            [`runtime_${activeAssistantId}_current`]: {
              id: `runtime_${activeAssistantId}_current`,
              assistantId: activeAssistantId,
              title: createConversationTitle(legacyMessages),
              messages: legacyMessages,
              createdAt: legacyMessages[0]?.createdAt ?? new Date().toISOString(),
              updatedAt: legacyMessages[legacyMessages.length - 1]?.createdAt ?? new Date().toISOString(),
            },
          },
          activeConversationIds: {
            ...store.activeConversationIds,
            [activeAssistantId]: `runtime_${activeAssistantId}_current`,
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
    conversations: activeAssistantId && messages.length ? {
      [`runtime_${activeAssistantId}_current`]: {
        id: `runtime_${activeAssistantId}_current`,
        assistantId: activeAssistantId,
        title: createConversationTitle(messages),
        messages,
        createdAt: messages[0]?.createdAt ?? new Date().toISOString(),
        updatedAt: messages[messages.length - 1]?.createdAt ?? new Date().toISOString(),
      },
    } : {},
    activeConversationIds: activeAssistantId && messages.length ? { [activeAssistantId]: `runtime_${activeAssistantId}_current` } : {},
    summaries: {},
  });
}

export async function saveRuntimeChatMessages(
  store: RuntimeChatStore,
  assistantId: string,
  messages: ChatMessage[],
  options?: {
    conversationId?: string | null;
    assistantName?: string;
    modelLabel?: string;
  },
): Promise<RuntimeChatStore> {
  const normalizedMessages = normalizeMessages(messages);
  const conversationId = options?.conversationId || store.activeConversationIds[assistantId] || createRuntimeConversationId(assistantId);
  const existing = store.conversations[conversationId];
  const now = new Date().toISOString();
  const conversations = { ...store.conversations };
  if (normalizedMessages.length) {
    conversations[conversationId] = {
      id: conversationId,
      assistantId,
      assistantName: options?.assistantName ?? existing?.assistantName,
      title: existing?.title && existing.title !== "New chat" ? existing.title : createConversationTitle(normalizedMessages),
      messages: normalizedMessages,
      createdAt: existing?.createdAt ?? normalizedMessages[0]?.createdAt ?? now,
      updatedAt: normalizedMessages[normalizedMessages.length - 1]?.createdAt ?? now,
      modelLabel: options?.modelLabel ?? existing?.modelLabel,
    };
  }

  const nextStore = normalizeRuntimeChatStore({
    ...store,
    conversations,
    activeConversationIds: {
      ...store.activeConversationIds,
      [assistantId]: conversationId,
    },
    updatedAt: new Date().toISOString(),
  });

  if (isTauriRuntime()) {
    return normalizeRuntimeChatStore(await invokeCommand<unknown>("save_chat_history_store", { store: nextStore }));
  }

  window.localStorage.setItem(legacyRuntimeChatStorageKey(assistantId), JSON.stringify(nextStore.conversations[conversationId]?.messages ?? []));
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
  const conversations = Object.fromEntries(
    Object.entries(store.conversations).filter(([, conversation]) => conversation.assistantId !== assistantId),
  );
  const activeConversationIds = { ...store.activeConversationIds };
  const summaries = { ...store.summaries };
  delete activeConversationIds[assistantId];
  delete summaries[assistantId];

  const nextStore = normalizeRuntimeChatStore({
    ...store,
    conversations,
    activeConversationIds,
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
