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

function MinimizeIcon() {
  return (
    <svg aria-hidden="true" className="h-[10px] w-[10px]" fill="none" viewBox="0 0 10 10">
      <path d="M1.5 5h7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function MaximizeIcon({ restore }: { restore: boolean }) {
  if (restore) {
    return (
      <svg aria-hidden="true" className="h-[10px] w-[10px]" fill="none" viewBox="0 0 10 10">
        <path d="M3.5 1.5h5v5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
        <path d="M1.5 3.5h5v5h-5z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-[10px] w-[10px]" fill="none" viewBox="0 0 10 10">
      <path d="M1.7 1.7h6.6v6.6H1.7z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-[10px] w-[10px]" fill="none" viewBox="0 0 10 10">
      <path d="m2 2 6 6M8 2 2 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

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

  const buttonClassName = "grid h-full w-11 place-items-center text-[var(--miva-window-control)] transition hover:bg-[rgba(63,111,168,0.13)] hover:text-[var(--miva-text)]";

  return (
    <div className={`flex h-full shrink-0 items-stretch ${className}`}>
      <button
        aria-label="Minimize window"
        className={buttonClassName}
        onClick={() => void minimizeWindow()}
        type="button"
      >
        <MinimizeIcon />
      </button>
      <button
        aria-label={isMaximized ? "Restore window" : "Maximize window"}
        className={buttonClassName}
        onClick={() => void toggleMaximizeWindow()}
        type="button"
      >
        <MaximizeIcon restore={isMaximized} />
      </button>
      <button
        aria-label="Close window"
        className="grid h-full w-11 place-items-center text-[var(--miva-window-control)] transition hover:bg-[var(--miva-danger)] hover:text-white"
        onClick={() => void closeWindow()}
        type="button"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
