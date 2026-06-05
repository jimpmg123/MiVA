const DAISO_OUTPUT_LIMIT = 18000;

export function truncateOutput(value, limit = DAISO_OUTPUT_LIMIT) {
  const text = String(value || "");
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}\n...[truncated ${text.length - limit} chars]`;
}

export function parseJsonOutput(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function tokenizeCommand(value) {
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(String(value || "")))) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

export function hasArg(args, name) {
  return args.some((arg) => arg === name);
}

export function commandLineFor(args) {
  return `daiso ${args.map((arg) => (
    /\s/.test(arg) ? `"${arg.replace(/"/g, "\\\"")}"` : arg
  )).join(" ")}`;
}

export function todayKstYmd() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "2026";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  return `${year}${month}${day}`;
}

export function includesAny(text, markers) {
  const lower = String(text || "").toLowerCase();
  return markers.some((marker) => lower.includes(marker.toLowerCase()));
}

export function cleanKeyword(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^(에서|에|근처|주변|부근)\s*/g, "")
    .replace(/\s*(에서|에|근처|주변|부근)$/g, "")
    .trim();
}
