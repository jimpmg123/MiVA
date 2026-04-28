import en from "./locales/en.json";

export type Locale = "ko" | "en";

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  ko: en,
};

export function translate(locale: Locale, key: string) {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
}
