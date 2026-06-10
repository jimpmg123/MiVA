import { Injectable } from "@nestjs/common";

type StudioOption = {
  id: string;
  label: string;
  value: string;
  requiresText?: boolean;
};

type StudioQuestion = {
  id: string;
  title: string;
  description?: string;
  type: "single_choice" | "multi_choice" | "text";
  options?: StudioOption[];
  placeholder?: string;
  reason?: string;
  slot?: string;
};

type StudioDomain = "companion" | "coding" | "travel" | "study" | "generic";
type AssistantCategoryId = "study" | "writing" | "work" | "coding" | "planning" | "creative" | "personal";

type StudioCoverage = {
  filledSlots: string[];
  missingSlots: string[];
  isSufficient: boolean;
};

type StudioSlotSpec = {
  slot: string;
  purpose: string;
  askFor: string;
  outputImpact: string;
  preferredType: "single_choice" | "multi_choice" | "text";
  exampleOptions?: string[];
};

type StudioQuestionsResult = {
  questions: StudioQuestion[];
  detectedDomain?: string;
  coverage?: StudioCoverage;
};

type StudioAnswer = {
  questionId: string;
  questionTitle: string;
  answerValue: string | string[];
  answerLabel: string | string[];
  customText?: string;
};

type UserProfile = {
  ageGroup?: string;
  currentStatus?: string;
  educationLevel?: string;
  majorOrField?: string;
  jobSeekingField?: string;
  industryOrRole?: string;
  teachingAudience?: string;
  householdContext?: string;
  expertiseLevel?: string;
  preferredLanguage?: string;
  profileSummary?: string;
};

type StudioPreview = {
  sampleUserMessage: string;
  sampleAssistantResponse: string;
  detectedResponseFormat: string[];
  draftPromptRules: string[];
};

type AssistantRecipeDraft = {
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

const assistantCategoryIds: AssistantCategoryId[] = ["study", "writing", "work", "coding", "planning", "creative", "personal"];
const assistantCategoryByStarterLabel = new Map<string, AssistantCategoryId>([
  ["study & learning", "study"],
  ["writing & communication", "writing"],
  ["work & productivity", "work"],
  ["coding & developer workflow", "coding"],
  ["planning & life", "planning"],
  ["creative & ideas", "creative"],
  ["fun & companion", "personal"],
]);

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return slug || `option-${Math.random().toString(36).slice(2, 8)}`;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.map((item) => asString(item)).filter(Boolean);
  return normalized.length ? normalized : fallback;
}

function normalizeCategoryText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeAssistantCategory(value: unknown): AssistantCategoryId | null {
  const normalized = normalizeCategoryText(asString(value));
  return assistantCategoryIds.includes(normalized as AssistantCategoryId)
    ? normalized as AssistantCategoryId
    : null;
}

function answerText(answer: StudioAnswer | undefined) {
  if (!answer) {
    return "";
  }

  if (Array.isArray(answer.answerLabel)) {
    return answer.answerLabel.filter(Boolean).join(", ");
  }

  return answer.answerLabel || answer.customText || "";
}

function categoryFromStarterAnswers(starterAnswers: StudioAnswer[]) {
  const answer = starterAnswers.find((item) => item.questionId === "assistant-kind");
  const label = normalizeCategoryText(answerText(answer));
  return assistantCategoryByStarterLabel.get(label) ?? null;
}

function inferAssistantCategory(input: {
  assistantPurpose: string;
  starterAnswers: StudioAnswer[];
  studioAnswers: StudioAnswer[];
  recipe?: Partial<AssistantRecipeDraft>;
}): AssistantCategoryId {
  const fixedCategory = categoryFromStarterAnswers(input.starterAnswers);
  if (fixedCategory) {
    return fixedCategory;
  }

  const haystack = normalizeCategoryText([
    input.assistantPurpose,
    ...input.starterAnswers.map(answerText),
    ...input.studioAnswers.map(answerText),
    input.recipe?.name,
    input.recipe?.purpose,
    input.recipe?.targetUser,
    input.recipe?.profileContext,
    ...(input.recipe?.workflowSteps ?? []),
    ...(input.recipe?.responseFormat ?? []),
    ...(input.recipe?.rules ?? []),
  ].filter(Boolean).join(" "));

  const score = (keywords: string[]) => keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
  const scores: Array<[AssistantCategoryId, number]> = [
    ["study", score(["study", "learn", "learning", "school", "class", "lecture", "homework", "assignment", "exam", "tutor", "math", "problem set"])],
    ["writing", score(["write", "writing", "content", "copy", "blog", "email", "essay", "rewrite", "grammar", "translation", "document"])],
    ["work", score(["work", "project", "meeting", "productivity", "manager", "report", "business", "task", "client"])],
    ["coding", score(["code", "coding", "debug", "developer", "python", "react", "api", "repository", "programming", "implementation", "pr review"])],
    ["planning", score(["plan", "planning", "research", "travel", "schedule", "itinerary", "organize", "compare", "budget"])],
    ["creative", score(["creative", "idea", "story", "brainstorm", "branding", "naming", "design", "art", "image prompt"])],
    ["personal", score(["daily", "personal", "life", "habit", "health", "coach", "companion", "routine", "casual", "roleplay", "game-like"])],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0]?.[1] ? scores[0][0] : "personal";
}

function normalizeAnswer(value: unknown): StudioAnswer | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<StudioAnswer>;
  const questionId = asString(source.questionId);
  const questionTitle = asString(source.questionTitle);
  const answerValue = Array.isArray(source.answerValue)
    ? source.answerValue.map((item) => asString(item)).filter(Boolean)
    : asString(source.answerValue);
  const answerLabel = Array.isArray(source.answerLabel)
    ? source.answerLabel.map((item) => asString(item)).filter(Boolean)
    : asString(source.answerLabel);

  if (!questionId || !questionTitle) {
    return null;
  }

  return {
    questionId,
    questionTitle,
    answerValue,
    answerLabel,
    customText: asString(source.customText) || undefined,
  };
}

function normalizeAnswers(value: unknown): StudioAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeAnswer).filter((item): item is StudioAnswer => Boolean(item));
}

function normalizeUserProfile(value: unknown): UserProfile {
  const source = value && typeof value === "object" ? value as UserProfile : {};
  return {
    ageGroup: asString(source.ageGroup),
    currentStatus: asString(source.currentStatus),
    educationLevel: asString(source.educationLevel),
    majorOrField: asString(source.majorOrField),
    jobSeekingField: asString(source.jobSeekingField),
    industryOrRole: asString(source.industryOrRole),
    teachingAudience: asString(source.teachingAudience),
    householdContext: asString(source.householdContext),
    expertiseLevel: asString(source.expertiseLevel),
    preferredLanguage: asString(source.preferredLanguage),
    profileSummary: asString(source.profileSummary),
  };
}

function option(label: string, requiresText = false): StudioOption {
  return {
    id: requiresText ? "custom" : slugify(label),
    label,
    value: requiresText ? "" : label,
    requiresText: requiresText || undefined,
  };
}

function normalizeQuestion(value: unknown, fallbackId: string): StudioQuestion | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<StudioQuestion>;
  const type = source.type === "multi_choice" || source.type === "text" ? source.type : "single_choice";
  const title = asString(source.title);
  if (!title) {
    return null;
  }

  const options = Array.isArray(source.options)
    ? source.options.flatMap((item, index) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        const optionSource = item as Partial<StudioOption>;
        const label = asString(optionSource.label);
        if (!label) {
          return [];
        }

        return [{
          id: asString(optionSource.id, slugify(label || `option-${index}`)),
          label,
          value: asString(optionSource.value, label),
          requiresText: optionSource.requiresText === true || undefined,
        }];
      })
    : [];

  const hasCustom = options.some((item) => item.requiresText || item.label.toLowerCase().includes("something else"));
  const normalizedOptions = type === "text"
    ? undefined
    : hasCustom
      ? options
      : [...options, option("Something else...", true)];

  if (type !== "text" && (!normalizedOptions || normalizedOptions.length < 2)) {
    return null;
  }

  return {
    id: asString(source.id, fallbackId),
    title,
    description: asString(source.description) || undefined,
    type,
    options: normalizedOptions,
    placeholder: asString(source.placeholder) || undefined,
    reason: asString(source.reason) || undefined,
    slot: asString((source as { slot?: unknown }).slot) || undefined,
  };
}

function normalizeCoverage(value: unknown): StudioCoverage | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const source = value as Partial<StudioCoverage>;
  return {
    filledSlots: asStringArray(source.filledSlots, []),
    missingSlots: asStringArray(source.missingSlots, []),
    isSufficient: source.isSufficient === true,
  };
}

function normalizeQuestionsPayload(value: unknown): StudioQuestionsResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as { questions?: unknown; coverage?: unknown; detectedDomain?: unknown };
  const questions = Array.isArray(source.questions)
    ? source.questions
        .map((item, index) => normalizeQuestion(item, `q${index + 1}`))
        .filter((item): item is StudioQuestion => Boolean(item))
        .filter((item) => !isGenericBoundaryQuestion(item))
        .filter((item) => !isCapabilityViolatingQuestion(item))
    : [];

  if (!questions.length) {
    return null;
  }

  return {
    questions: questions.slice(0, 6),
    detectedDomain: asString(source.detectedDomain) || undefined,
    coverage: normalizeCoverage(source.coverage),
  };
}

function isGenericBoundaryQuestion(question: StudioQuestion) {
  const title = question.title.toLowerCase();
  const optionText = (question.options ?? []).map((item) => item.label.toLowerCase()).join(" ");
  const genericBoundaryTitle = title.includes("avoid discussing")
    || title.includes("topics should")
    || title.includes("boundaries")
    || title.includes("off-limits");
  const genericBoundaryOptions = ["politics", "religion", "controversial", "personal advice"]
    .filter((keyword) => optionText.includes(keyword)).length >= 2;

  return genericBoundaryTitle && genericBoundaryOptions;
}

// Hard guardrail: drop any question that implies a capability MiVA does not have,
// even if the model ignores the system-prompt contract. This is the enforcement
// half of the "prompt persuades + normalizer enforces" dual defense.
const CAPABILITY_VIOLATION_PATTERNS: RegExp[] = [
  /(edit|modify|change)\s+(the\s+)?(repo|repository|codebase)/,
  /(directly\s+)?(edit|modify|write)\s+(source\s+code|source\s+files|code\s+files)/,
  /(run|execute)\s+(a\s+)?(terminal|shell|command\s*line|cli)\b/,
  /(run|execute)\s+(commands?|scripts?)\b/,
  /(auto(?:matic(?:ally)?)?|autonomous(?:ly)?)[^.]*\b(pr|pull\s*request|commit|push|deploy)\b/,
  /\b(create|open|generate)\b[^.]*\b(pull\s*request|pr)\b/,
  /(custom|semantic|new)\s+(motion|animation)/,
  /(trigger|call|invoke)\b[^.]*\b(motion|animation)\b/,
  /motion\s+(api|trigger)/,
];

function isCapabilityViolatingQuestion(question: StudioQuestion) {
  const haystack = [
    question.title,
    question.description ?? "",
    ...(question.options ?? []).map((item) => item.label),
  ].join(" ").toLowerCase();

  return CAPABILITY_VIOLATION_PATTERNS.some((pattern) => pattern.test(haystack));
}

function isRuntimeCodePromptText(value: string) {
  const normalized = value.trim().replace(/^[-*]\s*/, "");
  return /code-related answers?.*fenced code blocks?/i.test(normalized)
    || /fenced code blocks?.*language labels?.*copyable.*code/i.test(normalized)
    || /non-trivial code snippets?.*fenced code blocks?/i.test(normalized)
    || /\b(repo|repository|codebase|source code|source files|terminal|shell commands?|commits?|pull requests?|coding-agent|coding agents?)\b/i.test(normalized);
}

function stripRuntimeCodePromptItems(values: string[]) {
  return values.filter((value) => !isRuntimeCodePromptText(value));
}

function stripRuntimeCodePromptText(value: string) {
  return value
    .split("\n")
    .filter((line) => !isRuntimeCodePromptText(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function oneLineDescription(value: string, fallback: string) {
  const text = (value || fallback)
    .replace(/[#*_`>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return fallback;
  }

  return text.length > 150 ? `${text.slice(0, 147).trim()}...` : text;
}

function normalizePreviewPayload(value: unknown): StudioPreview | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<StudioPreview> & {
    userMessage?: unknown;
    sampleInput?: unknown;
    assistantResponse?: unknown;
    sampleOutput?: unknown;
    responseFormat?: unknown;
    formats?: unknown;
    promptRules?: unknown;
    rules?: unknown;
  };
  const sampleUserMessage = asString(source.sampleUserMessage)
    || asString(source.userMessage)
    || asString(source.sampleInput);
  const sampleAssistantResponse = asString(source.sampleAssistantResponse)
    || asString(source.assistantResponse)
    || asString(source.sampleOutput);
  const detectedResponseFormat = stripRuntimeCodePromptItems(asStringArray(
    source.detectedResponseFormat ?? source.responseFormat ?? source.formats,
    ["Markdown", "Structured response"],
  ));
  const draftPromptRules = stripRuntimeCodePromptItems(asStringArray(
    source.draftPromptRules ?? source.promptRules ?? source.rules,
    [
      "Start with the most useful answer.",
      "Use clear Markdown sections when the answer has multiple parts.",
      "Ask for missing context before making strong assumptions.",
    ],
  ));

  if (!sampleUserMessage || !sampleAssistantResponse) {
    return null;
  }

  return {
    sampleUserMessage,
    sampleAssistantResponse,
    detectedResponseFormat,
    draftPromptRules,
  };
}

function normalizeRulesPayload(value: unknown): {
  updatedPromptRules: string[];
  rulePatch: string[];
  changeSummary: string;
  shouldRegeneratePreview: boolean;
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as {
    updatedPromptRules?: unknown;
    rulePatch?: unknown;
    changeSummary?: unknown;
    shouldRegeneratePreview?: unknown;
  };
  const updatedPromptRules = stripRuntimeCodePromptItems(asStringArray(source.updatedPromptRules, []));
  const rulePatch = stripRuntimeCodePromptItems(asStringArray(source.rulePatch, []));
  const changeSummary = asString(source.changeSummary);

  if (updatedPromptRules.length === 0 || rulePatch.length === 0 || !changeSummary) {
    return null;
  }

  return {
    updatedPromptRules,
    rulePatch,
    changeSummary,
    shouldRegeneratePreview: source.shouldRegeneratePreview !== false,
  };
}

const finalPromptSectionNames = [
  "Role",
  "Target user",
  "Main purpose",
  "Workflow",
  "Response format",
  "Style rules",
  "Constraints",
  "Examples",
  "Uncertainty behavior",
  "Revision behavior",
];

function hasFinalPromptSections(prompt: string) {
  return finalPromptSectionNames.every((section) => (
    new RegExp(`(^|\\n)#{0,3}\\s*${section}\\b`, "i").test(prompt)
  ));
}

function bulletLines(values: string[], fallback: string[]) {
  const source = values.length ? values : fallback;
  return source.map((value) => `- ${value}`);
}

function ensureSectionedFinalPrompt(prompt: string, recipe: AssistantRecipeDraft) {
  if (hasFinalPromptSections(prompt)) {
    return prompt;
  }

  const examples = recipe.examples.length
    ? recipe.examples
    : [{ userMessage: "Help me with this task.", assistantResponse: "I will clarify the goal, structure the work, and provide the next useful action." }];

  return [
    "# Role",
    prompt || `You are ${recipe.name || "a custom MIVA assistant"}.`,
    "",
    "# Target user",
    recipe.targetUser || recipe.profileContext || "The user who created this assistant in MIVA Studio.",
    "",
    "# Main purpose",
    recipe.purpose || "Help the user complete the configured assistant workflow.",
    "",
    "# Workflow",
    ...bulletLines(recipe.workflowSteps, [
      "Understand the user's immediate request.",
      "Identify missing context before making assumptions.",
      "Produce a structured answer in the saved response format.",
      "Offer a concise next action or revision path.",
    ]),
    "",
    "# Response format",
    ...bulletLines(recipe.responseFormat, [
      "Use Markdown.",
      "Use clear sections.",
      "Use bullets or numbered steps when useful.",
    ]),
    "",
    "# Style rules",
    ...bulletLines(recipe.rules, ["Start with the most useful answer.", "Keep assumptions explicit.", "Ask a concise clarification when critical context is missing."]),
    "",
    "# Constraints",
    "- Do not invent unsupported facts.",
    "- Do not ask for sensitive personal identifiers.",
    "- Keep generated Studio setup output in English unless the user explicitly requests another language.",
    "",
    "# Examples",
    ...examples.flatMap((example) => [
      `User: ${example.userMessage}`,
      `Assistant: ${example.assistantResponse}`,
      "",
    ]),
    "# Uncertainty behavior",
    "- State uncertainty clearly and ask for the smallest missing detail needed.",
    "",
    "# Revision behavior",
    "- When the user gives feedback, convert it into durable behavior rules instead of treating it as a one-off instruction.",
  ].join("\n").trim();
}

function normalizeFinalizePayload(
  value: unknown,
  categoryContext?: {
    assistantPurpose: string;
    starterAnswers: StudioAnswer[];
    studioAnswers: StudioAnswer[];
  },
): {
  assistantName: string;
  assistantDescription: string;
  assistantCategory: AssistantCategoryId;
  assistantRecipe: AssistantRecipeDraft;
  finalSystemPrompt: string;
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as {
    assistantName?: unknown;
    assistantDescription?: unknown;
    assistantCategory?: unknown;
    assistantRecipe?: unknown;
    finalSystemPrompt?: unknown;
  };
  const recipeSource = source.assistantRecipe && typeof source.assistantRecipe === "object"
    ? source.assistantRecipe as Partial<AssistantRecipeDraft>
    : {};
  const assistantName = asString(source.assistantName) || asString(recipeSource.name);
  let finalSystemPrompt = asString(source.finalSystemPrompt) || asString(recipeSource.finalSystemPrompt);

  if (!assistantName || !finalSystemPrompt) {
    return null;
  }

  const assistantRecipe: AssistantRecipeDraft = {
    name: assistantName,
    purpose: asString(recipeSource.purpose),
    targetUser: asString(recipeSource.targetUser),
    profileContext: asString(recipeSource.profileContext),
    workflowSteps: asStringArray(recipeSource.workflowSteps, []),
    responseFormat: stripRuntimeCodePromptItems(asStringArray(recipeSource.responseFormat, [])),
    rules: stripRuntimeCodePromptItems(asStringArray(recipeSource.rules, [])),
    examples: Array.isArray(recipeSource.examples)
      ? recipeSource.examples.flatMap((item) => {
          if (!item || typeof item !== "object") {
            return [];
          }
          const example = item as { userMessage?: unknown; assistantResponse?: unknown };
          const userMessage = asString(example.userMessage);
          const assistantResponse = asString(example.assistantResponse);
          return userMessage && assistantResponse ? [{ userMessage, assistantResponse }] : [];
        })
      : [],
    finalSystemPrompt,
  };
  finalSystemPrompt = ensureSectionedFinalPrompt(stripRuntimeCodePromptText(finalSystemPrompt), assistantRecipe);
  assistantRecipe.finalSystemPrompt = finalSystemPrompt;
  const fixedCategory = categoryFromStarterAnswers(categoryContext?.starterAnswers ?? []);
  const assistantCategory = fixedCategory
    ?? normalizeAssistantCategory(source.assistantCategory)
    ?? inferAssistantCategory({
      assistantPurpose: categoryContext?.assistantPurpose ?? "",
      starterAnswers: categoryContext?.starterAnswers ?? [],
      studioAnswers: categoryContext?.studioAnswers ?? [],
      recipe: assistantRecipe,
    });
  const assistantDescription = oneLineDescription(
    asString(source.assistantDescription),
    assistantRecipe.purpose || categoryContext?.assistantPurpose || `${assistantName} assistant`,
  );

  return {
    assistantName,
    assistantDescription,
    assistantCategory,
    assistantRecipe,
    finalSystemPrompt,
  };
}

function buildProfileContext(profile: UserProfile) {
  return profile.profileSummary
    || [
      profile.ageGroup && `Age group: ${profile.ageGroup}`,
      profile.currentStatus && `Current status: ${profile.currentStatus}`,
      profile.educationLevel && `Education: ${profile.educationLevel}`,
      profile.majorOrField && `Field: ${profile.majorOrField}`,
      profile.jobSeekingField && `Job-seeking field: ${profile.jobSeekingField}`,
      profile.industryOrRole && `Industry or role: ${profile.industryOrRole}`,
      profile.teachingAudience && `Teaching audience: ${profile.teachingAudience}`,
      profile.householdContext && `Household context: ${profile.householdContext}`,
      profile.expertiseLevel && `Expertise: ${profile.expertiseLevel}`,
      profile.preferredLanguage && `Preferred language: ${profile.preferredLanguage}`,
    ].filter(Boolean).join("; ")
    || "No saved profile context is available.";
}

function summarizeAnswers(answers: StudioAnswer[]) {
  if (answers.length === 0) {
    return "No answers yet.";
  }

  return answers.map((answer) => {
    const label = Array.isArray(answer.answerLabel) ? answer.answerLabel.join(", ") : answer.answerLabel;
    return `- ${answer.questionTitle}: ${label}`;
  }).join("\n");
}

// Authoritative MiVA capability contract. Server-owned static constant, injected
// into the question-planner system prompt on every call (cheap: identical prefix,
// prompt-cached). The model must never generate questions that assume a "cannot".
const MIVA_CAPABILITIES = [
  "MIVA CAPABILITIES (authoritative contract; never generate a question that assumes a capability marked 'cannot'):",
  "- Product goal: MIVA Studio turns the user's current concrete task into a reusable assistant recipe for similar future work. It is not a generic chatbot personality survey.",
  "- Local-first reality: local models may be weaker than cloud models, so generated prompts must be explicit, structured, repeatable, and grounded in the user's quality bar.",
  "- Platform: MIVA is a local/cloud personal assistant. It stores an assistant profile, prompt settings, durable prompt rules, and memory settings.",
  "- Memory: long-term facts are user-pinned via 'remember this'; long chats are compacted into a rolling summary; on conflict the latest user message wins. Do not assume external databases, file indexing, or persistent tools beyond this.",
  "- Live2D character: facial expressions are limited to the selected model bundle. The assistant sets at most ONE expression per reply via a mood tag (neutral, happy, angry, sad, surprised, shy, playful). Motions are limited to Idle / Thinking / Speaking driven by playback state.",
  "  cannot: trigger custom or semantic motions, define new motions/animations outside the model bundle, run timers, or cycle expressions on a schedule.",
  "- Coding: MIVA can explain code, review design, break work into tasks, and draft prompts for external coding agents (e.g. Codex/Cursor).",
  "  cannot: directly edit repository files, run terminal/shell commands, create commits or pull requests, or make autonomous code changes (unless a separate coding-agent integration is connected).",
  "- Question UX: prefer concrete choice buttons; keep all question text UI-facing in English; 4 to 6 questions while required recipe slots remain.",
].join("\n");

const CORE_RECIPE_SLOTS = ["immediate_task", "repeat_pattern", "quality_bar", "fix_preferences"];

// Slot catalog is server authority. Each domain lists the setup slots that shape
// the final system prompt. starter questions already cover some; OpenAI only fills
// the remaining (target) slots.
const DOMAIN_SLOT_CATALOG: Record<StudioDomain, { required: string[]; optional: string[]; domainSpecific: string[] }> = {
  generic: {
    required: [...CORE_RECIPE_SLOTS, "workflow_pattern", "output_format", "missing_info_policy"],
    optional: ["example_inputs", "memory_style"],
    domainSpecific: ["tone_strictness"],
  },
  coding: {
    required: [...CORE_RECIPE_SLOTS, "workflow_mode", "answer_structure", "coding_boundary"],
    optional: ["uncertainty", "memory_style"],
    domainSpecific: ["stack_context", "agent_handoff", "review_depth"],
  },
  companion: {
    required: [...CORE_RECIPE_SLOTS, "persona_voice", "mood_tag_policy", "session_depth"],
    optional: ["memory_style", "boundary"],
    domainSpecific: ["character_constraint", "reaction_style", "relationship_mode"],
  },
  travel: {
    required: [...CORE_RECIPE_SLOTS, "domain_priority", "output_format", "missing_info_policy"],
    optional: ["budget_handling", "memory_style"],
    domainSpecific: ["destination_context", "itinerary_granularity", "transit_style"],
  },
  study: {
    required: [...CORE_RECIPE_SLOTS, "material_type", "explanation_depth", "output_format"],
    optional: ["example_inputs", "memory_style"],
    domainSpecific: ["practice_style", "feedback_style"],
  },
};

const SLOT_SPEC_CATALOG: Record<string, StudioSlotSpec> = {
  immediate_task: {
    slot: "immediate_task",
    purpose: "Capture the concrete job the user wants help with right now.",
    askFor: "A real current task, file, deliverable, plan, or problem, not a broad assistant category.",
    outputImpact: "Becomes the first realistic example and grounds the assistant recipe.",
    preferredType: "text",
  },
  repeat_pattern: {
    slot: "repeat_pattern",
    purpose: "Generalize the current task into a future recurring workflow.",
    askFor: "What similar work the user expects to repeat later.",
    outputImpact: "Defines the reusable workflow rather than overfitting to one task.",
    preferredType: "single_choice",
    exampleOptions: ["Same task with new input", "Same project over revisions", "Different topics with the same format", "One-off task only"],
  },
  quality_bar: {
    slot: "quality_bar",
    purpose: "Learn what makes an answer feel acceptable to this user.",
    askFor: "The user's success criteria, level of detail, proof standard, or preferred final shape.",
    outputImpact: "Turns subjective taste into durable prompt rules.",
    preferredType: "multi_choice",
    exampleOptions: ["Accurate and source-aware", "Actionable next steps", "Concise but complete", "Includes risks and edge cases", "Ready to paste or use"],
  },
  fix_preferences: {
    slot: "fix_preferences",
    purpose: "Learn what the user usually fixes after an AI answer.",
    askFor: "Common failure modes the assistant should avoid from the beginning.",
    outputImpact: "Defines revision behavior and durable anti-pattern rules.",
    preferredType: "multi_choice",
    exampleOptions: ["Too vague", "Too long", "Misses constraints", "Assumes missing facts", "Wrong tone", "Not actionable enough"],
  },
  workflow_pattern: {
    slot: "workflow_pattern",
    purpose: "Define the repeatable steps the assistant should follow.",
    askFor: "The most useful sequence for solving the user's recurring task.",
    outputImpact: "Becomes the Workflow section of the final system prompt.",
    preferredType: "single_choice",
    exampleOptions: ["Clarify then draft", "Draft first with assumptions", "Analyze then recommend", "Compare options", "Coach with feedback"],
  },
  output_format: {
    slot: "output_format",
    purpose: "Define the default artifact shape.",
    askFor: "The response format the user wants to reuse.",
    outputImpact: "Becomes the Response format section.",
    preferredType: "single_choice",
    exampleOptions: ["Short sections", "Numbered steps", "Checklist", "Table", "Prompt template", "Polished draft"],
  },
  missing_info_policy: {
    slot: "missing_info_policy",
    purpose: "Decide how the assistant handles underspecified requests.",
    askFor: "Whether to ask first, draft with assumptions, or offer choices.",
    outputImpact: "Becomes uncertainty behavior.",
    preferredType: "single_choice",
    exampleOptions: ["Ask one key question first", "Draft with labeled assumptions", "Give two options", "State what is missing then proceed"],
  },
  tone_strictness: {
    slot: "tone_strictness",
    purpose: "Set feedback style.",
    askFor: "How direct, strict, or supportive the assistant should be.",
    outputImpact: "Becomes style rules.",
    preferredType: "single_choice",
    exampleOptions: ["Supportive", "Balanced", "Direct and strict", "Ask before critiquing"],
  },
  example_inputs: {
    slot: "example_inputs",
    purpose: "Collect a reusable example input.",
    askFor: "A sample request, document type, or task input the assistant will often see.",
    outputImpact: "Improves examples and default behavior.",
    preferredType: "text",
  },
  memory_style: {
    slot: "memory_style",
    purpose: "Define what should become durable memory.",
    askFor: "What facts, preferences, or recurring constraints should be remembered when the user explicitly saves them.",
    outputImpact: "Guides memory behavior without inventing automatic storage.",
    preferredType: "multi_choice",
    exampleOptions: ["Preferred output format", "Recurring project context", "Tone preferences", "Personal constraints", "Do not remember by default"],
  },
  workflow_mode: {
    slot: "workflow_mode",
    purpose: "Define the coding or developer workflow mode.",
    askFor: "The kind of coding-adjacent help MiVA should repeatedly provide.",
    outputImpact: "Keeps coding support inside MiVA's actual scope.",
    preferredType: "single_choice",
    exampleOptions: ["Codex/Cursor prompt drafting", "Feature breakdown", "Debugging thought partner", "PR review checklist", "Architecture notes"],
  },
  answer_structure: {
    slot: "answer_structure",
    purpose: "Define how technical or detailed answers should be structured.",
    askFor: "The answer layout that makes repeated work faster.",
    outputImpact: "Becomes the assistant's default response skeleton.",
    preferredType: "single_choice",
    exampleOptions: ["Diagnosis first", "Step-by-step plan", "Diff-style suggestions", "Acceptance criteria", "Risks then recommendation"],
  },
  coding_boundary: {
    slot: "coding_boundary",
    purpose: "Prevent the assistant from promising actions MiVA cannot perform.",
    askFor: "Boundaries around repo edits, terminal commands, and coding-agent handoff.",
    outputImpact: "Becomes constraints in the final prompt.",
    preferredType: "multi_choice",
    exampleOptions: ["Do not claim files were edited", "Draft prompts for coding agents", "Ask before risky commands", "Explain assumptions", "Keep scope tight"],
  },
  stack_context: {
    slot: "stack_context",
    purpose: "Capture recurring stack or project context.",
    askFor: "The languages, frameworks, repo style, or documentation context the assistant should expect.",
    outputImpact: "Improves technical grounding without direct repo access.",
    preferredType: "text",
  },
  agent_handoff: {
    slot: "agent_handoff",
    purpose: "Define how MiVA should hand work to Codex/Cursor or another coding agent.",
    askFor: "Whether to produce implementation prompts, review prompts, test plans, or task tickets.",
    outputImpact: "Turns coding support into a practical external-agent workflow.",
    preferredType: "single_choice",
    exampleOptions: ["Implementation prompt", "Bug investigation prompt", "Review checklist", "Test plan", "Task breakdown"],
  },
  review_depth: {
    slot: "review_depth",
    purpose: "Set how rigorous coding or strategy review should be.",
    askFor: "How strongly the assistant should challenge assumptions and surface risks.",
    outputImpact: "Defines review behavior.",
    preferredType: "single_choice",
    exampleOptions: ["Light sanity check", "Balanced review", "Strict engineering review", "Risk-first review"],
  },
  persona_voice: {
    slot: "persona_voice",
    purpose: "Define the companion's speaking personality.",
    askFor: "The durable tone and social feel of the character.",
    outputImpact: "Becomes character speaking style.",
    preferredType: "single_choice",
    exampleOptions: ["Calm and gentle", "Bright and upbeat", "Playful and teasing", "Cool and reserved", "Direct but caring"],
  },
  mood_tag_policy: {
    slot: "mood_tag_policy",
    purpose: "Control how often Live2D mood tags should be used.",
    askFor: "How expressive the character should be per reply.",
    outputImpact: "Maps conversation tone to the limited expression system.",
    preferredType: "single_choice",
    exampleOptions: ["Most replies", "Only clear emotional changes", "Mostly neutral", "Only user asks for reaction"],
  },
  session_depth: {
    slot: "session_depth",
    purpose: "Set conversation depth.",
    askFor: "Whether the companion should favor quick reactions or deeper back-and-forth.",
    outputImpact: "Guides response length and question frequency.",
    preferredType: "single_choice",
    exampleOptions: ["Short snappy reactions", "Balanced back-and-forth", "Deeper conversations", "Task-focused support"],
  },
  character_constraint: {
    slot: "character_constraint",
    purpose: "Stay within actual character renderer limits.",
    askFor: "Which visual behaviors matter while respecting model-bundle expression limits.",
    outputImpact: "Prevents fake motion/expression claims.",
    preferredType: "multi_choice",
    exampleOptions: ["Use mood tags", "Do not narrate visual actions", "Keep expressions subtle", "React strongly when mood changes"],
  },
  reaction_style: {
    slot: "reaction_style",
    purpose: "Define when the companion asks back or reacts.",
    askFor: "The desired balance between useful answers and character reactions.",
    outputImpact: "Becomes dialogue behavior.",
    preferredType: "single_choice",
    exampleOptions: ["Answer first, react lightly", "React first, then help", "Ask back often", "Keep character flavor minimal"],
  },
  relationship_mode: {
    slot: "relationship_mode",
    purpose: "Define the social relationship frame.",
    askFor: "Whether the assistant should feel like a companion, tutor, teammate, or character.",
    outputImpact: "Shapes persona without over-roleplaying.",
    preferredType: "single_choice",
    exampleOptions: ["Friendly companion", "Study buddy", "Work teammate", "Roleplay character", "Quiet assistant"],
  },
  domain_priority: {
    slot: "domain_priority",
    purpose: "Capture the main domain priority.",
    askFor: "What the assistant should optimize for inside this domain.",
    outputImpact: "Guides tradeoffs.",
    preferredType: "multi_choice",
    exampleOptions: ["Speed", "Cost", "Quality", "Realism", "Depth", "Ease of use"],
  },
  budget_handling: {
    slot: "budget_handling",
    purpose: "Define how budget or resource limits should be handled.",
    askFor: "Whether to optimize tightly, give ranges, or flag tradeoffs.",
    outputImpact: "Improves planning answers.",
    preferredType: "single_choice",
    exampleOptions: ["Strict budget", "Flexible range", "Show tradeoffs", "Ignore unless asked"],
  },
  destination_context: {
    slot: "destination_context",
    purpose: "Ground travel planning in concrete trip constraints.",
    askFor: "Destination, trip length, people count, and purpose when available.",
    outputImpact: "Makes travel output actionable instead of generic.",
    preferredType: "text",
  },
  itinerary_granularity: {
    slot: "itinerary_granularity",
    purpose: "Set travel plan detail level.",
    askFor: "How detailed each day or route should be.",
    outputImpact: "Controls itinerary structure.",
    preferredType: "single_choice",
    exampleOptions: ["Loose daily outline", "Timed schedule", "Route-by-route", "Options by mood/weather"],
  },
  transit_style: {
    slot: "transit_style",
    purpose: "Set travel movement preferences.",
    askFor: "Preferred transit and pace.",
    outputImpact: "Prevents unrealistic itineraries.",
    preferredType: "single_choice",
    exampleOptions: ["Public transit", "Walking-heavy", "Taxi/rideshare", "Rental car", "Minimize transfers"],
  },
  material_type: {
    slot: "material_type",
    purpose: "Capture the usual study input.",
    askFor: "The material type the assistant should expect.",
    outputImpact: "Shapes explanation and summarization behavior.",
    preferredType: "single_choice",
    exampleOptions: ["Lecture notes", "Research papers", "Textbook sections", "Problem sets", "Assignment instructions"],
  },
  explanation_depth: {
    slot: "explanation_depth",
    purpose: "Set the learning explanation depth.",
    askFor: "How much reasoning, examples, and scaffolding the user wants.",
    outputImpact: "Controls answer length and tutoring style.",
    preferredType: "single_choice",
    exampleOptions: ["Short and simple", "Step-by-step", "Detailed with examples", "Socratic questions"],
  },
  practice_style: {
    slot: "practice_style",
    purpose: "Define how the assistant helps the user practice.",
    askFor: "Whether to quiz, explain, solve examples, or review attempts.",
    outputImpact: "Turns study help into a repeatable learning loop.",
    preferredType: "single_choice",
    exampleOptions: ["Quiz me", "Explain then test", "Review my answer", "Work through examples", "Make study plans"],
  },
  feedback_style: {
    slot: "feedback_style",
    purpose: "Set how the assistant corrects mistakes.",
    askFor: "Whether feedback should be gentle, direct, hint-based, or rubric-based.",
    outputImpact: "Defines revision behavior for learning tasks.",
    preferredType: "single_choice",
    exampleOptions: ["Gentle hints", "Direct correction", "Rubric-style feedback", "Ask me to try again first"],
  },
  boundary: {
    slot: "boundary",
    purpose: "Capture domain-specific limits only when relevant.",
    askFor: "Specific behavior limits for this assistant, not generic safety topics.",
    outputImpact: "Becomes constraints.",
    preferredType: "multi_choice",
  },
  uncertainty: {
    slot: "uncertainty",
    purpose: "Set how strongly the assistant should flag uncertainty.",
    askFor: "How to handle missing context or weak assumptions.",
    outputImpact: "Becomes uncertainty behavior.",
    preferredType: "single_choice",
    exampleOptions: ["Flag uncertainty briefly", "Ask before assuming", "Proceed with labeled assumptions", "List confidence and risks"],
  },
};

// Maps known starter questionIds to the slot they already satisfy, so the planner
// does not re-ask them.
const STARTER_SLOT_MAP: Record<string, string> = {
  "assistant-kind": "assistant_category",
  "assistant-purpose": "high_level_purpose",
  "study-q1": "study_focus",
  "study-q2": "material_type",
  "study-q3": "explanation_depth",
  "coding-q1": "workflow_mode",
  "coding-q2": "output_artifact",
  "coding-q3": "answer_structure",
  "planning-q1": "domain_priority",
  "planning-q2": "optimization_goal",
  "planning-q3": "output_format",
  "work-q1": "workflow_pattern",
  "work-q2": "output_format",
  "work-q3": "missing_info_policy",
  "writing-q1": "workflow_pattern",
  "writing-q2": "domain_priority",
  "writing-q3": "tone_strictness",
  "creative-q1": "workflow_pattern",
  "creative-q2": "tone_strictness",
  "creative-q3": "answer_structure",
  "fun-q1": "character_constraint",
  "fun-q2": "reaction_style",
};

function getStarterAnswerText(answers: StudioAnswer[], questionId: string) {
  const answer = answers.find((item) => item.questionId === questionId);
  if (!answer) {
    return "";
  }
  const label = Array.isArray(answer.answerLabel) ? answer.answerLabel.join(", ") : answer.answerLabel;
  const value = Array.isArray(answer.answerValue) ? answer.answerValue.join(", ") : answer.answerValue;
  return asString(label || value || answer.customText || "");
}

// Rule-based domain detection. Prefers the explicit starter `assistant-kind`
// (high confidence); falls back to purpose keywords. No second LLM call (v2 only).
function inferDomain(input: { assistantPurpose?: string; starterAnswers?: StudioAnswer[] }): {
  domain: StudioDomain;
  confidence: number;
  source: string;
} {
  const starterAnswers = Array.isArray(input.starterAnswers) ? input.starterAnswers : [];
  const kind = getStarterAnswerText(starterAnswers, "assistant-kind").toLowerCase();
  const purpose = asString(input.assistantPurpose).toLowerCase();
  const planningDetail = getStarterAnswerText(starterAnswers, "planning-q1").toLowerCase();
  const travelHints = ["travel", "trip", "tour", "itinerary", "여행"];
  const haystack = `${kind} ${purpose} ${planningDetail}`;

  if (kind.includes("coding") || kind.includes("developer")) {
    return { domain: "coding", confidence: 0.9, source: "assistant-kind" };
  }
  if (kind.includes("fun") || kind.includes("companion")) {
    return { domain: "companion", confidence: 0.9, source: "assistant-kind" };
  }
  if (kind.includes("study") || kind.includes("learning")) {
    return { domain: "study", confidence: 0.9, source: "assistant-kind" };
  }
  if (kind.includes("planning")) {
    return travelHints.some((hint) => haystack.includes(hint))
      ? { domain: "travel", confidence: 0.85, source: "assistant-kind+planning" }
      : { domain: "generic", confidence: 0.6, source: "assistant-kind(planning)" };
  }
  if (kind) {
    return travelHints.some((hint) => haystack.includes(hint))
      ? { domain: "travel", confidence: 0.7, source: "assistant-kind+purpose" }
      : { domain: "generic", confidence: 0.7, source: "assistant-kind" };
  }

  // No starter kind: legacy purpose-keyword detection.
  if (travelHints.some((hint) => purpose.includes(hint))) {
    return { domain: "travel", confidence: 0.6, source: "purpose" };
  }
  if (["code", "developer", "debug", "repo", "programming"].some((hint) => purpose.includes(hint))) {
    return { domain: "coding", confidence: 0.6, source: "purpose" };
  }
  if (["companion", "character", "roleplay", "persona", "live2d"].some((hint) => purpose.includes(hint))) {
    return { domain: "companion", confidence: 0.6, source: "purpose" };
  }
  if (["assignment", "study", "summary", "homework", "exam", "lecture"].some((hint) => purpose.includes(hint))) {
    return { domain: "study", confidence: 0.6, source: "purpose" };
  }

  return { domain: "generic", confidence: 0.3, source: "default" };
}

function buildAnsweredSlotSummary(starterAnswers: StudioAnswer[], existingAnswers: StudioAnswer[]) {
  const summary: Array<{ slot: string; value: string }> = [];
  const seen = new Set<string>();

  for (const answer of [...starterAnswers, ...existingAnswers]) {
    const slot = STARTER_SLOT_MAP[answer.questionId] || answer.questionId;
    if (!slot || seen.has(slot)) {
      continue;
    }
    const label = Array.isArray(answer.answerLabel) ? answer.answerLabel.join(", ") : answer.answerLabel;
    const value = asString(label || answer.customText || "");
    if (!value) {
      continue;
    }
    seen.add(slot);
    summary.push({ slot, value });
  }

  return summary;
}

function computeTargetSlots(domain: StudioDomain, coveredSlots: string[]) {
  const catalog = DOMAIN_SLOT_CATALOG[domain];
  const covered = new Set(coveredSlots);
  const pick = (slots: string[]) => slots.filter((slot) => !covered.has(slot));
  return {
    required: pick(catalog.required),
    optional: pick(catalog.optional),
    domainSpecific: pick(catalog.domainSpecific),
  };
}

function buildTargetSlotSpecs(targetSlots: ReturnType<typeof computeTargetSlots>) {
  const orderedSlots = [
    ...targetSlots.required,
    ...targetSlots.domainSpecific,
    ...targetSlots.optional,
  ];

  return orderedSlots.map((slot): StudioSlotSpec => (
    SLOT_SPEC_CATALOG[slot] ?? {
      slot,
      purpose: "Capture a missing assistant setup detail.",
      askFor: "Ask for the concrete user preference or constraint this slot represents.",
      outputImpact: "Use the answer as a durable rule in the final assistant recipe.",
      preferredType: "single_choice",
    }
  ));
}

function slotQuestion(question: StudioQuestion & { slot: string }): StudioQuestion {
  return question;
}

function fallbackQuestionsForDomain(
  domain: StudioDomain,
  field: string,
  targetSlots: ReturnType<typeof computeTargetSlots>,
): StudioQuestion[] {
  const coreQuestions = [
    slotQuestion({
      id: "immediate-task",
      slot: "immediate_task",
      title: "What are you trying to finish right now?",
      description: "Use a real task, document, plan, or problem. This becomes the first example for the assistant.",
      type: "text",
      placeholder: "Example: Turn my rough feature idea into a Codex-ready implementation prompt.",
    }),
    slotQuestion({
      id: "repeat-pattern",
      slot: "repeat_pattern",
      title: "What similar work should this assistant handle again later?",
      description: "This turns today's task into a reusable workflow instead of a one-off answer.",
      type: "single_choice",
      options: [option("Same task with new input"), option("Same project over multiple revisions"), option("Different topics with the same output format"), option("One-off task only"), option("Something else...", true)],
    }),
    slotQuestion({
      id: "quality-bar",
      slot: "quality_bar",
      title: "What makes the result good enough for you?",
      description: "Choose the standards the assistant should optimize for every time.",
      type: "multi_choice",
      options: [option("Accurate and source-aware"), option("Actionable next steps"), option("Concise but complete"), option("Includes risks and edge cases"), option("Ready to paste or use"), option("Something else...", true)],
    }),
    slotQuestion({
      id: "fix-preferences",
      slot: "fix_preferences",
      title: "What do you usually have to fix in AI answers?",
      description: "These become durable anti-patterns in the assistant prompt.",
      type: "multi_choice",
      options: [option("Too vague"), option("Too long"), option("Misses constraints"), option("Assumes missing facts"), option("Wrong tone"), option("Not actionable enough"), option("Something else...", true)],
    }),
  ];

  const genericQuestions = [
    slotQuestion({
      id: "main-workflow",
      slot: "workflow_pattern",
      title: "What workflow should this assistant handle from start to finish?",
      description: "Pick the pattern that should become reusable.",
      type: "single_choice",
      options: [option("Plan then execute"), option("Analyze then summarize"), option("Coach with feedback"), option("Generate polished drafts"), option("Compare options"), option("Something else...", true)],
    }),
    slotQuestion({
      id: "response-format",
      slot: "output_format",
      title: "What response format should it usually use?",
      type: "single_choice",
      options: [option("Short sections"), option("Bullets"), option("Numbered steps"), option("Table when useful"), option("Checklist ending"), option("Something else...", true)],
    }),
    slotQuestion({
      id: "strictness",
      slot: "tone_strictness",
      title: "How strict should the assistant be when giving feedback?",
      type: "single_choice",
      options: [option("Supportive"), option("Balanced"), option("Direct and strict"), option("Ask before critiquing"), option("Something else...", true)],
    }),
  ];

  const domainQuestions: Record<StudioDomain, StudioQuestion[]> = {
    generic: [],
    study: [
      slotQuestion({
        id: "material-type",
        slot: "material_type",
        title: `What type of ${field} material should this assistant handle most often?`,
        description: "Choose the input this assistant should expect.",
        type: "single_choice",
        options: [option("Research papers"), option("Lecture notes"), option("Assignment instructions"), option("Documentation"), option("Code explanation"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "summary-depth",
        slot: "explanation_depth",
        title: "How detailed should the assistant's explanations be?",
        description: "This shapes the default response length and tutoring style.",
        type: "single_choice",
        options: [option("Short and simple"), option("Balanced"), option("Detailed with key examples"), option("Step-by-step"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "practice-style",
        slot: "practice_style",
        title: "How should this assistant help you practice?",
        type: "single_choice",
        options: [option("Quiz me"), option("Explain then test me"), option("Review my answer"), option("Work through examples"), option("Make study plans"), option("Something else...", true)],
      }),
    ],
    coding: [
      slotQuestion({
        id: "developer-workflow",
        slot: "workflow_mode",
        title: "What coding-adjacent workflow should this assistant repeat for you?",
        description: "MIVA should shape reusable help, not pretend it edited the repository itself.",
        type: "single_choice",
        options: [option("Codex/Cursor prompt drafting"), option("Feature breakdown"), option("Debugging thought partner"), option("PR review checklist"), option("Architecture notes"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "code-answer-style",
        slot: "answer_structure",
        title: "What structure makes technical answers easiest to use?",
        type: "single_choice",
        options: [option("Diagnosis first"), option("Step-by-step plan"), option("Diff-style suggestions"), option("Acceptance criteria"), option("Risks then recommendation"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "agent-handoff",
        slot: "agent_handoff",
        title: "What should MiVA produce when another coding agent will do the implementation?",
        type: "single_choice",
        options: [option("Implementation prompt"), option("Bug investigation prompt"), option("Review checklist"), option("Test plan"), option("Task breakdown"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "stack-context",
        slot: "stack_context",
        title: "What stack or project context should it assume for repeated coding help?",
        type: "text",
        placeholder: "Example: React + Tauri desktop app, TypeScript, local-first assistant features.",
      }),
    ],
    companion: [
      slotQuestion({
        id: "persona-voice",
        slot: "persona_voice",
        title: "How should this companion usually talk?",
        description: "Sets the character's default speaking style.",
        type: "single_choice",
        options: [option("Calm and gentle"), option("Bright and upbeat"), option("Playful and teasing"), option("Cool and reserved"), option("Direct but caring"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "mood-tag-policy",
        slot: "mood_tag_policy",
        title: "How expressive should the character's facial reactions be?",
        description: "MiVA can set one mood tag per reply and map it to available expressions.",
        type: "single_choice",
        options: [option("React with a mood on most replies"), option("Only when the emotion clearly changes"), option("Rarely, stay mostly neutral"), option("Only when I ask for a reaction"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "relationship-mode",
        slot: "relationship_mode",
        title: "What relationship should the character feel like?",
        type: "single_choice",
        options: [option("Friendly companion"), option("Study buddy"), option("Work teammate"), option("Roleplay character"), option("Quiet assistant"), option("Something else...", true)],
      }),
    ],
    travel: [
      slotQuestion({
        id: "destination-context",
        slot: "destination_context",
        title: "What trip details should this planner use first?",
        description: "Give any destination, duration, people count, budget, or purpose you already know.",
        type: "text",
        placeholder: "Example: 4 days in Osaka with two friends, food-focused, medium budget.",
      }),
      slotQuestion({
        id: "travel-priority",
        slot: "domain_priority",
        title: "Which parts of the trip should this assistant prioritize?",
        description: "Choose the travel work this assistant should handle most often.",
        type: "multi_choice",
        options: [option("Day-by-day itinerary planning"), option("Food and local restaurants"), option("Transit between places"), option("Budget tradeoffs"), option("Realistic pacing"), option("Something else...", true)],
      }),
      slotQuestion({
        id: "travel-granularity",
        slot: "itinerary_granularity",
        title: "How detailed should each itinerary be?",
        type: "single_choice",
        options: [option("Loose daily outline"), option("Timed schedule"), option("Route-by-route"), option("Options by mood or weather"), option("Something else...", true)],
      }),
    ],
  };

  const allQuestions = [...coreQuestions, ...genericQuestions, ...domainQuestions[domain]];
  const bySlot = new Map(allQuestions.map((question) => [question.slot, question]));
  const orderedTargetSlots = [
    ...targetSlots.required,
    ...targetSlots.domainSpecific,
    ...targetSlots.optional,
  ];
  const selected = orderedTargetSlots.flatMap((slot) => {
    const question = bySlot.get(slot);
    return question ? [question] : [];
  });

  return (selected.length ? selected : allQuestions).slice(0, 6);
}

function fallbackQuestions(payload: any): StudioQuestionsResult {
  const userProfile = normalizeUserProfile(payload.userProfile);
  const starterAnswers = normalizeAnswers(payload.starterAnswers);
  const existingAnswers = normalizeAnswers(payload.existingAnswers);
  const field = userProfile.majorOrField || userProfile.jobSeekingField || userProfile.industryOrRole || "your field";
  const { domain } = inferDomain({ assistantPurpose: payload.assistantPurpose, starterAnswers });

  const covered = buildAnsweredSlotSummary(starterAnswers, existingAnswers).map((entry) => entry.slot);
  const targets = computeTargetSlots(domain, covered);
  const coverage: StudioCoverage = {
    filledSlots: covered,
    missingSlots: [...targets.required, ...targets.domainSpecific],
    isSufficient: targets.required.length === 0,
  };

  return {
    questions: fallbackQuestionsForDomain(domain, field, targets),
    detectedDomain: domain,
    coverage,
  };
}

function fallbackPreview(payload: any): StudioPreview {
  const userProfile = normalizeUserProfile(payload.userProfile);
  const purpose = asString(payload.assistantPurpose, "custom assistant");
  const studioAnswers = normalizeAnswers(payload.studioAnswers);
  const firstAnswer = studioAnswers[0];
  const profileContext = buildProfileContext(userProfile);
  const focus = firstAnswer
    ? Array.isArray(firstAnswer.answerLabel) ? firstAnswer.answerLabel.join(", ") : firstAnswer.answerLabel
    : purpose;

  return {
    sampleUserMessage: `I need help with ${focus}. Can you show me how this assistant would respond?`,
    sampleAssistantResponse: [
      `## ${purpose}`,
      "",
      `I will treat this as a reusable assistant for ${focus}.`,
      "",
      "### Recommended response",
      "- Start with the most important answer.",
      "- Use structured Markdown so the result is easy to scan.",
      "- Ask for missing context before making strong assumptions.",
      "",
      "### Next action",
      "Share a real sample input and I will adapt the format more precisely.",
    ].join("\n"),
    detectedResponseFormat: ["Markdown headings", "Bullet list", "Actionable next step"],
    draftPromptRules: [
      `Act as a ${purpose} for the target user context: ${profileContext}.`,
      "Use English UI-facing output by default, even when profile data contains another preferred language.",
      "Start with the most useful answer before adding background context.",
      "Use Markdown sections and lists for readability.",
      "Ask one clarifying question when the request is missing critical context.",
    ],
  };
}

function fallbackRules(payload: any) {
  const currentPromptRules = stripRuntimeCodePromptItems(asStringArray(payload.currentPromptRules, fallbackPreview(payload).draftPromptRules));
  const feedback = asString(payload.userFeedback, "Make the assistant more concise.");
  const lowerFeedback = feedback.toLowerCase();
  const rulePatch = [
    lowerFeedback.includes("short") || lowerFeedback.includes("concise")
      ? "Keep responses concise unless the user asks for depth."
      : lowerFeedback.includes("step") || lowerFeedback.includes("process")
        ? "Break complex answers into clear numbered steps."
        : lowerFeedback.includes("example")
          ? "Include a compact example when it will make the answer easier to apply."
          : lowerFeedback.includes("strict") || lowerFeedback.includes("direct")
            ? "Give direct feedback and name the practical tradeoff before adding softer wording."
            : "Adapt the response style to the user's latest preview feedback as a reusable behavior rule.",
  ];

  return {
    updatedPromptRules: Array.from(new Set([...currentPromptRules, ...rulePatch])),
    rulePatch,
    changeSummary: "Updated the assistant rules based on the latest preview feedback.",
    shouldRegeneratePreview: true,
  };
}

function fallbackFinalize(payload: any) {
  const userProfile = normalizeUserProfile(payload.userProfile);
  const purpose = asString(payload.assistantPurpose, "Custom Assistant");
  const starterAnswers = normalizeAnswers(payload.starterAnswers);
  const studioAnswers = normalizeAnswers(payload.studioAnswers);
  const profileContext = buildProfileContext(userProfile);
  const finalPromptRules = stripRuntimeCodePromptItems(asStringArray(payload.finalPromptRules, fallbackPreview(payload).draftPromptRules));
  const preview = payload.latestPreview && typeof payload.latestPreview === "object"
    ? payload.latestPreview as Partial<StudioPreview>
    : {};
  const sampleUserMessage = asString(preview.sampleUserMessage, `Help me with ${purpose}.`);
  const sampleAssistantResponse = asString(preview.sampleAssistantResponse, fallbackPreview(payload).sampleAssistantResponse);
  const assistantName = `${purpose.replace(/\bassistant\b/gi, "").trim() || "Custom"} Assistant`;
  const responseFormat = [
    "Markdown",
    "Clear sections",
    "Bullets or numbered steps when useful",
  ];
  const workflowSteps = [
    "Start from the user's immediate task and identify the repeated task pattern it represents.",
    "Apply the saved quality bar before drafting the answer.",
    "Identify missing context before making assumptions, or label assumptions clearly when drafting first.",
    "Produce a structured answer in the saved response format.",
    "When the user fixes the answer, convert that correction into a durable behavior rule.",
  ];
  const finalSystemPrompt = [
    `# Role`,
    `You are an assistant specialized in ${purpose}.`,
    "",
    "# Target user",
    profileContext,
    "",
    "# Main purpose",
    purpose,
    "",
    "# Workflow",
    ...workflowSteps.map((step) => `- ${step}`),
    "",
    "# Response format",
    ...responseFormat.map((item) => `- ${item}`),
    "",
    "# Style rules",
    "- Ground answers in the user's concrete task before generalizing.",
    "- Optimize for repeatable work, not one-off conversation.",
    ...finalPromptRules.map((rule) => `- ${rule}`),
    "",
    "# Constraints",
    "- Do not invent unsupported facts.",
    "- Do not ask for sensitive personal identifiers.",
    "- Keep all UI-facing generated output in English unless the user explicitly asks otherwise.",
    "",
    "# Examples",
    `User: ${sampleUserMessage}`,
    `Assistant: ${sampleAssistantResponse}`,
    "",
    "# Uncertainty behavior",
    "- State uncertainty clearly and ask for the smallest missing detail needed.",
    "",
    "# Revision behavior",
    "- When the user gives feedback, convert it into durable behavior changes instead of treating it as a one-off instruction.",
  ].join("\n");

  const assistantRecipe: AssistantRecipeDraft = {
    name: assistantName,
    purpose,
    targetUser: profileContext,
    profileContext,
    workflowSteps,
    responseFormat,
    rules: finalPromptRules,
    examples: [{ userMessage: sampleUserMessage, assistantResponse: sampleAssistantResponse }],
    finalSystemPrompt,
  };

  return {
    assistantName,
    assistantDescription: oneLineDescription(`Reusable assistant for ${purpose}.`, purpose),
    assistantCategory: inferAssistantCategory({
      assistantPurpose: purpose,
      starterAnswers,
      studioAnswers,
      recipe: assistantRecipe,
    }),
    assistantRecipe,
    finalSystemPrompt,
  };
}

@Injectable()
export class StudioService {
  async generateQuestions(payload: any) {
    const userProfile = normalizeUserProfile(payload.userProfile);
    const assistantPurpose = asString(payload.assistantPurpose);
    const starterAnswers = normalizeAnswers(payload.starterAnswers);
    const existingAnswers = normalizeAnswers(payload.existingAnswers);
    const detectedDomain = inferDomain({ assistantPurpose, starterAnswers });
    const answeredSlotSummary = buildAnsweredSlotSummary(starterAnswers, existingAnswers);
    const targetSlots = computeTargetSlots(detectedDomain.domain, answeredSlotSummary.map((entry) => entry.slot));
    const targetSlotSpecs = buildTargetSlotSpecs(targetSlots);

    const normalizedPayload = {
      userProfile,
      assistantPurpose,
      starterAnswers,
      existingAnswers,
      detectedDomain,
      answeredSlotSummary,
      targetSlots,
      targetSlotSpecs,
    };

    return this.callOpenAiJson(
      "question-generation",
      [
        MIVA_CAPABILITIES,
        "",
        "You are MIVA's Studio question planner.",
        "Your job is to turn the user's current concrete task into a reusable assistant recipe for similar future work.",
        "Do not create a generic assistant personality survey.",
        "Treat assistantPurpose and starterAnswers as the source of truth for the assistant being built.",
        "Anchor every question to detectedDomain.domain (companion, coding, travel, study, or generic).",
        "Slot-filling: targetSlots lists the setup slots that still need user input. targetSlotSpecs explains why each slot matters, what to ask for, and how the final prompt will use the answer.",
        "Ask ONLY about targetSlotSpecs, prioritizing required, then domainSpecific, then optional. Tag each question with the slot it fills via the \"slot\" field.",
        "First priority slots, when present: immediate_task, repeat_pattern, quality_bar, fix_preferences.",
        "The best questions should reveal: what the user is trying to finish now, what similar task will repeat later, what a good result looks like, and what the user usually fixes in AI answers.",
        "The \"slot\" field is a hidden machine tag. The \"title\" field MUST be the natural-language question the user reads (for example 'How should this companion usually talk?'), never the slot id or a title-cased slot name like 'Persona Voice'.",
        "Do not ask about anything already present in answeredSlotSummary, starterAnswers, or existingAnswers.",
        "Never generate a question that assumes a capability marked 'cannot' in the MIVA CAPABILITIES contract above (e.g. editing repo files, running terminal commands, autonomous commits/PRs, custom or semantic Live2D motions, scheduled/timed expression cycling).",
        "Use the provided user profile only as background context. Do not ask profile questions again.",
        "Do not ask for exact age, real company name, address, phone number, private identifiers, or sensitive information.",
        "Do not generate generic setup, compliance, moderation, safety, or boundary questions unless the assistant purpose explicitly asks for that kind of assistant.",
        "Never ask 'What topics should the assistant avoid discussing?' and never offer generic avoid-topic options such as Politics, Religion, Controversial issues, or Personal advice for ordinary assistants.",
        "Questions must be concrete, non-overlapping, and useful for configuring runtime behavior, workflow steps, output format, memory behavior, Live2D reaction behavior, or coding-agent handoff.",
        "Prefer concrete examples over abstract preferences. Ask for a real current task when the slot asks for it.",
        "Prefer button options over long text input. Always include 'Something else...' when options may not fit.",
        "Generate 4 to 6 questions when required recipe slots remain. If targetSlots.required and targetSlots.domainSpecific are both empty, return only 0 to 2 high-value refinement questions.",
        "All question titles, descriptions, option labels, and reasons must be written in English.",
        "Also report coverage: which catalog slots are already filled, which are still missing, and whether the required slots are sufficiently covered.",
        "Return only valid JSON in this shape: {\"detectedDomain\":\"string\",\"coverage\":{\"filledSlots\":[\"string\"],\"missingSlots\":[\"string\"],\"isSufficient\":false},\"questions\":[{\"id\":\"string\",\"slot\":\"string\",\"title\":\"string\",\"description\":\"string\",\"type\":\"single_choice|multi_choice|text\",\"options\":[{\"id\":\"string\",\"label\":\"string\",\"value\":\"string\",\"requiresText\":false}],\"placeholder\":\"string\",\"reason\":\"string\"}]}",
      ].join("\n"),
      normalizedPayload,
      () => fallbackQuestions(normalizedPayload),
      normalizeQuestionsPayload,
      {
        timeoutMs: Number(process.env.OPENAI_QUESTION_TIMEOUT_MS || 8000),
      },
    );
  }

  async generatePreview(payload: any) {
    const normalizedPayload = {
      userProfile: normalizeUserProfile(payload.userProfile),
      assistantPurpose: asString(payload.assistantPurpose),
      starterAnswers: normalizeAnswers(payload.starterAnswers),
      studioAnswers: normalizeAnswers(payload.studioAnswers),
      currentPromptRules: asStringArray(payload.currentPromptRules, []),
    };

    return this.callOpenAiJson(
      "preview-generation",
      [
        "You are MIVA's Studio preview writer.",
        "Generate a realistic sample conversation for the custom assistant being built.",
        "Reflect the user profile, assistant purpose, starter answers, and Studio answers.",
        "The preview is not final. It is for the user to judge and refine.",
        "The sample assistant response must use Markdown.",
        "All generated UI-facing text must be in English.",
        "Return only valid JSON in this shape: {\"sampleUserMessage\":\"string\",\"sampleAssistantResponse\":\"string\",\"detectedResponseFormat\":[\"string\"],\"draftPromptRules\":[\"string\"]}",
      ].join("\n"),
      normalizedPayload,
      () => fallbackPreview(normalizedPayload),
      normalizePreviewPayload,
    );
  }

  async refineRules(payload: any) {
    const normalizedPayload = {
      userProfile: normalizeUserProfile(payload.userProfile),
      assistantPurpose: asString(payload.assistantPurpose),
      starterAnswers: normalizeAnswers(payload.starterAnswers),
      studioAnswers: normalizeAnswers(payload.studioAnswers),
      currentPromptRules: asStringArray(payload.currentPromptRules, []),
      sampleUserMessage: asString(payload.sampleUserMessage),
      sampleAssistantResponse: asString(payload.sampleAssistantResponse),
      userFeedback: asString(payload.userFeedback),
    };

    return this.callOpenAiJson(
      "rule-refinement",
      [
        "You are MIVA's prompt rule refiner.",
        "Convert natural-language preview feedback into durable assistant prompt rules.",
        "Do not store raw feedback as the final rule.",
        "Keep updated rules specific, reusable, and behavior-oriented.",
        "All rule patches, updated rules, and summaries must be written in English.",
        "Return only valid JSON in this shape: {\"updatedPromptRules\":[\"string\"],\"rulePatch\":[\"string\"],\"changeSummary\":\"string\",\"shouldRegeneratePreview\":true}",
      ].join("\n"),
      normalizedPayload,
      () => fallbackRules(normalizedPayload),
      normalizeRulesPayload,
    );
  }

  async finalizePrompt(payload: any) {
    const normalizedPayload = {
      userProfile: normalizeUserProfile(payload.userProfile),
      assistantPurpose: asString(payload.assistantPurpose),
      starterAnswers: normalizeAnswers(payload.starterAnswers),
      studioAnswers: normalizeAnswers(payload.studioAnswers),
      finalPromptRules: asStringArray(payload.finalPromptRules, []),
      latestPreview: payload.latestPreview && typeof payload.latestPreview === "object" ? payload.latestPreview : {},
    };

    return this.callOpenAiJson(
      "prompt-finalization",
      [
        "You are MIVA's final assistant prompt compiler.",
        "Generate a reusable Assistant Recipe draft and final system prompt from the user's current concrete task, repeated future pattern, quality bar, and fix preferences.",
        "Do not write a generic chatbot prompt. The prompt must make the assistant good at the user's repeated task pattern.",
        "Treat the immediate task as the first realistic example, not as the only thing the assistant can ever do.",
        "Turn quality_bar and fix_preferences answers into durable behavior rules and revision behavior.",
        "Respect MIVA's capability limits: do not claim unavailable external actions, tool results, visual motions, or integrations unless a connected integration confirms them.",
        "Classify the assistant for MIVA's My Assistants UI with assistantCategory exactly one of: study, writing, work, coding, planning, creative, personal.",
        "If starterAnswers includes a fixed assistant-kind category, assistantCategory MUST match that fixed category. If the user selected Something else/custom, choose the closest category from the full assistant purpose, answers, and recipe.",
        "assistantCategory is only a library grouping. Ignore Live2D/2D character settings unless the requested assistant is primarily companion, roleplay, or casual conversation. Do not classify as creative just because visual character UI is enabled.",
        "Write assistantDescription as one short plain-English sentence under 150 characters. It is used as the assistant's public/share card summary, not as a system instruction.",
        "Do not include a 'Your name is ...' line in the final system prompt. MiVA injects the runtime assistant name separately from the role.",
        "Treat assistantName as a library/display title for the assistant profile, not as the runtime identity name.",
        "The final prompt must be organized into sections: Role, Target user, Main purpose, Workflow, Response format, Style rules, Constraints, Examples, Uncertainty behavior, Revision behavior.",
        "Use the user profile only as background context. Do not ask profile questions.",
        "All assistant names, recipe fields, examples, and final system prompt text must be written in English.",
        "Return only valid JSON in this shape: {\"assistantName\":\"string\",\"assistantDescription\":\"string\",\"assistantCategory\":\"study|writing|work|coding|planning|creative|personal\",\"assistantRecipe\":{\"name\":\"string\",\"purpose\":\"string\",\"targetUser\":\"string\",\"profileContext\":\"string\",\"workflowSteps\":[\"string\"],\"responseFormat\":[\"string\"],\"rules\":[\"string\"],\"examples\":[{\"userMessage\":\"string\",\"assistantResponse\":\"string\"}],\"finalSystemPrompt\":\"string\"},\"finalSystemPrompt\":\"string\"}",
      ].join("\n"),
      normalizedPayload,
      () => fallbackFinalize(normalizedPayload),
      (value) => normalizeFinalizePayload(value, normalizedPayload),
    );
  }

  saveAssistant(payload: any) {
    const finalized = normalizeFinalizePayload({
      assistantName: payload?.assistantRecipe?.name,
      assistantRecipe: payload?.assistantRecipe,
      finalSystemPrompt: payload?.assistantRecipe?.finalSystemPrompt,
    });

    return {
      ok: true,
      saved: false,
      note: "Assistant Recipe storage endpoint is prepared. The desktop app currently saves the finalized assistant through the existing local assistant profile store.",
      assistantCategory: finalized?.assistantCategory ?? normalizeAssistantCategory(payload?.assistantCategory) ?? null,
      assistantRecipe: finalized?.assistantRecipe ?? payload?.assistantRecipe ?? null,
    };
  }

  private async callOpenAiJson<T>(
    taskName: string,
    systemPrompt: string,
    payload: unknown,
    fallback: () => T,
    validate: (value: unknown) => T | null,
    options?: {
      timeoutMs?: number;
    },
  ): Promise<T & { source?: "openai" | "fallback"; fallbackReason?: string }> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return { ...fallback(), source: "fallback", fallbackReason: "OPENAI_API_KEY is not configured." };
    }

    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const timeoutMs = options?.timeoutMs ?? Number(process.env.OPENAI_TIMEOUT_MS || 20000);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
          method: "POST",
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  `Task: ${taskName}`,
                  "Return JSON only. Do not wrap it in Markdown.",
                  "Input:",
                  JSON.stringify(payload, null, 2),
                ].join("\n"),
              },
            ],
          }),
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const text = await response.text();
        return { ...fallback(), source: "fallback", fallbackReason: `OpenAI request failed: ${response.status} ${text.slice(0, 240)}` };
      }

      const json = await response.json() as any;
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        return { ...fallback(), source: "fallback", fallbackReason: "OpenAI response did not include message content." };
      }

      const parsed = JSON.parse(content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
      const validated = validate(parsed);
      if (!validated) {
        return { ...fallback(), source: "fallback", fallbackReason: "OpenAI JSON did not match the expected schema." };
      }

      return { ...validated, source: "openai" };
    } catch (error) {
      return { ...fallback(), source: "fallback", fallbackReason: error instanceof Error ? error.message : String(error) };
    }
  }
}
