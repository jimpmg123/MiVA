import { useState } from "react";
import type { AppMode, SettingsSection, StepId } from "../types";

type NavigationTarget = {
  appMode: AppMode;
  activeStep: StepId;
};

export function useAppNavigation() {
  const [appMode, setAppMode] = useState<AppMode>("setup");
  const [activeStep, setActiveStep] = useState<StepId>("welcome");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [settingsReturnTarget, setSettingsReturnTarget] = useState<NavigationTarget>({
    appMode: "studio",
    activeStep: "welcome",
  });
  const [authReturnTarget, setAuthReturnTarget] = useState<NavigationTarget>({
    appMode: "studio",
    activeStep: "welcome",
  });

  function enterSettings(section: SettingsSection = "general") {
    if (activeStep !== "settings") {
      setSettingsReturnTarget({ appMode, activeStep });
    }

    setAppMode("setup");
    setActiveStep("settings");
    setSettingsSection(section);
  }

  function exitSettings() {
    setAppMode(settingsReturnTarget.appMode);
    setActiveStep(settingsReturnTarget.activeStep === "settings" ? "welcome" : settingsReturnTarget.activeStep);
  }

  function openAuth() {
    if (appMode !== "auth") {
      setAuthReturnTarget({ appMode, activeStep });
    }

    setAppMode("auth");
  }

  function closeAuth() {
    setAppMode(authReturnTarget.appMode === "auth" ? "studio" : authReturnTarget.appMode);
    setActiveStep(authReturnTarget.activeStep === "settings" ? "welcome" : authReturnTarget.activeStep);
  }

  function openInitialSetup() {
    setAppMode("setup");
    setActiveStep("welcome");
  }

  return {
    activeStep,
    appMode,
    closeAuth,
    enterSettings,
    exitSettings,
    openAuth,
    openInitialSetup,
    setActiveStep,
    setAppMode,
    setSettingsSection,
    settingsSection,
  };
}
