import { useEffect, useMemo, useState } from "react";
import type { AuthSession } from "../types";
import { BrandLogo } from "./BrandLogo";
import { UserNavButton } from "./UserNavButton";

type RuntimeNavigationProps = {
  activeAssistantId: string;
  assistantConversationGroups: RuntimeAssistantConversationGroup[];
  activeConversationId: string | null;
  authSession: AuthSession | null;
  onClearCurrentChat: () => void;
  onConversationSelect: (conversation: RuntimeConversationNavItem) => void;
  onOpenChatSearch: () => void;
  onNewChatForAssistant: (assistantId: string) => void;
  onToggleSidebar: () => void;
  onEnterSettings: () => void;
  onEnterPersonalization: () => void;
  onOpenAuth: () => void;
  onOpenBilling: () => void;
  onOpenWebConsole: () => void;
  onSignOut: () => void;
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
  onClearCurrentChat,
  onConversationSelect,
  onOpenChatSearch,
  onNewChatForAssistant,
  onToggleSidebar,
  onEnterSettings,
  onEnterPersonalization,
  onOpenAuth,
  onOpenBilling,
  onOpenWebConsole,
  onSignOut,
}: RuntimeNavigationProps) {
  const [expandedAssistantIds, setExpandedAssistantIds] = useState<string[]>([activeAssistantId]);
  const activeAssistantGroup = useMemo(() => (
    assistantConversationGroups.find((group) => group.assistantId === activeAssistantId)
      ?? { assistantId: activeAssistantId, assistantName: "Assistant", conversations: [] }
  ), [activeAssistantId, assistantConversationGroups]);
  const otherAssistantGroups = assistantConversationGroups.filter((group) => group.assistantId !== activeAssistantId);

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
    <aside className="miva-sidebar flex h-screen shrink-0 flex-col bg-[#F8FAFC] text-slate-900">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo className="h-7 w-7 rounded" />
          <span className="min-w-0 truncate text-lg font-bold tracking-tight">
            MiVA <span className="font-normal text-slate-400">Runtime</span>
          </span>
        </div>
        <button
          aria-label="Close navigation"
          className="grid h-7 w-7 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onToggleSidebar}
          title="Close navigation"
          type="button"
        >
          <i className="ph ph-sidebar-simple text-lg" />
        </button>
      </div>

      <div className="border-b border-slate-200 bg-white p-3">
        <button
          className="relative flex h-9 w-full items-center rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-left text-sm text-slate-400 transition hover:border-blue-200 hover:bg-white hover:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          onClick={onOpenChatSearch}
          type="button"
        >
          <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
          <span className="truncate">Search assistants or chats...</span>
        </button>
      </div>

      <nav className="miva-scrollbar-hidden flex-1 space-y-4 overflow-y-auto p-2">
        <section>
          <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Active Assistant</span>
            <i className="ph ph-caret-down" />
          </div>
          <AssistantHeader
            active
            assistantName={activeAssistantGroup.assistantName}
            modelLabel={activeAssistantGroup.conversations[0]?.modelLabel}
          />
          <NewChatRow inset onClick={onClearCurrentChat} />
          <ConversationList
            activeConversationId={activeConversationId}
            conversations={activeAssistantGroup.conversations}
            inset
            onConversationSelect={onConversationSelect}
          />
        </section>

        {otherAssistantGroups.length ? (
          <section>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Assistants
            </div>
            <div className="space-y-2">
              {otherAssistantGroups.map((group) => {
                const expanded = expandedAssistantIds.includes(group.assistantId);

                return (
                  <div key={group.assistantId}>
                    <button
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left transition hover:bg-white hover:shadow-sm"
                      onClick={() => toggleAssistant(group.assistantId)}
                      type="button"
                    >
                      <AssistantAvatar assistantName={group.assistantName} small />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{group.assistantName}</span>
                      <i className={`ph ${expanded ? "ph-caret-down" : "ph-caret-right"} text-slate-400 transition-colors group-hover:text-slate-600`} />
                    </button>
                    {expanded ? (
                      <div className="ml-11 mt-1 border-l border-slate-200 pl-2">
                        <NewChatRow onClick={() => onNewChatForAssistant(group.assistantId)} />
                        <ConversationList
                          activeConversationId={activeConversationId}
                          conversations={group.conversations}
                          onConversationSelect={onConversationSelect}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </nav>

      <UserNavButton
        authSession={authSession}
        onEnterPersonalization={onEnterPersonalization}
        onEnterSettings={onEnterSettings}
        onOpenAuth={onOpenAuth}
        onOpenBilling={onOpenBilling}
        onOpenWebConsole={onOpenWebConsole}
        onSignOut={onSignOut}
      />
    </aside>
  );
}

function AssistantHeader({
  active,
  assistantName,
  modelLabel,
}: {
  active?: boolean;
  assistantName: string;
  modelLabel?: string;
}) {
  return (
    <div className={`group flex items-center gap-3 rounded-lg border px-3 py-2 shadow-sm ${active ? "border-blue-100 bg-white" : "border-slate-200 bg-white"}`}>
      <AssistantAvatar assistantName={assistantName} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-900">{assistantName}</p>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
        </div>
        <p className="truncate text-[10px] text-slate-500">{modelLabel || "Ready"}</p>
      </div>
    </div>
  );
}

function NewChatRow({ inset = false, onClick }: { inset?: boolean; onClick: () => void }) {
  return (
    <div className={`${inset ? "ml-11 border-l border-slate-200 pl-2" : ""} mt-1`}>
      <button
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
        onClick={onClick}
        type="button"
      >
        <i className="ph ph-plus-circle text-sm" />
        <span className="truncate">New Chat</span>
      </button>
    </div>
  );
}

function ConversationList({
  activeConversationId,
  conversations,
  inset = false,
  onConversationSelect,
}: {
  activeConversationId: string | null;
  conversations: RuntimeConversationNavItem[];
  inset?: boolean;
  onConversationSelect: (conversation: RuntimeConversationNavItem) => void;
}) {
  if (!conversations.length) {
    return null;
  }

  return (
    <div className={`${inset ? "ml-11 border-l border-slate-200 pl-2" : ""} mt-1 space-y-0.5`}>
      {conversations.map((conversation) => (
        <ConversationButton
          active={conversation.id === activeConversationId}
          conversation={conversation}
          key={conversation.id}
          onSelect={onConversationSelect}
        />
      ))}
    </div>
  );
}

function ConversationButton({
  active,
  conversation,
  onSelect,
}: {
  active: boolean;
  conversation: RuntimeConversationNavItem;
  onSelect: (conversation: RuntimeConversationNavItem) => void;
}) {
  return (
    <button
      className={`flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] transition ${
        active
          ? "bg-blue-50 font-semibold text-blue-600"
          : "text-slate-600 hover:bg-white hover:shadow-sm"
      }`}
      onClick={() => onSelect(conversation)}
      type="button"
    >
      <i className="ph ph-chat-text shrink-0 text-xs" />
      <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
      <span className={`shrink-0 text-[9px] ${active ? "text-blue-400" : "text-slate-400"}`}>{conversation.updatedAtLabel}</span>
    </button>
  );
}

function AssistantAvatar({ assistantName, small = false }: { assistantName: string; small?: boolean }) {
  const initials = getAssistantInitials(assistantName);

  return (
    <div className={`${small ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs"} flex shrink-0 items-center justify-center rounded-md bg-blue-100 font-bold text-blue-600`}>
      {initials}
    </div>
  );
}

function getAssistantInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const value = words.length >= 2
    ? `${words[0][0] ?? ""}${words[1][0] ?? ""}`
    : (words[0] ?? "AI").slice(0, 2);
  return value.toUpperCase();
}
