import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanKeyword,
  commandLineFor,
  hasArg,
  includesAny,
  hasMeaningfulInventoryKeyword,
  isDaisoInventoryConceptQuestion,
  isDaisoMetaQuestion,
  parseJsonOutput,
  todayKstYmd,
  tokenizeCommand,
  truncateOutput,
} from "./daiso-utils.mjs";

const DAISO_TIMEOUT_MS = 45000;
const DAISO_BIN_PATH = fileURLToPath(new URL("../../node_modules/daiso/dist/bin.js", import.meta.url));

const PLAIN_COMMANDS = new Set(["health", "help", "url"]);
const ALLOWED_COMMANDS = new Set([
  "health",
  "help",
  "url",
  "products",
  "product",
  "stores",
  "inventory",
  "display-location",
  "compare",
  "places",
  "get",
  "cu-stores",
  "cu-inventory",
  "gs25-stores",
  "gs25-products",
  "gs25-inventory",
  "seveneleven-products",
  "seveneleven-stores",
  "seveneleven-inventory",
  "seveneleven-popwords",
  "seveneleven-catalog",
  "emart24-stores",
  "emart24-products",
  "emart24-inventory",
  "lottemart-stores",
  "lottemart-products",
  "lottecinema-theaters",
  "cgv-theaters",
  "cgv-movies",
  "cgv-timetable",
]);

let daisoQueue = Promise.resolve();

function enqueueDaisoRun(operation) {
  const queued = daisoQueue.then(operation, operation);
  daisoQueue = queued.catch(() => undefined);
  return queued;
}

function resolveDaisoRunner() {
  if (existsSync(DAISO_BIN_PATH)) {
    return {
      command: process.execPath,
      argsPrefix: [DAISO_BIN_PATH],
      label: `node ${DAISO_BIN_PATH}`,
      installed: true,
    };
  }

  return {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    argsPrefix: ["--yes", "daiso"],
    label: "npx --yes daiso",
    installed: false,
  };
}

function stripCommonWords(value) {
  return cleanKeyword(
    String(value || "")
      .replace(/\/?daiso\b/gi, " ")
      .replace(/\bcli\b/gi, " ")
      .replace(/다이소|올리브영|롯데마트|이마트24|세븐일레븐|편의점|상품|제품|검색|찾아줘|찾아|알려줘|확인|조회|재고|매장|근처|주변|가격|비교|어디가\s*싸|제일\s*싼|해줘|해\s*줘|해/g, " ")
      .replace(/\b(gs25|cu|cgv|megabox|lotte\s*cinema|lottecinema|emart24)\b/gi, " "),
  );
}

function extractNearLocation(prompt) {
  const text = String(prompt || "").trim();
  const match = text.match(/([가-힣A-Za-z0-9\s]{1,30}?)(?:\s*)(근처|주변|부근)/);
  if (match) {
    return cleanKeyword(match[1]);
  }
  return "";
}

function extractInventoryParts(prompt, servicePatterns) {
  let text = String(prompt || "");
  for (const pattern of servicePatterns) {
    text = text.replace(pattern, " ");
  }
  text = text.split(/재고|stock|inventory/i)[0] || text;
  text = text
    .replace(/찾아줘|찾아|알려줘|확인|조회|상품|제품|매장|근처|주변|해줘|해\s*줘|해/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    return {
      storeKeyword: tokens.slice(0, -1).join(" "),
      keyword: tokens.at(-1),
    };
  }
  return {
    storeKeyword: extractNearLocation(prompt),
    keyword: tokens[0] || stripCommonWords(prompt),
  };
}

function extractDate(prompt) {
  const text = String(prompt || "");
  const ymd = text.match(/\b(20\d{2})[-.]?(\d{1,2})[-.]?(\d{1,2})\b/);
  if (ymd) {
    return `${ymd[1]}${ymd[2].padStart(2, "0")}${ymd[3].padStart(2, "0")}`;
  }
  return todayKstYmd();
}

function validateExplicitArgs(args) {
  const command = args[0];
  if (!command || !ALLOWED_COMMANDS.has(command)) {
    return {
      ok: false,
      message: `Unsupported Daiso CLI command: ${command || "(empty)"}.`,
    };
  }

  if (command === "get") {
    const apiPath = args[1] || "";
    if (!apiPath.startsWith("/api/") || apiPath.includes("feedback") || apiPath.includes("requests")) {
      return {
        ok: false,
        message: "Daiso get commands are limited to read-only /api paths.",
      };
    }
  }

  return { ok: true };
}

function finalizePlan(args, summary, needsUserInput = false, message = "") {
  if (needsUserInput) {
    return { needsUserInput, message };
  }

  const validation = validateExplicitArgs(args);
  if (!validation.ok) {
    return {
      needsUserInput: true,
      message: validation.message,
    };
  }

  const command = args[0];
  const finalArgs = PLAIN_COMMANDS.has(command) || hasArg(args, "--json")
    ? args
    : [...args, "--json"];

  return {
    args: finalArgs,
    command,
    commandLine: commandLineFor(finalArgs),
    summary,
  };
}

function parseExplicitCommand(prompt) {
  const tokens = tokenizeCommand(prompt);
  if (tokens[0] === "daiso") {
    tokens.shift();
  }
  if (!tokens.length || !ALLOWED_COMMANDS.has(tokens[0])) {
    return null;
  }
  return tokens;
}

function planConvenienceInventory(prompt, service) {
  const servicePatterns = {
    gs25: [/\bgs25\b/gi],
    cu: [/\bcu\b/gi],
    seveneleven: [/세븐일레븐/g, /seven\s*eleven/gi, /7-eleven/gi],
    emart24: [/이마트24/g, /\bemart24\b/gi],
  }[service];
  const { keyword, storeKeyword } = extractInventoryParts(prompt, servicePatterns);
  if (!keyword) {
    return finalizePlan([], "", true, "Tell the user to provide a product keyword for the Daiso CLI inventory lookup.");
  }

  if (service === "gs25") {
    return finalizePlan(["gs25-inventory", keyword, "--storeKeyword", storeKeyword || "강남", "--storeLimit", "10"], `Check GS25 inventory for ${keyword}.`);
  }
  if (service === "cu") {
    return finalizePlan(["cu-inventory", keyword, "--storeKeyword", storeKeyword || "강남"], `Check CU inventory for ${keyword}.`);
  }
  if (service === "seveneleven") {
    return finalizePlan(["seveneleven-inventory", keyword, "--storeKeyword", storeKeyword || "강남", "--storeLimit", "10"], `Check Seven-Eleven inventory for ${keyword}.`);
  }
  return finalizePlan(["emart24-products", keyword, "--pageSize", "10"], `Search Emart24 product candidates for ${keyword}.`);
}

function formatDaisoFeatureGuideReply(prompt = "") {
  const lines = [
    "Daiso CLI는 MiVA 안에서 로컬로 실행되는 읽기 전용 조회 도구입니다.",
    "",
    "다이소, 편의점(GS25/CU/세븐일레븐/이마트24), 올리브영, 롯데마트, 주유소, 주변 장소, CGV/메가박스/롯데시네마 같은 외부 서비스에서 조회 결과를 가져와 답변에 활용합니다.",
    "",
    "할 수 있는 것",
    "- 제품 검색: 상품 이름·가격·이미지 찾기",
    "- 재고 확인: 특정 상품이 어느 매장에 있는지 조회 (제품 검색과 다름)",
    "- 매장 찾기, 가격 비교, 주변 장소, 유가, 영화/상영 시간표",
    "- 가격 비교, 주변 장소, 유가, 영화/상영 시간표",
    "",
    "사용 예시",
    "- /daiso products 마스크",
    "- /daiso 강남역 근처 매장",
    "- /daiso compare 콜라",
    "- /daiso health",
    "",
    "기능 설명이나 사용법을 물을 때는 제품 검색을 실행하지 않고 이 안내를 보여줍니다. 실제 조회가 필요하면 위 예시처럼 키워드나 명령을 함께 입력하세요.",
  ];

  if (prompt.trim()) {
    lines.push("", `지금 질문: ${prompt.trim()}`);
  }

  return lines.join("\n");
}

function buildDaisoFeatureGuide(prompt = "") {
  return [
    "MiVA Daiso CLI feature guide. This is not a live retail lookup result.",
    formatDaisoFeatureGuideReply(prompt),
  ].join("\n");
}

function planDaisoMetaHelp(prompt) {
  return {
    metaHelp: true,
    command: "guide",
    commandLine: "daiso (feature guide)",
    summary: "Explain what the Daiso CLI integration does in MiVA.",
    context: buildDaisoFeatureGuide(prompt),
  };
}

function formatDaisoInventoryGuideReply(prompt = "") {
  const lines = [
    "재고 확인은 '상품 목록 검색'과 다릅니다.",
    "",
    "제품 검색 (products)",
    "- 다이소몰에 등록된 상품 후보를 찾습니다.",
    "- 이름, 가격, 이미지 같은 카탈로그 정보가 나옵니다.",
    "- 지금 보신 '3단부직포수납장 5,000원' 같은 목록이 이 단계입니다.",
    "",
    "재고 확인 (inventory)",
    "- 특정 상품이 어느 오프라인 매장에 있는지 조회합니다.",
    "- 상품번호(6자리 이상) 또는 상품명 + 매장 지역이 필요합니다.",
    "",
    "사용 예시",
    "1) /daiso products 마스크",
    "2) /daiso inventory 1234567 --keyword 강남역",
    "또는 /daiso 강남역 마스크 재고",
    "",
    "편의점(GS25, CU, 세븐일레븐)도 'OO매장 YYYY 재고' 형태로 비슷하게 조회합니다.",
  ];

  if (prompt.trim()) {
    lines.push("", `지금 질문: ${prompt.trim()}`);
  }

  return lines.join("\n");
}

function planDaisoInventoryGuide(prompt) {
  return {
    metaHelp: true,
    command: "inventory-guide",
    commandLine: "daiso (inventory guide)",
    summary: "Explain the difference between Daiso product search and inventory lookup.",
    context: [
      "MiVA Daiso CLI inventory concept guide. This is not live retail data.",
      formatDaisoInventoryGuideReply(prompt),
    ].join("\n"),
    directReply: formatDaisoInventoryGuideReply(prompt),
  };
}

function planDaisoPrompt(prompt) {
  const explicit = parseExplicitCommand(prompt);
  if (explicit) {
    return finalizePlan(explicit, `Run explicit Daiso CLI command: ${explicit[0]}.`);
  }

  const text = String(prompt || "").trim();
  const keyword = stripCommonWords(text);
  const location = extractNearLocation(text);

  if (isDaisoMetaQuestion(text)) {
    return planDaisoMetaHelp(text);
  }

  if (!text) {
    return planDaisoMetaHelp(text);
  }

  if (includesAny(text, ["health", "헬스", "상태"])) {
    return finalizePlan(["health"], "Check Daiso CLI health.");
  }

  if (includesAny(text, ["어디가 싸", "가격 비교", "비교", "최저가"])) {
    return finalizePlan(["compare", keyword || "콜라", "--limit", "5"], `Compare product prices for ${keyword || "콜라"}.`);
  }

  if (includesAny(text, ["카페", "cafe", "음식점", "식당", "맛집", "브런치"])) {
    const category = includesAny(text, ["카페", "cafe", "디저트"]) ? "cafe" : "restaurant";
    const place = location || text.split(/\s+/)[0] || "강남역";
    const placeKeyword = includesAny(text, ["브런치"]) ? "브런치" : "";
    const args = ["places", place, "--category", category, "--limit", "5"];
    if (placeKeyword) {
      args.push("--keyword", placeKeyword);
    }
    return finalizePlan(args, `Search nearby places around ${place}.`);
  }

  if (includesAny(text, ["주유소", "휘발유", "경유", "유가", "기름값"])) {
    if (includesAny(text, ["평균", "전국"])) {
      return finalizePlan(["get", "/api/opinet/average"], "Get average fuel prices.");
    }
    const place = location || keyword || "강남역";
    return finalizePlan(["get", "/api/opinet/stations/around", "--location", place, "--sort", "price", "--count", "5"], `Search low-price fuel stations around ${place}.`);
  }

  if (includesAny(text, ["올리브영", "olive young", "oliveyoung"])) {
    const parts = extractInventoryParts(text, [/올리브영/g, /olive\s*young/gi, /oliveyoung/gi]);
    if (includesAny(text, ["재고", "inventory", "stock"])) {
      return finalizePlan(["get", "/api/oliveyoung/inventory", "--keyword", parts.keyword || keyword || "선크림", "--storeKeyword", parts.storeKeyword || location || "명동"], "Check Olive Young inventory.");
    }
    if (includesAny(text, ["매장", "store", "근처", "주변"])) {
      return finalizePlan(["get", "/api/oliveyoung/stores", "--keyword", location || keyword || "명동", "--limit", "10"], "Find Olive Young stores.");
    }
    return finalizePlan(["get", "/api/oliveyoung/products", "--keyword", keyword || "선크림", "--size", "10"], "Search Olive Young products.");
  }

  if (includesAny(text, ["gs25"])) {
    if (includesAny(text, ["재고", "inventory", "stock"])) {
      return planConvenienceInventory(text, "gs25");
    }
    if (includesAny(text, ["매장", "store", "근처", "주변"])) {
      return finalizePlan(["gs25-stores", location || keyword || "강남", "--limit", "10"], "Find GS25 stores.");
    }
    return finalizePlan(["gs25-products", keyword || "콜라", "--limit", "10"], "Search GS25 products.");
  }

  if (includesAny(text, ["cu", "씨유"])) {
    if (includesAny(text, ["재고", "inventory", "stock"])) {
      return planConvenienceInventory(text, "cu");
    }
    return finalizePlan(["cu-stores", location || keyword || "강남"], "Find CU stores.");
  }

  if (includesAny(text, ["세븐일레븐", "seven eleven", "7-eleven"])) {
    if (includesAny(text, ["재고", "inventory", "stock"])) {
      return planConvenienceInventory(text, "seveneleven");
    }
    if (includesAny(text, ["매장", "store", "근처", "주변"])) {
      return finalizePlan(["seveneleven-stores", location || keyword || "강남", "--limit", "10"], "Find Seven-Eleven stores.");
    }
    return finalizePlan(["seveneleven-products", keyword || "삼각김밥", "--size", "10"], "Search Seven-Eleven products.");
  }

  if (includesAny(text, ["이마트24", "emart24"])) {
    if (includesAny(text, ["매장", "store", "근처", "주변"])) {
      return finalizePlan(["emart24-stores", location || keyword || "강남", "--limit", "10"], "Find Emart24 stores.");
    }
    return finalizePlan(["emart24-products", keyword || "커피", "--pageSize", "10"], "Search Emart24 products.");
  }

  if (includesAny(text, ["롯데마트", "lotte mart", "lottemart"])) {
    if (includesAny(text, ["매장", "store", "근처", "주변"])) {
      return finalizePlan(["lottemart-stores", location || keyword || "잠실", "--area", "서울", "--limit", "10"], "Find Lotte Mart stores.");
    }
    return finalizePlan(["lottemart-products", keyword || "콜라", "--area", "서울"], "Search Lotte Mart products.");
  }

  if (includesAny(text, ["cgv"])) {
    const playDate = extractDate(text);
    if (includesAny(text, ["시간표", "상영", "timetable", "좌석"])) {
      return finalizePlan(["get", "/api/cgv/timetable", "--playDate", playDate, "--keyword", location || keyword || "강남", "--limit", "20"], "Get CGV timetable.");
    }
    if (includesAny(text, ["영화", "movie"])) {
      return finalizePlan(["get", "/api/cgv/movies", "--playDate", playDate, "--keyword", location || keyword || "강남"], "Get CGV movies.");
    }
    return finalizePlan(["cgv-theaters", location || keyword || "강남", "--limit", "10"], "Find CGV theaters.");
  }

  if (includesAny(text, ["메가박스", "megabox"])) {
    const playDate = extractDate(text);
    if (includesAny(text, ["영화", "시간표", "상영", "좌석", "movie", "seat"])) {
      return finalizePlan(["get", "/api/megabox/movies", "--playDate", playDate, "--keyword", location || keyword || "강남"], "Get Megabox movies.");
    }
    return finalizePlan(["get", "/api/megabox/theaters", "--keyword", location || keyword || "강남", "--limit", "10"], "Find Megabox theaters.");
  }

  if (includesAny(text, ["롯데시네마", "lotte cinema", "lottecinema"])) {
    const playDate = extractDate(text);
    if (includesAny(text, ["영화", "시간표", "상영", "좌석", "movie", "seat"])) {
      return finalizePlan(["get", "/api/lottecinema/movies", "--playDate", playDate, "--keyword", location || keyword || "잠실"], "Get Lotte Cinema movies.");
    }
    return finalizePlan(["lottecinema-theaters", location || keyword || "잠실", "--limit", "10"], "Find Lotte Cinema theaters.");
  }

  if (includesAny(text, ["매장", "store", "근처", "주변"]) && !includesAny(text, ["재고"])) {
    return finalizePlan(["stores", location || keyword || "강남역", "--limit", "10"], "Find Daiso stores.");
  }

  if (includesAny(text, ["재고", "inventory", "stock"])) {
    if (isDaisoInventoryConceptQuestion(text)) {
      return planDaisoInventoryGuide(text);
    }

    const productId = text.match(/\b\d{6,}\b/)?.[0];
    const parts = extractInventoryParts(text, [/다이소/g, /\bdaiso\b/gi]);
    const productKeyword = parts.keyword || keyword;

    if (productId) {
      return finalizePlan(["inventory", productId, "--keyword", parts.storeKeyword || location || "강남역"], `Check Daiso inventory for product ${productId}.`);
    }

    if (!hasMeaningfulInventoryKeyword(productKeyword)) {
      return finalizePlan([], "", true, [
        "재고 확인은 '어느 매장에 이 상품이 있는지'를 조회하는 기능입니다.",
        "상품명과 지역/매장 키워드를 함께 알려주세요.",
        "예: /daiso 강남역 마스크 재고",
        "예: /daiso inventory 1234567 --keyword 강남역",
      ].join(" "));
    }

    const plan = finalizePlan(
      ["products", productKeyword, "--pageSize", "10"],
      `Search Daiso products for ${productKeyword} before inventory lookup.`,
    );
    return {
      ...plan,
      inventoryPrecursor: true,
      productKeyword,
      storeKeyword: parts.storeKeyword || location || "",
    };
  }

  return finalizePlan(["products", keyword || text, "--pageSize", "10"], `Search Daiso products for ${keyword || text}.`);
}

function buildContext({ prompt, plan, result }) {
  const dataText = result.json
    ? JSON.stringify(result.json, null, 2)
    : result.stdout;
  const lines = [
    "Daiso CLI result was retrieved by MiVA for the user's request.",
    `User request: ${prompt}`,
    `CLI command: ${plan.commandLine}`,
    `Plan summary: ${plan.summary}`,
  ];

  if (plan.inventoryPrecursor) {
    lines.push(
      "Important: this is a product catalog search, not a store inventory result.",
      "Do not describe these items as confirmed in-store stock.",
      "Explain that inventory lookup needs a product ID from these candidates plus a store keyword.",
      plan.storeKeyword
        ? `Next step example: daiso inventory <productId> --keyword ${plan.storeKeyword}`
        : "Ask the user which product ID and store area to use for inventory lookup.",
    );
  } else {
    lines.push(
      "Use this result as tool context. Summarize only useful product, store, inventory, place, price, movie, showtime, or seat details.",
    );
  }

  lines.push(
    "Do not claim the result is permanent; Daiso data comes from live external services and can change.",
    "CLI output:",
    truncateOutput(dataText),
  );

  return lines.join("\n");
}

function runProcess(args, timeoutMs = DAISO_TIMEOUT_MS) {
  const runner = resolveDaisoRunner();
  return new Promise((resolve) => {
    const child = spawn(runner.command, [...runner.argsPrefix, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        code: null,
        runner,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(`${stderr}\n${error.message}`.trim()),
        timedOut,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        code,
        runner,
        stdout: truncateOutput(stdout),
        stderr: truncateOutput(stderr),
        timedOut,
      });
    });
  });
}

export async function getDaisoStatus() {
  const runner = resolveDaisoRunner();
  const result = await enqueueDaisoRun(() => runProcess(["health"], 20000));
  const json = parseJsonOutput(result.stdout);
  return {
    installed: runner.installed,
    available: result.ok,
    command: runner.label,
    status: json?.status || (result.ok ? "ok" : "error"),
    endpoint: json?.endpoint || "https://mcp.aka.page/mcp",
    checkedAt: json?.checkedAt || new Date().toISOString(),
    error: result.ok ? null : result.stderr || result.stdout || "Daiso CLI health check failed.",
  };
}

export async function runDaisoRequest({ prompt = "", args = null } = {}) {
  const plan = Array.isArray(args) && args.length
    ? finalizePlan(args.map(String), "Run explicit Daiso CLI arguments.")
    : planDaisoPrompt(prompt);

  if (plan.metaHelp) {
    return {
      ok: true,
      needsUserInput: false,
      featureGuide: true,
      command: plan.command,
      commandLine: plan.commandLine,
      message: plan.command === "inventory-guide" ? "Daiso CLI inventory guide." : "Daiso CLI feature guide.",
      directReply: plan.directReply || formatDaisoFeatureGuideReply(prompt),
      context: plan.context,
    };
  }

  if (plan.needsUserInput) {
    return {
      ok: false,
      needsUserInput: true,
      message: plan.message,
    };
  }

  const result = await enqueueDaisoRun(() => runProcess(plan.args));
  const json = parseJsonOutput(result.stdout);
  const payload = {
    ok: result.ok,
    needsUserInput: false,
    command: plan.command,
    commandLine: plan.commandLine,
    plan,
    data: json,
    stdout: result.stdout,
    stderr: result.stderr,
    timedOut: result.timedOut,
    message: result.ok
      ? "Daiso CLI completed."
      : result.timedOut
        ? "Daiso CLI timed out."
        : result.stderr || result.stdout || "Daiso CLI failed.",
  };

  return {
    ...payload,
    context: result.ok ? buildContext({ prompt, plan, result: { ...result, json } }) : "",
  };
}
