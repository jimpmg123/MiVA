import type { ChatUiAction, ImageAttachmentPayload, LocalAssistantProfile, ProviderId } from "../../types";
import type { ChatMessage } from "../../types";

const LOCAL_HELPER_URL = "http://127.0.0.1:43110";

export type StreamChatInput = {
  provider: ProviderId;
  model: string;
  prompt: string;
  locale: string;
  apiKey: string | null;
  openAiApiKey?: string | null;
  authToken?: string | null;
  profile: LocalAssistantProfile;
  messages?: Pick<ChatMessage, "role" | "content">[];
  memorySummary?: string | null;
  toolContext?: string | null;
  imageAttachments?: ImageAttachmentPayload[];
  clawCodeForced?: boolean;
  workspaceSlashForced?: boolean;
};

function parseStreamError(text: string) {
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return data.message || data.error || text;
  } catch {
    return text.trim() || "Chat stream failed.";
  }
}

export type StreamChatResult = {
  answer: string;
  uiAction: ChatUiAction | null;
};

export async function streamChatOnce(
  input: StreamChatInput,
  callbacks: {
    onDelta: (delta: string) => void;
  },
  signal?: AbortSignal,
): Promise<StreamChatResult> {
  const response = await fetch(`${LOCAL_HELPER_URL}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseStreamError(text));
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Chat stream returned no body.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let uiAction: ChatUiAction | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      let event: {
        error?: string;
        done?: boolean;
        answer?: string;
        uiAction?: ChatUiAction | null;
        message?: { content?: string };
      };

      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.error) {
        throw new Error(event.error);
      }

      if (typeof event.message?.content === "string" && event.message.content.length > 0) {
        answer += event.message.content;
        callbacks.onDelta(event.message.content);
      }

      if (event.done) {
        if (typeof event.answer === "string" && event.answer.trim()) {
          answer = event.answer.trim();
        }
        if (event.uiAction === "claw-pick-workspace") {
          uiAction = event.uiAction;
        }
      }
    }
  }

  if (!answer.trim() && buffer.trim()) {
    try {
      const payload = JSON.parse(buffer.trim()) as { answer?: string; uiAction?: ChatUiAction | null };
      if (typeof payload.answer === "string" && payload.answer.trim()) {
        answer = payload.answer.trim();
        callbacks.onDelta(answer);
      }
      if (payload.uiAction === "claw-pick-workspace") {
        uiAction = payload.uiAction;
      }
    } catch {
      // Ignore non-JSON fallback payloads.
    }
  }

  return {
    answer: answer.trim(),
    uiAction,
  };
}
