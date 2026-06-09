import { useEffect, useState } from "react";
import type { AuthSession } from "../types";
import { BrandLogo } from "./BrandLogo";
import { SidebarToggleIcon } from "./SidebarToggleIcon";
import { UserNavButton } from "./UserNavButton";

type RuntimeNavigationProps = {
  activeAssistantId: string;
  authSession: AuthSession | null;
  assistantConversationGroups: RuntimeAssistantConversationGroup[];
  activeConversationId: string | null;
  t: Record<string, string>;
  onClearCurrentChat: () => void;
  onConversationSelect: (conversation: RuntimeConversationNavItem) => void;
  onEnterPersonalization: () => void;
  onEnterSettings: () => void;
  onOpenChatSearch: () => void;
  onOpenLibrary: () => void;
  onNewChatForAssistant: (assistantId: string) => void;
  onOpenAuth: () => void;
  onOpenBilling: () => void;
  onOpenWebConsole: () => void;
  onSignOut: () => void;
  onToggleSidebar: () => void;
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
  onEnterPersonalization,
  onEnterSettings,
  onOpenChatSearch,
  onOpenLibrary,
  onNewChatForAssistant,
  onOpenAuth,
  onOpenBilling,
  onOpenWebConsole,
  onSignOut,
  onToggleSidebar,
}: RuntimeNavigationProps) {
  const [expandedAssistantIds, setExpandedAssistantIds] = useState<string[]>([activeAssistantId]);

  useEffect(() => {
    setExpandedAssistantIds((current) => (
      current.includes(activeAssistantId) ? current : [...current, activeAssistantId]
    ));
  }, [activeAssistantId]);

  function toggleAssistant(assistantId: string) {
    setExpandedAssistantIds((current) => (
      current.includes(assistantId)
        ? current.filter((id) => id !== assistantId)
        : [...current, assistantId]
    ));
  }

  return (
    <aside className="miva-sidebar flex h-screen shrink-0 flex-col">
      <div className="miva-sidebar-header">
        <BrandLogo className="h-7 w-7 rounded-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="miva-sidebar-brand-title font-heading truncate">MiVA</h1>
          <p className="miva-nav-section-label truncate normal-case tracking-[0.08em]">{t.assistantWorkspace}</p>
        </div>
        <button
          aria-label="Close navigation"
          className="miva-sidebar-toggle"
          onClick={onToggleSidebar}
          title="Close navigation"
          type="button"
        >
          <SidebarToggleIcon className="h-[16px] w-[16px]" />
        </button>
      </div>

      <div className="grid gap-0.5 border-b border-[var(--miva-border)]/80 px-2.5 py-2">
        <RuntimeNavAction icon="edit_square" label="New Chat" onClick={onClearCurrentChat} />
        <RuntimeNavAction icon="search" label="Search Chats" onClick={onOpenChatSearch} />
        <RuntimeNavAction icon="view_carousel" label="Library" onClick={onOpenLibrary} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <section>
          <h2 className="miva-nav-section-label miva-runtime-nav-section-title px-2">Conversations</h2>
          <div className="mt-2 grid gap-1">
            {assistantConversationGroups.map((group) => {
              const expanded = expandedAssistantIds.includes(group.assistantId);
              const isActiveAssistant = group.assistantId === activeAssistantId;

              return (
                <div key={group.assistantId}>
                  <div className={`flex items-center justify-between gap-1.5 rounded-[var(--miva-radius-sm)] px-2 py-1.5 ${isActiveAssistant ? "text-[var(--miva-primary)]" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{group.assistantName}</p>
                    </div>
                    <button
                      aria-label={expanded ? `Collapse ${group.assistantName}` : `Expand ${group.assistantName}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                      onClick={() => toggleAssistant(group.assistantId)}
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[17px] transition-transform duration-200 ${expanded ? "rotate-90" : "rotate-0"}`}>
                        chevron_right
                      </span>
                    </button>
                  </div>

                  <div
                    className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out ${
                      expanded ? "mt-0 grid-rows-[1fr] opacity-100 translate-y-0" : "mt-0 grid-rows-[0fr] opacity-0 -translate-y-1"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="grid gap-0 pl-2">
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
                          <div className="flex items-center justify-between gap-1.5 rounded-[var(--miva-radius-sm)] px-3 py-1">
                            <p className="min-w-0 truncate text-[13px] text-[var(--miva-text-muted)]">No conversations yet.</p>
                            <button
                              aria-label={`Start new chat with ${group.assistantName}`}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-transparent text-[var(--miva-primary)] transition hover:bg-white/70 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.22),0_4px_14px_rgba(31,57,88,0.08)] focus-visible:bg-white/70 focus-visible:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28),0_4px_14px_rgba(31,57,88,0.08)]"
                              onClick={() => onNewChatForAssistant(group.assistantId)}
                              type="button"
                            >
                              <span className="text-[22px] font-semibold leading-none">+</span>
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

        <section className="mt-6 border-t border-[var(--miva-border)]/80 pt-4">
          <h2 className="miva-nav-section-label miva-runtime-nav-section-title px-2">Workspace</h2>
          <div className="mt-2 grid gap-0.5">
            <button className="miva-nav-item flex min-h-9 items-center gap-2 rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-left transition" type="button">
              <span className="material-symbols-outlined text-[15px] text-[var(--miva-text-muted)]">bookmark</span>
              {t.savedSnippets}
            </button>
            <button className="miva-nav-item flex min-h-9 items-center gap-2 rounded-[var(--miva-radius-sm)] px-2 py-1.5 text-left transition" type="button">
              <span className="material-symbols-outlined text-[15px] text-[var(--miva-text-muted)]">monitoring</span>
              {t.systemLogs}
            </button>
          </div>
        </section>
      </div>

      <UserNavButton authSession={authSession} onEnterPersonalization={onEnterPersonalization} onEnterSettings={onEnterSettings} onOpenAuth={onOpenAuth} onOpenBilling={onOpenBilling} onOpenWebConsole={onOpenWebConsole} onSignOut={onSignOut} />
    </aside>
  );
}

function RuntimeNavAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      className="flex min-h-8 w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[13px] font-medium leading-4 text-[var(--miva-text)] transition hover:bg-white/64"
      onClick={onClick}
      type="button"
    >
      <span className="material-symbols-outlined text-[17px] text-[var(--miva-primary)]">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
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
      className={`flex min-w-0 items-center gap-2 rounded-[var(--miva-radius-sm)] px-2.5 text-left transition ${
        compact ? "py-2" : "py-3"
      } miva-nav-item ${active ? "miva-nav-item-active font-bold" : ""}`}
      onClick={() => onSelect(conversation)}
      type="button"
    >
      <span className="material-symbols-outlined shrink-0 text-[15px] text-[var(--miva-text-muted)]">chat_bubble</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{conversation.title}</span>
        {!compact && (
          <span className="block truncate text-[13px] font-medium text-[var(--miva-text-muted)]">
            {conversation.assistantName} - {conversation.updatedAtLabel}
          </span>
        )}
      </span>
    </button>
  );
}
