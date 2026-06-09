type SidebarToggleIconProps = {
  className?: string;
};

export function SidebarToggleIcon({ className = "h-5 w-5" }: SidebarToggleIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="15.5" rx="3.4" stroke="currentColor" strokeWidth="1.8" width="17.5" x="3.25" y="4.25" />
      <path d="M8.75 4.85V19.15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
