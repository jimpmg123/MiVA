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
  return (
    <main className="flex h-screen min-w-[1000px] overflow-hidden bg-[#f8f9fa] text-[#191c1d]">
      {appMode === "auth" ? (
        authView
      ) : (
        <>
          {navigation}
          <div className="flex min-w-0 flex-1 flex-col">
            {topBar}
            <div className="flex-1 overflow-y-auto px-10 py-9">{content}</div>
          </div>
        </>
      )}
      {downloadModal}
    </main>
  );
}
