import { UI_THEME_OPTIONS, type UiThemeId } from "../features/theme/themes";

type ThemeSelectorProps = {
  themeId: UiThemeId;
  onThemeChange: (themeId: UiThemeId) => void;
};

export function ThemeSelector({ themeId, onThemeChange }: ThemeSelectorProps) {
  return (
    <div className="grid gap-3">
      {UI_THEME_OPTIONS.map((theme) => {
        const selected = theme.id === themeId;

        return (
          <button
            className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition ${
              selected
                ? "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)] shadow-[var(--miva-shadow-sm)]"
                : "border-[var(--miva-border)] bg-[var(--miva-bg-soft)] hover:border-[var(--miva-border-strong)]"
            } ${theme.available ? "" : "cursor-not-allowed opacity-55"}`}
            disabled={!theme.available}
            key={theme.id}
            onClick={() => {
              if (theme.available) {
                onThemeChange(theme.id);
              }
            }}
            type="button"
          >
            <span className="grid shrink-0 grid-cols-3 overflow-hidden rounded-md border border-[var(--miva-border)] shadow-sm">
              <span className="h-10 w-8" style={{ background: theme.preview.background }} />
              <span className="h-10 w-8" style={{ background: theme.preview.accent }} />
              <span className="grid h-10 w-8 place-items-center text-[10px] font-bold" style={{ background: theme.preview.background, color: theme.preview.text }}>
                Aa
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--miva-text)]">{theme.label}</span>
                {selected && (
                  <span className="rounded-full bg-[var(--miva-primary-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miva-primary)]">
                    Active
                  </span>
                )}
                {!theme.available && (
                  <span className="rounded-full bg-[var(--miva-surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">
                    Soon
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--miva-text-muted)]">{theme.description}</span>
            </span>
            {selected && (
              <span className="material-symbols-outlined shrink-0 text-[20px] text-[var(--miva-primary)]">check_circle</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
