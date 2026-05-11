import type { ChatMessage } from "../../types";

const RUNTIME_CHAT_STORAGE_KEY = "miva.runtimeChat.v1";

function runtimeChatStorageKey(assistantId: string) {
  return `${RUNTIME_CHAT_STORAGE_KEY}.${encodeURIComponent(assistantId || "default")}`;
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

export function loadRuntimeChatMessages(assistantId: string): ChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(runtimeChatStorageKey(assistantId));
    if (!saved) {
      const legacySaved = window.localStorage.getItem(RUNTIME_CHAT_STORAGE_KEY);
      if (!legacySaved) {
        return [];
      }
      const legacyMessages = normalizeMessages(JSON.parse(legacySaved));
      if (legacyMessages.length) {
        window.localStorage.setItem(runtimeChatStorageKey(assistantId), JSON.stringify(legacyMessages));
        window.localStorage.removeItem(RUNTIME_CHAT_STORAGE_KEY);
      }
      return legacyMessages;
    }

    return normalizeMessages(JSON.parse(saved));
  } catch {
    return [];
  }
}

export function saveRuntimeChatMessages(assistantId: string, messages: ChatMessage[]) {
  window.localStorage.setItem(runtimeChatStorageKey(assistantId), JSON.stringify(messages));
}

export function deleteRuntimeChatMessages(assistantId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(runtimeChatStorageKey(assistantId));
}
