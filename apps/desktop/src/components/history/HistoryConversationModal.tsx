import { useMemo, useState } from "react";
import type { RuntimeStoredConversation } from "../../types";
import type { HistoryAssistantDayCard } from "../../features/history/groupHistoryByDate";
import { formatHistoryCardTime } from "../../features/history/groupHistoryByDate";
import { Badge, ModalBackdrop, ModalPanel, PrimaryButton, SecondaryButton } from "../ui";

type HistoryConversationModalProps = {
  card: HistoryAssistantDayCard;
  dateLabel: string;
  continueLabel: string;
  onClose: () => void;
  onContinue: (conversation: RuntimeStoredConversation) => void;
};

export function HistoryConversationModal({
  card,
  dateLabel,
  continueLabel,
  onClose,
  onContinue,
}: HistoryConversationModalProps) {
  const [activeConversationId, setActiveConversationId] = useState(card.conversations[0]?.id ?? "");
  const activeConversation = useMemo(
    () => card.conversations.find((conversation) => conversation.id === activeConversationId) ?? card.conversations[0] ?? null,
    [activeConversationId, card.conversations],
  );

  if (!activeConversation) {
    return null;
  }

  return (
    <ModalBackdrop>
      <ModalPanel className="flex max-h-[min(88vh,860px)] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="border-b border-[var(--miva-border)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">{dateLabel}</p>
              <h3 className="mt-1 truncate font-heading text-2xl font-bold text-[var(--miva-text)]">{card.assistantName}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {card.modelLabel ? <Badge tone="neutral">{card.modelLabel}</Badge> : null}
                <Badge tone="action">{activeConversation.messages.length} messages</Badge>
              </div>
            </div>
            <button
              aria-label="Close conversation history"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-text)]"
              onClick={onClose}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {card.conversations.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {card.conversations.map((conversation) => (
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    conversation.id === activeConversation.id
                      ? "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)] text-[var(--miva-primary)]"
                      : "border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-text-muted)] hover:border-[var(--miva-border-strong)] hover:text-[var(--miva-text)]"
                  }`}
                  key={conversation.id}
                  onClick={() => setActiveConversationId(conversation.id)}
                  type="button"
                >
                  {conversation.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {activeConversation.messages.map((message, index) => (
              <div
                className={`flex max-w-[85%] items-end gap-4 ${message.role === "user" ? "self-end" : "self-start"}`}
                key={`${message.role}-${index}-${message.createdAt ?? index}`}
              >
                {message.role === "assistant" ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--miva-primary-soft)]">
                    <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">bolt</span>
                  </div>
                ) : null}
                <div
                  className={`whitespace-pre-wrap break-words rounded-lg border p-4 text-sm leading-6 shadow-[var(--miva-shadow-sm)] ${
                    message.role === "user"
                      ? "rounded-br-none border-[var(--miva-primary)] bg-[var(--miva-primary)] text-[var(--miva-on-primary)]"
                      : "rounded-bl-none border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-text)]"
                  }`}
                >
                  {message.content}
                  {message.createdAt ? (
                    <span className={`mt-2 block text-right text-[10px] ${message.role === "user" ? "text-white/70" : "text-[var(--miva-text-soft)]"}`}>
                      {formatHistoryCardTime(message.createdAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--miva-border)] px-6 py-4">
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          <PrimaryButton onClick={() => onContinue(activeConversation)}>
            {continueLabel}
          </PrimaryButton>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
