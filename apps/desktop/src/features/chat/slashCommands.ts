import type { LocalAssistantProfile, WorkspaceServiceId } from "../../types";

export type ChatSlashCommandId =
  | "google-calendar"
  | "google-docs"
  | "gmail"
  | "google-sheets"
  | "daiso";

export type ChatSlashCommand = {
  id: ChatSlashCommandId;
  aliases: string[];
  label: string;
  description: string;
  icon: string;
  workspaceService?: WorkspaceServiceId;
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
    id: "daiso",
    aliases: ["daiso-cli", "daiso_cli", "daiso"],
    label: "Daiso CLI",
    description: "Run approved local Daiso CLI workflows",
    icon: "terminal",
  },
];

export function findSlashCommand(slug: string) {
  const normalized = slug.trim().toLowerCase();
  return CHAT_SLASH_COMMANDS.find((command) => (
    command.id === normalized || command.aliases.includes(normalized)
  )) ?? null;
}

export function parseSlashCommand(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/([\w-]+)(?:\s+([\s\S]*))?$/);
  if (!match) {
    return null;
  }

  const command = findSlashCommand(match[1]);
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

export function filterSlashCommands(query: string | null) {
  if (query === null) {
    return [];
  }

  if (!query) {
    return CHAT_SLASH_COMMANDS;
  }

  return CHAT_SLASH_COMMANDS.filter((command) => (
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

export function applySlashCommandProfile(
  profile: LocalAssistantProfile,
  commandId: ChatSlashCommandId,
): LocalAssistantProfile {
  const command = CHAT_SLASH_COMMANDS.find((entry) => entry.id === commandId);
  if (command?.workspaceService) {
    return enableGoogleWorkspaceService(profile, command.workspaceService);
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
