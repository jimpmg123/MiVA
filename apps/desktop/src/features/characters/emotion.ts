import type { CharacterEmotion } from "../../types";

/**
 * Local command detection is intentionally narrow.
 *
 * MiVA only reacts locally to the exact English phrases "change expression" and
 * "change pose". Korean text and broad emotion words such as happy/angry/sad do
 * not trigger local character changes.
 *
 * AI mood tags are separate: when reaction mode is "aiCues" the model can append
 * a single `[[mood:xxx]]` tag. We parse it out, honor it, and always strip it
 * from displayed text + TTS so it never leaks to the user.
 */

const CHANGE_EXPRESSION_PATTERN = /\bchange\s+expression\b/i;
const CHANGE_POSE_PATTERN = /\bchange\s+pose\b/i;

export type LocalCharacterCommand = {
  expression: boolean;
  pose: boolean;
};

export function detectLocalCharacterCommand(text: string): LocalCharacterCommand {
  return {
    expression: CHANGE_EXPRESSION_PATTERN.test(text),
    pose: CHANGE_POSE_PATTERN.test(text),
  };
}

const MOOD_TAG_PATTERN = /\[\[\s*mood\s*:\s*([a-z]+)\s*\]\]/gi;
const VALID_EMOTIONS: ReadonlySet<string> = new Set<CharacterEmotion>([
  "neutral",
  "happy",
  "angry",
  "sad",
  "surprised",
  "shy",
  "playful",
]);

/** Extracts the last `[[mood:xxx]]` tag from text, if present and valid. */
export function parseMoodTag(text: string): CharacterEmotion | null {
  if (!text) {
    return null;
  }

  let match: RegExpExecArray | null;
  let last: string | null = null;
  MOOD_TAG_PATTERN.lastIndex = 0;
  while ((match = MOOD_TAG_PATTERN.exec(text)) !== null) {
    last = match[1].toLowerCase();
  }

  if (last && VALID_EMOTIONS.has(last)) {
    return last as CharacterEmotion;
  }

  return null;
}

/** Removes any `[[mood:xxx]]` tags and any partial trailing mood tag. */
export function stripMoodTag(text: string): string {
  if (!text) {
    return text;
  }

  return text
    .replace(MOOD_TAG_PATTERN, "")
    .replace(/\[\[\s*mood\s*:?[a-z]*\s*\]?\]?\s*$/i, "")
    .trimEnd();
}

/**
 * Instruction appended to the model context when reaction mode is "aiCues".
 * Kept short and explicit so it survives across providers.
 */
export const MOOD_TAG_INSTRUCTION = [
  "Character mood cue: at the very END of your reply, append exactly one tag on its own line:",
  "[[mood:X]] where X is one of neutral, happy, angry, sad, surprised, shy, playful.",
  "Pick the mood that best matches how the character feels in this reply. Output nothing after the tag.",
].join("\n");
