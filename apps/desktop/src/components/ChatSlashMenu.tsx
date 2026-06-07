import type { Locale } from "../i18n";
import type { ChatSlashCommand } from "../features/chat/slashCommands";
import { slashMenuHintCopy } from "../features/chat/slashCommands";

type ChatSlashMenuProps = {
  commands: ChatSlashCommand[];
  activeIndex: number;
  locale: Locale;
  onHighlight: (index: number) => void;
  onSelect: (command: ChatSlashCommand) => void;
};

export function ChatSlashMenu({ commands, activeIndex, locale, onHighlight, onSelect }: ChatSlashMenuProps) {
  return (
    <div className="absolute bottom-full left-0 z-40 mb-2 w-full min-w-[280px] max-w-[420px] overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] shadow-[var(--miva-shadow-lg)]">
      <div className="border-b border-[var(--miva-border)] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Skills</p>
          <p className="text-[10px] font-medium normal-case tracking-normal text-[var(--miva-text-soft)]">
            {slashMenuHintCopy(locale)}
          </p>
        </div>
      </div>
      <ul className="max-h-56 overflow-y-auto p-1">
        {commands.map((command, index) => {
          const active = index === activeIndex;

          return (
            <li key={command.id}>
              <button
                className={`flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition ${
                  active
                    ? "bg-[var(--miva-primary-surface)] text-[var(--miva-text)]"
                    : "text-[var(--miva-text-muted)] hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-text)]"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(command);
                }}
                onMouseEnter={() => onHighlight(index)}
                type="button"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  active ? "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]" : "bg-[var(--miva-bg-soft)] text-[var(--miva-text-muted)]"
                }`}>
                  <span className="material-symbols-outlined text-[18px]">{command.icon}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--miva-text)]">{command.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--miva-text-muted)]">{command.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
