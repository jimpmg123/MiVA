import { useEffect, useRef, useState } from "react";
import { loadAppPreferences, type AppPreferences } from "../features/app/storage";
import type { AppMode } from "../types";

const MIN_BOOT_MS = 900;

type UseAppBootOptions = {
  assistantProfileLoaded: boolean;
  runtimeReady: boolean;
  tauriRuntime: boolean;
};

type BootPhase = "loading" | "ready";

export function useAppBoot({
  assistantProfileLoaded,
  runtimeReady,
  tauriRuntime,
}: UseAppBootOptions) {
  const [phase, setPhase] = useState<BootPhase>("loading");
  const [progress, setProgress] = useState(0);
  const [statusLine, setStatusLine] = useState("시스템 리소스를 초기화하는 중");
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const bootStartedAtRef = useRef(Date.now());
  const finishRequestedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadAppPreferences();
        if (!cancelled) {
          setPreferences(loaded);
        }
      } catch {
        if (!cancelled) {
          setPreferences({ setupCompleted: false, lastAppMode: "studio", setupCompletedAt: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferences) {
      setProgress(8);
      setStatusLine("시스템 리소스를 초기화하는 중");
      return;
    }

    if (!preferences.setupCompleted) {
      setPhase("ready");
      return;
    }

    const prefsReady = true;
    const profilesReady = assistantProfileLoaded;
    const runtimeChecksReady = !tauriRuntime || runtimeReady;

    const completedSteps = [prefsReady, profilesReady, runtimeChecksReady].filter(Boolean).length;
    const targetProgress = 12 + completedSteps * 28;

    setProgress((current) => Math.max(current, Math.min(targetProgress, 92)));

    if (!profilesReady) {
      setStatusLine("어시스턴트 프로필을 불러오는 중");
      return;
    }

    if (!runtimeChecksReady) {
      setStatusLine("로컬 AI 런타임 상태를 확인하는 중");
      return;
    }

    setStatusLine("시스템 리소스를 초기화하는 중");
    setProgress((current) => Math.max(current, 96));

    if (finishRequestedRef.current) {
      return;
    }

    finishRequestedRef.current = true;
    const elapsed = Date.now() - bootStartedAtRef.current;
    const remaining = Math.max(0, MIN_BOOT_MS - elapsed);

    window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => setPhase("ready"), 180);
    }, remaining);
  }, [assistantProfileLoaded, preferences, runtimeReady, tauriRuntime]);

  const showBootScreen = preferences === null || (preferences.setupCompleted && phase === "loading");
  const initialAppMode: AppMode = preferences?.setupCompleted
    ? (preferences.lastAppMode ?? "studio")
    : "setup";

  return {
    bootProgress: progress,
    bootStatusLine: statusLine,
    bootReady: phase === "ready" && preferences !== null,
    initialAppMode,
    setupCompleted: preferences?.setupCompleted ?? false,
    showBootScreen,
  };
}
