import type { PersonaPreset, PersonaPresetComment } from './mivaApi';

// Local (browser) persistence layer for Persona Hub interactions that do not yet
// have a backend: saved (bookmarked) shared assistants and user-authored comments.
// These mirror the existing localStorage-based patterns (share drafts, auth).

const SAVED_PRESETS_KEY = 'miva.web.saved-presets.v1';
const PRESET_COMMENTS_KEY = 'miva.web.preset-comments.v1';

export interface SavedPreset {
  id: string;
  icon: PersonaPreset['icon'];
  title: string;
  author: string;
  voice: string;
  character: string;
  useCase: PersonaPreset['useCase'];
  tags: string[];
  description: string;
  downloads: number;
  likes: number;
  savedAt: string;
}

export interface LocalComment extends PersonaPresetComment {
  // Comments authored locally by the current user; editable/deletable.
  own: true;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / serialization errors; persistence is best-effort.
  }
}

// --- Saved (bookmarked) shared assistants ---

export function getSavedPresets(): SavedPreset[] {
  const list = readJson<SavedPreset[]>(SAVED_PRESETS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function isPresetSaved(id: string): boolean {
  return getSavedPresets().some((preset) => preset.id === id);
}

function toSavedPreset(preset: PersonaPreset): SavedPreset {
  return {
    id: preset.id,
    icon: preset.icon,
    title: preset.title,
    author: preset.author,
    voice: preset.voice,
    character: preset.character,
    useCase: preset.useCase,
    tags: preset.tags,
    description: preset.description,
    downloads: preset.downloads,
    likes: preset.likes,
    savedAt: new Date().toISOString(),
  };
}

export function toggleSavedPreset(preset: PersonaPreset): SavedPreset[] {
  const current = getSavedPresets();
  const next = current.some((item) => item.id === preset.id)
    ? current.filter((item) => item.id !== preset.id)
    : [toSavedPreset(preset), ...current];
  writeJson(SAVED_PRESETS_KEY, next);
  return next;
}

export function removeSavedPreset(id: string): SavedPreset[] {
  const next = getSavedPresets().filter((preset) => preset.id !== id);
  writeJson(SAVED_PRESETS_KEY, next);
  return next;
}

// --- User-authored comments (per preset) ---

type CommentsMap = Record<string, LocalComment[]>;

export function getAllLocalComments(): CommentsMap {
  const map = readJson<CommentsMap>(PRESET_COMMENTS_KEY, {});
  return map && typeof map === 'object' ? map : {};
}

export function getLocalComments(presetId: string): LocalComment[] {
  return getAllLocalComments()[presetId] ?? [];
}

function persistComments(map: CommentsMap) {
  writeJson(PRESET_COMMENTS_KEY, map);
}

function makeId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addLocalComment(presetId: string, author: string, body: string): CommentsMap {
  const map = getAllLocalComments();
  const comment: LocalComment = {
    id: makeId(),
    author,
    body,
    createdAt: new Date().toISOString(),
    likes: 0,
    own: true,
  };
  const next: CommentsMap = { ...map, [presetId]: [...(map[presetId] ?? []), comment] };
  persistComments(next);
  return next;
}

export function editLocalComment(presetId: string, commentId: string, body: string): CommentsMap {
  const map = getAllLocalComments();
  const list = map[presetId] ?? [];
  const next: CommentsMap = {
    ...map,
    [presetId]: list.map((comment) => (comment.id === commentId ? { ...comment, body } : comment)),
  };
  persistComments(next);
  return next;
}

export function deleteLocalComment(presetId: string, commentId: string): CommentsMap {
  const map = getAllLocalComments();
  const list = map[presetId] ?? [];
  const next: CommentsMap = { ...map, [presetId]: list.filter((comment) => comment.id !== commentId) };
  persistComments(next);
  return next;
}
