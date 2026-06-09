import { invokeCommand, isTauriRuntime } from "../../app/tauri";
import type { ImageAttachment, LibraryItem } from "../../types";

const LIBRARY_STORAGE_KEY = "miva.libraryItems.v1";
const LIBRARY_SCHEMA_VERSION = 1;

export type LibraryItemsStore = {
  schemaVersion: typeof LIBRARY_SCHEMA_VERSION;
  items: LibraryItem[];
  updatedAt: string | null;
};

export const emptyLibraryItemsStore: LibraryItemsStore = {
  schemaVersion: LIBRARY_SCHEMA_VERSION,
  items: [],
  updatedAt: null,
};

function getExtension(name: string) {
  return name.includes(".") ? name.split(".").pop()?.toLowerCase() || "" : "";
}

function normalizeLibraryItem(value: unknown): LibraryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<LibraryItem>;
  const name = typeof source.name === "string" && source.name.trim() ? source.name.trim() : "";
  const path = typeof source.path === "string" && source.path.trim() ? source.path.trim() : "";
  const updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : typeof source.addedAt === "string" ? source.addedAt : "";
  const addedAt = typeof source.addedAt === "string" ? source.addedAt : updatedAt;
  const sizeBytes = Number.isFinite(Number(source.sizeBytes)) ? Math.max(0, Math.round(Number(source.sizeBytes))) : 0;

  if (!name || !path || !updatedAt) {
    return null;
  }

  return {
    id: typeof source.id === "string" && source.id ? source.id : `${path}:${updatedAt}`,
    type: source.type === "image" ? "image" : "file",
    name,
    path,
    extension: typeof source.extension === "string" ? source.extension : getExtension(name),
    mimeType: typeof source.mimeType === "string" ? source.mimeType : undefined,
    sizeBytes,
    addedAt,
    updatedAt,
    source: "runtime",
    previewUrl: typeof source.previewUrl === "string" && source.previewUrl.startsWith("data:image/") ? source.previewUrl : undefined,
  };
}

export function normalizeLibraryItemsStore(value: unknown): LibraryItemsStore {
  if (!value || typeof value !== "object") {
    return emptyLibraryItemsStore;
  }

  const source = value as Partial<LibraryItemsStore>;
  const items = Array.isArray(source.items)
    ? source.items.flatMap((item) => {
        const normalized = normalizeLibraryItem(item);
        return normalized ? [normalized] : [];
      })
    : [];
  const deduped = new Map<string, LibraryItem>();

  items.forEach((item) => {
    const key = item.path.toLowerCase();
    const existing = deduped.get(key);
    if (!existing || item.updatedAt > existing.updatedAt) {
      deduped.set(key, item);
    }
  });

  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    items: Array.from(deduped.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
  };
}

export async function loadLibraryItemsStore() {
  if (isTauriRuntime()) {
    return normalizeLibraryItemsStore(await invokeCommand<unknown>("load_library_items_store"));
  }

  const stored = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
  if (!stored) {
    return emptyLibraryItemsStore;
  }

  try {
    return normalizeLibraryItemsStore(JSON.parse(stored));
  } catch {
    return emptyLibraryItemsStore;
  }
}

export async function saveLibraryItemsStore(store: LibraryItemsStore) {
  const normalized = normalizeLibraryItemsStore({
    ...store,
    updatedAt: new Date().toISOString(),
  });

  if (isTauriRuntime()) {
    return normalizeLibraryItemsStore(await invokeCommand<unknown>("save_library_items_store", { store: normalized }));
  }

  window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createLibraryItemFromImageAttachment(attachment: ImageAttachment): LibraryItem {
  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `library-image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "image",
    name: attachment.name,
    path: attachment.path,
    extension: getExtension(attachment.name),
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    addedAt: now,
    updatedAt: now,
    source: "runtime",
    previewUrl: attachment.previewUrl,
  };
}

export function createLibraryItemFromDocument(input: {
  name: string;
  path: string;
  extension: string;
  sizeBytes: number | null;
}): LibraryItem {
  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `library-file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "file",
    name: input.name,
    path: input.path,
    extension: input.extension || getExtension(input.name),
    sizeBytes: input.sizeBytes ?? 0,
    addedAt: now,
    updatedAt: now,
    source: "runtime",
  };
}
