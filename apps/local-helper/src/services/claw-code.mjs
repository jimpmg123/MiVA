import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { OPENAI_DEFAULT_MODEL } from "../config.mjs";
import { getProviderApiKey } from "./provider-keys.mjs";

const execFileAsync = promisify(execFile);
const CLAW_VERSION = "0.1.0";
const MAX_AGENT_STEPS = 8;

const codeKeywords = [
  "code",
  "function",
  "class",
  "bug",
  "fix",
  "implement",
  "refactor",
  "typescript",
  "javascript",
  "python",
  "react",
  "error",
  "compile",
  "debug",
  "snippet",
  "repository",
  "repo",
  "file",
  "코드",
  "함수",
  "클래스",
  "버그",
  "수정",
  "구현",
  "리팩",
  "에러",
  "오류",
  "파일",
  "생성",
  "작성",
  "컴포넌트",
  "스크립트",
];

function clawDataDir() {
  if (process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, "com.miva.desktop", "claw-code");
  }

  return path.join(homedir(), ".miva", "claw-code");
}

function stateFilePath() {
  return path.join(clawDataDir(), "state.json");
}

function sessionsDirPath() {
  return path.join(clawDataDir(), "sessions");
}

async function detectCommand(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      timeout: 5000,
      windowsHide: true,
    });
    return {
      installed: true,
      version: (result.stdout || result.stderr || "").trim() || null,
      command,
    };
  } catch {
    return {
      installed: false,
      version: null,
      command,
    };
  }
}

async function loadState() {
  const filePath = stateFilePath();
  if (!existsSync(filePath)) {
    return {
      installed: false,
      workspaceRoot: null,
      version: null,
      installedAt: null,
    };
  }

  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return {
      installed: parsed.installed === true,
      workspaceRoot: typeof parsed.workspaceRoot === "string" ? parsed.workspaceRoot : null,
      version: typeof parsed.version === "string" ? parsed.version : null,
      installedAt: typeof parsed.installedAt === "string" ? parsed.installedAt : null,
    };
  } catch {
    return {
      installed: false,
      workspaceRoot: null,
      version: null,
      installedAt: null,
    };
  }
}

async function saveState(nextState) {
  const dir = clawDataDir();
  await mkdir(dir, { recursive: true });
  await mkdir(sessionsDirPath(), { recursive: true });
  await writeFile(stateFilePath(), JSON.stringify(nextState, null, 2), "utf8");
  return nextState;
}

function resolveWorkspaceRoot(state, overrideRoot) {
  const candidate = typeof overrideRoot === "string" && overrideRoot.trim()
    ? overrideRoot.trim()
    : state.workspaceRoot;
  if (!candidate) {
    return null;
  }

  return path.resolve(candidate);
}

function isPathInsideWorkspace(workspaceRoot, targetPath) {
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const resolvedTarget = path.resolve(workspaceRoot, targetPath);
  const relative = path.relative(resolvedWorkspace, resolvedTarget);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readWorkspaceFile(workspaceRoot, relativePath) {
  const fullPath = path.resolve(workspaceRoot, relativePath);
  if (!isPathInsideWorkspace(workspaceRoot, relativePath)) {
    throw new Error("Path is outside the allowed workspace.");
  }

  const content = await readFile(fullPath, "utf8");
  return content.length > 12000 ? `${content.slice(0, 12000)}\n...[truncated]` : content;
}

async function writeWorkspaceFile(workspaceRoot, relativePath, content) {
  const fullPath = path.resolve(workspaceRoot, relativePath);
  if (!isPathInsideWorkspace(workspaceRoot, relativePath)) {
    throw new Error("Path is outside the allowed workspace.");
  }

  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
  return fullPath;
}

async function listWorkspaceDirectory(workspaceRoot, relativePath = ".") {
  const fullPath = path.resolve(workspaceRoot, relativePath);
  if (!isPathInsideWorkspace(workspaceRoot, relativePath)) {
    throw new Error("Path is outside the allowed workspace.");
  }

  const entries = await readdir(fullPath, { withFileTypes: true });
  return entries
    .slice(0, 100)
    .map((entry) => `${entry.isDirectory() ? "[dir]" : "[file]"} ${entry.name}`)
    .join("\n");
}

async function appendSessionLog(sessionId, entry) {
  const filePath = path.join(sessionsDirPath(), `${sessionId}.jsonl`);
  await mkdir(sessionsDirPath(), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(entry)}\n`, { flag: "a" });
}

export function isCodeRelatedPrompt(prompt) {
  const lower = String(prompt || "").toLowerCase();
  if (lower.includes("```")) {
    return true;
  }

  return codeKeywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export function shouldRouteToClawCode({ profile, prompt }) {
  const coding = profile?.prompt?.settings?.coding;
  if (!coding || typeof coding !== "object") {
    return false;
  }

  if (coding.capability === "clawCode") {
    return isCodeRelatedPrompt(prompt);
  }

  if (coding.capability === "codeEdit") {
    return isCodeRelatedPrompt(prompt);
  }

  if (coding.capability === "codeExplain") {
    return isCodeRelatedPrompt(prompt);
  }

  return false;
}

export async function getClawCodeStatus() {
  const [node, git, state] = await Promise.all([
    detectCommand(process.execPath, ["--version"]),
    detectCommand(process.platform === "win32" ? "git.exe" : "git", ["--version"]),
    loadState(),
  ]);
  const openAiKey = getProviderApiKey("openai", "");

  return {
    installed: Boolean(state.installed),
    version: state.version,
    installedAt: state.installedAt,
    workspaceRoot: state.workspaceRoot,
    openAiConfigured: Boolean(openAiKey),
    openAiModel: OPENAI_DEFAULT_MODEL,
    node,
    git,
    sessionsDir: sessionsDirPath(),
  };
}

export async function installClawCode({ workspaceRoot } = {}) {
  const node = await detectCommand(process.execPath, ["--version"]);
  if (!node.installed) {
    throw new Error("Node.js is required before installing Claw Code.");
  }

  const resolvedWorkspace = workspaceRoot ? path.resolve(workspaceRoot) : null;
  if (resolvedWorkspace && !existsSync(resolvedWorkspace)) {
    throw new Error("Workspace folder does not exist.");
  }

  await mkdir(clawDataDir(), { recursive: true });
  await mkdir(sessionsDirPath(), { recursive: true });

  const nextState = await saveState({
    installed: true,
    workspaceRoot: resolvedWorkspace,
    version: CLAW_VERSION,
    installedAt: new Date().toISOString(),
  });

  return {
    ok: true,
    message: resolvedWorkspace
      ? `Claw Code is ready. Workspace: ${resolvedWorkspace}`
      : "Claw Code is ready. Choose a workspace folder before editing files.",
    state: nextState,
  };
}

export async function updateClawCodeWorkspace(workspaceRoot) {
  const state = await loadState();
  if (!state.installed) {
    throw new Error("Install Claw Code before choosing a workspace folder.");
  }

  const resolvedWorkspace = path.resolve(workspaceRoot);
  if (!existsSync(resolvedWorkspace)) {
    throw new Error("Workspace folder does not exist.");
  }

  const nextState = await saveState({
    ...state,
    workspaceRoot: resolvedWorkspace,
  });

  return {
    ok: true,
    workspaceRoot: nextState.workspaceRoot,
  };
}

function buildClawTools(accessMode) {
  const tools = [
    {
      type: "function",
      function: {
        name: "list_directory",
        description: "List files and folders inside the allowed workspace.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative path inside the workspace. Use . for root." },
          },
          required: ["path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read a text file inside the allowed workspace.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative file path inside the workspace." },
          },
          required: ["path"],
        },
      },
    },
  ];

  if (accessMode === "fileEdits" || accessMode === "shellCommands") {
    tools.push({
      type: "function",
      function: {
        name: "write_file",
        description: "Create or overwrite a text file inside the allowed workspace.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative file path inside the workspace." },
            content: { type: "string", description: "Full file contents to write." },
          },
          required: ["path", "content"],
        },
      },
    });
  }

  return tools;
}

async function executeToolCall({ workspaceRoot, accessMode, name, args }) {
  if (name === "read_file") {
    const content = await readWorkspaceFile(workspaceRoot, args.path);
    return { ok: true, content };
  }

  if (name === "list_directory") {
    const listing = await listWorkspaceDirectory(workspaceRoot, args.path || ".");
    return { ok: true, content: listing || "(empty)" };
  }

  if (name === "write_file") {
    if (accessMode !== "fileEdits" && accessMode !== "shellCommands") {
      return { ok: false, content: "Write access is disabled for this coding mode." };
    }

    const writtenPath = await writeWorkspaceFile(workspaceRoot, args.path, args.content);
    return { ok: true, content: `Wrote ${writtenPath}` };
  }

  return { ok: false, content: `Unsupported tool: ${name}` };
}

async function callOpenAiWithTools({ apiKey, model, messages, tools }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(1000 * 60 * 5),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI returned HTTP ${response.status}`);
  }

  return data?.choices?.[0]?.message;
}

export async function runClawCodeAgent({
  prompt,
  profile,
  apiKey,
  messages = [],
  locale = "ko",
  workspaceRoot: workspaceRootOverride,
}) {
  const status = await getClawCodeStatus();
  if (!status.installed) {
    return {
      type: "direct-answer",
      answer: locale === "en"
        ? "Claw Code is not installed yet. Install it from Setup or Settings > Claw Code, then retry."
        : "Claw Code가 아직 설치되지 않았습니다. Setup 또는 설정 > Claw Code에서 설치한 뒤 다시 시도해 주세요.",
    };
  }

  const resolvedKey = getProviderApiKey("openai", apiKey);
  if (!resolvedKey) {
    return {
      type: "direct-answer",
      answer: locale === "en"
        ? "Claw Code needs an OpenAI API key. Add one in Settings > AI models or local-helper demo.env."
        : "Claw Code를 사용하려면 OpenAI API 키가 필요합니다. 설정 > AI models 또는 local-helper demo.env에 키를 추가해 주세요.",
    };
  }

  const workspaceRoot = resolveWorkspaceRoot(await loadState(), workspaceRootOverride);
  if (!workspaceRoot) {
    return {
      type: "direct-answer",
      answer: locale === "en"
        ? "Choose a workspace folder in Claw Code settings before asking for file edits."
        : "파일 수정을 요청하기 전에 Claw Code 설정에서 작업 폴더를 선택해 주세요.",
    };
  }

  const coding = profile?.prompt?.settings?.coding || {};
  const accessMode = coding.accessMode || "readOnly";
  const tools = buildClawTools(accessMode);
  const sessionId = `${Date.now()}`;
  const conversation = [
    {
      role: "system",
      content: [
        "You are MiVA Claw Code, a local coding agent.",
        `Workspace root: ${workspaceRoot}`,
        "Use tools to inspect or modify files inside the workspace only.",
        accessMode === "readOnly"
          ? "This session is read-only. Explain code and inspect files, but do not write files."
          : "You may create or update files when the user asks for implementation or fixes.",
        "When you finish, answer in the user's language with a concise summary of what you inspected or changed.",
        `User locale: ${locale}.`,
      ].join("\n"),
    },
    ...messages
      .filter((message) => message?.role === "user" || message?.role === "assistant")
      .slice(-6)
      .map((message) => ({
        role: message.role,
        content: String(message.content || ""),
      })),
    {
      role: "user",
      content: String(prompt || ""),
    },
  ];

  let finalAnswer = "";
  for (let step = 0; step < MAX_AGENT_STEPS; step += 1) {
    const message = await callOpenAiWithTools({
      apiKey: resolvedKey,
      model: OPENAI_DEFAULT_MODEL,
      messages: conversation,
      tools,
    });

    if (!message) {
      throw new Error("OpenAI returned an empty Claw Code response.");
    }

    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    if (!toolCalls.length) {
      finalAnswer = String(message.content || "").trim();
      break;
    }

    conversation.push(message);
    for (const toolCall of toolCalls) {
      const toolName = toolCall?.function?.name;
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolCall?.function?.arguments || "{}");
      } catch {
        parsedArgs = {};
      }

      const toolResult = await executeToolCall({
        workspaceRoot,
        accessMode,
        name: toolName,
        args: parsedArgs,
      });

      await appendSessionLog(sessionId, {
        at: new Date().toISOString(),
        tool: toolName,
        args: parsedArgs,
        ok: toolResult.ok,
      });

      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult.content,
      });
    }
  }

  if (!finalAnswer) {
    finalAnswer = locale === "en"
      ? "Claw Code finished tool execution but did not return a final summary."
      : "Claw Code가 도구 실행은 마쳤지만 최종 요약을 반환하지 못했습니다.";
  }

  return {
    type: "direct-answer",
    answer: finalAnswer,
    meta: {
      provider: "openai",
      model: OPENAI_DEFAULT_MODEL,
      workspaceRoot,
      sessionId,
    },
  };
}

export async function buildClawCodeAnswer(input) {
  return runClawCodeAgent(input);
}
