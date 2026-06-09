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
  userProfileStep: ReactNode;
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
  userProfileStep,
  welcomeStep,
}: SetupPageProps) {
  let content: ReactNode;

  if (activeStep === "welcome") content = welcomeStep;
  else if (activeStep === "userProfile") content = userProfileStep;
  else if (activeStep === "survey") content = surveyStep;
  else if (activeStep === "hardware") content = hardwareStep;
  else if (activeStep === "recommendation") content = recommendationStep;
  else if (activeStep === "ollama") content = ollamaStep;
  else if (activeStep === "clawCode") content = clawCodeStep;
  else if (activeStep === "download") content = downloadStep;
  else if (activeStep === "chat") content = chatStep;
  else if (activeStep === "profile") content = profileStep;
  else content = settingsStep;

  return (
    <div key={activeStep} className={`miva-step-enter ${activeStep === "chat" ? "h-full min-h-0" : ""}`}>
      {content}
    </div>
  );
}
