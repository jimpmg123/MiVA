import { useCallback, useEffect, useState } from "react";
import type { LibraryItem } from "../../types";
import {
  emptyLibraryItemsStore,
  loadLibraryItemsStore,
  saveLibraryItemsStore,
  type LibraryItemsStore,
} from "./storage";

export function useLibraryItems(onLog: (message: string) => void) {
  const [libraryStore, setLibraryStore] = useState<LibraryItemsStore>(emptyLibraryItemsStore);
  const [libraryLoaded, setLibraryLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadLibraryItemsStore()
      .then((store) => {
        if (cancelled) {
          return;
        }
        setLibraryStore(store);
        setLibraryLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setLibraryLoaded(true);
          onLog(`Library load failed: ${String(error)}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onLog]);

  const addLibraryItems = useCallback(async (items: LibraryItem[]) => {
    if (!items.length) {
      return;
    }

    setLibraryStore((current) => {
      const byPath = new Map(current.items.map((item) => [item.path.toLowerCase(), item]));
      items.forEach((item) => {
        const existing = byPath.get(item.path.toLowerCase());
        byPath.set(item.path.toLowerCase(), existing ? { ...existing, ...item, addedAt: existing.addedAt } : item);
      });

      const nextStore: LibraryItemsStore = {
        ...current,
        items: Array.from(byPath.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
        updatedAt: new Date().toISOString(),
      };

      void saveLibraryItemsStore(nextStore)
        .then(setLibraryStore)
        .catch((error) => onLog(`Library save failed: ${String(error)}`));

      return nextStore;
    });
  }, [onLog]);

  const refreshLibraryItems = useCallback(async () => {
    try {
      const store = await loadLibraryItemsStore();
      setLibraryStore(store);
      setLibraryLoaded(true);
    } catch (error) {
      onLog(`Library refresh failed: ${String(error)}`);
    }
  }, [onLog]);

  return {
    addLibraryItems,
    libraryItems: libraryStore.items,
    libraryLoaded,
    refreshLibraryItems,
  };
}
