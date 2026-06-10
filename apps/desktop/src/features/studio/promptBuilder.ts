import type { LocalAssistantProfile, ProfileDetailsDraft, PromptSettings, UserProfile } from "../../types";
import { fetchCloudJson } from "../cloud/client";

export type AssistantCategoryId = "study" | "writing" | "work" | "coding" | "planning" | "creative" | "personal";

export type StudioOption = {
  id: string;
  label: string;
  value: string;
  requiresText?: boolean;
};

export type StudioQuestion = {
  id: string;
  slot?: string;
  title: string;
  description?: string;
  type: "single_choice" | "multi_choice" | "text";
  options?: StudioOption[];
  placeholder?: string;
  reason?: string;
};

export type StudioAnswer = {
  questionId: string;
  questionTitle: string;
  answerValue: string | string[];
  answerLabel: string | string[];
  customText?: string;
};

export type StudioPreview = {
  sampleUserMessage: string;
  sampleAssistantResponse: string;
  detectedResponseFormat: string[];
  draftPromptRules: string[];
  source?: "openai" | "fallback";
  fallbackReason?: string;
};

export type AssistantRecipeDraft = {
  name: string;
  purpose: string;
  targetUser: string;
  profileContext: string;
  workflowSteps: string[];
  responseFormat: string[];
  rules: string[];
  examples: Array<{
    userMessage: string;
    assistantResponse: string;
  }>;
  finalSystemPrompt: string;
};

type SourceMeta = {
  source?: "openai" | "fallback";
  fallbackReason?: string;
};

export type StudioQuestionsResponse = {
  questions: StudioQuestion[];
  detectedDomain?: string;
  coverage?: {
    filledSlots: string[];
    missingSlots: string[];
    isSufficient: boolean;
  };
} & SourceMeta;

export type StudioRulesResponse = {
  updatedPromptRules: string[];
  rulePatch: string[];
  changeSummary: string;
  shouldRegeneratePreview: boolean;
} & SourceMeta;

export type FinalizePromptResponse = {
  assistantName: string;
  assistantDescription: string;
  assistantCategory: AssistantCategoryId;
  assistantRecipe: AssistantRecipeDraft;
  finalSystemPrompt: string;
} & SourceMeta;

const jsonHeaders = { "content-type": "application/json" };

type GenerateStudioQuestionsInput = {
  userProfile: UserProfile;
  assistantPurpose: string;
  starterAnswers: StudioAnswer[];
  existingAnswers: StudioAnswer[];
};

function answerText(answers: StudioAnswer[], questionId: string) {
  const answer = answers.find((item) => item.questionId === questionId);
  if (!answer) {
    return "";
  }

  if (Array.isArray(answer.answerLabel)) {
    return answer.answerLabel.filter(Boolean).join(", ");
  }

  return answer.answerLabel || answer.customText || "";
}

function option(label: string, requiresText = false): StudioOption {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom",
    label,
    value: requiresText ? "" : label,
    requiresText,
  };
}

function inferFallbackDomain(input: GenerateStudioQuestionsInput) {
  const kind = answerText(input.starterAnswers, "assistant-kind").toLowerCase();
  const purpose = `${input.assistantPurpose} ${answerText(input.starterAnswers, "assistant-purpose")}`.toLowerCase();

  if (kind.includes("coding") || kind.includes("developer") || /\b(code|repo|debug|programming)\b/.test(purpose)) {
    return "coding";
  }
  if (kind.includes("fun") || kind.includes("companion") || /\b(companion|character|roleplay|live2d)\b/.test(purpose)) {
    return "companion";
  }
  if (kind.includes("study") || kind.includes("learning") || /\b(homework|assignment|study|exam|lecture)\b/.test(purpose)) {
    return "study";
  }
  if (kind.includes("planning") || /\b(travel|trip|itinerary|schedule|plan)\b/.test(purpose)) {
    return "planning";
  }

  return "generic";
}

function localFallbackQuestions(input: GenerateStudioQuestionsInput, fallbackReason: string): StudioQuestionsResponse {
  const domain = inferFallbackDomain(input);
  const coreQuestions: StudioQuestion[] = [
    {
      id: "immediate-task",
      slot: "immediate_task",
      title: "What are you trying to finish right now?",
      description: "Use a real task, document, plan, or problem. This becomes the first example for the assistant.",
      type: "text",
      placeholder: "Example: Turn my rough feature idea into a Codex-ready implementation prompt.",
    },
    {
      id: "repeat-pattern",
      slot: "repeat_pattern",
      title: "What similar work should this assistant handle again later?",
      description: "This turns today's task into a reusable workflow instead of a one-off answer.",
      type: "single_choice",
      options: [option("Same task with new input"), option("Same project over revisions"), option("Different topics with the same format"), option("One-off task only"), option("Something else...", true)],
    },
    {
      id: "quality-bar",
      slot: "quality_bar",
      title: "What makes the result good enough for you?",
      description: "Choose the standards the assistant should optimize for every time.",
      type: "multi_choice",
      options: [option("Accurate and source-aware"), option("Actionable next steps"), option("Concise but complete"), option("Includes risks and edge cases"), option("Ready to paste or use"), option("Something else...", true)],
    },
    {
      id: "fix-preferences",
      slot: "fix_preferences",
      title: "What do you usually have to fix in AI answers?",
      description: "These become durable anti-patterns in the assistant prompt.",
      type: "multi_choice",
      options: [option("Too vague"), option("Too long"), option("Misses constraints"), option("Assumes missing facts"), option("Wrong tone"), option("Not actionable enough"), option("Something else...", true)],
    },
  ];

  const domainQuestions: Record<string, StudioQuestion[]> = {
    coding: [
      {
        id: "agent-handoff",
        slot: "agent_handoff",
        title: "What should MiVA produce when another coding agent will do the implementation?",
        type: "single_choice",
        options: [option("Implementation prompt"), option("Bug investigation prompt"), option("Review checklist"), option("Test plan"), option("Task breakdown"), option("Something else...", true)],
      },
      {
        id: "stack-context",
        slot: "stack_context",
        title: "What stack or project context should it assume for repeated coding help?",
        type: "text",
        placeholder: "Example: React + Tauri desktop app, TypeScript, local-first assistant features.",
      },
    ],
    companion: [
      {
        id: "persona-voice",
        slot: "persona_voice",
        title: "How should this companion usually talk?",
        type: "single_choice",
        options: [option("Calm and gentle"), option("Bright and upbeat"), option("Playful and teasing"), option("Cool and reserved"), option("Direct but caring"), option("Something else...", true)],
      },
      {
        id: "mood-tag-policy",
        slot: "mood_tag_policy",
        title: "How expressive should the character's facial reactions be?",
        description: "MiVA can set one mood tag per reply and map it to available expressions.",
        type: "single_choice",
        options: [option("React with a mood on most replies"), option("Only when the emotion clearly changes"), option("Rarely, stay mostly neutral"), option("Only when I ask for a reaction"), option("Something else...", true)],
      },
    ],
    study: [
      {
        id: "material-type",
        slot: "material_type",
        title: "What kind of material should this assistant handle most often?",
        type: "single_choice",
        options: [option("Assignment instructions"), option("Lecture notes"), option("Research papers"), option("Problem sets"), option("Documentation"), option("Something else...", true)],
      },
      {
        id: "explanation-depth",
        slot: "explanation_depth",
        title: "How detailed should the assistant's explanations be?",
        type: "single_choice",
        options: [option("Short and simple"), option("Balanced"), option("Detailed with examples"), option("Step-by-step"), option("Something else...", true)],
      },
    ],
    planning: [
      {
        id: "planning-context",
        slot: "domain_priority",
        title: "What constraints should this planner care about most?",
        type: "multi_choice",
        options: [option("Budget"), option("Time"), option("People involved"), option("Realistic pacing"), option("Risk or backup options"), option("Something else...", true)],
      },
      {
        id: "planning-format",
        slot: "output_format",
        title: "What planning format should it usually use?",
        type: "single_choice",
        options: [option("Timeline"), option("Checklist"), option("Day-by-day plan"), option("Comparison table"), option("Something else...", true)],
      },
    ],
    generic: [
      {
        id: "output-format",
        slot: "output_format",
        title: "What response format should it usually use?",
        type: "single_choice",
        options: [option("Short sections"), option("Bullets"), option("Numbered steps"), option("Table when useful"), option("Checklist ending"), option("Something else...", true)],
      },
      {
        id: "workflow-pattern",
        slot: "workflow_pattern",
        title: "What workflow should this assistant handle from start to finish?",
        type: "single_choice",
        options: [option("Clarify then draft"), option("Draft first with assumptions"), option("Analyze then recommend"), option("Compare options"), option("Coach with feedback"), option("Something else...", true)],
      },
    ],
  };

  const questions = [...coreQuestions, ...(domainQuestions[domain] ?? domainQuestions.generic)].slice(0, 6);
  return {
    questions,
    detectedDomain: domain,
    coverage: {
      filledSlots: input.starterAnswers.map((answer) => answer.questionId),
      missingSlots: questions.map((question) => question.slot ?? question.id),
      isSufficient: false,
    },
    source: "fallback",
    fallbackReason,
  };
}

function fallbackReasonFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function generateStudioQuestions(input: GenerateStudioQuestionsInput) {
  try {
    return await fetchCloudJson<StudioQuestionsResponse>("/studio/generate-questions", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
  } catch (error) {
    return localFallbackQuestions(input, `Cloud question generation failed: ${fallbackReasonFromError(error)}`);
  }
}

export function generateStudioPreview(input: {
  userProfile: UserProfile;
  assistantPurpose: string;
  starterAnswers: StudioAnswer[];
  studioAnswers: StudioAnswer[];
  currentPromptRules: string[];
}) {
  return fetchCloudJson<StudioPreview>("/studio/generate-preview", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function refineStudioPromptRules(input: {
  userProfile: UserProfile;
  assistantPurpose: string;
  starterAnswers: StudioAnswer[];
  studioAnswers: StudioAnswer[];
  currentPromptRules: string[];
  sampleUserMessage: string;
  sampleAssistantResponse: string;
  userFeedback: string;
}) {
  return fetchCloudJson<StudioRulesResponse>("/studio/refine-rules", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function finalizeStudioPrompt(input: {
  userProfile: UserProfile;
  assistantPurpose: string;
  starterAnswers: StudioAnswer[];
  studioAnswers: StudioAnswer[];
  finalPromptRules: string[];
  latestPreview: StudioPreview | null;
}) {
  return fetchCloudJson<FinalizePromptResponse>("/studio/finalize-prompt", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
}

export function saveStudioAssistantRecipe(input: {
  profile: LocalAssistantProfile;
  assistantCategory: AssistantCategoryId;
  profileDetails: ProfileDetailsDraft;
  promptSettings: PromptSettings;
  finalSystemPrompt: string;
  assistantRecipe: AssistantRecipeDraft;
}) {
  return fetchCloudJson<{ profile?: { id?: string } }>("/assistant-profiles", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      id: input.profile.sync.cloudProfileId ?? input.profile.id,
      name: input.profileDetails.name || input.assistantRecipe.name,
      description: input.profileDetails.description || input.assistantRecipe.purpose,
      useCase: input.profile.useCase ?? "work",
      answerStyle: input.profile.answerStyle ?? "moderate",
      priority: input.profile.priority ?? "balanced",
      languageUse: "english",
      localMode: input.profile.localMode ?? "hybrid",
      provider: input.profile.provider,
      model: input.profile.model,
      futureFeatures: input.profile.futureFeatures,
      isDefault: input.profile.sync.cloudEnabled,
      source: "web-console",
      prompt: {
        ...input.profile.prompt,
        systemPrompt: input.finalSystemPrompt,
        settings: {
          ...input.promptSettings,
          generatedFinalSystemPrompt: input.finalSystemPrompt,
        },
        variables: {
          ...input.profile.prompt.variables,
          assistantCategory: input.assistantCategory,
          assistantRecipe: input.assistantRecipe,
        },
      },
      capabilities: input.profile.capabilities,
    }),
  });
}
