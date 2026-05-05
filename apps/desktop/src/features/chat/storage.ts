import type { ChatMessage } from "../../types";

const RUNTIME_CHAT_STORAGE_KEY = "miva.runtimeChat.v1";

export function loadRuntimeChatMessages(): ChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(RUNTIME_CHAT_STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved) as ChatMessage[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((message) => (
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string"
    ));
  } catch {
    return [];
  }
}

export function saveRuntimeChatMessages(messages: ChatMessage[]) {
  window.localStorage.setItem(RUNTIME_CHAT_STORAGE_KEY, JSON.stringify(messages));
}
