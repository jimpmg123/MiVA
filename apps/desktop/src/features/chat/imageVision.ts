export const IMAGE_VISION_PROVIDER = "gemini" as const;
export const IMAGE_VISION_MODEL = "gemini-2.5-flash";

export function getDefaultImagePrompt() {
  return "Describe what you see in the attached image(s) and answer the user's question.";
}
