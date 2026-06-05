import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../../app/tauri";
import { defaultPromptSettings } from "../assistants/profile";
import { Live2DStage } from "./Live2DStage";
import {
  CHARACTER_OVERLAY_CLOSED_EVENT,
  CHARACTER_OVERLAY_EVENT,
  CHARACTER_OVERLAY_READY_EVENT,
  type CharacterOverlayState,
} from "./useCharacterOverlay";

const defaultOverlayState: CharacterOverlayState = {
  character: defaultPromptSettings.character,
  activity: "Idle",
};

type ContextMenuState = {
  x: number;
  y: number;
};

function shouldSkipOverlayDrag(target: EventTarget | null) {
  return target instanceof Element && Boolean(
    target.closest("button") || target.closest("[data-overlay-menu]"),
  );
}

export function CharacterOverlayApp() {
  const [overlayState, setOverlayState] = useState<CharacterOverlayState>(defaultOverlayState);
  const [hovered, setHovered] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const showControls = hovered || grabbing || contextMenu !== null;

  useEffect(() => {
    document.documentElement.classList.add("miva-character-overlay-root");
    document.body.classList.add("miva-character-overlay-root");

    if (isTauriRuntime()) {
      const overlayWindow = getCurrentWebviewWindow();
      void overlayWindow.setAlwaysOnTop(true);
    }

    return () => {
      document.documentElement.classList.remove("miva-character-overlay-root");
      document.body.classList.remove("miva-character-overlay-root");
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<CharacterOverlayState>(CHARACTER_OVERLAY_EVENT, (event) => {
      if (!disposed && event.payload) {
        setOverlayState(event.payload);
      }
    }).then((cleanup) => {
      unlisten = cleanup;
      if (!disposed) {
        void emit(CHARACTER_OVERLAY_READY_EVENT, {});
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function dismissContextMenu() {
      setContextMenu(null);
    }

    window.addEventListener("mousedown", dismissContextMenu);
    window.addEventListener("blur", dismissContextMenu);

    return () => {
      window.removeEventListener("mousedown", dismissContextMenu);
      window.removeEventListener("blur", dismissContextMenu);
    };
  }, [contextMenu]);

  function handleOverlayDragStart(event: MouseEvent) {
    if (!isTauriRuntime() || event.button !== 0 || shouldSkipOverlayDrag(event.target)) {
      return;
    }

    setContextMenu(null);
    setGrabbing(true);
    void getCurrentWebviewWindow().startDragging();
  }

  function handleOverlayMouseUp() {
    setGrabbing(false);
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }

  async function handleClose() {
    setContextMenu(null);
    await emit(CHARACTER_OVERLAY_CLOSED_EVENT, {});
    await getCurrentWebviewWindow().close();
  }

  const character = overlayState.character;
  const overlayEnabled = character.renderer === "live2d";

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-transparent text-[var(--miva-text)]"
      onContextMenu={handleContextMenu}
      onMouseDown={handleOverlayDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setGrabbing(false);
      }}
      onMouseUp={handleOverlayMouseUp}
    >
      <div
        className={`pointer-events-none absolute top-3 right-3 z-50 flex items-center gap-1.5 transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="rounded-full border border-[var(--miva-border)] bg-[var(--miva-floating-surface)]/90 px-2.5 py-1 text-[10px] font-semibold text-[var(--miva-text-muted)] shadow-[var(--miva-shadow-sm)] backdrop-blur">
          {overlayState.activity}
        </div>
        <button
          aria-label="Close character overlay"
          className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full border border-[var(--miva-border)] bg-[var(--miva-floating-surface)]/90 text-[var(--miva-text-muted)] shadow-[var(--miva-shadow-sm)] backdrop-blur transition hover:border-[var(--miva-danger)] hover:bg-[var(--miva-danger)] hover:text-white"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => void handleClose()}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      {contextMenu ? (
        <div
          className="absolute z-[60] min-w-[168px] overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-floating-surface)] py-1 shadow-[var(--miva-shadow-md)] backdrop-blur"
          data-overlay-menu
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">
            {character.displayName || "MiVA Character"}
          </p>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--miva-text)] transition hover:bg-[var(--miva-surface-muted)]"
            onClick={() => void handleClose()}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[var(--miva-danger)]">close</span>
            Close floating window
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 [&_*]:pointer-events-none">
        {overlayEnabled ? (
          <Live2DStage
            activity={overlayState.activity}
            blockPointerEvents
            bottomReservePx={32}
            character={character}
            topReservePx={20}
          />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center text-sm text-[var(--miva-text-muted)]">
            <div className="grid gap-2">
              <span className="material-symbols-outlined text-[32px] text-[var(--miva-text-soft)]">person_off</span>
              <p>Enable Live2D character in Studio to use the floating window.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
