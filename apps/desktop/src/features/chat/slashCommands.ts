import type { LocalAssistantProfile, WorkspaceServiceId } from "../../types";

export type ChatSlashCommandId = "workspace" | "daiso";

export type ChatSlashCommand = {
  id: ChatSlashCommandId;
  aliases: string[];
  label: string;
  description: string;
  icon: string;
};

export const CHAT_SLASH_COMMANDS: ChatSlashCommand[] = [
  {
    id: "workspace",
    aliases: ["google-workspace", "google", "workspace"],
    label: "Google Workspace",
    description: "Gmail, Calendar, Drive, Docs, and Sheets",
    icon: "workspaces",
  },
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

export function applySlashCommandProfile(
  profile: LocalAssistantProfile,
  commandId: ChatSlashCommandId,
): LocalAssistantProfile {
  const settings = profile.prompt.settings;

  if (commandId === "workspace") {
    const services: WorkspaceServiceId[] = settings.toolConnections.googleWorkspaceServices.length
      ? settings.toolConnections.googleWorkspaceServices
      : ["gmail", "calendar", "drive", "docs", "sheets"];

    return {
      ...profile,
      prompt: {
        ...profile.prompt,
        settings: {
          ...settings,
          toolConnections: {
            ...settings.toolConnections,
            googleWorkspace: true,
            googleWorkspaceServices: services,
          },
        },
      },
    };
  }

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
