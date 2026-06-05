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

const DAISO_META_QUESTION_PATTERNS = [
  /무슨\s*기능/,
  /어떤\s*기능/,
  /기능\s*(이|가)?\s*(뭐|무엇)/,
  /뭐하는\s*(거|것|기능|명령|도구)/,
  /뭔\s*기능/,
  /이건?\s*뭐/,
  /이게\s*뭐/,
  /사용법/,
  /사용\s*방법/,
  /어떻게\s*(써|사용|쓰)/,
  /설명\s*(해|해줘|좀|부탁)?/,
  /what\s+is\s+(this|daiso|the)/i,
  /what\s+does/i,
  /how\s+(do|to)\s+(i\s+)?use/i,
  /\bexplain\b/i,
  /^help$/i,
  /^도움말$/,
  /^소개$/,
];

export function isDaisoMetaQuestion(prompt) {
  const text = String(prompt || "").trim();
  if (!text) {
    return true;
  }

  const normalized = text.toLowerCase();
  if (DAISO_META_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const stripped = normalized
    .replace(/\/?daiso\b/g, " ")
    .replace(/\bcli\b/g, " ")
    .replace(/다이소/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!stripped) {
    return true;
  }

  return /^(이건?|이게|무슨|뭐|뭔가|기능|설명|help|소개|안내)(\s+(이야|야|임|인가요|인가|인지|할까|해|해줘|부탁))?$/i.test(stripped);
}

export function isDaisoInventoryConceptQuestion(prompt) {
  const text = String(prompt || "").trim();
  if (!text) {
    return false;
  }

  return /재고\s*(확인|조회)?\s*(은|이)?\s*(뭐|무엇|말하는)/i.test(text)
    || /재고\s*확인이\s*뭐/i.test(text)
    || /what\s+(is|does)\s+inventory/i.test(text)
    || (/inventory/i.test(text) && /\b(what|explain|mean)\b/i.test(text));
}

export function hasMeaningfulInventoryKeyword(keyword) {
  const cleaned = cleanKeyword(String(keyword || ""));
  if (!cleaned || cleaned.length < 2) {
    return false;
  }

  return !/^(재고|inventory|stock|확인|조회|상품|제품)$/i.test(cleaned);
}
