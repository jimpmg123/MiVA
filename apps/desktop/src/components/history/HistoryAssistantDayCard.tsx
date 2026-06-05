import type { HistoryAssistantDayCard as HistoryAssistantDayCardData } from "../../features/history/groupHistoryByDate";
import { formatHistoryCardTime } from "../../features/history/groupHistoryByDate";
import { Badge, IconTile } from "../ui";

type HistoryAssistantDayCardProps = {
  card: HistoryAssistantDayCardData;
  conversationCountLabel: string;
  messageCountLabel: string;
  viewLabel: string;
  onSelect: () => void;
};

export function HistoryAssistantDayCard({
  card,
  conversationCountLabel,
  messageCountLabel,
  viewLabel,
  onSelect,
}: HistoryAssistantDayCardProps) {
  return (
    <button
      className="group flex h-full flex-col rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--miva-border-strong)] hover:shadow-[var(--miva-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(36,73,102,0.32)] focus-visible:ring-offset-2"
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <IconTile className="h-10 w-10">
          <span className="material-symbols-outlined text-[21px]">smart_toy</span>
        </IconTile>
        <div className="flex flex-wrap justify-end gap-2">
          {card.modelLabel ? <Badge tone="neutral">{card.modelLabel}</Badge> : null}
          <Badge tone="action">{messageCountLabel}</Badge>
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <h4 className="truncate font-heading text-lg font-bold text-[var(--miva-text)]">{card.assistantName}</h4>
        <p className="mt-1 text-xs font-semibold text-[var(--miva-text-muted)]">
          {formatHistoryCardTime(card.latestUpdatedAt)}
          {card.conversations.length > 1 ? ` · ${conversationCountLabel}` : ""}
        </p>
      </div>

      <div className="mt-3 flex-1 rounded-lg bg-[var(--miva-bg-soft)] p-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Latest</span>
        <p className="mt-1 line-clamp-4 text-sm leading-6 text-[var(--miva-text-muted)]">{card.preview || "No preview available."}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold text-[var(--miva-primary)]">
        <span>{viewLabel}</span>
        <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
      </div>
    </button>
  );
}
