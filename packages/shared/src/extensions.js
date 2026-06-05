export const cloudModelCatalog = [
  {
    id: "gemini-2.5-pro",
    provider: "gemini",
    label: "Gemini 2.5 Pro",
    category: "Stable large model",
    summary: {
      ko: "Korean copy pending",
      en: "A stable large Gemini model for higher-quality assistant work with a 1M+ context window.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "High-quality answers, long context, Google Workspace preparation",
    },
    status: {
      ko: "Korean copy pending",
      en: "API key required",
    },
  },
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    label: "Gemini 2.5 Flash",
    category: "Balanced cloud",
    summary: {
      ko: "Korean copy pending",
      en: "A balanced Gemini model for everyday cloud assistant testing.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "General chat, quick work support, Google Workspace preparation",
    },
    status: {
      ko: "Korean copy pending",
      en: "API key required",
    },
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o mini",
    category: "Balanced cloud",
    summary: {
      ko: "Korean copy pending",
      en: "A balanced cloud candidate for general assistant tasks with lightweight cost and latency.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "General assistant, writing, work support",
    },
    status: {
      ko: "Korean copy pending",
      en: "API key required",
    },
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    label: "GPT-4.1 mini",
    category: "Reasoning cloud",
    summary: {
      ko: "Korean copy pending",
      en: "A cloud candidate for document and work support when quality matters more.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Documents, email, light analysis",
    },
    status: {
      ko: "Korean copy pending",
      en: "Later integration",
    },
  },
  {
    id: "gemini-2.5-flash-lite",
    provider: "gemini",
    label: "Gemini 2.5 Flash Lite",
    category: "Fast lightweight",
    summary: {
      ko: "Korean copy pending",
      en: "A faster, lighter Gemini fallback for low-latency and quota-sensitive testing.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Fast responses, lightweight assistant tasks, quota fallback",
    },
    status: {
      ko: "Korean copy pending",
      en: "API key required",
    },
  },
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    label: "Llama 3.1 8B Instant",
    category: "Fast cloud",
    summary: {
      ko: "Korean copy pending",
      en: "A fast Groq-hosted Llama model for low-latency assistant testing.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Fast responses, lightweight Workspace follow-ups, low-latency chat",
    },
    status: {
      ko: "Korean copy pending",
      en: "API key required",
    },
  },
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    label: "Llama 3.3 70B Versatile",
    category: "High-speed large model",
    summary: {
      ko: "Korean copy pending",
      en: "A larger Groq-hosted Llama model for stronger general assistant quality.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Work support, writing, analysis, cloud coding experiments",
    },
    status: {
      ko: "Korean copy pending",
      en: "API key required",
    },
  },
  {
    id: "custom-cloud",
    provider: "openai",
    label: "Custom API Model",
    category: "Placeholder",
    summary: {
      ko: "Korean copy pending",
      en: "Manual provider and model-name entry will be added later.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Custom cloud provider setup",
    },
    status: {
      ko: "Korean copy pending",
      en: "Coming soon",
    },
  },
];

function modelsForProvider(provider) {
  return cloudModelCatalog.filter((model) => model.provider === provider);
}

export const cloudProviderManifests = [
  {
    id: "openai",
    label: "OpenAI",
    mode: "cloud",
    icon: "cloud",
    auth: {
      type: "apiKey",
      envKey: "OPENAI_API_KEY",
      label: "OpenAI API key",
      placeholder: "sk-...",
      helpUrl: "https://platform.openai.com/api-keys",
    },
    defaultModel: "gpt-4o-mini",
    defaultModelEnvKey: "OPENAI_DEFAULT_MODEL",
    capabilities: ["chat", "toolContext"],
    models: modelsForProvider("openai"),
  },
  {
    id: "gemini",
    label: "Gemini",
    mode: "cloud",
    icon: "auto_awesome",
    auth: {
      type: "apiKey",
      envKey: "GEMINI_API_KEY",
      label: "Gemini API key",
      placeholder: "AIza...",
      helpUrl: "https://aistudio.google.com/app/apikey",
    },
    defaultModel: "gemini-2.5-flash",
    defaultModelEnvKey: "GEMINI_DEFAULT_MODEL",
    capabilities: ["chat", "toolContext"],
    models: modelsForProvider("gemini"),
  },
  {
    id: "groq",
    label: "Groq",
    mode: "cloud",
    icon: "bolt",
    auth: {
      type: "apiKey",
      envKey: "GROQ_API_KEY",
      label: "Groq API key",
      placeholder: "gsk_...",
      helpUrl: "https://console.groq.com/keys",
    },
    defaultModel: "llama-3.1-8b-instant",
    defaultModelEnvKey: "GROQ_DEFAULT_MODEL",
    capabilities: ["chat", "toolContext"],
    models: modelsForProvider("groq"),
  },
];

export const providerManifestList = [
  {
    id: "ollama",
    label: "Ollama",
    mode: "local",
    icon: "dns",
    auth: {
      type: "none",
    },
    defaultModel: "llama3.2:3b",
    capabilities: ["chat", "streaming", "localRuntime"],
  },
  ...cloudProviderManifests,
];

export const providerManifests = Object.fromEntries(
  providerManifestList.map((provider) => [provider.id, provider]),
);

export const providerMeta = Object.fromEntries(
  providerManifestList.map((provider) => [
    provider.id,
    {
      label: provider.label,
      mode: provider.mode,
      icon: provider.icon,
    },
  ]),
);

export const allowedProviderIds = Object.keys(providerManifests);

export const toolManifestList = [
  {
    id: "googleWorkspace",
    title: "Google apps",
    label: "Google Calendar, Gmail, Drive, Docs, Sheets",
    icon: "workspaces",
    description: "Uses direct Google APIs to provide Gmail, Drive, Docs, Calendar, and Sheets context after OAuth.",
    role: "Lets the assistant answer with retrieved Workspace context. Write actions still require a MiVA confirmation before external services are changed.",
    features: ["Calendar context", "Gmail summaries", "Drive and Docs context"],
    auth: {
      type: "oauth",
    },
    capabilities: ["readContext", "writeAction", "oauth", "confirmationRequired"],
    confirmation: {
      writeActions: "required",
    },
    prompt: {
      enabled: [
        "Google Workspace access is usable only when a later Workspace context or Workspace action result is included in this prompt. Do not assume access from the profile setting alone.",
        "When Google app context is provided, it was retrieved by MiVA using the user's approved Google permissions. Use that retrieved context to answer the user.",
        "Do not claim you lack access if the needed Gmail, Google Calendar, Google Drive, Google Docs, or Google Sheets information is included in the provided context.",
        "Write actions such as creating Google Calendar events, updating Google Docs, or deleting data require explicit confirmation and a connected tool result. Only say a write action is done after the connected tool confirms completion. Never invent progress messages such as 'adding to calendar now' without a tool result.",
      ],
      disabled: [
        "Google Workspace context is off. You may draft schedules, emails, and workspace plans, but do not claim you used Google apps.",
      ],
    },
  },
  {
    id: "daisoCli",
    title: "Daiso CLI",
    label: "Daiso",
    icon: "terminal",
    description: "Runs approved Daiso CLI workflows for read-only Korean retail, convenience, place, fuel price, and cinema lookups.",
    role: "Lets the assistant use Daiso CLI context included by MiVA. It must only report lookup completion after the connected CLI confirms it.",
    features: ["Approved CLI workflows", "Read-only local command bridge", "Live external lookup context"],
    auth: {
      type: "localRuntime",
    },
    capabilities: ["readContext", "localCommand"],
    confirmation: {
      writeActions: "none",
    },
    prompt: {
      enabled: [
        "When Daiso CLI is available, you may use Daiso CLI context included by MiVA for read-only Korean retail, convenience store, place, fuel price, and cinema lookups.",
        "If a Daiso CLI result is included in the prompt, summarize that result instead of claiming the tool is unavailable. Only report lookup completion after the connected CLI result is present.",
        "If no Daiso CLI result is included, prepare the workflow or ask the user to use the /daiso command before claiming live retail, inventory, place, fuel, or cinema data was checked.",
      ],
      disabled: [
        "Daiso CLI is off. Do not claim Daiso CLI actions are available or completed.",
      ],
    },
  },
];

export const toolManifests = Object.fromEntries(
  toolManifestList.map((tool) => [tool.id, tool]),
);

export function getProviderManifest(provider) {
  return providerManifests[provider] || null;
}

export function isProviderAllowed(provider) {
  return Boolean(getProviderManifest(provider));
}

export function getProviderDefaultModel(provider) {
  return getProviderManifest(provider)?.defaultModel || providerManifests.ollama.defaultModel;
}

export function getProviderEnvKey(provider) {
  const auth = getProviderManifest(provider)?.auth;
  return auth?.type === "apiKey" ? auth.envKey : null;
}

export function getToolManifest(toolId) {
  return toolManifests[toolId] || null;
}

export function buildProviderCapabilityInstructions(provider) {
  const manifest = getProviderManifest(provider);
  if (!manifest) {
    return [`Active provider is not registered in MiVA provider manifests: ${provider}.`];
  }

  const instructions = [
    `Provider manifest: ${manifest.label}. Mode: ${manifest.mode}. Capabilities: ${manifest.capabilities.join(", ")}.`,
  ];

  if (manifest.capabilities.includes("toolContext")) {
    instructions.push("Provider capability: this model can receive MiVA-provided tool context when the runtime includes it.");
  }

  if (manifest.capabilities.includes("localRuntime")) {
    instructions.push("Provider capability: this model runs locally and may be slower with long prompts.");
  }

  return instructions;
}

export function buildToolCapabilityInstructions(toolConnections = {}) {
  const instructions = [];

  for (const tool of toolManifestList) {
    const enabled = toolConnections?.[tool.id] === true;
    instructions.push(`${tool.title} profile setting: ${enabled ? "enabled" : "disabled"}.`);
    instructions.push(...(enabled ? tool.prompt.enabled : tool.prompt.disabled));
  }

  return instructions;
}
