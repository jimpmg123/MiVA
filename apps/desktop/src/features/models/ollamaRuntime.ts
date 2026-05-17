import { invokeCommand } from "../../app/tauri";
import type { ChatMessage, HardwareInfo, LocalAssistantProfile, OllamaStatus, ProviderId, RuntimeRequirements } from "../../types";

export function getOllamaStatus() {
  return invokeCommand<OllamaStatus>("get_ollama_status");
}

export function installOllamaRuntime() {
  return invokeCommand<string>("install_ollama");
}

export function startOllamaRuntime() {
  return invokeCommand<string>("start_ollama");
}

export function pullOllamaModel(model: string) {
  return invokeCommand<string>("pull_model", { model });
}

export function getHardwareInfo() {
  return invokeCommand<HardwareInfo>("get_hardware_info");
}

export function getRuntimeRequirements() {
  return invokeCommand<RuntimeRequirements>("get_runtime_requirements");
}

export function getDefaultPythonInstallDir() {
  return invokeCommand<string>("get_default_python_install_dir");
}

export function installPythonRuntime(targetDir: string | null) {
  return invokeCommand<string>("install_python", { targetDir });
}

export function runChatOnce(input: {
  provider: ProviderId;
  model: string;
  prompt: string;
  locale: string;
  apiKey: string | null;
  authToken?: string | null;
  profile: LocalAssistantProfile;
  messages?: Pick<ChatMessage, "role" | "content">[];
  memorySummary?: string | null;
}) {
  return invokeCommand<string>("chat_once", input);
}
