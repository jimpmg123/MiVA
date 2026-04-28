function getCurrentDateLabel(locale) {
  const language = locale === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(language, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date());
}

const profileInstructionMap = {
  useCase: {
    daily: "User need: daily planning. Prioritize schedules, tasks, notes, reminders, and practical next actions.",
    study: "User need: study and writing. Prioritize summaries, drafts, explanations, examples, and clear structure.",
    work: "User need: work support. Prioritize email, documents, decisions, light analysis, and professional tone.",
    fast: "User need: fast casual chat. Answer quickly and avoid unnecessary background.",
    character: "User need: character assistant. Keep a friendly assistant persona while staying useful and concise."
  },
  answerStyle: {
    short: "Answer style: short. Prefer brief answers, compact bullets, and direct recommendations.",
    moderate: "Answer style: moderate. Give enough context to be useful without becoming long.",
    detailed: "Answer style: detailed. Explain steps, reasoning, and tradeoffs when helpful."
  },
  priority: {
    balanced: "Priority: balanced. Balance answer quality, speed, and clarity.",
    speed: "Priority: speed. Prefer fast, simple answers and avoid heavy reasoning unless needed.",
    quality: "Priority: quality. Prefer careful, accurate answers even if they are slightly longer."
  },
  languageUse: {
    korean: "Language preference: Korean-first. Default to Korean.",
    english: "Language preference: English-first. Default to English.",
    both: "Language preference: Korean and English. Use the user's current language, and include English terms only when useful."
  },
  localMode: {
    localOnly: "Operation preference: local only. Do not suggest cloud-only features unless the user asks.",
    cloudOnly: "Operation preference: cloud only. It is acceptable to rely on external AI providers.",
    hybrid: "Operation preference: hybrid. Prefer local-first defaults, but mention cloud or external integrations when they are clearly useful."
  },
  futureFeatures: {
    voice: "Future interest: voice chat. When relevant, consider speech-friendly, concise responses.",
    character: "Future interest: virtual character. Keep responses suitable for a visible assistant character.",
    googleWorkspace: "Future interest: Google Workspace. Calendar, Gmail, Drive, and Google Workspace automation may be added later.",
    files: "Future interest: local files. When relevant, ask for files or context before making claims about documents.",
    tools: "Future interest: tools and MCP. Tool use may be added later, but do not claim tools are available unless explicitly provided.",
    unsure: "Future interest: unsure. Keep defaults simple and avoid advanced setup assumptions."
  }
};

function buildProfileInstructions(profile) {
  if (!profile || typeof profile !== "object") {
    return [];
  }

  const instructions = [];
  for (const key of ["useCase", "answerStyle", "priority", "languageUse", "localMode"]) {
    const value = profile[key];
    const instruction = profileInstructionMap[key]?.[value];
    if (instruction) {
      instructions.push(instruction);
    }
  }

  if (Array.isArray(profile.futureFeatures)) {
    for (const feature of profile.futureFeatures) {
      const instruction = profileInstructionMap.futureFeatures[feature];
      if (instruction) {
        instructions.push(instruction);
      }
    }
  }

  return instructions;
}

export function buildSystemPrompt({ locale = "ko", provider = "ollama", model = "", profile = null } = {}) {
  const languageInstruction = locale === "ko"
    ? "Always answer in natural Korean unless the user explicitly asks for another language. Do not mix in English, Japanese, Chinese, Thai, or other languages unless needed for names, commands, or technical terms."
    : "Always answer in clear English unless the user explicitly asks for another language.";

  const providerInstruction = provider === "ollama"
    ? "You are running as a local model. Prefer concise answers because the model may be lightweight."
    : "You are running through a cloud provider. Be accurate, practical, and transparent when external or paid provider behavior matters.";

  return [
    "You are MiVA, the user's personal AI assistant.",
    languageInstruction,
    "Be practical, concise, and direct. If you are unsure, say so instead of inventing facts.",
    ...buildProfileInstructions(profile),
    `Current date and time in Korea: ${getCurrentDateLabel(locale)}.`,
    `Active provider: ${provider}. Active model: ${model || "unknown"}.`,
    providerInstruction
  ].join("\n");
}

export function normalizeChatMessages(body, systemPrompt) {
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: ["system", "assistant", "user"].includes(message.role) ? message.role : "user",
      content: message.content.trim()
    }))
    .filter((message) => message.content);

  if (typeof body.prompt === "string" && body.prompt.trim()) {
    messages.push({
      role: "user",
      content: body.prompt.trim()
    });
  }

  const withoutSystem = messages.filter((message) => message.role !== "system");
  return [
    {
      role: "system",
      content: systemPrompt
    },
    ...withoutSystem
  ];
}

export function getLastUserMessage(messages) {
  return [...messages].reverse().find((message) => message.role === "user");
}
