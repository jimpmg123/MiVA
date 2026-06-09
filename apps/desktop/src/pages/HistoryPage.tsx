import { useMemo, useState } from "react";
import type { RuntimeStoredConversation } from "../types";
import { HistoryAssistantDayCard } from "../components/history/HistoryAssistantDayCard";
import { HistoryConversationModal } from "../components/history/HistoryConversationModal";
import { IconTile, Input, Panel, SectionHeader } from "../components/ui";
import { groupHistoryByDateAndAssistant, type HistoryAssistantDayCard as HistoryAssistantDayCardData } from "../features/history/groupHistoryByDate";

type HistoryPageProps = {
  conversations: RuntimeStoredConversation[];
  t: Record<string, string>;
  onContinueInRuntime: (conversation: RuntimeStoredConversation) => void;
};

type SelectedHistoryCard = {
  dateLabel: string;
  card: HistoryAssistantDayCardData;
};

function matchesQuery(conversation: RuntimeStoredConversation, query: string) {
  const haystack = [
    conversation.title,
    conversation.assistantName ?? "",
    ...conversation.messages.map((message) => message.content),
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(query);
}

export function HistoryPage({ conversations, t, onContinueInRuntime }: HistoryPageProps) {
  const [selectedCard, setSelectedCard] = useState<SelectedHistoryCard | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredConversations = useMemo(() => {
    if (!normalizedQuery) {
      return conversations;
    }
    return conversations.filter((conversation) => matchesQuery(conversation, normalizedQuery));
  }, [conversations, normalizedQuery]);

  const dateGroups = useMemo(
    () => groupHistoryByDateAndAssistant(filteredConversations),
    [filteredConversations],
  );

  const formatCountLabel = (template: string, count: number) => template.replace("{count}", String(count));
  const hasConversations = conversations.length > 0;
  const isSearching = normalizedQuery.length > 0;

  return (
    <div className="grid gap-5 pb-8">
      <Panel>
        <SectionHeader
          body={t.historyBody}
          title={t.historyTitle}
        />
        {hasConversations ? (
          <div className="relative mt-5">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[var(--miva-text-soft)]">
              search
            </span>
            <Input
              aria-label={t.historySearchPlaceholder ?? "Search chats"}
              className="pl-10 pr-10"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t.historySearchPlaceholder ?? "Search chats by title, assistant, or message"}
              type="search"
              value={searchQuery}
            />
            {isSearching ? (
              <button
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {dateGroups.length === 0 ? (
        <Panel className="grid place-items-center px-6 py-16 text-center">
          <IconTile className="h-14 w-14">
            <span className="material-symbols-outlined text-[28px]">{isSearching ? "search_off" : "history"}</span>
          </IconTile>
          <h3 className="mt-4 font-heading text-xl font-bold text-[var(--miva-text)]">
            {isSearching ? (t.historyNoResultsTitle ?? "No matching chats") : t.historyEmptyTitle}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--miva-text-muted)]">
            {isSearching
              ? (t.historyNoResultsBody ?? `No conversations match "${searchQuery.trim()}".`)
              : t.historyEmptyBody}
          </p>
        </Panel>
      ) : (
        dateGroups.map((group) => (
          <section className="grid gap-4" key={group.dateKey}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Date</p>
                <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">{group.label}</h3>
              </div>
              <p className="text-sm font-semibold text-[var(--miva-text-muted)]">
                {group.assistants.length} assistant{group.assistants.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.assistants.map((card) => (
                <HistoryAssistantDayCard
                  card={card}
                  conversationCountLabel={formatCountLabel(t.historyConversations, card.conversations.length)}
                  key={`${group.dateKey}-${card.assistantId}`}
                  messageCountLabel={formatCountLabel(t.historyMessages, card.messageCount)}
                  onSelect={() => setSelectedCard({ dateLabel: group.label, card })}
                  viewLabel={t.historyViewConversation}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {selectedCard ? (
        <HistoryConversationModal
          card={selectedCard.card}
          continueLabel={t.historyContinueInRuntime}
          dateLabel={selectedCard.dateLabel}
          onClose={() => setSelectedCard(null)}
          onContinue={(conversation) => {
            setSelectedCard(null);
            onContinueInRuntime(conversation);
          }}
        />
      ) : null}
    </div>
  );
}
