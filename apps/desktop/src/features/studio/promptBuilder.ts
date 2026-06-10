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

export function generateStudioQuestions(input: {
  userProfile: UserProfile;
  assistantPurpose: string;
  starterAnswers: StudioAnswer[];
  existingAnswers: StudioAnswer[];
}) {
  return fetchCloudJson<StudioQuestionsResponse>("/studio/generate-questions", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
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
