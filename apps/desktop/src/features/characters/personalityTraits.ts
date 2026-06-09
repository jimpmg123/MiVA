export type PersonalityTrait = {
  id: string;
  label: string;
  /** Phrase injected into the assistant prompt when the trait is selected. */
  phrase: string;
  /** Conflicting trait id that cannot be selected at the same time, if any. */
  opposite: string | null;
};

// 5 opposing pairs (one of each pair can be active) + 2 neutral traits.
export const personalityTraits: PersonalityTrait[] = [
  { id: "bright", label: "Bright", phrase: "bright and cheerful", opposite: "calm" },
  { id: "calm", label: "Calm", phrase: "calm and composed", opposite: "bright" },
  { id: "warm", label: "Warm", phrase: "warm and friendly", opposite: "cool" },
  { id: "cool", label: "Cool", phrase: "cool and reserved", opposite: "warm" },
  { id: "playful", label: "Playful", phrase: "playful and witty", opposite: "serious" },
  { id: "serious", label: "Serious", phrase: "serious and focused", opposite: "playful" },
  { id: "polite", label: "Polite", phrase: "polite and courteous", opposite: "blunt" },
  { id: "blunt", label: "Blunt", phrase: "frank and straightforward", opposite: "polite" },
  { id: "logical", label: "Logical", phrase: "logical and analytical", opposite: "emotional" },
  { id: "emotional", label: "Emotional", phrase: "emotional and empathetic", opposite: "logical" },
  { id: "caring", label: "Caring", phrase: "caring and considerate", opposite: null },
  { id: "curious", label: "Curious", phrase: "curious and eager to learn", opposite: null },
];

const traitById = new Map(personalityTraits.map((trait) => [trait.id, trait]));
const traitOrder = personalityTraits.map((trait) => trait.id);

/** Keep only valid ids, in canonical order, dropping duplicates and conflicting opposites. */
export function normalizePersonalityTraits(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const selected: string[] = [];
  for (const id of traitOrder) {
    if (!ids.includes(id)) {
      continue;
    }
    const opposite = traitById.get(id)?.opposite;
    if (opposite && selected.includes(opposite)) {
      continue;
    }
    selected.push(id);
  }
  return selected;
}

/** Build the personality sentence injected into the prompt from selected trait ids. */
export function buildPersonalityFromTraits(ids: string[]): string {
  const phrases = ids
    .map((id) => traitById.get(id)?.phrase)
    .filter((phrase): phrase is string => Boolean(phrase));
  if (phrases.length === 0) {
    return "";
  }
  const sentence = phrases.join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
