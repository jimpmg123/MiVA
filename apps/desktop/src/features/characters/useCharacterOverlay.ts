import { useCallback, useEffect, useState } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { invokeCommand, isTauriRuntime } from "../../app/tauri";
import type { CharacterEmotion, PromptSettings } from "../../types";

export const CHARACTER_OVERLAY_EVENT = "character-overlay:update";
export const CHARACTER_OVERLAY_CLOSED_EVENT = "character-overlay:closed";
export const CHARACTER_OVERLAY_READY_EVENT = "character-overlay:ready";

export type CharacterOverlayState = {
  character: PromptSettings["character"];
  activity: "Idle" | "Thinking" | "Speaking";
  emotion?: CharacterEmotion;
};

export async function showCharacterOverlay() {
  return invokeCommand<{ open: boolean; created: boolean }>("show_character_overlay");
}

export async function closeCharacterOverlay() {
  return invokeCommand<{ open: boolean }>("close_character_overlay");
}

export async function isCharacterOverlayOpen() {
  return invokeCommand<boolean>("is_character_overlay_open");
}

export function useCharacterOverlaySync(state: CharacterOverlayState | null) {
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let unlistenClosed: (() => void) | undefined;
    let unlistenReady: (() => void) | undefined;

    void isCharacterOverlayOpen().then((open) => {
      if (!disposed) {
        setOverlayOpen(open);
      }
    });

    void listen(CHARACTER_OVERLAY_CLOSED_EVENT, () => {
      if (!disposed) {
        setOverlayOpen(false);
      }
    }).then((unlisten) => {
      unlistenClosed = unlisten;
    });

    void listen(CHARACTER_OVERLAY_READY_EVENT, () => {
      if (!disposed && state) {
        void emit(CHARACTER_OVERLAY_EVENT, state);
      }
    }).then((unlisten) => {
      unlistenReady = unlisten;
    });

    return () => {
      disposed = true;
      unlistenClosed?.();
      unlistenReady?.();
    };
  }, [state]);

  useEffect(() => {
    if (!overlayOpen || !state || !isTauriRuntime()) {
      return;
    }

    void emit(CHARACTER_OVERLAY_EVENT, state);
  }, [overlayOpen, state]);

  const openOverlay = useCallback(async () => {
    if (!isTauriRuntime()) {
      return;
    }

    try {
      await showCharacterOverlay();
      setOverlayOpen(true);
      if (state) {
        await emit(CHARACTER_OVERLAY_EVENT, state);
      }
    } catch (error) {
      setOverlayOpen(false);
      console.error("Failed to open character overlay:", error);
      throw error;
    }
  }, [state]);

  const closeOverlay = useCallback(async () => {
    if (!isTauriRuntime()) {
      return;
    }

    await closeCharacterOverlay();
    setOverlayOpen(false);
  }, []);

  const toggleOverlay = useCallback(async () => {
    if (overlayOpen) {
      await closeOverlay();
      return;
    }

    await openOverlay();
  }, [closeOverlay, openOverlay, overlayOpen]);

  return {
    overlayOpen,
    openOverlay,
    closeOverlay,
    toggleOverlay,
  };
}
