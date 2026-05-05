import type { ReactNode } from "react";
import type { StepId } from "../types";

type SetupPageProps = {
  activeStep: StepId;
  chatStep: ReactNode;
  clawCodeStep: ReactNode;
  downloadStep: ReactNode;
  hardwareStep: ReactNode;
  ollamaStep: ReactNode;
  profileStep: ReactNode;
  recommendationStep: ReactNode;
  settingsStep: ReactNode;
  surveyStep: ReactNode;
  welcomeStep: ReactNode;
};

export function SetupPage({
  activeStep,
  chatStep,
  clawCodeStep,
  downloadStep,
  hardwareStep,
  ollamaStep,
  profileStep,
  recommendationStep,
  settingsStep,
  surveyStep,
  welcomeStep,
}: SetupPageProps) {
  if (activeStep === "welcome") return <>{welcomeStep}</>;
  if (activeStep === "survey") return <>{surveyStep}</>;
  if (activeStep === "hardware") return <>{hardwareStep}</>;
  if (activeStep === "recommendation") return <>{recommendationStep}</>;
  if (activeStep === "ollama") return <>{ollamaStep}</>;
  if (activeStep === "clawCode") return <>{clawCodeStep}</>;
  if (activeStep === "download") return <>{downloadStep}</>;
  if (activeStep === "chat") return <>{chatStep}</>;
  if (activeStep === "profile") return <>{profileStep}</>;
  return <>{settingsStep}</>;
}
