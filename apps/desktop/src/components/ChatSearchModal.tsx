import { useEffect, useMemo, useState } from "react";
import type { RuntimeStoredConversation } from "../types";

type ChatSearchModalProps = {
  conversations: RuntimeStoredConversation[];
  t: Record<string, string>;
  onClose: () => void;
  onSelect: (conversation: RuntimeStoredConversation) => void;
};

type AssistantGroup = {
  assistantId: string;
  assistantName: string;
  conversations: RuntimeStoredConversation[];
};

function conversationText(conversation: RuntimeStoredConversation) {
  return [
    conversation.title,
    conversation.assistantName ?? "",
    ...conversation.messages.map((message) => message.content),
  ]
    .join("\n")
    .toLowerCase();
}

function lastMessagePreview(conversation: RuntimeStoredConversation) {
  const last = conversation.messages[conversation.messages.length - 1];
  return last?.content?.replace(/\s+/g, " ").trim() ?? "";
}

// When searching, surface the snippet around the first matching message.
function matchSnippet(conversation: RuntimeStoredConversation, query: string) {
  if (!query) {
    return lastMessagePreview(conversation);
  }
  for (const message of conversation.messages) {
    const index = message.content.toLowerCase().indexOf(query);
    if (index >= 0) {
      const start = Math.max(0, index - 24);
      const slice = message.content.slice(start, index + query.length + 48).replace(/\s+/g, " ").trim();
      return `${start > 0 ? "… " : ""}${slice}${index + query.length + 48 < message.content.length ? " …" : ""}`;
    }
  }
  return lastMessagePreview(conversation);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function groupByAssistant(conversations: RuntimeStoredConversation[]): AssistantGroup[] {
  const map = new Map<string, AssistantGroup>();
  for (const conversation of conversations) {
    const key = conversation.assistantId;
    if (!map.has(key)) {
      map.set(key, {
        assistantId: key,
        assistantName: conversation.assistantName || "Assistant",
        conversations: [],
      });
    }
    map.get(key)!.conversations.push(conversation);
  }

  const groups = [...map.values()];
  for (const group of groups) {
    group.conversations.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }
  groups.sort((left, right) => {
    const leftMax = left.conversations[0]?.updatedAt ?? "";
    const rightMax = right.conversations[0]?.updatedAt ?? "";
    return rightMax.localeCompare(leftMax);
  });
  return groups;
}

export function ChatSearchModal({ conversations, t, onClose, onSelect }: ChatSearchModalProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return conversations;
    }
    return conversations.filter((conversation) => conversationText(conversation).includes(normalizedQuery));
  }, [conversations, normalizedQuery]);

  const groups = useMemo(() => groupByAssistant(filtered), [filtered]);
  const isSearching = normalizedQuery.length > 0;

  const placeholder = t.historySearchPlaceholder ?? "Search chats by title, assistant, or message";

  return (
    <div
      className="fixed inset-0 z-[140] flex items-start justify-center bg-[var(--miva-overlay)] px-6 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-label={t.searchChats ?? "Search Chats"}
        aria-modal="true"
        className="flex max-h-[min(74vh,660px)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] shadow-[var(--miva-shadow-lg)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="relative border-b border-[var(--miva-border)]">
          <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[var(--miva-text-soft)]">
            search
          </span>
          {/* Uncontrolled input: the DOM owns the text so Korean IME composition is never reset
              by React re-renders. Filtering is still driven live from onChange. */}
          <input
            autoFocus
            aria-label={placeholder}
            className="h-14 w-full bg-transparent pl-11 pr-12 text-base text-[var(--miva-text)] outline-none placeholder:text-[var(--miva-text-soft)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            type="text"
          />
          <button
            aria-label="Close search"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-text)]"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-[var(--miva-border)] px-4 py-2">
          {isSearching ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--miva-primary-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--miva-primary)]">
              <span className="material-symbols-outlined text-[14px]">search</span>
              채팅 검색 중
            </span>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">
              전체 대화
            </span>
          )}
          <span className="text-[11px] font-medium text-[var(--miva-text-muted)]">
            {isSearching
              ? `"${query.trim()}" 검색 결과 ${filtered.length}개`
              : `${conversations.length}개 대화`}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {groups.length === 0 ? (
            <div className="grid place-items-center px-6 py-14 text-center">
              <span className="material-symbols-outlined text-[28px] text-[var(--miva-text-soft)]">
                {normalizedQuery ? "search_off" : "history"}
              </span>
              <p className="mt-3 text-sm font-semibold text-[var(--miva-text)]">
                {normalizedQuery
                  ? (t.historyNoResultsTitle ?? "No matching chats")
                  : (t.historyEmptyTitle ?? "No conversations yet")}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--miva-text-muted)]">
                {normalizedQuery
                  ? (t.historyNoResultsBody ?? "Try a different keyword.")
                  : (t.historyEmptyBody ?? "Start chatting to save conversations here.")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {groups.map((group) => (
                <div key={group.assistantId}>
                  <p className="px-3 pb-1 pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">
                    {group.assistantName}
                  </p>
                  <ul className="grid gap-0.5">
                    {group.conversations.map((conversation) => {
                      const snippet = matchSnippet(conversation, normalizedQuery);
                      return (
                        <li key={conversation.id}>
                          <button
                            className="flex w-full items-center gap-3 rounded-[var(--miva-radius-sm)] px-3 py-2.5 text-left transition hover:bg-[var(--miva-bg-soft)]"
                            onClick={() => onSelect(conversation)}
                            type="button"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--miva-primary-soft)]">
                              <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">chat_bubble</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate text-sm font-semibold text-[var(--miva-text)]">
                                  {conversation.title}
                                </span>
                                <span className="shrink-0 text-[11px] font-medium text-[var(--miva-text-soft)]">
                                  {formatDateLabel(conversation.updatedAt)}
                                </span>
                              </span>
                              {snippet ? (
                                <span className="mt-0.5 block truncate text-xs text-[var(--miva-text-muted)]">
                                  {snippet}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
