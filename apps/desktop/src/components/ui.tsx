import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PrimaryButton({ children, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg bg-[#35607f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-[#c2c7ce] bg-white px-5 py-3 text-sm font-semibold text-[#35607f] transition hover:bg-[#f3f4f5] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_12px_30px_rgba(53,96,127,0.08)] ${className}`}>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "action";
  className?: string;
}) {
  const classes = {
    neutral: "bg-[#e1e3e4] text-[#42474d]",
    success: "bg-[#c9e8cb] text-[#334d38]",
    action: "bg-[#cae6ff] text-[#1c4b69]",
  };

  return (
    <span className={`inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold leading-none ${classes[tone]} ${className}`}>
      {children}
    </span>
  );
}
