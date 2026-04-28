const DESKTOP_URL = "http://127.0.0.1:43111";
const HELPER_URL = "http://127.0.0.1:43110";

const dictionaries = {
  ko: {
    eyebrow: "Web Console PoC",
    title: "MiVA 앱 연결 확인",
    subtitle: "웹 콘솔이 이 컴퓨터에서 실행 중인 MiVA Desktop과 통신할 수 있는지 확인합니다.",
    desktopApp: "Desktop App",
    localHelper: "Local Helper",
    installedModels: "설치된 모델",
    device: "Device",
    connectionTitle: "로컬 앱 연결",
    startOllama: "Ollama 시작",
    desktopBridge: "Desktop Bridge",
    helperBridge: "Local Helper",
    hardware: "Hardware",
    profiles: "Profiles",
    profileTitle: "비서 프로필 준비",
    phaseTwo: "Phase 2",
    profileBody: "웹은 나중에 프롬프트, 역할, Google Workspace, 음성/캐릭터 설정을 관리하는 콘솔이 됩니다.",
    generalAssistant: "General Assistant",
    scheduleManager: "Schedule Manager",
    workspaceReady: "Google Workspace Ready",
    models: "Models",
    modelTitle: "모델 카탈로그",
    test: "Test",
    chatTitle: "웹에서 로컬 채팅 테스트",
    messagePlaceholder: "웹에서 MiVA에게 물어보기...",
    send: "전송",
    logTitle: "연결 로그",
    clear: "지우기",
    checking: "확인 중",
    connected: "연결됨",
    offline: "오프라인",
    running: "실행 중",
    stopped: "중지됨",
    notFound: "찾을 수 없음",
    unavailable: "사용 불가",
    noModels: "없음",
    helperNeeded: "채팅 테스트는 local-helper가 필요합니다.",
  },
  en: {
    eyebrow: "Web Console PoC",
    title: "MiVA App Connection Check",
    subtitle: "Confirm that the web console can communicate with MiVA Desktop running on this computer.",
    desktopApp: "Desktop App",
    localHelper: "Local Helper",
    installedModels: "Installed Models",
    device: "Device",
    connectionTitle: "Local App Connection",
    startOllama: "Start Ollama",
    desktopBridge: "Desktop Bridge",
    helperBridge: "Local Helper",
    hardware: "Hardware",
    profiles: "Profiles",
    profileTitle: "Assistant Profile Prep",
    phaseTwo: "Phase 2",
    profileBody: "The web console will later manage prompts, roles, Google Workspace, voice, and character settings.",
    generalAssistant: "General Assistant",
    scheduleManager: "Schedule Manager",
    workspaceReady: "Google Workspace Ready",
    models: "Models",
    modelTitle: "Model Catalog",
    test: "Test",
    chatTitle: "Local Chat Test From Web",
    messagePlaceholder: "Ask MiVA from the web...",
    send: "Send",
    logTitle: "Connection Log",
    clear: "Clear",
    checking: "Checking",
    connected: "Connected",
    offline: "Offline",
    running: "Running",
    stopped: "Stopped",
    notFound: "Not found",
    unavailable: "Unavailable",
    noModels: "None",
    helperNeeded: "Chat test requires local-helper.",
  },
};

const elements = {
  languageSelect: document.querySelector("#languageSelect"),
  refreshButton: document.querySelector("#refreshButton"),
  clearLogButton: document.querySelector("#clearLogButton"),
  startOllamaButton: document.querySelector("#startOllamaButton"),
  desktopCard: document.querySelector("#desktopCard"),
  helperCard: document.querySelector("#helperCard"),
  ollamaCard: document.querySelector("#ollamaCard"),
  modelCard: document.querySelector("#modelCard"),
  desktopStatus: document.querySelector("#desktopStatus"),
  helperStatus: document.querySelector("#helperStatus"),
  ollamaStatus: document.querySelector("#ollamaStatus"),
  modelStatus: document.querySelector("#modelStatus"),
  hardwareSummary: document.querySelector("#hardwareSummary"),
  modelSelect: document.querySelector("#modelSelect"),
  modelList: document.querySelector("#modelList"),
  messages: document.querySelector("#messages"),
  chatForm: document.querySelector("#chatForm"),
  messageInput: document.querySelector("#messageInput"),
  log: document.querySelector("#log"),
};

let locale = "ko";
let helperOnline = false;
let selectedModel = "qwen3:4b";
let modelCatalog = [];

function t(key) {
  return dictionaries[locale][key] || dictionaries.en[key] || key;
}

function applyLocale() {
  document.documentElement.lang = locale;

  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }

  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
}

function setCardState(card, state) {
  card.classList.remove("ok", "warn", "fail");
  if (state) {
    card.classList.add(state);
  }
}

function appendLog(value) {
  const line = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  elements.log.textContent += `${new Date().toLocaleTimeString()} ${line}\n`;
  elements.log.scrollTop = elements.log.scrollHeight;
}

function replaceLog(value) {
  elements.log.textContent = "";
  appendLog(value);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || "Request failed.");
    error.data = data;
    throw error;
  }

  return data;
}

function renderModelCatalog(catalog) {
  modelCatalog = catalog || [];
  elements.modelList.innerHTML = "";
  elements.modelSelect.innerHTML = "";

  for (const model of modelCatalog) {
    const option = document.createElement("option");
    option.value = model.ollamaName;
    option.textContent = `${model.label} (${model.ollamaName})`;
    elements.modelSelect.append(option);

    const item = document.createElement("div");
    item.className = `model-item${model.installed ? " installed" : ""}`;
    item.innerHTML = `
      <strong>${model.label}</strong>
      <p>${model.summary || model.ollamaName}</p>
      <p>${model.installed ? "Installed" : "Not installed"}</p>
    `;
    elements.modelList.append(item);
  }

  if (modelCatalog.some((model) => model.ollamaName === selectedModel)) {
    elements.modelSelect.value = selectedModel;
  } else if (modelCatalog[0]) {
    selectedModel = modelCatalog[0].ollamaName;
    elements.modelSelect.value = selectedModel;
  }
}

async function checkDesktopBridge() {
  try {
    const health = await fetchJson(`${DESKTOP_URL}/health`);
    elements.desktopStatus.textContent = t("connected");
    setCardState(elements.desktopCard, "ok");
    appendLog({ desktop: health });

    const [ollama, hardware] = await Promise.all([
      fetchJson(`${DESKTOP_URL}/ollama/status`),
      fetchJson(`${DESKTOP_URL}/hardware`),
    ]);

    updateOllamaStatus(ollama);
    elements.hardwareSummary.textContent = `${Math.round(hardware.totalMemoryGb || 0)}GB RAM / ${hardware.logicalCoreCount || "-"} cores`;
    return true;
  } catch (error) {
    elements.desktopStatus.textContent = t("offline");
    elements.hardwareSummary.textContent = "-";
    setCardState(elements.desktopCard, "fail");
    appendLog(`Desktop bridge offline: ${error.message}`);
    return false;
  }
}

function updateOllamaStatus(status) {
  if (!status) {
    elements.ollamaStatus.textContent = t("unavailable");
    setCardState(elements.ollamaCard, "warn");
    return;
  }

  if (status.running) {
    elements.ollamaStatus.textContent = `${t("running")} (${status.installedModelCount || 0})`;
    setCardState(elements.ollamaCard, "ok");
    return;
  }

  elements.ollamaStatus.textContent = status.installed ? t("stopped") : t("notFound");
  setCardState(elements.ollamaCard, status.installed ? "warn" : "fail");
}

async function checkHelper() {
  try {
    const health = await fetchJson(`${HELPER_URL}/health`);
    helperOnline = Boolean(health.ok);
    elements.helperStatus.textContent = t("connected");
    setCardState(elements.helperCard, "ok");

    const models = await fetchJson(`${HELPER_URL}/models`);
    updateOllamaStatus(models.ollama);
    renderModelCatalog(models.catalog);
    elements.modelStatus.textContent = String(models.ollama.installedModelCount || 0);
    setCardState(elements.modelCard, models.ollama.installedModelCount > 0 ? "ok" : "warn");
    appendLog({ helper: health, models: models.ollama });
    return true;
  } catch (error) {
    helperOnline = false;
    elements.helperStatus.textContent = t("offline");
    elements.modelStatus.textContent = t("unavailable");
    setCardState(elements.helperCard, "fail");
    setCardState(elements.modelCard, "warn");
    appendLog(`Local helper offline: ${error.message}`);
    return false;
  }
}

async function refreshAll() {
  elements.desktopStatus.textContent = t("checking");
  elements.helperStatus.textContent = t("checking");
  elements.ollamaStatus.textContent = t("checking");
  elements.modelStatus.textContent = t("checking");
  await Promise.allSettled([checkDesktopBridge(), checkHelper()]);
}

async function startOllama() {
  if (!helperOnline) {
    appendLog(t("helperNeeded"));
    return;
  }

  const result = await fetchJson(`${HELPER_URL}/ollama/start`, { method: "POST" });
  appendLog(result);
  await refreshAll();
}

function appendMessage(role, content) {
  const item = document.createElement("div");
  item.className = `message ${role === "User" ? "user" : "assistant"}`;
  item.innerHTML = `<strong>${role}</strong><span></span>`;
  item.querySelector("span").textContent = content;
  elements.messages.append(item);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  return item.querySelector("span");
}

async function sendChat(message) {
  if (!helperOnline) {
    appendLog(t("helperNeeded"));
    return;
  }

  appendMessage("User", message);
  const assistantNode = appendMessage("MiVA", "");

  const systemPrompt =
    locale === "ko"
      ? "You are MiVA, the user's local personal AI assistant. Reply only in Korean. Do not mix other languages. Keep answers short and practical."
      : "You are MiVA, the user's local personal AI assistant. Reply in English. Keep answers short and practical.";

  const response = await fetch(`${HELPER_URL}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    assistantNode.textContent = data.message || data.error || "Chat request failed.";
    appendLog(data);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.message?.content) assistantNode.textContent += event.message.content;
      if (event.error) assistantNode.textContent += `\nError: ${event.error}`;
    }
  }
}

elements.languageSelect.addEventListener("change", () => {
  locale = elements.languageSelect.value;
  applyLocale();
  refreshAll();
});

elements.refreshButton.addEventListener("click", refreshAll);
elements.clearLogButton.addEventListener("click", () => {
  elements.log.textContent = "";
});
elements.startOllamaButton.addEventListener("click", () => {
  startOllama().catch((error) => appendLog(error.data || error.message));
});
elements.modelSelect.addEventListener("change", () => {
  selectedModel = elements.modelSelect.value;
});
elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = elements.messageInput.value.trim();
  if (!message) return;
  elements.messageInput.value = "";
  sendChat(message).catch((error) => appendLog(error.data || error.message));
});

applyLocale();
refreshAll();
