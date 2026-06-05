import { useState } from "react";
import type { AuthSession } from "../types";
import { BrandLogo } from "./BrandLogo";
import { UserNavButton } from "./UserNavButton";

type RuntimeNavigationProps = {
  activeAssistantId: string;
  authSession: AuthSession | null;
  assistantConversationGroups: RuntimeAssistantConversationGroup[];
  activeConversationId: string | null;
  t: Record<string, string>;
  onClearCurrentChat: () => void;
  onConversationSelect: (conversation: RuntimeConversationNavItem) => void;
  onNewChatForAssistant: (assistantId: string) => void;
  onOpenAuth: () => void;
};

export type RuntimeConversationNavItem = {
  id: string;
  assistantId: string;
  assistantName: string;
  title: string;
  preview?: string;
  modelLabel?: string;
  messageCount: number;
  updatedAtLabel: string;
};

export type RuntimeAssistantConversationGroup = {
  assistantId: string;
  assistantName: string;
  conversations: RuntimeConversationNavItem[];
};

export function RuntimeNavigation({
  activeAssistantId,
  activeConversationId,
  assistantConversationGroups,
  authSession,
  t,
  onClearCurrentChat,
  onConversationSelect,
  onNewChatForAssistant,
  onOpenAuth,
}: RuntimeNavigationProps) {
  const [expandedAssistantIds, setExpandedAssistantIds] = useState<string[]>([]);

  function toggleAssistant(assistantId: string) {
    setExpandedAssistantIds((current) => (
      current.includes(assistantId)
        ? current.filter((id) => id !== assistantId)
        : [...current, assistantId]
    ));
  }

  return (
    <aside className="miva-sidebar flex h-screen w-[250px] shrink-0 flex-col">
      <div className="flex h-[60px] items-center gap-3 border-b border-[var(--miva-border)]/70 px-6">
        <BrandLogo />
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[var(--miva-text)]">MiVA</h1>
          <p className="miva-nav-section-label">{t.assistantWorkspace}</p>
        </div>
      </div>

      <div className="border-b border-[var(--miva-border)]/60 p-4">
        <button
          className="miva-soft-card flex min-h-11 w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-bold text-[var(--miva-text)] transition hover:border-[var(--miva-primary)]/60"
          type="button"
          onClick={onClearCurrentChat}
        >
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">add_comment</span>
            {t.newChat}
          </span>
          <span className="material-symbols-outlined text-[16px] text-[var(--miva-text-muted)]">arrow_forward</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <section>
          <h2 className="miva-nav-section-label px-3">By assistant</h2>
          <div className="mt-3 grid gap-2">
            {assistantConversationGroups.map((group) => {
              const expanded = expandedAssistantIds.includes(group.assistantId);
              const isActiveAssistant = group.assistantId === activeAssistantId;

              return (
                <div className="rounded-xl" key={group.assistantId}>
                  <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${isActiveAssistant ? "bg-[var(--miva-primary-surface)]" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--miva-text)]">{group.assistantName}</p>
                      <p className="text-xs text-[var(--miva-text-muted)]">{group.conversations.length} conversations</p>
                    </div>
                    <button
                      aria-label={expanded ? `Collapse ${group.assistantName}` : `Expand ${group.assistantName}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                      onClick={() => toggleAssistant(group.assistantId)}
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${expanded ? "rotate-180" : "rotate-0"}`}>
                        {expanded ? "remove" : "add"}
                      </span>
                    </button>
                  </div>

                  <div
                    className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out ${
                      expanded ? "mt-1 grid-rows-[1fr] opacity-100 translate-y-0" : "mt-0 grid-rows-[0fr] opacity-0 -translate-y-1"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="grid gap-1 pl-3">
                        {group.conversations.length ? (
                          group.conversations.map((conversation) => (
                            <ConversationButton
                              active={conversation.id === activeConversationId}
                              compact
                              conversation={conversation}
                              key={conversation.id}
                              onSelect={onConversationSelect}
                            />
                          ))
                        ) : (
                          <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2">
                            <p className="min-w-0 truncate text-xs text-[var(--miva-text-muted)]">No conversations yet.</p>
                            <button
                              aria-label={`Start new chat with ${group.assistantName}`}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-primary)] transition hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
                              onClick={() => onNewChatForAssistant(group.assistantId)}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">add_comment</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="miva-nav-section-label px-3">Collection</h2>
          <div className="mt-3 grid gap-1">
            <button className="miva-nav-item flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition" type="button">
              <span className="material-symbols-outlined text-[16px] text-[var(--miva-text-muted)]">bookmark</span>
              {t.savedSnippets}
            </button>
            <button className="miva-nav-item flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition" type="button">
              <span className="material-symbols-outlined text-[16px] text-[var(--miva-text-muted)]">monitoring</span>
              {t.systemLogs}
            </button>
          </div>
        </section>
      </div>

      <UserNavButton authSession={authSession} onOpenAuth={onOpenAuth} />
    </aside>
  );
}

function ConversationButton({
  active,
  compact = false,
  conversation,
  onSelect,
}: {
  active: boolean;
  compact?: boolean;
  conversation: RuntimeConversationNavItem;
  onSelect: (conversation: RuntimeConversationNavItem) => void;
}) {
  return (
    <button
      className={`flex min-w-0 items-center gap-3 rounded-xl px-3 text-left transition ${
        compact ? "py-2 text-xs" : "py-3 text-sm"
      } ${active ? "miva-nav-item-active font-bold" : "miva-nav-item"}`}
      onClick={() => onSelect(conversation)}
      type="button"
    >
      <span className="material-symbols-outlined shrink-0 text-[16px] text-[var(--miva-text-muted)]">history</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{conversation.title}</span>
        {!compact && (
          <span className="block truncate text-xs font-medium text-[var(--miva-text-muted)]">
            {conversation.assistantName} - {conversation.updatedAtLabel}
          </span>
        )}
      </span>
    </button>
  );
}
