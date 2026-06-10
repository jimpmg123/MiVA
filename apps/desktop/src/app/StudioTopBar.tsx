import { WindowControls, WindowDragLayer } from "../components/WindowControls";
import { cn } from "../lib/utils";
import { SidebarToggleIcon } from "./SidebarToggleIcon";
import { isTauriRuntime } from "./tauri";

export type StudioTopBarChipTone = "neutral" | "blue" | "green" | "orange" | "red";

export type StudioTopBarChip = {
  label: string;
  tone?: StudioTopBarChipTone;
  icon?: string;
};

type StudioTopBarProps = {
  chips: StudioTopBarChip[];
  sectionLabel: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

const chipToneClassNames: Record<StudioTopBarChipTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-500",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  orange: "border-orange-100 bg-orange-50 text-orange-600",
  red: "border-red-100 bg-red-50 text-red-600",
};

export function StudioTopBar({ chips, sectionLabel, sidebarOpen, onToggleSidebar }: StudioTopBarProps) {
  const desktopChrome = isTauriRuntime();

  return (
    <header className="relative h-12 w-full shrink-0 border-b border-slate-200 bg-white pl-5 pr-36 text-slate-900">
      {desktopChrome && <WindowDragLayer />}

      <div className="pointer-events-none relative z-10 flex h-full min-w-0 items-center gap-3 overflow-hidden">
        <div className="flex min-w-0 shrink-0 items-center gap-2 text-sm">
          {!sidebarOpen && (
            <button
              aria-label="Open navigation"
              className="pointer-events-auto grid h-7 w-7 shrink-0 place-items-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={onToggleSidebar}
              title="Open navigation"
              type="button"
            >
              <SidebarToggleIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="shrink-0 font-medium text-slate-400">Studio</span>
          <i className="ph ph-caret-right shrink-0 text-[10px] text-slate-400" />
          <h1 className="truncate text-sm font-bold leading-5 text-slate-900">{sectionLabel}</h1>
        </div>

        {chips.length > 0 && (
          <>
            <div className="h-5 w-px shrink-0 bg-slate-200" />
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {chips.map((chip) => (
                <span
                  className={cn(
                    "inline-flex h-5 shrink-0 items-center gap-1 rounded border px-2 text-[10px] font-bold uppercase leading-none",
                    chipToneClassNames[chip.tone ?? "neutral"],
                  )}
                  key={`${chip.label}-${chip.tone ?? "neutral"}`}
                >
                  {chip.icon ? <i className={cn("ph text-[11px]", chip.icon)} /> : null}
                  {chip.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {desktopChrome && <WindowControls className="pointer-events-auto absolute right-0 top-0 z-30 h-full" />}
    </header>
  );
}
