import { useEffect, useState } from "react";
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
  const [surveyTipExpanded, setSurveyTipExpanded] = useState(false);
  const [surveyTipContentVisible, setSurveyTipContentVisible] = useState(false);
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

  useEffect(() => {
    if (!surveyTipExpanded) {
      setSurveyTipContentVisible(false);
      return;
    }

    setSurveyTipContentVisible(false);
    const timer = window.setTimeout(() => {
      setSurveyTipContentVisible(true);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [surveyTipExpanded]);

  return {
    activeIndex,
    goToNextStep,
    goToPreviousStep,
    setSurveyQuestionIndex,
    setSurveyTipExpanded,
    surveyQuestionIndex,
    surveyTipContentVisible,
    surveyTipExpanded,
  };
}
