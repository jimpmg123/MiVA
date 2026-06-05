import type { RuntimeStoredConversation } from "../../types";

export type HistoryAssistantDayCard = {
  assistantId: string;
  assistantName: string;
  modelLabel?: string;
  conversations: RuntimeStoredConversation[];
  messageCount: number;
  preview: string;
  latestUpdatedAt: string;
};

export type HistoryDateGroup = {
  dateKey: string;
  label: string;
  assistants: HistoryAssistantDayCard[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatHistoryDateLabel(dateKey: string, now = new Date()) {
  const todayKey = getLocalDateKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday.toISOString());

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === yesterdayKey) {
    return "Yesterday";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatHistoryCardTime(iso: string) {
  return formatTimeLabel(iso);
}

export function groupHistoryByDateAndAssistant(conversations: RuntimeStoredConversation[]): HistoryDateGroup[] {
  const byDate = new Map<string, Map<string, RuntimeStoredConversation[]>>();

  conversations.forEach((conversation) => {
    if (!conversation.messages.length) {
      return;
    }

    const dateKey = getLocalDateKey(conversation.updatedAt);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, new Map());
    }

    const byAssistant = byDate.get(dateKey)!;
    if (!byAssistant.has(conversation.assistantId)) {
      byAssistant.set(conversation.assistantId, []);
    }

    byAssistant.get(conversation.assistantId)!.push(conversation);
  });

  const groups: HistoryDateGroup[] = [];

  byDate.forEach((assistantMap, dateKey) => {
    const assistants: HistoryAssistantDayCard[] = [];

    assistantMap.forEach((items, assistantId) => {
      const sorted = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      const allMessages = sorted.flatMap((conversation) => conversation.messages);
      const lastMessage = allMessages[allMessages.length - 1];

      assistants.push({
        assistantId,
        assistantName: sorted[0]?.assistantName?.trim() || "Assistant",
        modelLabel: sorted.find((conversation) => conversation.modelLabel)?.modelLabel,
        conversations: sorted,
        messageCount: allMessages.length,
        preview: lastMessage?.content.trim().slice(0, 180) || "",
        latestUpdatedAt: sorted[0]?.updatedAt ?? new Date().toISOString(),
      });
    });

    assistants.sort((left, right) => right.latestUpdatedAt.localeCompare(left.latestUpdatedAt));
    groups.push({
      dateKey,
      label: formatHistoryDateLabel(dateKey),
      assistants,
    });
  });

  return groups.sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}
