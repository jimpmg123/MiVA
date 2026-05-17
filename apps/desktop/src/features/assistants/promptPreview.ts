import type { LocalAssistantProfile, PromptSettings } from "../../types";
import {
  codingAccessModeCopy,
  codingCapabilityCopy,
  codingProviderPolicyCopy,
  scheduleModeCopy,
  workspacePolicyCopy,
} from "./profile";

export function buildSystemPromptPreview(
  profile: Pick<LocalAssistantProfile, "useCase" | "answerStyle" | "priority" | "languageUse" | "localMode" | "futureFeatures" | "provider" | "model">,
  promptSettings: PromptSettings,
) {
  const languageLine = "Use English for this development build. Other locale preferences are stored for later localization.";

  return [
    "You are MiVA, the user's personal AI assistant.",
    languageLine,
    "Be practical, concise, and direct. If unsure, say so instead of inventing facts.",
    "User-friendly prompt setup:",
    `- Assistant purpose: ${promptSettings.simple.assistantPurpose}`,
    `- User-requested work: ${promptSettings.simple.desiredTasks}`,
    `- Preferred tone: ${promptSettings.simple.preferredTone}`,
    `- Avoidances: ${promptSettings.simple.avoidances}`,
    "Tools for AI:",
    `- Google Workspace direct API context: ${promptSettings.toolConnections.googleWorkspace ? "on" : "off"}. When on, MiVA may use retrieved read-only context from Google Calendar, Gmail, Drive, Docs, or Sheets. It must only say an action is done after a connected tool confirms completion.`,
    `- Daiso CLI: ${promptSettings.toolConnections.daisoCli ? "on" : "off"}. When on, MiVA may prepare approved Daiso CLI workflows, but it must only run or report actions after the connected tool confirms completion.`,
    "Coding policy:",
    `- Capability: ${codingCapabilityCopy[promptSettings.coding.capability]}.`,
    `- Model policy: ${codingProviderPolicyCopy[promptSettings.coding.providerPolicy]}.`,
    `- Access mode: ${codingAccessModeCopy[promptSettings.coding.accessMode]}.`,
    `- Workspace allowlist required: ${promptSettings.coding.workspaceAllowlistRequired ? "yes" : "no"}.`,
    `- Local coding experimental: ${promptSettings.coding.localExperimental ? "yes" : "no"}.`,
    promptSettings.coding.providerPolicy === "cloudRequired"
      ? "- Code editing and Claw Code must use a cloud API model unless the user explicitly enables advanced local experimental mode."
      : "- Local models may be used only within the selected read-only or limited coding policy.",
    "Voice policy:",
    `- Voice workspace: ${promptSettings.voice.enabled ? "enabled" : "disabled"}.`,
    `- STT provider: ${promptSettings.voice.stt.enabled ? promptSettings.voice.stt.provider : "disabled"}; recording mode: ${promptSettings.voice.stt.recordingMode}; show transcripts: ${promptSettings.voice.runtime.showTranscripts ? "yes" : "no"}.`,
    `- TTS provider: ${promptSettings.voice.tts.enabled ? promptSettings.voice.tts.provider : "disabled"}; auto-speak: ${promptSettings.voice.tts.autoSpeak ? "yes" : "no"}.`,
    `Persona: ${promptSettings.persona}`,
    `Role goal: ${promptSettings.roleGoal}`,
    `Use case: ${profile.useCase ?? "daily"}.`,
    `Answer style: ${profile.answerStyle ?? "moderate"}.`,
    `Priority: ${profile.priority ?? "balanced"}.`,
    `Operation mode: ${profile.localMode ?? "hybrid"}.`,
    `Future interests: ${profile.futureFeatures.length ? profile.futureFeatures.join(", ") : "none"}.`,
    "Response rules:",
    ...promptSettings.responseRules.map((rule) => `- ${rule}`),
    `Schedule policy: ${scheduleModeCopy[promptSettings.scheduleRules.mode]}`,
    `Schedule timezone: ${promptSettings.scheduleRules.timezone}.`,
    `Schedule reminder preference: ${promptSettings.scheduleRules.reminderPreference}`,
    `Google Workspace policy: ${workspacePolicyCopy[promptSettings.workspaceRules.googleWorkspace]}.`,
    `Calendar policy: ${workspacePolicyCopy[promptSettings.workspaceRules.calendar]}. Gmail policy: ${workspacePolicyCopy[promptSettings.workspaceRules.gmail]}. Drive policy: ${workspacePolicyCopy[promptSettings.workspaceRules.drive]}.`,
    "Memory policy:",
    `- Explicit memory updates: ${promptSettings.summaryMemory.rollingSummary ? "enabled" : "disabled"}.`,
    `- Summary model policy: ${promptSettings.summaryMemory.modelPolicy}.`,
    `- Memory compaction budget: about ${promptSettings.summaryMemory.triggerTokenBudget} tokens.`,
    "Safety rules:",
    ...promptSettings.safetyRules.map((rule) => `- ${rule}`),
    `Active provider: ${profile.provider}. Active model: ${profile.model}.`,
  ].join("\n");
}
