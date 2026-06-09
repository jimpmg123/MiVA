import { Injectable } from "@nestjs/common";
import { lightweightModels } from "../../../packages/shared/src/index.js";

type PersonaPreset = {
  id: string;
  icon: "desk" | "tutor" | "focus" | "character";
  title: string;
  author: string;
  voice: string;
  character: string;
  useCase: "daily" | "study" | "work" | "character";
  tags: string[];
  description: string;
  updatedAt: string;
  featured?: boolean;
  voiceFocused?: boolean;
  characterFocused?: boolean;
  downloads: number;
  likes: number;
  commentCount: number;
  comments: Array<{
    id: string;
    author: string;
    body: string;
    createdAt: string;
    likes: number;
  }>;
};

const personaPresetSeeds: PersonaPreset[] = [
  {
    id: "preset-nova",
    icon: "desk",
    title: "Nova Crystal - Calm Desk Companion",
    author: "mina.k",
    voice: "Solomon Deep",
    character: "Nova Crystal",
    useCase: "daily",
    tags: ["2D Avatar", "Korean", "Low VRAM"],
    description:
      "A quiet office assistant preset with soft TTS, short answers, and a prepared character profile for later Live2D use.",
    updatedAt: "2026-06-04T09:12:00.000Z",
    featured: true,
    voiceFocused: true,
    characterFocused: true,
    downloads: 1284,
    likes: 312,
    commentCount: 2,
    comments: [
      {
        id: "c1",
        author: "jay.p",
        body: "Imported this on an 8GB laptop. Voice latency is manageable, and the prompt style is calm.",
        createdAt: "2026-06-04T11:20:00.000Z",
        likes: 14,
      },
      {
        id: "c2",
        author: "studio.team",
        body: "This is server-seeded placeholder data until the preset schema is finalized.",
        createdAt: "2026-06-03T18:02:00.000Z",
        likes: 8,
      },
    ],
  },
  {
    id: "preset-lyra",
    icon: "tutor",
    title: "Lyra Spark - Friendly Tutor",
    author: "edu.lab",
    voice: "Lyra Bright",
    character: "Pixel Mentor",
    useCase: "study",
    tags: ["TTS", "Step-by-step", "EN/KR"],
    description:
      "A study-focused preset with slower response rhythm, example-based explanations, and a lightweight character profile.",
    updatedAt: "2026-06-03T14:40:00.000Z",
    voiceFocused: true,
    downloads: 892,
    likes: 201,
    commentCount: 1,
    comments: [
      {
        id: "c3",
        author: "hana.lee",
        body: "The step-by-step prompt is useful for homework and short concept reviews.",
        createdAt: "2026-06-03T16:10:00.000Z",
        likes: 11,
      },
    ],
  },
  {
    id: "preset-sol",
    icon: "focus",
    title: "Solomon Night - Focus Mode",
    author: "dev.local",
    voice: "Solomon Deep",
    character: "Minimal Orb",
    useCase: "work",
    tags: ["No Avatar", "Focus", "Short answers"],
    description:
      "A low-distraction work preset for coding sessions, notes, and late-night task support.",
    updatedAt: "2026-06-02T22:15:00.000Z",
    voiceFocused: true,
    downloads: 654,
    likes: 148,
    commentCount: 1,
    comments: [
      {
        id: "c4",
        author: "codex.user",
        body: "No character overlay keeps the runtime light while preserving the assistant behavior.",
        createdAt: "2026-06-02T23:01:00.000Z",
        likes: 6,
      },
    ],
  },
  {
    id: "preset-hana",
    icon: "character",
    title: "Hana Bloom - Character-first",
    author: "art.miva",
    voice: "Custom Warm",
    character: "Hana Bloom",
    useCase: "character",
    tags: ["Live2D-ready", "Reactive", "Emotive"],
    description:
      "A character-oriented preset prepared for expressive reactions, longer greetings, and future Live2D rendering.",
    updatedAt: "2026-06-01T08:30:00.000Z",
    characterFocused: true,
    downloads: 421,
    likes: 97,
    commentCount: 2,
    comments: [
      {
        id: "c5",
        author: "overlay.fan",
        body: "This would work well once the runtime renderer is connected.",
        createdAt: "2026-06-01T12:44:00.000Z",
        likes: 19,
      },
      {
        id: "c6",
        author: "miva.team",
        body: "Pinned as a placeholder for Phase 2 community import.",
        createdAt: "2026-05-30T09:00:00.000Z",
        likes: 22,
      },
    ],
  },
];

@Injectable()
export class CatalogService {
  getCatalogModels() {
    return { models: lightweightModels };
  }

  getPersonaPresets() {
    return {
      presets: personaPresetSeeds,
      source: "server-placeholder",
      schemaVersion: "draft-1",
    };
  }
}
