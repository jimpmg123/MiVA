import { flushSync } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { LocalAssistantProfile, MivaPromptLayerSettings, ProfileDetailsDraft, PromptSettings, UserProfile } from "../types";
import { Badge, IconTile, Input, Panel, PrimaryButton, ProgressBar, SecondaryButton, StatusAlert, Textarea } from "../components/ui";
import { defaultMivaPromptLayerSettings, defaultProfileDetails } from "../features/assistants/profile";
import { buildSystemPromptPreview } from "../features/assistants/promptPreview";
import { resolvePromptAssistantName } from "../features/assistants/promptIdentity";
import { loadUserProfile } from "../features/profile/storage";
import {
  finalizeStudioPrompt,
  generateStudioQuestions,
  saveStudioAssistantRecipe,
  type AssistantCategoryId,
  type AssistantRecipeDraft,
  type FinalizePromptResponse,
  type StudioAnswer,
  type StudioOption,
  type StudioQuestion,
} from "../features/studio/promptBuilder";

type PromptStudioPanelProps = {
  profile: LocalAssistantProfile;
  profileDetailsDraft: ProfileDetailsDraft;
  settings: PromptSettings;
  hasSavedPrompt: boolean;
  mivaDevModeOpen: boolean;
  mivaPromptLayers: MivaPromptLayerSettings;
  onMivaDevModeOpenChange: (open: boolean) => void;
  onMivaPromptLayersChange: (settings: MivaPromptLayerSettings) => void;
  onProfileDetailsChange: (draft: ProfileDetailsDraft | ((current: ProfileDetailsDraft) => ProfileDetailsDraft)) => void;
  onPromptSettingsChange: (updater: (current: PromptSettings) => PromptSettings) => void;
  onSaveLocal: (options?: { promptVariables?: Record<string, unknown> }) => Promise<unknown> | unknown;
};

type PromptBuilderStage = "starter" | "generated" | "preview" | "final" | "manage";
type LoadingAction = "questions" | "preview" | "refine" | "finalize" | "save";
type AnswerTarget = "starter" | "studio";

const STUDY = "Study & Learning";
const WRITING = "Writing & Communication";
const WORK = "Work & Productivity";
const CODING = "Coding & Developer Workflow";
const PLANNING = "Planning & Life";
const CREATIVE = "Creative & Ideas";
const FUN = "Fun & Companion";
const SOMETHING_ELSE = "Something else";

const assistantCategoryByStarterLabel = new Map<string, AssistantCategoryId>([
  [STUDY.toLowerCase(), "study"],
  [WRITING.toLowerCase(), "writing"],
  [WORK.toLowerCase(), "work"],
  [CODING.toLowerCase(), "coding"],
  [PLANNING.toLowerCase(), "planning"],
  [CREATIVE.toLowerCase(), "creative"],
  [FUN.toLowerCase(), "personal"],
]);

// Fixed first question. Category selection drives which follow-up questions appear next.
const categoryQuestion: StudioQuestion = {
  id: "assistant-kind",
  title: "What kind of assistant do you want to create?",
  description: "Choose the closest category. MIVA will use this to generate better setup questions.",
  type: "single_choice",
  options: [
    { id: "study", label: STUDY, value: STUDY },
    { id: "writing", label: WRITING, value: WRITING },
    { id: "work", label: WORK, value: WORK },
    { id: "coding", label: CODING, value: CODING },
    { id: "planning", label: PLANNING, value: PLANNING },
    { id: "creative", label: CREATIVE, value: CREATIVE },
    { id: "fun", label: FUN, value: FUN },
    { id: "custom", label: SOMETHING_ELSE, value: "", requiresText: true },
  ],
};

// Kept from the original survey. Always shown after the category-specific questions.
const briefQuestion: StudioQuestion = {
  id: "assistant-purpose",
  title: "Briefly describe what this assistant should help with.",
  description: "One or two sentences are enough. Keep it specific to the assistant you are building now.",
  type: "text",
  placeholder: "Example: Help me turn assignment requirements into a plan, checklist, and draft outline.",
};

// Builds a single-choice question whose final option is always a free-text "Something else".
function choiceQuestion(id: string, title: string, labels: string[]): StudioQuestion {
  return {
    id,
    title,
    type: "single_choice",
    options: [
      ...labels.map((label, index) => ({ id: `${id}-o${index + 1}`, label, value: label })),
      { id: `${id}-other`, label: SOMETHING_ELSE, value: "", requiresText: true },
    ],
  };
}

const categoryFollowups: Record<string, StudioQuestion[]> = {
  [STUDY]: [
    choiceQuestion("study-q1", "What should this study assistant mainly help with?", [
      "Summarizing class materials",
      "Explaining difficult concepts",
      "Solving homework or practice problems",
      "Preparing for exams",
    ]),
    choiceQuestion("study-q2", "What kind of material will you usually give this assistant?", [
      "Lecture notes",
      "Textbook sections",
      "Research papers",
      "Problem sets",
    ]),
    choiceQuestion("study-q3", "How should this assistant explain things?", [
      "Step-by-step",
      "Short and simple",
      "Detailed with examples",
      "Like a tutor asking questions",
    ]),
  ],
  [WRITING]: [
    choiceQuestion("writing-q1", "What kind of writing should this assistant help with?", [
      "Emails or messages",
      "Essays or academic writing",
      "Professional documents",
      "Translation or rewriting",
    ]),
    choiceQuestion("writing-q2", "What should the assistant focus on most?", [
      "Making writing clearer",
      "Making writing more natural",
      "Changing the tone",
      "Fixing grammar and structure",
    ]),
    choiceQuestion("writing-q3", "What tone should this assistant usually use?", [
      "Casual and friendly",
      "Polite and professional",
      "Academic",
      "Short and direct",
    ]),
  ],
  [WORK]: [
    choiceQuestion("work-q1", "What work task should this assistant mainly help with?", [
      "Organizing tasks",
      "Writing reports or documents",
      "Summarizing meetings or notes",
      "Planning projects",
    ]),
    choiceQuestion("work-q2", "What kind of output would be most useful?", [
      "Checklist",
      "Action plan",
      "Summary",
      "Table or structured format",
    ]),
    choiceQuestion("work-q3", "How should this assistant handle information?", [
      "Prioritize the most urgent tasks",
      "Break work into steps",
      "Keep everything concise",
      "Explain reasoning before recommendations",
    ]),
  ],
  [CODING]: [
    choiceQuestion("coding-q1", "What developer workflow should this assistant help with?", [
      "Turning rough ideas into Codex/Cursor-ready prompts",
      "Breaking features into implementation tasks",
      "Writing technical documentation",
      "Reviewing code or PRs",
    ]),
    choiceQuestion("coding-q2", "What should the assistant produce most often?", [
      "Implementation prompts",
      "Task breakdowns",
      "README or documentation drafts",
      "Architecture decision notes",
    ]),
    choiceQuestion("coding-q3", "How detailed should the assistant be?", [
      "Short task brief",
      "Step-by-step implementation plan",
      "Include acceptance criteria",
      "Include risks and edge cases",
    ]),
  ],
  [PLANNING]: [
    choiceQuestion("planning-q1", "What kind of planning should this assistant help with?", [
      "Travel planning",
      "Daily or weekly schedule",
      "Meal, fitness, or routine planning",
      "Shopping or comparison decisions",
    ]),
    choiceQuestion("planning-q2", "What should this assistant optimize for?", [
      "Saving time",
      "Saving money",
      "Reducing stress",
      "Making the plan realistic",
    ]),
    choiceQuestion("planning-q3", "What format should the assistant use?", [
      "Timeline",
      "Checklist",
      "Day-by-day plan",
      "Table format",
    ]),
  ],
  [CREATIVE]: [
    choiceQuestion("creative-q1", "What creative task should this assistant help with?", [
      "Brainstorming ideas",
      "Branding or naming",
      "Content planning",
      "Image or design prompt creation",
    ]),
    choiceQuestion("creative-q2", "What kind of style should the assistant aim for?", [
      "Minimal and modern",
      "Fun and playful",
      "Professional and polished",
      "Unique and experimental",
    ]),
    choiceQuestion("creative-q3", "How should the assistant develop ideas?", [
      "Give many quick options",
      "Explain the reasoning behind each idea",
      "Refine one idea deeply",
      "Compare multiple directions",
    ]),
  ],
  [FUN]: [
    choiceQuestion("fun-q1", "What kind of fun assistant do you want to create?", [
      "2D Live character chat",
      "Casual conversation companion",
      "Roleplay character",
      "Game-like assistant",
    ]),
    choiceQuestion("fun-q2", "How should this assistant interact with the user?", [
      "Short casual replies",
      "Character-style reactions",
      "Ask questions back often",
      "Use playful expressions",
    ]),
  ],
};

function buildStarterQuestions(category: string): StudioQuestion[] {
  return [categoryQuestion, ...(categoryFollowups[category] ?? []), briefQuestion];
}

function optionKey(question: StudioQuestion, option: StudioOption) {
  return option.requiresText ? `custom:${question.id}` : option.value || option.id;
}

function upsertAnswer(answers: StudioAnswer[], answer: StudioAnswer) {
  return [...answers.filter((item) => item.questionId !== answer.questionId), answer];
}

function getAnswerText(answer: StudioAnswer | undefined) {
  if (!answer) {
    return "";
  }

  if (Array.isArray(answer.answerLabel)) {
    return answer.answerLabel.filter(Boolean).join(", ");
  }

  return answer.answerLabel || answer.customText || "";
}

function getStarterCategoryFromAnswers(answers: StudioAnswer[]): AssistantCategoryId | null {
  const answer = answers.find((item) => item.questionId === "assistant-kind");
  const candidates = [
    typeof answer?.answerValue === "string" ? answer.answerValue : "",
    getAnswerText(answer),
  ];

  for (const candidate of candidates) {
    const category = assistantCategoryByStarterLabel.get(candidate.replace(/\s+/g, " ").trim().toLowerCase());
    if (category) {
      return category;
    }
  }

  return null;
}

function getStarterToneFromAnswers(answers: StudioAnswer[]) {
  return getAnswerText(answers.find((answer) => answer.questionId === "writing-q3"));
}

function isAnswerComplete(question: StudioQuestion, answer: StudioAnswer | undefined) {
  if (!answer) {
    return false;
  }

  if (question.type === "multi_choice") {
    return Array.isArray(answer.answerValue)
      && answer.answerValue.length > 0
      && Array.isArray(answer.answerLabel)
      && answer.answerLabel.every((label) => label.trim().length > 0);
  }

  return getAnswerText(answer).trim().length > 0;
}

function profileItems(profile: UserProfile) {
  return [
    ["Age group", profile.ageGroup],
    ["Status", profile.currentStatus],
    ["Education", profile.educationLevel],
    ["Field", profile.majorOrField || profile.jobSeekingField || profile.industryOrRole],
    ["Audience", profile.teachingAudience],
    ["Expertise", profile.expertiseLevel],
  ].filter((item): item is [string, string] => Boolean(item[1]));
}

function buildPromptSettingsFromRecipe(
  current: PromptSettings,
  recipe: AssistantRecipeDraft,
  finalSystemPrompt: string,
  starterAnswers: StudioAnswer[],
): PromptSettings {
  const avoidances = recipe.rules.find((rule) => /avoid|do not|never|must not/i.test(rule)) ?? current.simple.avoidances;
  const assistantKind = getAnswerText(starterAnswers.find((answer) => answer.questionId === "assistant-kind"));
  const assistantBrief = getAnswerText(starterAnswers.find((answer) => answer.questionId === "assistant-purpose"));
  const preferredTone = getStarterToneFromAnswers(starterAnswers);

  return {
    ...current,
    simple: {
      ...current.simple,
      assistantPurpose: assistantKind || recipe.purpose || current.simple.assistantPurpose,
      desiredTasks: assistantBrief || recipe.workflowSteps.join("\n") || current.simple.desiredTasks,
      preferredTone: preferredTone || recipe.rules.slice(0, 2).join(" ") || current.simple.preferredTone,
      avoidances,
    },
    persona: recipe.name ? `A custom assistant named ${recipe.name}.` : current.persona,
    roleGoal: recipe.purpose || current.roleGoal,
    responseRules: recipe.rules.length ? recipe.rules : current.responseRules,
    generatedFinalSystemPrompt: finalSystemPrompt,
  };
}

function sourceMessage(source?: "openai" | "fallback", fallbackReason?: string) {
  if (source === "openai") {
    return "Generated with OpenAI in English.";
  }

  if (source === "fallback") {
    return fallbackReason ? `Using English fallback output. ${fallbackReason}` : "Using English fallback output.";
  }

  return null;
}

function resolveProfileDescription(currentDescription: string, generatedDescription: string, fallbackDescription: string) {
  const current = currentDescription.trim();
  if (current && current !== defaultProfileDetails.description) {
    return current;
  }

  return generatedDescription.trim() || fallbackDescription.trim() || defaultProfileDetails.description;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function rewritePromptRulesInSystemPrompt(systemPrompt: string | undefined, rules: string[]) {
  const base = systemPrompt?.trim();
  const ruleBlock = rules.map((rule) => `- ${rule}`).join("\n");
  if (!base) {
    return ruleBlock ? `# Runtime fixes\n${ruleBlock}` : "";
  }

  if (!ruleBlock) {
    return base.replace(/\n\n# Runtime fixes\n(?:- .*(?:\n|$))+/i, "").trim();
  }

  const runtimeFixesPattern = /(^|\n)# Runtime fixes\n[\s\S]*?(?=\n# |\s*$)/i;
  if (runtimeFixesPattern.test(base)) {
    return base.replace(runtimeFixesPattern, `$1# Runtime fixes\n${ruleBlock}`).trim();
  }

  const styleRulesPattern = /(^|\n)# Style rules\n[\s\S]*?(?=\n# |\s*$)/i;
  if (styleRulesPattern.test(base)) {
    return base.replace(styleRulesPattern, `$1# Style rules\n${ruleBlock}`).trim();
  }

  return `${base}\n\n# Runtime fixes\n${ruleBlock}`;
}

function isLocalAssistantProfile(value: unknown): value is LocalAssistantProfile {
  return Boolean(
    value
      && typeof value === "object"
      && typeof (value as Partial<LocalAssistantProfile>).id === "string"
      && typeof (value as Partial<LocalAssistantProfile>).prompt === "object",
  );
}

export function PromptStudioPanel({
  profile,
  profileDetailsDraft,
  settings,
  hasSavedPrompt,
  mivaDevModeOpen,
  mivaPromptLayers,
  onMivaDevModeOpenChange,
  onMivaPromptLayersChange,
  onProfileDetailsChange,
  onPromptSettingsChange,
  onSaveLocal,
}: PromptStudioPanelProps) {
  const [savedUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [stage, setStage] = useState<PromptBuilderStage>(() => hasSavedPrompt ? "manage" : "starter");
  const [starterIndex, setStarterIndex] = useState(0);
  const [studioIndex, setStudioIndex] = useState(0);
  const [starterAnswers, setStarterAnswers] = useState<StudioAnswer[]>([]);
  const [studioAnswers, setStudioAnswers] = useState<StudioAnswer[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<StudioQuestion[]>([]);
  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});
  const [finalResult, setFinalResult] = useState<FinalizePromptResponse | null>(null);
  const [ruleDrafts, setRuleDrafts] = useState<string[]>(() => settings.responseRules.length ? settings.responseRules : [""]);
  const [mivaLayerDraft, setMivaLayerDraft] = useState<MivaPromptLayerSettings>(() => mivaPromptLayers);
  const [mivaLayerStatus, setMivaLayerStatus] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleProfileItems = useMemo(() => profileItems(savedUserProfile), [savedUserProfile]);
  const selectedCategory = useMemo(() => {
    const answer = starterAnswers.find((item) => item.questionId === "assistant-kind");
    return typeof answer?.answerValue === "string" ? answer.answerValue : "";
  }, [starterAnswers]);
  const starterQuestions = useMemo(() => buildStarterQuestions(selectedCategory), [selectedCategory]);
  const assistantPurpose = useMemo(() => {
    const kind = getAnswerText(starterAnswers.find((answer) => answer.questionId === "assistant-kind"));
    const purpose = getAnswerText(starterAnswers.find((answer) => answer.questionId === "assistant-purpose"));
    return [kind, purpose].filter(Boolean).join(" - ") || settings.simple.assistantPurpose;
  }, [settings.simple.assistantPurpose, starterAnswers]);
  const totalQuestionCount = starterQuestions.length + generatedQuestions.length;
  const progressTotal = Math.max(starterQuestions.length + 5, totalQuestionCount + 2);
  const progressStep = stage === "starter"
    ? starterIndex + 1
    : stage === "generated"
      ? starterQuestions.length + studioIndex + 1
      : stage === "manage"
        ? progressTotal
        : totalQuestionCount + 2;
  const progressValue = Math.min(100, Math.round((progressStep / progressTotal) * 100));
  const activeQuestion = stage === "starter"
    ? starterQuestions[starterIndex]
    : stage === "generated"
      ? generatedQuestions[studioIndex]
      : null;

  useEffect(() => {
    setMivaLayerDraft(mivaPromptLayers);
  }, [mivaPromptLayers]);

  const updateMivaLayerDraft = (field: keyof MivaPromptLayerSettings, value: string) => {
    setMivaLayerStatus(null);
    setMivaLayerDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveMivaLayerSettings = async () => {
    setLoadingAction("save");
    setErrorMessage(null);
    setMivaLayerStatus(null);

    try {
      flushSync(() => onMivaPromptLayersChange(mivaLayerDraft));
      await onSaveLocal();
      setMivaLayerStatus("MiVA dev mode settings saved for this assistant.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save MiVA dev mode settings.");
    } finally {
      setLoadingAction(null);
    }
  };

  const resetMivaLayerSettings = () => {
    setErrorMessage(null);
    setMivaLayerDraft(defaultMivaPromptLayerSettings);
    onMivaPromptLayersChange(defaultMivaPromptLayerSettings);
    setMivaLayerStatus("Default MiVA runtime prompt structure applied to this assistant draft. Save settings to keep it.");
  };

  const getAnswers = (target: AnswerTarget) => target === "starter" ? starterAnswers : studioAnswers;
  const setAnswers = (target: AnswerTarget, updater: (answers: StudioAnswer[]) => StudioAnswer[]) => {
    if (target === "starter") {
      setStarterAnswers(updater);
    } else {
      setStudioAnswers(updater);
    }
  };
  const currentAnswerFor = (question: StudioQuestion, target: AnswerTarget) => (
    getAnswers(target).find((answer) => answer.questionId === question.id)
  );
  const syncStarterAnswersToPromptSettings = (answers: StudioAnswer[]) => {
    const assistantKind = getAnswerText(answers.find((answer) => answer.questionId === "assistant-kind")).trim();
    const assistantBrief = getAnswerText(answers.find((answer) => answer.questionId === "assistant-purpose")).trim();
    const preferredTone = getStarterToneFromAnswers(answers).trim();
    if (!assistantKind && !assistantBrief && !preferredTone) {
      return;
    }

    onPromptSettingsChange((current) => {
      const nextSimple = {
        ...current.simple,
        assistantPurpose: assistantKind
          ? [assistantKind, assistantBrief].filter(Boolean).join(" - ")
          : current.simple.assistantPurpose,
        desiredTasks: assistantBrief || current.simple.desiredTasks,
        preferredTone: preferredTone || current.simple.preferredTone,
      };

      if (
        nextSimple.assistantPurpose === current.simple.assistantPurpose
        && nextSimple.desiredTasks === current.simple.desiredTasks
        && nextSimple.preferredTone === current.simple.preferredTone
      ) {
        return current;
      }

      return {
        ...current,
        simple: nextSimple,
      };
    });
  };
  const writeAnswer = (target: AnswerTarget, answer: StudioAnswer) => {
    setAnswers(target, (current) => {
      const nextAnswers = upsertAnswer(current, answer);
      if (target === "starter") {
        syncStarterAnswersToPromptSettings(nextAnswers);
      }
      return nextAnswers;
    });
  };
  const setGeneratedStatus = (source?: "openai" | "fallback", fallbackReason?: string) => {
    const message = sourceMessage(source, fallbackReason);
    if (message) {
      setStatusMessage(message);
    }
  };

  useEffect(() => {
    setRuleDrafts(settings.responseRules.length ? settings.responseRules : [""]);
  }, [settings.responseRules]);

  // When the category changes, drop answers that belong to a different category's follow-ups.
  useEffect(() => {
    const validIds = new Set(starterQuestions.map((question) => question.id));
    setStarterAnswers((current) => {
      const next = current.filter((answer) => validIds.has(answer.questionId));
      return next.length === current.length ? current : next;
    });
  }, [starterQuestions]);

  const handleTextAnswer = (question: StudioQuestion, target: AnswerTarget, value: string) => {
    setTextDrafts((current) => ({ ...current, [question.id]: value }));
    writeAnswer(target, {
      questionId: question.id,
      questionTitle: question.title,
      answerValue: value,
      answerLabel: value,
    });
  };

  const handleSingleOption = (question: StudioQuestion, target: AnswerTarget, option: StudioOption) => {
    const customText = option.requiresText ? customDrafts[question.id] ?? "" : "";
    writeAnswer(target, {
      questionId: question.id,
      questionTitle: question.title,
      answerValue: optionKey(question, option),
      answerLabel: option.requiresText ? customText : option.label,
      customText: option.requiresText ? customText : undefined,
    });
  };

  const handleMultiOption = (question: StudioQuestion, target: AnswerTarget, option: StudioOption) => {
    const key = optionKey(question, option);
    const customText = option.requiresText ? customDrafts[question.id] ?? "" : "";
    const currentAnswer = currentAnswerFor(question, target);
    const currentValues = Array.isArray(currentAnswer?.answerValue) ? currentAnswer.answerValue : [];
    const currentLabels = Array.isArray(currentAnswer?.answerLabel) ? currentAnswer.answerLabel : [];
    const existingIndex = currentValues.indexOf(key);
    const nextValues = existingIndex >= 0
      ? currentValues.filter((_, index) => index !== existingIndex)
      : [...currentValues, key];
    const nextLabels = existingIndex >= 0
      ? currentLabels.filter((_, index) => index !== existingIndex)
      : [...currentLabels, option.requiresText ? customText : option.label];

    writeAnswer(target, {
      questionId: question.id,
      questionTitle: question.title,
      answerValue: nextValues,
      answerLabel: nextLabels,
      customText: customText || undefined,
    });
  };

  const handleCustomText = (question: StudioQuestion, target: AnswerTarget, value: string) => {
    const customOption = question.options?.find((option) => option.requiresText);
    if (!customOption) {
      return;
    }

    setCustomDrafts((current) => ({ ...current, [question.id]: value }));
    const currentAnswer = currentAnswerFor(question, target);
    const key = optionKey(question, customOption);
    if (question.type === "single_choice" && currentAnswer?.answerValue === key) {
      writeAnswer(target, {
        questionId: question.id,
        questionTitle: question.title,
        answerValue: key,
        answerLabel: value,
        customText: value,
      });
    }

    if (question.type === "multi_choice" && Array.isArray(currentAnswer?.answerValue) && currentAnswer.answerValue.includes(key)) {
      const labels = Array.isArray(currentAnswer.answerLabel) ? currentAnswer.answerLabel : [];
      writeAnswer(target, {
        questionId: question.id,
        questionTitle: question.title,
        answerValue: currentAnswer.answerValue,
        answerLabel: currentAnswer.answerValue.map((item, index) => item === key ? value : labels[index] ?? item),
        customText: value,
      });
    }
  };

  const isOptionSelected = (question: StudioQuestion, target: AnswerTarget, option: StudioOption) => {
    const answer = currentAnswerFor(question, target);
    const key = optionKey(question, option);

    if (question.type === "multi_choice") {
      return Array.isArray(answer?.answerValue) && answer.answerValue.includes(key);
    }

    return answer?.answerValue === key;
  };

  const handleGenerateQuestions = async () => {
    setLoadingAction("questions");
    setErrorMessage(null);
    try {
      const result = await generateStudioQuestions({
        userProfile: savedUserProfile,
        assistantPurpose,
        starterAnswers,
        existingAnswers: studioAnswers,
      });
      setGeneratedQuestions(result.questions);
      setStudioAnswers([]);
      setStudioIndex(0);
      setStage("generated");
      setGeneratedStatus(result.source, result.fallbackReason);
    } catch (error) {
      setErrorMessage(`Could not generate Studio questions: ${errorText(error)}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFinalizePrompt = async () => {
    setLoadingAction("finalize");
    setErrorMessage(null);
    try {
      const result = await finalizeStudioPrompt({
        userProfile: savedUserProfile,
        assistantPurpose,
        starterAnswers,
        studioAnswers,
        finalPromptRules: [],
        latestPreview: null,
      });
      setFinalResult(result);
      setStage("final");
      setGeneratedStatus(result.source, result.fallbackReason);
    } catch (error) {
      setErrorMessage(`Could not finalize the prompt: ${errorText(error)}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveAssistant = async () => {
    if (!finalResult) {
      return;
    }

    const recipe = finalResult.assistantRecipe;
    const nextProfileDetails: ProfileDetailsDraft = {
      name: finalResult.assistantName || recipe.name || profileDetailsDraft.name,
      description: resolveProfileDescription(
        profileDetailsDraft.description,
        finalResult.assistantDescription,
        recipe.purpose,
      ),
    };
    const nextPromptSettings = buildPromptSettingsFromRecipe(settings, recipe, finalResult.finalSystemPrompt, starterAnswers);
    const assistantCategory = getStarterCategoryFromAnswers(starterAnswers) ?? finalResult.assistantCategory;

    setLoadingAction("save");
    setErrorMessage(null);
    try {
      flushSync(() => {
        onProfileDetailsChange(nextProfileDetails);
        onPromptSettingsChange(() => nextPromptSettings);
      });
      const promptVariables = {
        assistantCategory,
        assistantDescription: nextProfileDetails.description,
        starterAnswers,
        studioAnswers,
        assistantRecipe: recipe,
      };
      const savedProfile = await onSaveLocal({ promptVariables });
      const profileForCloud = isLocalAssistantProfile(savedProfile) ? savedProfile : profile;

      try {
        await saveStudioAssistantRecipe({
          profile: profileForCloud,
          assistantCategory,
          profileDetails: nextProfileDetails,
          promptSettings: nextPromptSettings,
          finalSystemPrompt: finalResult.finalSystemPrompt,
          assistantRecipe: recipe,
        });
        setStatusMessage("Saved locally and sent to the web assistant profile store.");
      } catch (cloudError) {
        setStatusMessage(`Saved locally. Web save was skipped or failed: ${errorText(cloudError)}`);
      }
      setStage("manage");
    } catch (error) {
      setErrorMessage(`Could not save this assistant: ${errorText(error)}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveManagedPrompt = async () => {
    const nextRules = ruleDrafts.map((rule) => rule.trim()).filter(Boolean);
    setLoadingAction("save");
    setErrorMessage(null);
    try {
      flushSync(() => {
        onPromptSettingsChange((current) => ({
          ...current,
          responseRules: nextRules,
          generatedFinalSystemPrompt: rewritePromptRulesInSystemPrompt(
            current.generatedFinalSystemPrompt || profile.prompt.systemPrompt,
            nextRules,
          ),
        }));
      });
      await onSaveLocal();
      setStatusMessage("Prompt rules saved.");
    } catch (error) {
      setErrorMessage(`Could not save prompt rules: ${errorText(error)}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const updateRuleDraft = (index: number, value: string) => {
    setRuleDrafts((current) => current.map((rule, ruleIndex) => ruleIndex === index ? value : rule));
  };

  const addRuleDraft = () => {
    setRuleDrafts((current) => [...current, ""]);
  };

  const removeRuleDraft = (index: number) => {
    setRuleDrafts((current) => current.filter((_, ruleIndex) => ruleIndex !== index));
  };

  const goBack = (target: AnswerTarget) => {
    if (target === "starter" && starterIndex > 0) {
      setStarterIndex((current) => current - 1);
      return;
    }

    if (target === "studio") {
      if (studioIndex > 0) {
        setStudioIndex((current) => current - 1);
      } else {
        setStage("starter");
        setStarterIndex(starterQuestions.length - 1);
      }
    }
  };

  const goNext = (question: StudioQuestion, target: AnswerTarget) => {
    if (!isAnswerComplete(question, currentAnswerFor(question, target))) {
      return;
    }

    if (target === "starter") {
      if (starterIndex < starterQuestions.length - 1) {
        setStarterIndex((current) => current + 1);
      } else {
        void handleGenerateQuestions();
      }
      return;
    }

    if (studioIndex < generatedQuestions.length - 1) {
      setStudioIndex((current) => current + 1);
    } else {
      void handleFinalizePrompt();
    }
  };

  const renderOption = (question: StudioQuestion, target: AnswerTarget, option: StudioOption) => {
    const selected = isOptionSelected(question, target, option);
    const customValue = customDrafts[question.id] ?? "";

    return (
      <div className="grid gap-2" key={option.id}>
        <button
          className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
            selected
              ? "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)] text-[var(--miva-primary)] ring-2 ring-[var(--miva-primary-soft)]"
              : "border-[var(--miva-border)] bg-[var(--miva-bg-soft)] text-[var(--miva-text)] hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]/40"
          }`}
          onClick={() => question.type === "multi_choice" ? handleMultiOption(question, target, option) : handleSingleOption(question, target, option)}
          type="button"
        >
          <span className="min-w-0 break-words">{option.label}</span>
          {selected ? (
            <span className="flex shrink-0 items-center gap-2">
              <Badge tone="action">Selected</Badge>
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </span>
          ) : null}
        </button>
        {selected && option.requiresText ? (
          <Input
            placeholder="Write your own answer in English."
            value={customValue}
            onChange={(event) => handleCustomText(question, target, event.target.value)}
          />
        ) : null}
      </div>
    );
  };

  const renderQuestion = (question: StudioQuestion, target: AnswerTarget, index: number, total: number) => {
    const answer = currentAnswerFor(question, target);
    const complete = isAnswerComplete(question, answer);
    const canGoBack = target === "starter" ? starterIndex > 0 : true;
    const nextLabel = target === "starter" && starterIndex === starterQuestions.length - 1
      ? "Generate AI Questions"
      : target === "studio" && studioIndex === generatedQuestions.length - 1
        ? "Finalize Assistant"
        : "Next";

    return (
      <Panel className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--miva-text-muted)]">Question {index + 1} of {total}</p>
          <Badge tone={target === "starter" ? "neutral" : "action"}>
            {target === "starter" ? "Starter" : "OpenAI generated"}
          </Badge>
        </div>
        <ProgressBar className="mt-4" size="sm" value={Math.round(((index + 1) / Math.max(total, 1)) * 100)} />

        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{question.id}</p>
          <h3 className="mt-2 font-heading text-[22px] font-bold leading-8 text-[var(--miva-text)]">{question.title}</h3>
          {question.description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">{question.description}</p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3">
          {question.type === "text" ? (
            <Textarea
              className="min-h-[132px] resize-none"
              placeholder={question.placeholder ?? "Write your answer in English."}
              value={textDrafts[question.id] ?? ""}
              onChange={(event) => handleTextAnswer(question, target, event.target.value)}
            />
          ) : (
            question.options?.map((option) => renderOption(question, target, option))
          )}
        </div>

        {question.reason ? (
          <StatusAlert className="mt-5" tone="neutral">{question.reason}</StatusAlert>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--miva-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <SecondaryButton disabled={!canGoBack || loadingAction !== null} onClick={() => goBack(target)}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back
          </SecondaryButton>
          <PrimaryButton disabled={!complete || loadingAction !== null} onClick={() => goNext(question, target)}>
            {loadingAction === "questions" || loadingAction === "finalize" ? "Working..." : nextLabel}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </PrimaryButton>
        </div>
      </Panel>
    );
  };

  const renderFinal = () => {
    if (!finalResult) {
      return null;
    }
    const visibleFinalPrompt = buildSystemPromptPreview(profile, {
      ...settings,
      generatedFinalSystemPrompt: finalResult.finalSystemPrompt,
    });

    return (
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Final prompt</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">{finalResult.assistantName}</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--miva-text-muted)]">
              This English system prompt will become the runtime prompt through the assistant profile settings.
            </p>
          </div>
          {finalResult.source === "openai" ? <Badge tone="success">openai</Badge> : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-[var(--miva-bg-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Purpose</p>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text)]">{finalResult.assistantRecipe.purpose}</p>
          </div>
          <div className="rounded-lg bg-[var(--miva-bg-soft)] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Target user</p>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text)]">{finalResult.assistantRecipe.targetUser}</p>
          </div>
        </div>

        <pre className="mt-6 max-h-[440px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--miva-text)] p-5 text-xs leading-6 text-[var(--miva-surface-muted)]">
          {visibleFinalPrompt}
        </pre>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--miva-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <SecondaryButton disabled={loadingAction !== null} onClick={() => {
            setStage("generated");
            setStudioIndex(Math.max(0, generatedQuestions.length - 1));
          }}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to questions
          </SecondaryButton>
          <PrimaryButton disabled={loadingAction !== null} onClick={() => void handleSaveAssistant()}>
            {loadingAction === "save" ? "Saving..." : "Save Assistant"}
            <span className="material-symbols-outlined text-[18px]">save</span>
          </PrimaryButton>
        </div>
      </Panel>
    );
  };

  const renderManage = () => {
    const visiblePromptPreview = buildSystemPromptPreview(profile, settings);
    const resolvedAssistantName = resolvePromptAssistantName(settings);

    return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Current prompt</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">Visible assistant prompt</h3>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--miva-text-muted)]">
              This shows the user-created assistant prompt. MiVA runtime, tool, safety, and rendering instructions are injected separately and hidden from this view.
            </p>
          </div>
          <SecondaryButton onClick={() => {
            setStage("starter");
            setStarterIndex(0);
            setGeneratedQuestions([]);
            setStudioAnswers([]);
            setFinalResult(null);
          }}>
            Rebuild from questions
          </SecondaryButton>
        </div>

        <div className="mt-6 grid gap-3 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Your name is</span>
            <Input
              placeholder={resolvedAssistantName}
              value={settings.assistantName}
              onChange={(event) => onPromptSettingsChange((current) => ({
                ...current,
                assistantName: event.target.value,
              }))}
            />
          </label>
          <div className="rounded-md bg-[var(--miva-surface)] px-3 py-2 text-xs font-semibold text-[var(--miva-text-muted)]">
            Current: {resolvedAssistantName}
          </div>
        </div>

        <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--miva-text)] p-5 text-xs leading-6 text-[var(--miva-surface-muted)]">
          {visiblePromptPreview}
        </pre>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Prompt rules</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Edit durable behavior rules here. Rules saved from Runtime /fix appear in this list.
            </p>
          </div>
          <SecondaryButton onClick={addRuleDraft}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add rule
          </SecondaryButton>
        </div>

        <div className="mt-6 grid gap-3">
          {ruleDrafts.map((rule, index) => (
            <div className="flex gap-2" key={`managed-rule-${index}`}>
              <Textarea
                className="min-h-[72px] resize-none"
                placeholder="Write a durable response rule in English."
                value={rule}
                onChange={(event) => updateRuleDraft(index, event.target.value)}
              />
              <SecondaryButton className="h-[72px] px-3" onClick={() => removeRuleDraft(index)}>
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </SecondaryButton>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end border-t border-[var(--miva-border)] pt-5">
          <PrimaryButton disabled={loadingAction !== null} onClick={() => void handleSaveManagedPrompt()}>
            {loadingAction === "save" ? "Saving..." : "Save prompt rules"}
            <span className="material-symbols-outlined text-[18px]">save</span>
          </PrimaryButton>
        </div>
      </Panel>
    </div>
    );
  };

  const renderMivaDevMode = () => (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <IconTile className="h-12 w-12">
              <span className="material-symbols-outlined text-[24px]">tune</span>
            </IconTile>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">MiVA dev mode</p>
              <h3 className="mt-2 font-heading text-[24px] font-bold leading-8 text-[var(--miva-text)]">MiVA detailed settings</h3>
              <p className="mt-2 max-w-[760px] text-sm leading-6 text-[var(--miva-text-muted)]">
                Every assistant starts with these defaults, then keeps its own editable copy. Use them for MiVA rendering rules and runtime capability contracts, not for this assistant's personality.
              </p>
            </div>
          </div>
          <Badge tone="action">This assistant</Badge>
        </div>

        <div className="mt-7 grid gap-7">
          <label className="grid gap-3">
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Default response surface</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--miva-text-muted)]">
                Tell models what MiVA can render: Markdown, headings, tables, code cards, images, and emphasis rules.
              </span>
            </span>
            <Textarea
              className="min-h-[260px] font-mono text-xs leading-5"
              value={mivaLayerDraft.responseSurfacePrompt}
              onChange={(event) => updateMivaLayerDraft("responseSurfacePrompt", event.target.value)}
            />
          </label>

          <label className="grid gap-3 border-t border-[var(--miva-border)] pt-7">
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Default capability prompt</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--miva-text-muted)]">
                Describe MiVA-specific tools and constraints: Workspace, coding, image, TTS, character, and imported skills.
              </span>
            </span>
            <Textarea
              className="min-h-[300px] font-mono text-xs leading-5"
              value={mivaLayerDraft.capabilityPrompt}
              onChange={(event) => updateMivaLayerDraft("capabilityPrompt", event.target.value)}
            />
          </label>
        </div>

        {mivaLayerStatus ? (
          <StatusAlert className="mt-6" tone="success">{mivaLayerStatus}</StatusAlert>
        ) : null}
        {errorMessage ? (
          <StatusAlert className="mt-3" tone="danger">{errorMessage}</StatusAlert>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--miva-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <SecondaryButton disabled={loadingAction !== null} onClick={() => onMivaDevModeOpenChange(false)}>
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Prompts
          </SecondaryButton>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SecondaryButton disabled={loadingAction !== null} onClick={resetMivaLayerSettings}>
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              Reset defaults
            </SecondaryButton>
            <PrimaryButton disabled={loadingAction !== null} onClick={() => void saveMivaLayerSettings()}>
              {loadingAction === "save" ? "Saving..." : "Save settings"}
              <span className="material-symbols-outlined text-[18px]">save</span>
            </PrimaryButton>
          </div>
        </div>
      </Panel>
    </div>
  );

  if (hasSavedPrompt && mivaDevModeOpen) {
    return renderMivaDevMode();
  }

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <IconTile className="h-12 w-12">
              <span className="material-symbols-outlined text-[24px]">psychology</span>
            </IconTile>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Prompt Studio</p>
              <h3 className="mt-2 font-heading text-[24px] font-bold leading-8 text-[var(--miva-text)]">Studio Assistant Builder</h3>
              <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--miva-text-muted)]">
                MIVA uses the saved initial profile as context, then asks assistant-specific questions in English.
              </p>
            </div>
          </div>
          <Badge tone="action">English prompt flow</Badge>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4 text-xs font-bold text-[var(--miva-text-soft)]">
            <span>{activeQuestion ? activeQuestion.title : stage === "manage" ? "Manage saved prompt" : "Finalize and save"}</span>
            <span>{progressValue}% Complete</span>
          </div>
          <ProgressBar className="mt-3" value={progressValue} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProfileItems.length ? (
            visibleProfileItems.map(([label, value]) => (
              <div className="rounded-lg bg-[var(--miva-bg-soft)] p-3" key={label}>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--miva-text)]">{value}</p>
              </div>
            ))
          ) : (
            <StatusAlert className="sm:col-span-2 xl:col-span-3" tone="warning">
              No saved initial profile was found. Studio can still continue, but generated questions will be less personalized.
            </StatusAlert>
          )}
        </div>
      </Panel>

      {statusMessage ? <StatusAlert tone="success">{statusMessage}</StatusAlert> : null}
      {errorMessage ? <StatusAlert tone="danger">{errorMessage}</StatusAlert> : null}

      {stage === "starter" && activeQuestion ? renderQuestion(activeQuestion, "starter", starterIndex, starterQuestions.length) : null}
      {stage === "generated" && activeQuestion ? renderQuestion(activeQuestion, "studio", studioIndex, generatedQuestions.length) : null}
      {stage === "final" ? renderFinal() : null}
      {stage === "manage" ? renderManage() : null}
    </div>
  );
}
