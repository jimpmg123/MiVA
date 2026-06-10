import type { LocalAssistantProfile, PromptSettings } from "../../types";
import { applyPromptAssistantName, applyPromptAssistantNameReferences, buildPromptAssistantIdentityLine } from "./promptIdentity";

export function buildSystemPromptPreview(
  _profile: Pick<LocalAssistantProfile, "useCase" | "answerStyle" | "priority" | "languageUse" | "localMode" | "futureFeatures" | "provider" | "model">,
  promptSettings: PromptSettings,
) {
  if (promptSettings.generatedFinalSystemPrompt?.trim()) {
    return applyPromptAssistantName(promptSettings.generatedFinalSystemPrompt, promptSettings);
  }

  const responseRules = promptSettings.responseRules.map((rule) => rule.trim()).filter(Boolean);

  return [
    buildPromptAssistantIdentityLine(promptSettings),
    "",
    "# Assistant purpose",
    promptSettings.simple.assistantPurpose || "(not set yet)",
    "",
    "# User-requested work",
    promptSettings.simple.desiredTasks || "(not set yet)",
    "",
    "# Preferred tone",
    promptSettings.simple.preferredTone || "(not set yet)",
    "",
    "# Avoidances",
    promptSettings.simple.avoidances || "(not set yet)",
    "",
    "# Role",
    `Role goal: ${promptSettings.roleGoal}`,
    ...(promptSettings.persona.trim() ? [`Persona: ${applyPromptAssistantNameReferences(promptSettings.persona, promptSettings)}`] : []),
    ...(responseRules.length ? [
      "",
      "# Runtime fixes",
      ...responseRules.map((rule) => `- ${rule}`),
    ] : []),
  ].join("\n");
}
