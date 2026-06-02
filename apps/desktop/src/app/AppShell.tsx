import type { ReactNode } from "react";
import type { AppMode } from "../types";

type AppShellProps = {
  appMode: AppMode;
  authView: ReactNode;
  content: ReactNode;
  downloadModal: ReactNode;
  navigation: ReactNode;
  topBar: ReactNode;
};

export function AppShell({ appMode, authView, content, downloadModal, navigation, topBar }: AppShellProps) {
  const contentClassName = appMode === "runtime"
    ? "miva-scrollbar-hidden min-h-0 flex-1 overflow-hidden px-10 py-9"
    : "min-h-0 flex-1 overflow-y-auto px-10 py-9";

  return (
    <main className="miva-app-shell flex h-screen min-w-[1000px] overflow-hidden">
      {appMode === "auth" ? (
        authView
      ) : (
        <>
          {navigation}
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
