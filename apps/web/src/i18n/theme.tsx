import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type WebTheme = 'light' | 'dark';

const themeStorageKey = 'miva.web.theme.v1';

type ThemeContextValue = {
  theme: WebTheme;
  setTheme: (theme: WebTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadTheme(): WebTheme {
  try {
    const saved = window.localStorage.getItem(themeStorageKey);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage errors.
  }

  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<WebTheme>(() => loadTheme());

  const setTheme = (nextTheme: WebTheme) => {
    setThemeState(nextTheme);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
