import type { HardwareInfo, SurveyState } from "./types";

export function isSupportedGpuName(value?: string | null) {
  if (!value) {
    return false;
  }

  return !/parsec|virtual|remote|microsoft basic|basic display|displaylink|indirect display|mirror driver|spacedesk|radmin|nomachine|vmware|virtualbox|hyper-v/i.test(value);
}

export function formatGb(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} GB`;
}

export function formatBytes(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  return `${nextValue.toFixed(unitIndex >= 2 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatChatLatency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Latency: -";
  }

  if (value < 1000) {
    return `Latency: ${Math.round(value)} ms`;
  }

  return `Latency: ${(value / 1000).toFixed(1)} s`;
}

export function formatLogTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function recommendModel(survey: SurveyState, hardware: HardwareInfo | null) {
  const ram = hardware?.totalMemoryGb ?? 0;

  if (ram > 0 && ram < 8) {
    return "phi3:mini";
  }

  if (survey.priority === "speed" || survey.answerStyle === "short" || survey.useCase === "fast") {
    return ram >= 12 ? "llama3.2:3b" : "phi3:mini";
  }

  if (survey.priority === "quality" || survey.useCase === "study" || survey.useCase === "work") {
    return ram >= 12 ? "qwen3:4b" : "llama3.2:3b";
  }

  if (survey.languageUse === "english") {
    return ram >= 12 ? "gemma3:4b" : "llama3.2:3b";
  }

  if (survey.useCase === "character" || survey.useCase === "daily") {
    return ram >= 12 ? "qwen3:4b" : "llama3.2:3b";
  }

  return ram >= 12 ? "gemma3:4b" : "llama3.2:3b";
}

export function recommendCloudModel(survey: SurveyState) {
  if (survey.priority === "speed" || survey.useCase === "fast") {
    return "gemini-2.5-flash-lite";
  }

  if (survey.useCase === "work" || survey.useCase === "study" || survey.priority === "quality") {
    return "gemini-2.5-flash";
  }

  if (survey.futureFeatures.includes("googleWorkspace")) {
    return "gemini-2.5-flash";
  }

  return "gemini-2.5-flash";
}
