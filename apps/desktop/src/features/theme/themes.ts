export type UiThemeId = "snow-blue" | "midnight-cyan" | "slate-violet" | "ivory-sage" | "paper-indigo";

export type UiThemeOption = {
  id: UiThemeId;
  label: string;
  description: string;
  preview: {
    background: string;
    accent: string;
    text: string;
  };
  available: boolean;
};

export const UI_THEME_STORAGE_KEY = "miva.uiTheme";

export const UI_THEME_OPTIONS: UiThemeOption[] = [
  {
    id: "snow-blue",
    label: "Snow & Blue",
    description: "Default light theme with calm blue accents.",
    preview: { background: "#f9f9fe", accent: "#4a6fa5", text: "#172033" },
    available: true,
  },
  {
    id: "midnight-cyan",
    label: "Midnight & Cyan",
    description: "Dark practical theme with cyan highlights.",
    preview: { background: "#0d1117", accent: "#22d3ee", text: "#e6edf3" },
    available: true,
  },
  {
    id: "slate-violet",
    label: "Slate & Violet",
    description: "Dark mood theme with violet accents.",
    preview: { background: "#1a1625", accent: "#a78bfa", text: "#ede9fe" },
    available: false,
  },
  {
    id: "ivory-sage",
    label: "Ivory & Sage",
    description: "Soft light theme with sage green accents.",
    preview: { background: "#f7f6f2", accent: "#5a7d5c", text: "#1f2a22" },
    available: true,
  },
  {
    id: "paper-indigo",
    label: "Paper & Indigo",
    description: "Clean light theme with indigo accents.",
    preview: { background: "#f8f9fc", accent: "#4f46e5", text: "#1e1b4b" },
    available: false,
  },
];

export function isUiThemeId(value: string | null | undefined): value is UiThemeId {
  return UI_THEME_OPTIONS.some((theme) => theme.id === value);
}

export function loadStoredUiTheme(): UiThemeId {
  if (typeof window === "undefined") {
    return "snow-blue";
  }

  const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
  if (isUiThemeId(stored)) {
    const theme = UI_THEME_OPTIONS.find((item) => item.id === stored);
    if (theme?.available) {
      return stored;
    }
  }

  return "snow-blue";
}

export function applyUiTheme(themeId: UiThemeId) {
  if (typeof document === "undefined") {
    return;
  }

  if (themeId === "snow-blue") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }

  document.documentElement.setAttribute("data-theme", themeId);
}

export function initUiTheme() {
  applyUiTheme(loadStoredUiTheme());
}
