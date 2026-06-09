import type { CharacterRendererId } from "../../types";

export type CharacterAsset = {
  id: string;
  name: string;
  role: string;
  icon: string;
  previewImage: string | null;
  previewImagePosition?: string;
  renderer: CharacterRendererId;
  live2dModelPath: string;
  personality: string;
  speakingStyle: string;
};

export const characterAssetCatalog: CharacterAsset[] = [
  {
    id: "vtuber-shizuku",
    name: "Shizuku",
    role: "Free Live2D model",
    icon: "face_3",
    previewImage: "/characters/vtuber/shizuku.png",
    renderer: "live2d",
    live2dModelPath: "VtuberLLM/Open-LLM-VTuber-main/live2d-models/shizuku/runtime/shizuku.model3.json",
    personality: "Calm, friendly, and softly supportive while still giving practical answers.",
    speakingStyle: "Use gentle wording, clear line breaks, and short natural reactions.",
  },
  {
    id: "vtuber-mao",
    name: "Mao",
    role: "Free Live2D model",
    icon: "face_4",
    previewImage: "/characters/vtuber/mao.png",
    renderer: "live2d",
    live2dModelPath: "VtuberLLM/Open-LLM-VTuber-main/live2d-models/mao_pro/runtime/mao_pro.model3.json",
    personality: "Bright, expressive, and lightly energetic while staying useful and concise.",
    speakingStyle: "Use upbeat but not noisy wording, with compact paragraphs for spoken output.",
  },
  {
    id: "vtuber-knight",
    name: "Knight",
    role: "Live2D model",
    icon: "shield",
    previewImage: "/characters/vtuber/knight.jpg",
    renderer: "live2d",
    live2dModelPath: "VtuberLLM/Open-LLM-VTuber-main/live2d-models/knight/runtime/knight.model3.json",
    personality: "Steady, composed, and protective while giving clear practical guidance.",
    speakingStyle: "Use confident, concise wording with calm status-oriented reactions.",
  },
  {
    id: "vtuber-takodachi",
    name: "Takodachi",
    role: "Live2D model",
    icon: "sentiment_satisfied",
    previewImage: "/characters/vtuber/takodachi.png",
    renderer: "live2d",
    live2dModelPath: "VtuberLLM/Open-LLM-VTuber-main/live2d-models/takodachi/runtime/takodachi.model3.json",
    personality: "Playful, soft, and cheerful while keeping answers useful and easy to follow.",
    speakingStyle: "Use short friendly reactions, simple wording, and a light playful tone.",
  },
  {
    id: "vtuber-doro",
    name: "Dororong",
    role: "Live2D meme model",
    icon: "mood",
    previewImage: "/characters/vtuber/doro.png",
    renderer: "live2d",
    live2dModelPath: "VtuberLLM/Open-LLM-VTuber-main/live2d-models/doro/runtime/Doro.model3.json",
    personality: "Cheeky, playful, and quick-witted while still being genuinely helpful.",
    speakingStyle: "Use short punchy reactions and a light teasing tone, but keep answers clear.",
  },
  {
    id: "vtuber-pichu",
    name: "Pichu",
    role: "Live2D meme model",
    icon: "bolt",
    previewImage: "/characters/vtuber/pichu.jpg",
    renderer: "live2d",
    live2dModelPath: "VtuberLLM/Open-LLM-VTuber-main/live2d-models/pichu/runtime/Pichu.model3.json",
    personality: "Bubbly, expressive, and a little dramatic while staying genuinely helpful.",
    speakingStyle: "Use short lively reactions with clear emotion, but keep answers easy to follow.",
  },
  {
    id: "miva-default",
    name: "MiVA Default",
    role: "Placeholder assistant",
    icon: "smart_toy",
    previewImage: null,
    renderer: "placeholder",
    live2dModelPath: "",
    personality: "Friendly, calm, and practical.",
    speakingStyle: "Warm but concise. Keep reactions light and not distracting.",
  },
];

export function getCharacterAsset(characterId: string | null | undefined) {
  return characterAssetCatalog.find((asset) => asset.id === characterId) ?? characterAssetCatalog[0];
}
