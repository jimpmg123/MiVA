import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriRuntime } from "../app/tauri";

type WindowDragLayerProps = {
  className?: string;
};

export function WindowDragLayer({ className = "absolute inset-0 z-0" }: WindowDragLayerProps) {
  if (!isTauriRuntime()) {
    return null;
  }

  return (
    <div
      className={className}
      data-tauri-drag-region
      onMouseDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        void getCurrentWebviewWindow().startDragging();
      }}
    />
  );
}

type WindowControlsProps = {
  className?: string;
};

export function WindowControls({ className = "" }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const appWindow = getCurrentWebviewWindow();
    let disposed = false;
    let unlistenResize: (() => void) | undefined;

    void appWindow.isMaximized().then((value) => {
      if (!disposed) {
        setIsMaximized(value);
      }
    });

    void appWindow.onResized(async () => {
      const value = await appWindow.isMaximized();
      if (!disposed) {
        setIsMaximized(value);
      }
    }).then((unlisten) => {
      unlistenResize = unlisten;
    });

    return () => {
      disposed = true;
      unlistenResize?.();
    };
  }, []);

  if (!isTauriRuntime()) {
    return null;
  }

  async function minimizeWindow() {
    await getCurrentWebviewWindow().minimize();
  }

  async function toggleMaximizeWindow() {
    const appWindow = getCurrentWebviewWindow();
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  }

  async function closeWindow() {
    await getCurrentWebviewWindow().close();
  }

  return (
    <div className={`flex h-7 shrink-0 items-stretch ${className}`}>
      <button
        aria-label="Minimize window"
        className="grid w-7 place-items-center text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
        onClick={() => void minimizeWindow()}
        type="button"
      >
        <span className="material-symbols-outlined text-[13px]">remove</span>
      </button>
      <button
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        className="grid w-7 place-items-center text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)] hover:text-[var(--miva-text)]"
        onClick={() => void toggleMaximizeWindow()}
        type="button"
      >
        <span className="material-symbols-outlined text-[13px]">
          {isMaximized ? "close_fullscreen" : "crop_square"}
        </span>
      </button>
      <button
        aria-label="Close window"
        className="grid w-7 place-items-center text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-danger)] hover:text-white"
        onClick={() => void closeWindow()}
        type="button"
      >
        <span className="material-symbols-outlined text-[13px]">close</span>
      </button>
    </div>
  );
}
