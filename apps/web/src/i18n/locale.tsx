import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { messages, type WebLocale, type WebMessages } from './messages';

const localeStorageKey = 'miva.web.locale.v1';

type LocaleContextValue = {
  locale: WebLocale;
  copy: WebMessages;
  setLocale: (locale: WebLocale) => void;
  toggleLocale: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function loadLocale(): WebLocale {
  try {
    const saved = window.localStorage.getItem(localeStorageKey);
    if (saved === 'ko' || saved === 'en') {
      return saved;
    }
  } catch {
    // Ignore storage errors.
  }

  return 'ko';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<WebLocale>(() => loadLocale());

  const setLocale = (nextLocale: WebLocale) => {
    setLocaleState(nextLocale);
  };

  const toggleLocale = () => {
    setLocaleState((current) => (current === 'ko' ? 'en' : 'ko'));
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      copy: messages[locale],
      setLocale,
      toggleLocale,
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }

  return context;
}

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { locale, toggleLocale, copy } = useLocale();
  const nextLabel = locale === 'ko' ? copy.languageEn : copy.languageKo;

  return (
    <button
      aria-label={`${copy.languageToggle}: ${nextLabel}`}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-secondary-container hover:text-primary-container dark:hover:text-blue-300 ${className}`}
      onClick={toggleLocale}
      title={`${copy.languageToggle} (${nextLabel})`}
      type="button"
    >
      <Languages className="h-5 w-5" strokeWidth={1.75} />
    </button>
  );
}
