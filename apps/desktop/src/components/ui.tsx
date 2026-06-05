import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:rgba(36,73,102,0.32)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--miva-primary)] text-[var(--miva-on-primary)] shadow-sm hover:bg-[var(--miva-primary-hover)]",
        secondary: "border border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-primary)] shadow-sm hover:border-[var(--miva-border-strong)] hover:bg-[var(--miva-bg-soft)]",
        ghost: "text-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]",
        destructive: "bg-[var(--miva-danger)] text-white shadow-sm hover:bg-[var(--miva-danger-hover)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-5",
        icon: "h-10 w-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} type={type} {...props} />;
}

export function IconButton({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button className={className} size="icon" type={type} variant="ghost" {...props} />;
}

export function PrimaryButton({ children, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={cn("h-12 px-5", className)} type={type} {...props}>
      {children}
    </Button>
  );
}

export function SecondaryButton({
  children,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={cn("h-12 px-5", className)} type={type} variant="secondary" {...props}>
      {children}
    </Button>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex min-h-10 w-full rounded-md border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-2 text-sm text-[var(--miva-text)] outline-none transition-colors placeholder:text-[var(--miva-text-soft)] focus-visible:border-[var(--miva-primary)] focus-visible:ring-2 focus-visible:ring-[color:rgba(36,73,102,0.22)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-md border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-2 text-sm leading-6 text-[var(--miva-text)] outline-none transition-colors placeholder:text-[var(--miva-text-soft)] focus-visible:border-[var(--miva-primary)] focus-visible:ring-2 focus-visible:ring-[color:rgba(36,73,102,0.22)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex min-h-10 w-full rounded-md border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-2 text-sm text-[var(--miva-text)] outline-none transition-colors focus-visible:border-[var(--miva-primary)] focus-visible:ring-2 focus-visible:ring-[color:rgba(36,73,102,0.22)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ checked, className, onCheckedChange, type = "button", ...props }: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        "inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-transparent p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:rgba(36,73,102,0.32)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[var(--miva-primary)]" : "bg-[var(--miva-switch-off)]",
        className,
      )}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type={type}
      {...props}
    >
      <span
        className={cn(
          "grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-bold text-[var(--miva-primary)] shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-6 shadow-sm", className)}>
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 font-heading text-[28px] font-bold leading-9 tracking-normal text-[var(--miva-text)]">
          {title}
        </h2>
        {body && (
          <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--miva-text-muted)]">
            {body}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-start gap-3 sm:justify-end">{actions}</div>}
    </header>
  );
}

export function IconTile({
  children,
  tone = "action",
  className,
}: {
  children: ReactNode;
  tone?: "action" | "success" | "neutral" | "danger" | "warning";
  className?: string;
}) {
  const tones = {
    action: "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]",
    success: "bg-[var(--miva-success-soft)] text-[var(--miva-success)]",
    neutral: "bg-[var(--miva-surface-muted)] text-[var(--miva-text-muted)]",
    danger: "bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)]",
    warning: "bg-[var(--miva-warning-soft)] text-[var(--miva-warning)]",
  };

  return (
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg", tones[tone], className)}>
      {children}
    </span>
  );
}

export function InfoTile({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-[var(--miva-bg-soft)] p-3", className)}>
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{label}</span>
      <p className="mt-1 min-w-0 truncate text-sm font-semibold text-[var(--miva-text)]">{value}</p>
    </div>
  );
}

export function ModalBackdrop({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("fixed inset-0 z-[120] grid place-items-center bg-[var(--miva-overlay)] px-6 backdrop-blur-sm", className)}>
      {children}
    </div>
  );
}

export function ModalPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("w-full rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-6 shadow-[var(--miva-shadow-lg)]", className)}>
      {children}
    </section>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-text)] shadow-sm", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("text-lg font-semibold leading-none tracking-normal text-[var(--miva-text)]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm leading-6 text-[var(--miva-text-muted)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

const badgeVariants = cva(
  "inline-flex min-h-6 items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-transparent bg-[var(--miva-surface-muted)] text-[var(--miva-text-muted)]",
        success: "border-transparent bg-[var(--miva-success-soft)] text-[var(--miva-success)]",
        action: "border-transparent bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export function Badge({
  children,
  tone = "neutral",
  className,
  glow = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "action";
  className?: string;
  glow?: boolean;
}) {
  return (
    <span className={cn(badgeVariants({ tone, className }), glow && "miva-status-glow")}>
      {children}
    </span>
  );
}

export function StatusAlert({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral:
      "border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] text-[var(--miva-text-muted)] shadow-[var(--miva-shadow-sm)]",
    success:
      "border border-[color:rgba(79,123,88,0.42)] bg-[var(--miva-success-surface)] text-[var(--miva-success)] shadow-[var(--miva-shadow-sm)] ring-1 ring-[color:rgba(79,123,88,0.12)]",
    warning:
      "border border-[color:rgba(122,85,0,0.38)] bg-[var(--miva-warning-soft)] text-[var(--miva-warning)] shadow-[var(--miva-shadow-sm)] ring-1 ring-[color:rgba(122,85,0,0.1)]",
    danger:
      "border border-[color:rgba(186,26,26,0.38)] bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)] shadow-[var(--miva-shadow-sm)] ring-1 ring-[color:rgba(186,26,26,0.1)]",
  };

  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-4 text-sm font-medium leading-6",
        tone === "success" && "border-l-[var(--miva-success)]",
        tone === "warning" && "border-l-[var(--miva-warning)]",
        tone === "danger" && "border-l-[var(--miva-danger)]",
        tone === "neutral" && "border-l-[var(--miva-primary)]",
        tones[tone],
        className,
      )}
      role="status"
    >
      {children}
    </div>
  );
}

export function SetupStepShell({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "hero" | "narrow";
  className?: string;
}) {
  const widthClass =
    variant === "hero" ? "max-w-4xl" : variant === "narrow" ? "max-w-[880px]" : "max-w-[1080px]";

  return (
    <div
      className={cn(
        "mx-auto w-full",
        widthClass,
        variant === "hero" && "flex min-h-[calc(100vh-144px)] flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SetupFooter({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <footer className={cn("miva-setup-footer mt-8 flex items-center justify-between gap-4", className)}>
      <div>{left}</div>
      <div>{right}</div>
    </footer>
  );
}

export function ProgressBar({
  value,
  className,
  shimmer = false,
  success = false,
  size = "md",
}: {
  value: number;
  className?: string;
  shimmer?: boolean;
  success?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const heightClass = size === "lg" ? "h-4" : size === "sm" ? "h-2" : "h-2.5";

  return (
    <div className={cn("overflow-hidden rounded-full bg-[var(--miva-surface-muted)]", heightClass, className)}>
      <div
        className={cn(
          "miva-progress-bar-fill h-full rounded-full bg-[var(--miva-primary)]",
          shimmer && clamped > 0 && clamped < 100 && "miva-progress-shimmer relative",
          success && clamped >= 100 && "miva-success-flash bg-[var(--miva-success)]",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function HeroPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Panel className={cn("miva-hero-panel relative overflow-hidden border-[var(--miva-primary)] bg-[var(--miva-primary-surface)]", className)}>
      <div className="relative z-10">{children}</div>
    </Panel>
  );
}

export function SelectionOptionCard({
  active,
  disabled,
  icon,
  title,
  description,
  eyebrow,
  trailing,
  onClick,
  className,
  staggerIndex,
  minHeight = false,
  as = "button",
  interaction = "lift",
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
  staggerIndex?: number;
  minHeight?: boolean;
  as?: "button" | "article";
  interaction?: "lift" | "border";
}) {
  const staggerClass =
    staggerIndex !== undefined ? `miva-stagger-item miva-stagger-${Math.min(staggerIndex, 5)}` : "";

  const interactionClass =
    interaction === "border"
      ? "transition-colors hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]/35"
      : "transition hover:-translate-y-0.5 hover:shadow-[var(--miva-shadow-md)] active:scale-[0.98]";

  const baseClass = cn(
    "group relative flex w-full flex-col items-start rounded-lg border bg-[var(--miva-surface)] p-5 text-left shadow-sm",
    interactionClass,
    active
      ? "border-[var(--miva-primary)] ring-4 ring-[var(--miva-primary-soft)]"
      : "border-[var(--miva-border)]",
    interaction === "border" && !active && "hover:ring-0",
    disabled && "cursor-not-allowed opacity-70 hover:translate-y-0 hover:border-[var(--miva-border)] hover:bg-[var(--miva-surface)] hover:shadow-sm",
    minHeight && "min-h-[150px]",
    staggerClass,
    className,
  );

  const body = (
    <>
      <div className="flex w-full items-start justify-between gap-3">
        <IconTile>{icon}</IconTile>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {trailing}
          <span
            className={cn(
              "transition-all duration-200",
              active ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover:opacity-40",
            )}
          >
            <span className="material-symbols-outlined text-[var(--miva-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </span>
        </div>
      </div>
      {eyebrow && (
        <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{eyebrow}</p>
      )}
      <span className="mt-3 font-heading text-lg font-bold text-[var(--miva-text)]">{title}</span>
      {description && <span className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">{description}</span>}
    </>
  );

  if (disabled || as === "article") {
    return (
      <article className={baseClass} onClick={disabled ? undefined : onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : -1}>
        {body}
      </article>
    );
  }

  return (
    <button className={baseClass} disabled={disabled} onClick={onClick} type="button">
      {body}
    </button>
  );
}

export function SetupStepActionCard({
  title,
  body,
  statusIcon = "check_circle",
  statusTone = "success",
  continueLabel,
  onContinue,
  continueDisabled,
  continueIcon = "arrow_forward",
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  statusIcon?: string;
  statusTone?: "success" | "action" | "warning";
  continueLabel: ReactNode;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueIcon?: string;
  className?: string;
}) {
  const toneClass = {
    success: "bg-[var(--miva-success-soft)] text-[var(--miva-success)]",
    action: "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]",
    warning: "bg-[var(--miva-warning-soft)] text-[var(--miva-warning)]",
  }[statusTone];

  return (
    <Panel className={cn("mt-8 flex items-center justify-between gap-6 transition hover:shadow-[var(--miva-shadow-md)]", className)}>
      <div className="flex min-w-0 items-center gap-4">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", toneClass)}>
          <span
            className="material-symbols-outlined"
            style={statusTone === "success" && statusIcon === "check_circle" ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {statusIcon}
          </span>
        </span>
        <div className="min-w-0">
          <h4 className="text-base font-bold text-[var(--miva-text)]">{title}</h4>
          {body && <p className="text-sm text-[var(--miva-text-muted)]">{body}</p>}
        </div>
      </div>

      <TextIconAction
        actionAriaLabel={String(continueLabel)}
        actionIcon={continueIcon}
        className="shrink-0 border-0 pt-0"
        disabled={continueDisabled}
        label={continueLabel}
        onAction={onContinue}
      />
    </Panel>
  );
}

export function TextIconAction({
  label,
  description,
  actionIcon = "arrow_forward",
  actionAriaLabel,
  onAction,
  disabled,
  className,
  layout = "group",
}: {
  label: ReactNode;
  description?: ReactNode;
  actionIcon?: string;
  actionAriaLabel: string;
  onAction: () => void;
  disabled?: boolean;
  className?: string;
  layout?: "group" | "spread";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-[var(--miva-border)] pt-5",
        layout === "spread" ? "justify-between" : "justify-end",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--miva-text)]">{label}</p>
        {description && <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">{description}</p>}
      </div>
      <Button
        aria-label={actionAriaLabel}
        className="h-11 w-11 shrink-0 rounded-full border-[var(--miva-border)] p-0 shadow-none transition hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)] hover:shadow-[var(--miva-shadow-sm)] active:scale-95"
        disabled={disabled}
        onClick={onAction}
        title={actionAriaLabel}
        variant="secondary"
      >
        <span className="material-symbols-outlined text-[20px]">{actionIcon}</span>
      </Button>
    </div>
  );
}

export function StatPanel({
  icon,
  title,
  body,
  badge,
  footerLabel,
  footerValue,
  staggerIndex,
  className,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  badge?: ReactNode;
  footerLabel?: ReactNode;
  footerValue?: ReactNode;
  staggerIndex?: number;
  className?: string;
  children?: ReactNode;
}) {
  const staggerClass =
    staggerIndex !== undefined ? `miva-stagger-item miva-stagger-${Math.min(staggerIndex, 5)}` : "";

  return (
    <Panel className={cn("group flex h-full flex-col transition hover:shadow-[var(--miva-shadow-md)]", staggerClass, className)}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <IconTile className="transition-transform group-hover:scale-110">{icon}</IconTile>
        {badge}
      </div>
      <h3 className="font-heading text-[22px] font-semibold leading-[30px] text-[var(--miva-text)]">{title}</h3>
      {body && <p className="mb-6 mt-2 text-sm leading-5 text-[var(--miva-text-muted)]">{body}</p>}
      {children}
      {footerLabel && (
        <div className="mt-auto">
          <p className="mb-2 text-sm font-semibold text-[var(--miva-text)]">{footerLabel}</p>
          <p className="text-sm leading-5 text-[var(--miva-text-muted)]">{footerValue}</p>
        </div>
      )}
    </Panel>
  );
}
