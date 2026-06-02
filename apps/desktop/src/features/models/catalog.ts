import type { CloudModelInfo, ModelInfo, ProviderId, ProviderMode } from "../../types";
export const modelCatalog: ModelInfo[] = [
  {
    id: "qwen3-4b",
    name: "qwen3:4b",
    label: "Qwen3 4B",
    category: "Default",
    summary: {
      ko: "Korean copy pending",
      en: "The safest Phase 1 default for Korean and general assistant work.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Planning, writing, general questions",
    },
    recommendedRamGb: 12,
  },
  {
    id: "exaone3.5-2.4b",
    name: "exaone3.5:2.4b",
    label: "EXAONE 3.5 2.4B",
    category: "Korean / compact",
    summary: {
      ko: "Korean copy pending",
      en: "A compact Korean/English bilingual model from LG AI Research, suitable for small-device local testing.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Korean chat, lightweight local assistant, lower-spec PCs",
    },
    recommendedRamGb: 8,
    downloadSizeLabel: "1.6 GB",
  },
  {
    id: "exaone3.5-7.8b",
    name: "exaone3.5:7.8b",
    label: "EXAONE 3.5 7.8B",
    category: "Korean / higher quality",
    summary: {
      ko: "Korean copy pending",
      en: "A larger Korean/English bilingual local model for better answer quality when the PC has enough memory.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Korean assistant quality, writing, long-context tests",
    },
    recommendedRamGb: 16,
    downloadSizeLabel: "4.8 GB",
  },
  {
    id: "llama3.2-3b",
    name: "llama3.2:3b",
    label: "Llama 3.2 3B",
    category: "Low-spec",
    summary: {
      ko: "Korean copy pending",
      en: "A compact model for lower-spec PCs or quick setup tests.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Fast casual chat, lower-spec PCs",
    },
    recommendedRamGb: 8,
  },
  {
    id: "gemma3-4b",
    name: "gemma3:4b",
    label: "Gemma 3 4B",
    category: "Balanced",
    summary: {
      ko: "Korean copy pending",
      en: "A lightweight general assistant candidate, especially worth testing for English-first use.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "General chat, light productivity support",
    },
    recommendedRamGb: 12,
  },
  {
    id: "phi3-mini",
    name: "phi3:mini",
    label: "Phi-3 Mini",
    category: "Ultralight",
    summary: {
      ko: "Korean copy pending",
      en: "An ultralight fallback that prioritizes running locally over answer quality.",
    },
    bestFor: {
      ko: "Korean copy pending",
      en: "Minimum-spec checks, install verification",
    },
    recommendedRamGb: 8,
  },
];

export const cloudModelCatalog: CloudModelInfo[] = [
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

export const providerMeta: Record<ProviderId, { label: string; mode: ProviderMode; icon: string }> = {
  ollama: { label: "Ollama", mode: "local", icon: "dns" },
  openai: { label: "OpenAI", mode: "cloud", icon: "cloud" },
  gemini: { label: "Gemini", mode: "cloud", icon: "auto_awesome" },
  groq: { label: "Groq", mode: "cloud", icon: "bolt" },
};

export function getModelByName(name: string) {
  return modelCatalog.find((model) => model.name === name) ?? modelCatalog[0];
}

export function getCloudModelById(id: string) {
  return cloudModelCatalog.find((model) => model.id === id) ?? cloudModelCatalog[0];
}
