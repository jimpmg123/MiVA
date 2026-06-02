import { useState } from "react";
import type { StepId } from "../types";

type SetupStep = {
  id: StepId;
};

type UseSetupWizardOptions = {
  activeStep: StepId;
  steps: SetupStep[];
  onStepChange: (step: StepId) => void;
  onEnteringChatStep: () => void;
};

export function useSetupWizard({
  activeStep,
  steps,
  onStepChange,
  onEnteringChatStep,
}: UseSetupWizardOptions) {
  const [surveyQuestionIndex, setSurveyQuestionIndex] = useState(0);
  const activeIndex = steps.findIndex((step) => step.id === activeStep);

  function goToNextStep() {
    const next = steps[Math.min(activeIndex + 1, steps.length - 1)];
    if (next.id === "chat") {
      onEnteringChatStep();
    }
    onStepChange(next.id);
  }

  function goToPreviousStep() {
    const previous = steps[Math.max(activeIndex - 1, 0)];
    onStepChange(previous.id);
  }

  return {
    activeIndex,
    goToNextStep,
    goToPreviousStep,
    setSurveyQuestionIndex,
    surveyQuestionIndex,
  };
}
