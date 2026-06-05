import { useEffect, useState } from "react";
import { syncProviderKeysFromCloud } from "../cloud/client";
import type { AuthSession } from "../../types";
import type { ProviderKeyState } from "../../types";
import { emptyCloudProviderKeys } from "./providerKeyMerge";

type UseProviderKeySyncOptions = {
  authSession: AuthSession | null;
  onLog?: (message: string) => void;
};

export function useProviderKeySync({
  authSession,
  onLog,
}: UseProviderKeySyncOptions) {
  const [cloudProviderKeys, setCloudProviderKeys] = useState<ProviderKeyState>(emptyCloudProviderKeys);
  const [providerKeysSyncedAt, setProviderKeysSyncedAt] = useState<string | null>(null);
  const [providerKeysSyncError, setProviderKeysSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!authSession) {
      setCloudProviderKeys(emptyCloudProviderKeys);
      setProviderKeysSyncedAt(null);
      setProviderKeysSyncError(null);
      return;
    }

    let cancelled = false;

    async function syncKeys() {
      try {
        const response = await syncProviderKeysFromCloud({ authSession });
        if (cancelled) {
          return;
        }

        setCloudProviderKeys({
          openai: response.keys.openai ?? "",
          gemini: response.keys.gemini ?? "",
          groq: response.keys.groq ?? "",
        });
        setProviderKeysSyncedAt(response.syncedAt);
        setProviderKeysSyncError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setProviderKeysSyncError(message);
        onLog?.(`API key sync failed: ${message}`);
      }
    }

    void syncKeys();
    const intervalId = window.setInterval(() => {
      void syncKeys();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authSession, onLog]);

  return {
    cloudProviderKeys,
    providerKeysSyncedAt,
    providerKeysSyncError,
  };
}
