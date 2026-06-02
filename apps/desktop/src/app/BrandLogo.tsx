type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "h-9 w-9" }: BrandLogoProps) {
  return (
    <img
      alt="MiVA"
      className={`${className} shrink-0 rounded-xl border border-[var(--miva-border)] bg-white object-contain shadow-[var(--miva-shadow-sm)]`}
      src="/miva-logo.png"
    />
  );
}
