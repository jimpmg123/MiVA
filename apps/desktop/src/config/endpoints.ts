function trimUrl(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : fallback;
}

export const CLOUD_API_URL = trimUrl(
  import.meta.env.VITE_MIVA_API_URL as string | undefined,
  "http://127.0.0.1:4000",
);

export const WEB_CONSOLE_URL = trimUrl(
  import.meta.env.VITE_WEB_CONSOLE_URL as string | undefined,
  "http://127.0.0.1:5173",
);
