import type { ImportedSkill, LocalAssistantProfile, WorkspaceServiceId } from "../../types";
import type { Locale } from "../../i18n";

export type BuiltinChatSlashCommandId =
  | "google-calendar"
  | "google-docs"
  | "google-drive"
  | "gmail"
  | "google-sheets"
  | "daiso"
  | "code"
  | "fix"
  | "image";

export type ChatSlashCommand = {
  id: string;
  aliases: string[];
  label: string;
  description: string;
  icon: string;
  workspaceService?: WorkspaceServiceId;
  importedSkillId?: string;
};

const GOOGLE_SLASH_COMMANDS: ChatSlashCommand[] = [
  {
    id: "google-calendar",
    aliases: ["calendar", "google-calendar", "gcal"],
    label: "Google Calendar",
    description: "Create, update, or check calendar events with confirmation",
    icon: "calendar_month",
    workspaceService: "calendar",
  },
  {
    id: "google-docs",
    aliases: ["docs", "google-docs", "gdocs"],
    label: "Google Docs",
    description: "Read or append content in Google Docs with confirmation",
    icon: "description",
    workspaceService: "docs",
  },
  {
    id: "google-drive",
    aliases: ["drive", "google-drive", "gdrive"],
    label: "Google Drive",
    description: "Read file metadata and find relevant Drive files for this assistant",
    icon: "folder",
    workspaceService: "drive",
  },
  {
    id: "gmail",
    aliases: ["gmail", "mail", "email"],
    label: "Gmail",
    description: "Read recent Gmail context for this assistant",
    icon: "mail",
    workspaceService: "gmail",
  },
  {
    id: "google-sheets",
    aliases: ["sheets", "google-sheets", "spreadsheet"],
    label: "Google Sheets",
    description: "Read spreadsheet context for this assistant",
    icon: "table",
    workspaceService: "sheets",
  },
];

export const CHAT_SLASH_COMMANDS: ChatSlashCommand[] = [
  ...GOOGLE_SLASH_COMMANDS,
  {
    id: "code",
    aliases: ["code", "claw", "claw-code"],
    label: "Claw Code",
    description: "Route this message through OpenAI Claw Code for local file work",
    icon: "code",
  },
  {
    id: "daiso",
    aliases: ["daiso-cli", "daiso_cli", "daiso"],
    label: "Daiso CLI",
    description: "Run approved local Daiso CLI workflows",
    icon: "terminal",
  },
  {
    id: "fix",
    aliases: ["fix", "prompt-fix", "rule"],
    label: "Fix prompt",
    description: "Save this feedback as a durable assistant prompt rule",
    icon: "rule_settings",
  },
  {
    id: "image",
    aliases: ["image", "img", "draw", "picture"],
    label: "Image generation",
    description: "Generate an image with Hugging Face Inference API",
    icon: "image",
  },
];

function importedSkillToSlashCommand(skill: ImportedSkill): ChatSlashCommand {
  return {
    id: skill.slug,
    aliases: [skill.slug],
    label: skill.name,
    description: skill.description,
    icon: skill.icon,
    importedSkillId: skill.id,
  };
}

export function buildSlashCommandsForProfile(profile: LocalAssistantProfile) {
  const imported = (profile.capabilities.skills?.imported ?? [])
    .filter((skill) => skill.enabled)
    .map(importedSkillToSlashCommand);

  return [...CHAT_SLASH_COMMANDS, ...imported];
}

export function getImportedSkillContent(profile: LocalAssistantProfile, command: ChatSlashCommand) {
  if (!command.importedSkillId) {
    return null;
  }

  return profile.capabilities.skills?.imported?.find((skill) => skill.id === command.importedSkillId)?.content ?? null;
}

export function findSlashCommand(slug: string, commands: ChatSlashCommand[] = CHAT_SLASH_COMMANDS) {
  const normalized = slug.trim().toLowerCase();
  return commands.find((command) => (
    command.id === normalized || command.aliases.includes(normalized)
  )) ?? null;
}

export function parseSlashCommand(input: string, commands: ChatSlashCommand[] = CHAT_SLASH_COMMANDS) {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/([\w-]+)(?:\s+([\s\S]*))?$/);
  if (!match) {
    return null;
  }

  const command = findSlashCommand(match[1], commands);
  if (!command) {
    return null;
  }

  const prompt = (match[2] ?? "").trim();
  return { command, prompt };
}

export function getSlashMenuQuery(input: string, caretIndex = input.length) {
  const beforeCaret = input.slice(0, caretIndex);
  const match = beforeCaret.match(/(?:^|\s)\/([\w-]*)$/);
  if (!match) {
    return null;
  }

  return match[1].toLowerCase();
}

export function filterSlashCommands(query: string | null, commands: ChatSlashCommand[] = CHAT_SLASH_COMMANDS) {
  if (query === null) {
    return [];
  }

  if (!query) {
    return commands;
  }

  return commands.filter((command) => (
    command.id.includes(query)
    || command.aliases.some((alias) => alias.includes(query))
    || command.label.toLowerCase().includes(query)
  ));
}

export function buildSlashCommandInput(command: ChatSlashCommand) {
  return `/${command.id}`;
}

export function formatSlashUserMessage(command: ChatSlashCommand, prompt: string) {
  const trimmedPrompt = prompt.trim();
  return trimmedPrompt ? `[${command.label}] ${trimmedPrompt}` : `[${command.label}]`;
}

const slashHelpExamples: Record<BuiltinChatSlashCommandId, { en: string; ko: string }> = {
  "google-calendar": {
    en: "add a meeting tomorrow at 3 PM",
    ko: "내일 오후 3시 회의 추가",
  },
  "google-docs": {
    en: "append a summary to my report",
    ko: "보고서에 요약 추가",
  },
  "google-drive": {
    en: "find my project proposal PDF",
    ko: "프로젝트 제안서 PDF 찾아줘",
  },
  gmail: {
    en: "summarize recent inbox messages",
    ko: "최근 받은편지함 요약",
  },
  "google-sheets": {
    en: "summarize this week's sales tab",
    ko: "이번 주 매출 시트 요약",
  },
  code: {
    en: "fix the login bug in App.tsx",
    ko: "App.tsx 로그인 버그 고쳐줘",
  },
  fix: {
    en: "always answer travel plans with a day-by-day checklist",
    ko: "응답 규칙을 영구 반영해줘",
  },
  daiso: {
    en: "list available workflows",
    ko: "사용 가능한 워크플로 보여줘",
  },
  image: {
    en: "a cozy desk with a laptop and coffee",
    ko: "노트북과 커피가 있는 아늑한 책상",
  },
};

export function slashMenuHintCopy(locale: Locale) {
  return locale === "en"
    ? "Select · Enter for explanation"
    : "선택 후 Enter로 설명 보기";
}

export function slashCommandHelpCopy(command: ChatSlashCommand, locale: Locale) {
  const slash = `/${command.aliases[0]}`;

  if (command.importedSkillId) {
    if (locale === "en") {
      return `Add your request after ${slash}. ${command.description}`;
    }

    return `${slash} 뒤에 요청을 입력해 주세요. ${command.description}`;
  }

  const example = slashHelpExamples[command.id as BuiltinChatSlashCommandId];
  if (!example) {
    if (locale === "en") {
      return `Add your request after ${slash}.`;
    }

    return `${slash} 뒤에 요청을 입력해 주세요.`;
  }

  if (locale === "en") {
    return `Add your request after ${slash}. Example: ${slash} ${example.en}`;
  }

  return `${slash} 뒤에 요청을 입력해 주세요. 예: ${slash} ${example.ko}`;
}

export type SlashCommandTone = "workspace" | "code" | "tool" | "skill";

export function getSlashCommandTone(command: ChatSlashCommand): SlashCommandTone {
  if (command.importedSkillId || command.id === "image") {
    return "skill";
  }

  if (command.workspaceService) {
    return "workspace";
  }

  if (command.id === "code") {
    return "code";
  }

  return "tool";
}

export function resolveSlashInvocation(
  input: string,
  selectedCommand: ChatSlashCommand | null,
  commands: ChatSlashCommand[] = CHAT_SLASH_COMMANDS,
) {
  const trimmedInput = input.trim();
  const parsedFromInput = trimmedInput ? parseSlashCommand(trimmedInput, commands) : null;

  if (selectedCommand) {
    return {
      command: selectedCommand,
      prompt: trimmedInput,
    };
  }

  return parsedFromInput;
}

export function parseSlashUserMessage(content: string, commands: ChatSlashCommand[] = CHAT_SLASH_COMMANDS) {
  const match = content.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const command = commands.find((entry) => entry.label === match[1]);
  if (!command) {
    return null;
  }

  const attachmentMarker = match[2].search(/\n\nAttached(?: images)?: /);
  const prompt = (attachmentMarker >= 0 ? match[2].slice(0, attachmentMarker) : match[2]).trim();
  const suffix = attachmentMarker >= 0 ? match[2].slice(attachmentMarker).trimStart() : "";

  return {
    command,
    prompt,
    suffix,
  };
}

function enableGoogleWorkspaceService(
  profile: LocalAssistantProfile,
  service: WorkspaceServiceId,
): LocalAssistantProfile {
  const settings = profile.prompt.settings;

  return {
    ...profile,
    prompt: {
      ...profile.prompt,
      settings: {
        ...settings,
        toolConnections: {
          ...settings.toolConnections,
          googleWorkspace: true,
          googleWorkspaceServices: [service],
        },
      },
    },
  };
}

function enableImageGeneration(profile: LocalAssistantProfile): LocalAssistantProfile {
  const skills = profile.capabilities.skills ?? { enabled: false, skillIds: [], imported: [] };
  const skillIds = skills.skillIds ?? [];

  return {
    ...profile,
    capabilities: {
      ...profile.capabilities,
      skills: {
        ...skills,
        enabled: true,
        skillIds: skillIds.includes("image-generation")
          ? skillIds
          : [...skillIds, "image-generation"],
      },
      externalApis: {
        enabled: true,
        providerIds: profile.capabilities.externalApis?.providerIds?.includes("huggingface")
          ? profile.capabilities.externalApis.providerIds
          : [...(profile.capabilities.externalApis?.providerIds ?? []), "huggingface"],
      },
    },
  };
}

function enableClawCode(profile: LocalAssistantProfile): LocalAssistantProfile {
  const settings = profile.prompt.settings;

  return {
    ...profile,
    prompt: {
      ...profile.prompt,
      settings: {
        ...settings,
        coding: {
          capability: "clawCode",
          providerPolicy: "cloudRequired",
          localExperimental: false,
          accessMode: "fileEdits",
          workspaceAllowlistRequired: true,
        },
      },
    },
  };
}

export function applySlashCommandProfile(
  profile: LocalAssistantProfile,
  commandId: string,
  commands: ChatSlashCommand[] = CHAT_SLASH_COMMANDS,
): LocalAssistantProfile {
  const command = commands.find((entry) => entry.id === commandId || entry.aliases.includes(commandId));
  if (command?.importedSkillId) {
    return profile;
  }

  if (command?.workspaceService) {
    return enableGoogleWorkspaceService(profile, command.workspaceService);
  }

  if (commandId === "code") {
    return enableClawCode(profile);
  }

  if (commandId === "image") {
    return enableImageGeneration(profile);
  }

  if (commandId === "fix") {
    return profile;
  }

  const settings = profile.prompt.settings;

  return {
    ...profile,
    prompt: {
      ...profile.prompt,
      settings: {
        ...settings,
        toolConnections: {
          ...settings.toolConnections,
          daisoCli: true,
        },
      },
    },
  };
}
