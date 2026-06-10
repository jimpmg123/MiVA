import type { ReactNode } from "react";
import type { AppMode } from "../types";

type AppShellProps = {
  appMode: AppMode;
  authView: ReactNode;
  content: ReactNode;
  downloadModal: ReactNode;
  navigation: ReactNode | null;
  sidebarOpen: boolean;
  topBar: ReactNode;
};

export function AppShell({ appMode, authView, content, downloadModal, navigation, sidebarOpen, topBar }: AppShellProps) {
  const contentClassName = appMode === "runtime"
    ? "miva-scrollbar-hidden flex min-h-0 flex-1 overflow-hidden"
    : appMode === "studio"
      ? "min-h-0 flex-1 overflow-hidden pl-8 pr-2 py-8"
    : "min-h-0 flex-1 overflow-auto px-8 py-8";

  return (
    <main className="miva-app-shell flex h-screen min-w-[1000px] overflow-hidden">
      {appMode === "auth" ? (
        authView
      ) : (
        <>
          {navigation && (
            <div
              aria-hidden={!sidebarOpen}
              className={`miva-sidebar-slot ${sidebarOpen ? "miva-sidebar-slot-open" : "miva-sidebar-slot-closed"}`}
            >
              {navigation}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            {topBar}
            <div className={contentClassName}>{content}</div>
          </div>
        </>
      )}
      {downloadModal}
    </main>
  );
}
