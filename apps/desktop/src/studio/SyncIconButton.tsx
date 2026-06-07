import type { ReactNode } from "react";
import { IconButton, Panel } from "../components/ui";
import { cn } from "../lib/utils";

type SyncIconButtonProps = {
  icon: string;
  title: string;
  description: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
  className?: string;
};

export function SyncIconButton({
  icon,
  title,
  description,
  disabled = false,
  active = false,
  onClick,
  className,
}: SyncIconButtonProps) {
  return (
    <div className={cn("group relative", className)}>
      <IconButton
        aria-label={title}
        className={cn(
          "h-11 w-11 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] shadow-sm transition",
          active && "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)] text-[var(--miva-primary)]",
          !disabled && "hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)] hover:text-[var(--miva-primary)]",
        )}
        disabled={disabled}
        onClick={onClick}
        title={title}
      >
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
          {icon}
        </span>
      </IconButton>
      <div
        className="pointer-events-none absolute right-0 top-[calc(100%+0.5rem)] z-30 opacity-0 transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        <Panel className="w-72 p-3 shadow-[var(--miva-shadow-md)]">
          <p className="text-sm font-bold text-[var(--miva-text)]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">{description}</p>
        </Panel>
      </div>
    </div>
  );
}

export function SyncIconButtonGroup({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}
