import type { ChatSlashCommand } from "../features/chat/slashCommands";
import { getSlashCommandTone } from "../features/chat/slashCommands";

type ChatSlashChipProps = {
  command: ChatSlashCommand;
  onRemove?: () => void;
  variant?: "input" | "on-primary";
  compact?: boolean;
};

const toneClasses: Record<ReturnType<typeof getSlashCommandTone>, { input: string; onPrimary: string }> = {
  workspace: {
    input: "border-[var(--miva-success)]/25 bg-[var(--miva-success-soft)] text-[var(--miva-success)]",
    onPrimary: "border-white/25 bg-white/15 text-white",
  },
  code: {
    input: "border-[var(--miva-primary)]/25 bg-[var(--miva-primary-surface)] text-[var(--miva-primary)]",
    onPrimary: "border-white/25 bg-white/15 text-white",
  },
  tool: {
    input: "border-[var(--miva-warning)]/25 bg-[var(--miva-warning-soft)] text-[var(--miva-warning)]",
    onPrimary: "border-white/25 bg-white/15 text-white",
  },
  skill: {
    input: "border-violet-300/40 bg-violet-50 text-violet-700",
    onPrimary: "border-white/25 bg-white/15 text-white",
  },
};

export function ChatSlashChip({
  command,
  onRemove,
  variant = "input",
  compact = false,
}: ChatSlashChipProps) {
  const tone = getSlashCommandTone(command);
  const palette = variant === "on-primary" ? toneClasses[tone].onPrimary : toneClasses[tone].input;

  const sizeClasses = compact
    ? "gap-1 px-1.5 py-px text-[10px] leading-4"
    : "gap-1.5 px-2 py-0.5 text-[11px] leading-4";

  const className = `inline-flex max-w-full shrink-0 items-center rounded-full border font-semibold ${palette} ${sizeClasses}${
    onRemove ? " cursor-pointer transition hover:opacity-80" : ""
  }`;

  const content = (
    <>
      <span className={`material-symbols-outlined ${compact ? "text-[12px]" : "text-[13px]"}`}>{command.icon}</span>
      <span className="truncate">{command.label}</span>
    </>
  );

  if (onRemove) {
    return (
      <button
        aria-label={`Remove ${command.label}`}
        className={className}
        onClick={onRemove}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <span className={className}>
      {content}
    </span>
  );
}
