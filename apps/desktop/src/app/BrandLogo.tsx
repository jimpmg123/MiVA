type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "h-9 w-9" }: BrandLogoProps) {
  return (
    <img
      alt="MiVA"
      className={`${className} shrink-0 rounded-[9px] border border-[var(--miva-border)] bg-white/80 object-contain`}
      src="/miva-logo.png"
    />
  );
}
