import type { CharacterEmotion } from "../../types";

/**
 * Hybrid emotion detection for the Live2D character.
 *
 * 1. Keyword detection (local, instant) — scans user input and assistant text
 *    for Korean/English cues. Drives the "tell it to be angry / tease it" flow
 *    with zero model cost.
 * 2. AI mood tag — when reaction mode is "aiCues" the model is asked to append a
 *    single `[[mood:xxx]]` tag. We parse it out, honor it, and always strip it
 *    from displayed text + TTS so it never leaks to the user.
 */

const KEYWORD_RULES: Array<{ emotion: CharacterEmotion; patterns: RegExp }> = [
  {
    emotion: "angry",
    patterns:
      /(화\s*(나|내|났|낸)|짜증|빡쳐|빡침|성질|삐(져|졌|질)|토라|발끈|angry|mad|furious|annoyed|grumpy|pissed)/i,
  },
  {
    emotion: "playful",
    patterns:
      /(놀려|놀리|약\s*올|장난|메롱|ㅋㅋㅋ|ㅎㅎㅎ|tease|teasing|playful|kidding|just kidding|jk|lol|haha)/i,
  },
  {
    emotion: "shy",
    patterns: /(부끄|수줍|민망|쑥스|설레|두근|blush|shy|embarrass|flustered)/i,
  },
  {
    emotion: "sad",
    patterns:
      /(슬퍼|슬프|우울|속상|눈물|울(어|고|었)|외로|미안|sad|sorry|depress|lonely|cry|unhappy)/i,
  },
  {
    emotion: "surprised",
    patterns: /(놀랐|깜짝|헐|대박|소름|어머|와우|surprise|shocked|whoa|wow|omg|no way)/i,
  },
  {
    emotion: "happy",
    patterns:
      /(기뻐|기쁨|행복|신나|좋아|최고|고마워|감사|사랑|happy|glad|great|awesome|thank|love|yay|nice)/i,
  },
];

/**
 * Returns the first matching emotion for the given text, or null. Rules are
 * ordered by intent strength (angry/playful first) so explicit commands like
 * "화내봐" win over an incidental "고마워".
 */
export function detectEmotionFromText(text: string): CharacterEmotion | null {
  if (!text) {
    return null;
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.test(text)) {
      return rule.emotion;
    }
  }

  return null;
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

/** Removes any `[[mood:xxx]]` tags (and any partial trailing tag) from text. */
export function stripMoodTag(text: string): string {
  if (!text) {
    return text;
  }

  return text
    .replace(MOOD_TAG_PATTERN, "")
    // Strip a partial tag still streaming in at the very end (e.g. "[[mood:an").
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
