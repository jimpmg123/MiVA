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
    character: "User need: character-ready assistant. Keep normal assistant behavior; visual character settings are configured separately in Studio."
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
    korean: "Stored language preference: Korean-first. If the user's latest message is clearly in English or another language, answer in that language.",
    english: "Stored language preference: English-first. If the user's latest message is clearly in Korean or another language, answer in that language.",
    both: "Stored language preference: Korean and English. Use the user's current message language, and include English terms only when useful."
  },
  localMode: {
    localOnly: "Operation preference: local only. Do not suggest cloud-only features unless the user asks.",
    cloudOnly: "Operation preference: cloud only. It is acceptable to rely on external AI providers.",
    hybrid: "Operation preference: hybrid. Prefer local-first defaults, but mention cloud or external integrations when they are clearly useful."
  },
  futureFeatures: {
    voice: "Future interest: voice chat. When relevant, consider speech-friendly, concise responses.",
    character: "Future interest: virtual character. Do not claim a visible character is active unless Studio character settings are enabled for this assistant.",
    googleWorkspace: "Future interest: Google Workspace. Calendar, Gmail, Drive, and Google Workspace automation may be added later.",
    files: "Future interest: local files. When relevant, ask for files or context before making claims about documents.",
    tools: "Future interest: tools and MCP. Tool use may be added later, but do not claim tools are available unless explicitly provided.",
    unsure: "Future interest: unsure. Keep defaults simple and avoid advanced setup assumptions."
  }
};

function buildProfileInstructions(profile, provider) {
  if (!profile || typeof profile !== "object") {
    return [];
  }

  const instructions = [];
  instructions.push("Preserve meaningful line breaks from the user's message when referring to or rewriting user-provided text. If your answer is more than a few sentences, use natural line breaks so it is easy to read.");
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

  const promptSettings = profile.prompt?.settings;
  if (promptSettings && typeof promptSettings === "object") {
    const simple = promptSettings.simple && typeof promptSettings.simple === "object"
      ? promptSettings.simple
      : null;

    if (simple) {
      if (typeof simple.assistantPurpose === "string" && simple.assistantPurpose.trim()) {
        instructions.push(`Assistant purpose: ${simple.assistantPurpose.trim()}`);
      }

      if (typeof simple.desiredTasks === "string" && simple.desiredTasks.trim()) {
        instructions.push(`User-requested tasks: ${simple.desiredTasks.trim()}`);
      }

      if (typeof simple.preferredTone === "string" && simple.preferredTone.trim()) {
        instructions.push(`Preferred tone: ${simple.preferredTone.trim()}`);
      }

      if (typeof simple.avoidances === "string" && simple.avoidances.trim()) {
        instructions.push(`Avoidances: ${simple.avoidances.trim()}`);
      }
    }

    const toolConnections = promptSettings.toolConnections && typeof promptSettings.toolConnections === "object"
      ? promptSettings.toolConnections
      : null;
    if (toolConnections) {
      const googleWorkspace = toolConnections.googleWorkspace === true;
      const daisoCli = toolConnections.daisoCli === true;

      instructions.push(`Google Workspace profile setting: ${googleWorkspace ? "enabled" : "disabled"}.`);
      if (googleWorkspace) {
        instructions.push("Google Workspace access is usable only when a later Workspace context or Workspace action result is included in this prompt. Do not assume access from the profile setting alone.");
        instructions.push("When Google Workspace context is provided, it was retrieved by MiVA using the user's approved Google permissions. Use that retrieved context to answer the user.");
        instructions.push("Do not claim you lack access if the needed Gmail, Calendar, Drive, Docs, or Sheets information is included in the provided Workspace context.");
        instructions.push("Workspace write actions such as sending email, creating calendar events, editing files, or deleting data require explicit confirmation and a connected tool result. Only say a write action is done after the connected tool confirms completion.");
      } else {
        instructions.push("Google Workspace context is off. You may draft schedules, emails, and workspace plans, but do not claim you used Google apps.");
      }

      instructions.push(`Daiso CLI tool access: ${daisoCli ? "on" : "off"}.`);
      if (daisoCli) {
        instructions.push("When Daiso CLI is available, you may prepare approved Daiso CLI workflows. Ask before tool use and only report completion after the connected CLI confirms it.");
      } else {
        instructions.push("Daiso CLI is off. Do not claim Daiso CLI actions are available or completed.");
      }
    }

    const coding = promptSettings.coding && typeof promptSettings.coding === "object"
      ? promptSettings.coding
      : null;
    if (coding) {
      const capability = coding.capability || "chatOnly";
      const providerPolicy = coding.providerPolicy || "localAllowed";
      const accessMode = coding.accessMode || "readOnly";
      const localExperimental = coding.localExperimental === true;
      const workspaceAllowlistRequired = coding.workspaceAllowlistRequired !== false;

      instructions.push(`Coding capability: ${capability}. Provider policy: ${providerPolicy}. Access mode: ${accessMode}.`);
      if (capability === "codeExplain") {
        instructions.push("Code policy: explain code and reason about snippets, but do not claim file edits or shell commands were performed.");
      } else if (capability === "codeEdit" || capability === "clawCode") {
        instructions.push("Code policy: full code editing and Claw Code workflows require a connected cloud coding model by default.");
        instructions.push("If no connected coding tool confirms a file edit or command result, describe the intended steps instead of claiming completion.");
      } else {
        instructions.push("Code policy: this assistant is not configured for repository work. Keep code help general unless the user changes the assistant capability.");
      }

      if (providerPolicy === "cloudRequired" && provider === "ollama" && !localExperimental) {
        instructions.push("Current model violates the coding policy for code editing. Refuse repository edits and ask the user to switch to a cloud API model.");
      }

      if (workspaceAllowlistRequired) {
        instructions.push("Workspace safety: repository actions require an explicit allowed workspace folder before reading, editing, or running commands.");
      }
    }

    const voice = promptSettings.voice && typeof promptSettings.voice === "object"
      ? promptSettings.voice
      : null;
    if (voice) {
      const stt = voice.stt && typeof voice.stt === "object" ? voice.stt : {};
      const tts = voice.tts && typeof voice.tts === "object" ? voice.tts : {};
      const runtime = voice.runtime && typeof voice.runtime === "object" ? voice.runtime : {};
      instructions.push(`Voice workspace: ${voice.enabled === true ? "enabled" : "disabled"}.`);
      instructions.push(`Speech-to-text provider: ${stt.enabled === true ? stt.provider || "unknown" : "disabled"}. Recording mode: ${stt.recordingMode || "toggleRecording"}. Show transcripts: ${runtime.showTranscripts === false ? "no" : "yes"}.`);
      instructions.push(`Text-to-speech provider: ${tts.enabled === true ? tts.provider || "unknown" : "disabled"}. Auto-speak: ${tts.autoSpeak === true ? "yes" : "no"}.`);
      if (tts.enabled === true && tts.provider && tts.provider !== "disabled") {
        instructions.push("Runtime TTS is connected for this assistant. Your answer may be spoken aloud by MiVA after generation.");
        instructions.push("TTS response style: use natural spoken wording, short paragraphs, and readable punctuation. Avoid large tables, dense lists, and long code blocks unless the user explicitly asks for them.");
        instructions.push("Do not announce that TTS is enabled unless the user asks about voice output.");
      }
      if (voice.enabled === true) {
        instructions.push("Voice policy: keep spoken responses concise and easy to read aloud. Do not claim microphone or audio output is active unless the runtime confirms it.");
      }
      if (runtime.showTranscripts === true) {
        instructions.push("Voice transcript policy: preserve transcript wording when the user asks to review or correct spoken input.");
      }
    }

    const character = promptSettings.character && typeof promptSettings.character === "object"
      ? promptSettings.character
      : null;
    if (character) {
      const characterEnabled = character.enabled === true;
      instructions.push(`Character workspace: ${characterEnabled ? "enabled" : "disabled"}.`);
      if (characterEnabled) {
        if (typeof character.displayName === "string" && character.displayName.trim()) {
          instructions.push(`Character display name: ${character.displayName.trim()}.`);
        }
        if (typeof character.personality === "string" && character.personality.trim()) {
          instructions.push(`Character personality: ${character.personality.trim()}`);
        }
        if (typeof character.userAddress === "string" && character.userAddress.trim()) {
          instructions.push(`User address style: ${character.userAddress.trim()}`);
        }
        if (typeof character.speakingStyle === "string" && character.speakingStyle.trim()) {
          instructions.push(`Character speaking style: ${character.speakingStyle.trim()}`);
        }
        instructions.push(`Character renderer setting: ${character.renderer || "placeholder"}. Runtime visible: ${character.showInRuntime === false ? "no" : "yes"}.`);
        if (character.reactionMode === "aiCues") {
          instructions.push("Character reaction policy: lightweight reaction cues are allowed for future runtime mapping, but do not claim that Live2D motion or visual rendering happened unless the app explicitly confirms it.");
        } else {
          instructions.push("Character reaction policy: use app status only. Do not invent visual expressions, motions, or character actions.");
        }
      } else {
        instructions.push("Character policy: no visible character behavior is active. Do not roleplay visual character actions.");
      }
    }

    if (typeof promptSettings.persona === "string" && promptSettings.persona.trim()) {
      instructions.push(`Persona: ${promptSettings.persona.trim()}`);
    }

    if (typeof promptSettings.roleGoal === "string" && promptSettings.roleGoal.trim()) {
      instructions.push(`Role goal: ${promptSettings.roleGoal.trim()}`);
    }

    if (Array.isArray(promptSettings.responseRules)) {
      for (const rule of promptSettings.responseRules) {
        if (typeof rule === "string" && rule.trim()) {
          instructions.push(`Response rule: ${rule.trim()}`);
        }
      }
    }

    const scheduleRules = promptSettings.scheduleRules && typeof promptSettings.scheduleRules === "object"
      ? promptSettings.scheduleRules
      : null;
    if (scheduleRules) {
      if (scheduleRules.mode === "draftOnly") {
        instructions.push("Schedule tool policy: draft schedules only. You may suggest plans, but you must not claim that calendar events were created, edited, or deleted.");
      } else if (scheduleRules.mode === "confirmBeforeAction") {
        instructions.push("Schedule tool policy: prepare calendar actions and ask for explicit confirmation before any connected calendar tool runs.");
      } else if (scheduleRules.mode === "connectedActions") {
        instructions.push("Schedule tool policy: confirmed calendar actions are allowed only after Google Workspace is connected and the tool confirms completion.");
      }

      if (typeof scheduleRules.timezone === "string" && scheduleRules.timezone.trim()) {
        instructions.push(`Schedule timezone: ${scheduleRules.timezone.trim()}.`);
      }

      if (typeof scheduleRules.reminderPreference === "string" && scheduleRules.reminderPreference.trim()) {
        instructions.push(`Reminder preference: ${scheduleRules.reminderPreference.trim()}`);
      }
    }

    const workspaceRules = promptSettings.workspaceRules && typeof promptSettings.workspaceRules === "object"
      ? promptSettings.workspaceRules
      : null;
    if (workspaceRules) {
      const googleWorkspacePolicy = workspaceRules.googleWorkspace || "disabled";
      const calendarPolicy = workspaceRules.calendar || "disabled";
      instructions.push(`Google Workspace policy: ${googleWorkspacePolicy}. Calendar policy: ${calendarPolicy}.`);
      if (googleWorkspacePolicy === "disabled") {
        instructions.push("Google Workspace tools are not connected. Do not say you can read Gmail, Drive, or Calendar yet.");
      } else {
        instructions.push("Google Workspace lookup is allowed when Workspace context is present in this prompt. Do not ask for extra permission just to read already-provided Gmail, Calendar, Drive, Docs, or Sheets context. Write actions are allowed only when a Workspace action result confirms completion.");
      }
    }

    if (Array.isArray(promptSettings.safetyRules)) {
      for (const rule of promptSettings.safetyRules) {
        if (typeof rule === "string" && rule.trim()) {
          instructions.push(`Safety rule: ${rule.trim()}`);
        }
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
    ...buildProfileInstructions(profile, provider),
    "If any stored language preference conflicts with the user's latest message language, answer in the user's latest message language.",
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
