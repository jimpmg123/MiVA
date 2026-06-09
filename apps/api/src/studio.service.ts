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
  };
}

function normalizeQuestionsPayload(value: unknown): { questions: StudioQuestion[] } | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as { questions?: unknown };
  const questions = Array.isArray(source.questions)
    ? source.questions
        .map((item, index) => normalizeQuestion(item, `q${index + 1}`))
        .filter((item): item is StudioQuestion => Boolean(item))
        .filter((item) => !isGenericBoundaryQuestion(item))
    : [];

  return questions.length ? { questions: questions.slice(0, 5) } : null;
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
  const detectedResponseFormat = asStringArray(
    source.detectedResponseFormat ?? source.responseFormat ?? source.formats,
    ["Markdown", "Structured response"],
  );
  const draftPromptRules = asStringArray(
    source.draftPromptRules ?? source.promptRules ?? source.rules,
    [
      "Start with the most useful answer.",
      "Use clear Markdown sections when the answer has multiple parts.",
      "Ask for missing context before making strong assumptions.",
    ],
  );

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
  const updatedPromptRules = asStringArray(source.updatedPromptRules, []);
  const rulePatch = asStringArray(source.rulePatch, []);
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
    ...bulletLines(recipe.responseFormat, ["Use Markdown.", "Use clear sections.", "Use bullets or numbered steps when useful."]),
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

function normalizeFinalizePayload(value: unknown): {
  assistantName: string;
  assistantRecipe: AssistantRecipeDraft;
  finalSystemPrompt: string;
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as {
    assistantName?: unknown;
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
    responseFormat: asStringArray(recipeSource.responseFormat, []),
    rules: asStringArray(recipeSource.rules, []),
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
  finalSystemPrompt = ensureSectionedFinalPrompt(finalSystemPrompt, assistantRecipe);
  assistantRecipe.finalSystemPrompt = finalSystemPrompt;

  return {
    assistantName,
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

function fallbackQuestions(payload: any): { questions: StudioQuestion[] } {
  const userProfile = normalizeUserProfile(payload.userProfile);
  const purpose = asString(payload.assistantPurpose, "custom assistant").toLowerCase();
  const field = userProfile.majorOrField || userProfile.jobSeekingField || userProfile.industryOrRole || "your field";

  if (purpose.includes("assignment") || purpose.includes("study") || purpose.includes("summary")) {
    return {
      questions: [
        {
          id: "material-type",
          title: `What type of ${field} material should this assistant handle most often?`,
          description: "Choose the input this assistant should expect.",
          type: "single_choice",
          options: [option("Research papers"), option("Lecture notes"), option("Assignment instructions"), option("Documentation"), option("Code explanation"), option("Something else...", true)],
        },
        {
          id: "summary-depth",
          title: "How detailed should the assistant's output be?",
          description: "This shapes the default response length.",
          type: "single_choice",
          options: [option("Very concise"), option("Balanced"), option("Detailed with key examples"), option("Step-by-step"), option("Something else...", true)],
        },
        {
          id: "output-shape",
          title: "What output format would be most useful?",
          description: "The final assistant prompt will store this as a durable response rule.",
          type: "single_choice",
          options: [option("Bullet summary"), option("Structured sections"), option("Table"), option("Checklist ending"), option("Something else...", true)],
        },
      ],
    };
  }

  if (purpose.includes("code") || purpose.includes("developer") || purpose.includes("debug")) {
    return {
      questions: [
        {
          id: "developer-workflow",
          title: "Which developer workflow should this assistant support?",
          description: "MIVA is not replacing coding agents; it is shaping reusable assistance around your workflow.",
          type: "single_choice",
          options: [option("Feature breakdown"), option("Debugging thought partner"), option("PR review style"), option("Technical documentation"), option("Architecture decisions"), option("Something else...", true)],
        },
        {
          id: "code-answer-style",
          title: "How should technical answers be structured?",
          type: "single_choice",
          options: [option("Short diagnosis first"), option("Step-by-step reasoning"), option("Diff-style suggestions"), option("Checklist before implementation"), option("Something else...", true)],
        },
        {
          id: "coding-boundaries",
          title: "What should this assistant avoid?",
          type: "multi_choice",
          options: [option("Over-explaining basics"), option("Skipping assumptions"), option("Suggesting risky commands"), option("Changing scope without asking"), option("Something else...", true)],
        },
      ],
    };
  }

  if (purpose.includes("travel") || purpose.includes("trip") || purpose.includes("tour") || purpose.includes("여행")) {
    return {
      questions: [
        {
          id: "travel-priority",
          title: "Which parts of the trip should this assistant prioritize?",
          description: "Choose the travel work this assistant should handle most often.",
          type: "multi_choice",
          options: [option("Day-by-day itinerary planning"), option("Sightseeing and landmarks"), option("Food and local restaurants"), option("Transit between cities"), option("Budget and reservations"), option("Something else...", true)],
        },
        {
          id: "travel-output-format",
          title: "What travel plan format should it usually produce?",
          description: "This becomes the assistant's default response structure.",
          type: "single_choice",
          options: [option("Daily schedule with time blocks"), option("Checklist by city"), option("Table with cost and travel time"), option("Map-style route order"), option("Short recommendation list"), option("Something else...", true)],
        },
        {
          id: "travel-decision-style",
          title: "How should it handle missing trip details?",
          description: "This controls whether the assistant asks questions first or gives a usable draft immediately.",
          type: "single_choice",
          options: [option("Ask one key question first"), option("Make reasonable assumptions and label them"), option("Give two itinerary options"), option("Start with a rough draft then refine"), option("Something else...", true)],
        },
      ],
    };
  }

  return {
    questions: [
      {
        id: "main-workflow",
        title: "What workflow should this assistant handle from start to finish?",
        description: "Pick the pattern that should become reusable.",
        type: "single_choice",
        options: [option("Plan then execute"), option("Analyze then summarize"), option("Coach with feedback"), option("Generate polished drafts"), option("Compare options"), option("Something else...", true)],
      },
      {
        id: "response-format",
        title: "What response format should it usually use?",
        type: "single_choice",
        options: [option("Short sections"), option("Bullets"), option("Numbered steps"), option("Table when useful"), option("Checklist ending"), option("Something else...", true)],
      },
      {
        id: "strictness",
        title: "How strict should the assistant be when giving feedback?",
        type: "single_choice",
        options: [option("Supportive"), option("Balanced"), option("Direct and strict"), option("Ask before critiquing"), option("Something else...", true)],
      },
    ],
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
  const currentPromptRules = asStringArray(payload.currentPromptRules, fallbackPreview(payload).draftPromptRules);
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
  const profileContext = buildProfileContext(userProfile);
  const finalPromptRules = asStringArray(payload.finalPromptRules, fallbackPreview(payload).draftPromptRules);
  const preview = payload.latestPreview && typeof payload.latestPreview === "object"
    ? payload.latestPreview as Partial<StudioPreview>
    : {};
  const sampleUserMessage = asString(preview.sampleUserMessage, `Help me with ${purpose}.`);
  const sampleAssistantResponse = asString(preview.sampleAssistantResponse, fallbackPreview(payload).sampleAssistantResponse);
  const assistantName = `${purpose.replace(/\bassistant\b/gi, "").trim() || "Custom"} Assistant`;
  const responseFormat = ["Markdown", "Clear sections", "Bullets or numbered steps when useful"];
  const workflowSteps = [
    "Understand the user's immediate request.",
    "Identify missing context before making assumptions.",
    "Produce a structured answer in the saved response format.",
    "Offer a concise next action or revision path.",
  ];
  const finalSystemPrompt = [
    `# Role`,
    `You are ${assistantName}.`,
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
    assistantRecipe,
    finalSystemPrompt,
  };
}

@Injectable()
export class StudioService {
  async generateQuestions(payload: any) {
    const normalizedPayload = {
      userProfile: normalizeUserProfile(payload.userProfile),
      assistantPurpose: asString(payload.assistantPurpose),
      starterAnswers: normalizeAnswers(payload.starterAnswers),
      existingAnswers: normalizeAnswers(payload.existingAnswers),
    };

    return this.callOpenAiJson(
      "question-generation",
      [
        "You are MIVA's Studio question planner.",
        "Your job is to generate assistant-specific setup questions that directly shape the final system prompt.",
        "Treat assistantPurpose and starterAnswers as the source of truth for the assistant being built.",
        "Every question must be anchored to the requested assistant domain and task. If the assistant is a China travel planner, ask about itinerary priorities, trip pace, cities, food/sightseeing balance, route format, budget handling, missing trip details, and output structure.",
        "Use the provided user profile only as background context.",
        "Do not ask profile questions again.",
        "Do not ask for exact age, real company name, address, phone number, private identifiers, or sensitive information.",
        "Do not generate generic setup, compliance, moderation, safety, or boundary questions unless the assistant purpose explicitly asks for that kind of assistant.",
        "Never ask 'What topics should the assistant avoid discussing?' and never offer generic avoid-topic options such as Politics, Religion, Controversial issues, or Personal advice for ordinary assistants.",
        "Do not ask general audience/scope questions already covered by starterAnswers.",
        "Ask only questions that help define this specific assistant's purpose, workflow, response style, output format, domain-specific constraints, and examples.",
        "Questions must be concrete, non-overlapping, and useful for configuring runtime behavior.",
        "Prefer button options over long text input.",
        "Always include 'Something else...' when options may not fit.",
        "Generate 3 to 5 questions.",
        "All question titles, descriptions, option labels, and reasons must be written in English.",
        "Return only valid JSON in this shape: {\"questions\":[{\"id\":\"string\",\"title\":\"string\",\"description\":\"string\",\"type\":\"single_choice|multi_choice|text\",\"options\":[{\"id\":\"string\",\"label\":\"string\",\"value\":\"string\",\"requiresText\":false}],\"placeholder\":\"string\",\"reason\":\"string\"}]}",
      ].join("\n"),
      normalizedPayload,
      () => fallbackQuestions(normalizedPayload),
      normalizeQuestionsPayload,
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
        "Generate a reusable Assistant Recipe draft and final system prompt.",
        "The final prompt must be organized into sections: Role, Target user, Main purpose, Workflow, Response format, Style rules, Constraints, Examples, Uncertainty behavior, Revision behavior.",
        "Use the user profile only as background context. Do not ask profile questions.",
        "All assistant names, recipe fields, examples, and final system prompt text must be written in English.",
        "Return only valid JSON in this shape: {\"assistantName\":\"string\",\"assistantRecipe\":{\"name\":\"string\",\"purpose\":\"string\",\"targetUser\":\"string\",\"profileContext\":\"string\",\"workflowSteps\":[\"string\"],\"responseFormat\":[\"string\"],\"rules\":[\"string\"],\"examples\":[{\"userMessage\":\"string\",\"assistantResponse\":\"string\"}],\"finalSystemPrompt\":\"string\"},\"finalSystemPrompt\":\"string\"}",
      ].join("\n"),
      normalizedPayload,
      () => fallbackFinalize(normalizedPayload),
      normalizeFinalizePayload,
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
      assistantRecipe: finalized?.assistantRecipe ?? payload?.assistantRecipe ?? null,
    };
  }

  private async callOpenAiJson<T>(
    taskName: string,
    systemPrompt: string,
    payload: unknown,
    fallback: () => T,
    validate: (value: unknown) => T | null,
  ): Promise<T & { source?: "openai" | "fallback"; fallbackReason?: string }> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return { ...fallback(), source: "fallback", fallbackReason: "OPENAI_API_KEY is not configured." };
    }

    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 20000);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
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
      clearTimeout(timeout);

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
