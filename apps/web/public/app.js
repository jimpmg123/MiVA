const HELPER_URL = "http://localhost:43110";

const helperStatus = document.querySelector("#helperStatus");
const ollamaStatus = document.querySelector("#ollamaStatus");
const checkButton = document.querySelector("#checkButton");
const modelListButton = document.querySelector("#modelListButton");
const pullButton = document.querySelector("#pullButton");
const modelSelect = document.querySelector("#modelSelect");
const log = document.querySelector("#log");
const messages = document.querySelector("#messages");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");

function appendLog(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  log.textContent += `${text}\n`;
  log.scrollTop = log.scrollHeight;
}

function appendMessage(role, content) {
  const element = document.createElement("div");
  element.className = "message";
  element.innerHTML = `<strong>${role}</strong><div></div>`;
  element.querySelector("div").textContent = content;
  messages.append(element);
  messages.scrollTop = messages.scrollHeight;
  return element.querySelector("div");
}

async function checkStatus() {
  try {
    const health = await fetch(`${HELPER_URL}/health`).then((res) => res.json());
    helperStatus.textContent = health.ok ? "연결됨" : "오류";
    appendLog(health);
  } catch (error) {
    helperStatus.textContent = "연결 실패";
    appendLog(`Local Helper error: ${error.message}`);
    return;
  }

  try {
    const status = await fetch(`${HELPER_URL}/ollama/status`).then((res) => res.json());
    ollamaStatus.textContent = status.running ? "실행 중" : "연결 실패";
    appendLog(status);
  } catch (error) {
    ollamaStatus.textContent = "확인 실패";
    appendLog(`Ollama status error: ${error.message}`);
  }
}

async function listModels() {
  const data = await fetch(`${HELPER_URL}/models`).then((res) => res.json());
  appendLog(data);
}

async function pullModel() {
  const model = modelSelect.value;
  appendLog(`Starting model download: ${model}`);

  const response = await fetch(`${HELPER_URL}/models/pull`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ model })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    appendLog(decoder.decode(value));
  }
}

async function sendChat(message) {
  appendMessage("사용자", message);
  const assistantNode = appendMessage("MiVA", "");

  const response = await fetch(`${HELPER_URL}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: modelSelect.value,
      messages: [
        {
          role: "system",
          content: "너는 사용자의 개인 AI 비서 MiVA다. 한국어로 짧고 실용적으로 답한다."
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      const event = JSON.parse(line);
      if (event.message?.content) {
        assistantNode.textContent += event.message.content;
      }
      if (event.error) {
        assistantNode.textContent += `\nError: ${event.error}`;
      }
    }
  }
}

checkButton.addEventListener("click", checkStatus);
modelListButton.addEventListener("click", listModels);
pullButton.addEventListener("click", pullModel);
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) {
    return;
  }
  messageInput.value = "";
  sendChat(message).catch((error) => appendLog(`Chat error: ${error.message}`));
});

checkStatus();

