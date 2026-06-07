import { ChatMessageImages } from "./ChatMessageImages";
import { ChatSlashChip } from "./ChatSlashChip";
import type { ChatGeneratedImage } from "../types";
import type { ChatSlashCommand } from "../features/chat/slashCommands";
import { CHAT_SLASH_COMMANDS, parseSlashUserMessage } from "../features/chat/slashCommands";

type ChatUserMessageContentProps = {
  content: string;
  images?: ChatGeneratedImage[];
  slashCommands?: ChatSlashCommand[];
};

function stripAttachmentLabels(content: string) {
  return content
    .replace(/\n\nAttached images: [^\n]+/g, "")
    .replace(/\n\nAttached: [^\n]+/g, "")
    .trim();
}

function getVisibleUserText(content: string, hasImages: boolean) {
  const stripped = stripAttachmentLabels(content);
  if (!hasImages) {
    return stripped;
  }

  if (stripped === "Analyze the attached image(s).") {
    return "";
  }

  return stripped;
}

export function ChatUserMessageContent({
  content,
  images = [],
  slashCommands = CHAT_SLASH_COMMANDS,
}: ChatUserMessageContentProps) {
  const parsed = parseSlashUserMessage(content, slashCommands);
  const visibleImages = images;

  if (!parsed) {
    const visibleContent = getVisibleUserText(content, visibleImages.length > 0);

    return (
      <>
        {visibleContent ? <span>{visibleContent}</span> : null}
        {visibleImages.length > 0 ? <ChatMessageImages images={visibleImages} variant="user" /> : null}
      </>
    );
  }

  const visiblePrompt = getVisibleUserText(parsed.prompt, visibleImages.length > 0);
  const visibleSuffix = stripAttachmentLabels(parsed.suffix);

  return (
    <span className="inline-flex flex-col gap-2">
      <span className="inline-flex flex-wrap items-center gap-2">
        <ChatSlashChip command={parsed.command} compact variant="on-primary" />
        {visiblePrompt ? <span>{visiblePrompt}</span> : null}
      </span>
      {visibleSuffix ? <span className="text-[var(--miva-on-primary)]/85">{visibleSuffix}</span> : null}
      {visibleImages.length > 0 ? <ChatMessageImages images={visibleImages} variant="user" /> : null}
    </span>
  );
}
