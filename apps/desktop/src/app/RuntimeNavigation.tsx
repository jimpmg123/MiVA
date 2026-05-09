import { useState } from "react";
import type { AuthSession } from "../types";
import { BrandLogo } from "./BrandLogo";
import { UserNavButton } from "./UserNavButton";

type RuntimeNavigationProps = {
  activeAssistantId: string;
  authSession: AuthSession | null;
  assistantConversationGroups: RuntimeAssistantConversationGroup[];
  currentAssistantConversations: RuntimeConversationNavItem[];
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
  currentAssistantConversations,
  t,
  onClearCurrentChat,
  onConversationSelect,
  onNewChatForAssistant,
  onOpenAuth,
}: RuntimeNavigationProps) {
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [expandedAssistantIds, setExpandedAssistantIds] = useState<string[]>([]);
  const visibleRecentConversations = recentExpanded ? currentAssistantConversations : currentAssistantConversations.slice(0, 3);

  function toggleAssistant(assistantId: string) {
    setExpandedAssistantIds((current) => (
      current.includes(assistantId)
        ? current.filter((id) => id !== assistantId)
        : [...current, assistantId]
    ));
  }

  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <BrandLogo />
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.assistantWorkspace}</p>
        </div>
      </div>

      <div className="border-b border-[#c2c7ce]/30 p-4">
        <button
          className="flex w-full items-center justify-between rounded-2xl border border-[#c2c7ce]/50 bg-white px-4 py-3 text-sm font-bold text-[#191c1d] shadow-sm transition hover:border-[#35607f]/60"
          type="button"
          onClick={onClearCurrentChat}
        >
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[#35607f]">add_comment</span>
            {t.newChat}
          </span>
          <span className="material-symbols-outlined text-[16px] text-[#72787e]">arrow_forward</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <section>
          <div className="flex items-center justify-between gap-2 px-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">{t.recentConversations}</h2>
            {currentAssistantConversations.length > 3 && (
              <button
                aria-label={recentExpanded ? "Collapse recent conversations" : "Expand recent conversations"}
                className="grid h-6 w-6 place-items-center rounded-full text-[#72787e] transition hover:bg-[#e7e8e9] hover:text-[#191c1d]"
                onClick={() => setRecentExpanded((value) => !value)}
                type="button"
              >
                <span className={`material-symbols-outlined text-[17px] transition-transform duration-300 ${recentExpanded ? "rotate-180" : "rotate-0"}`}>
                  {recentExpanded ? "remove" : "add"}
                </span>
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-1">
            {visibleRecentConversations.length ? (
              visibleRecentConversations.map((conversation) => (
                <ConversationButton
                  active={conversation.id === activeConversationId}
                  conversation={conversation}
                  key={conversation.id}
                  onSelect={onConversationSelect}
                />
              ))
            ) : (
              <p className="rounded-xl px-3 py-3 text-sm text-[#72787e]">No conversations yet.</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">By assistant</h2>
          <div className="mt-3 grid gap-2">
            {assistantConversationGroups.map((group) => {
              const expanded = expandedAssistantIds.includes(group.assistantId);
              const isActiveAssistant = group.assistantId === activeAssistantId;

              return (
                <div className="rounded-xl" key={group.assistantId}>
                  <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${isActiveAssistant ? "bg-[#cae6ff]/25" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#191c1d]">{group.assistantName}</p>
                      <p className="text-xs text-[#72787e]">{group.conversations.length} conversations</p>
                    </div>
                    <button
                      aria-label={expanded ? `Collapse ${group.assistantName}` : `Expand ${group.assistantName}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#72787e] transition hover:bg-[#e7e8e9] hover:text-[#191c1d]"
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
                            <p className="min-w-0 truncate text-xs text-[#72787e]">No conversations yet.</p>
                            <button
                              aria-label={`Start new chat with ${group.assistantName}`}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#c2c7ce]/70 bg-white text-[#35607f] transition hover:border-[#35607f] hover:bg-[#f3f4f5]"
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
          <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">Collection</h2>
          <div className="mt-3 grid gap-1">
            <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#42474d] transition hover:bg-[#f3f4f5]" type="button">
              <span className="material-symbols-outlined text-[16px] text-[#72787e]">bookmark</span>
              {t.savedSnippets}
            </button>
            <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#42474d] transition hover:bg-[#f3f4f5]" type="button">
              <span className="material-symbols-outlined text-[16px] text-[#72787e]">monitoring</span>
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
      } ${active ? "bg-[#cae6ff]/35 font-bold text-[#191c1d]" : "text-[#42474d] hover:bg-[#f3f4f5]"}`}
      onClick={() => onSelect(conversation)}
      type="button"
    >
      <span className="material-symbols-outlined shrink-0 text-[16px] text-[#72787e]">history</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{conversation.title}</span>
        {!compact && (
          <span className="block truncate text-xs font-medium text-[#72787e]">
            {conversation.assistantName} - {conversation.updatedAtLabel}
          </span>
        )}
      </span>
    </button>
  );
}
