import { useState } from "react";
import type { ProviderKeyState } from "../../types";
import { clearProviderKeysStorage, emptyProviderKeys, loadProviderKeys, saveProviderKeysToStorage } from "./storage";

export function useProviderKeys() {
  const [providerKeys, setProviderKeys] = useState<ProviderKeyState>(() => loadProviderKeys());
  const [providerKeysSaved, setProviderKeysSaved] = useState(false);

  function saveProviderKeys() {
    saveProviderKeysToStorage(providerKeys);
    setProviderKeysSaved(true);
    window.setTimeout(() => setProviderKeysSaved(false), 2000);
  }

  function clearProviderKeys() {
    setProviderKeys(emptyProviderKeys);
    clearProviderKeysStorage();
    setProviderKeysSaved(false);
  }

  return {
    clearProviderKeys,
    providerKeys,
    providerKeysSaved,
    saveProviderKeys,
    setProviderKeys,
  };
}
