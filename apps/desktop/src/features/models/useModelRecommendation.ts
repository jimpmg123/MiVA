import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { HardwareInfo, ProviderId, SurveyState } from "../../types";
import { recommendCloudModel, recommendModel } from "../../utils";
import { getCloudModelById, getModelByName } from "./catalog";

type UseModelRecommendationOptions = {
  autoApplyRecommendations: boolean;
  hardware: HardwareInfo | null;
  signedIn: boolean;
  survey: SurveyState;
  setSelectedCloudModel: Dispatch<SetStateAction<string>>;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  setSelectedProvider: Dispatch<SetStateAction<ProviderId>>;
};

export function useModelRecommendation({
  autoApplyRecommendations,
  hardware,
  signedIn,
  survey,
  setSelectedCloudModel,
  setSelectedModel,
  setSelectedProvider,
}: UseModelRecommendationOptions) {
  const recommendedModel = useMemo(() => recommendModel(survey, hardware), [survey, hardware]);
  const recommendedCloudModel = useMemo(() => recommendCloudModel(survey), [survey]);
  const recommendedModelInfo = getModelByName(recommendedModel);
  const recommendedCloudModelInfo = getCloudModelById(recommendedCloudModel);
  const cloudRecommended =
    survey.localMode === "cloudOnly" ||
    (survey.localMode === "hybrid" && (survey.priority === "quality" || survey.useCase === "work"));

  useEffect(() => {
    if (!autoApplyRecommendations) {
      return;
    }

    setSelectedModel(recommendedModel);
  }, [autoApplyRecommendations, recommendedModel, setSelectedModel]);

  useEffect(() => {
    if (!autoApplyRecommendations) {
      return;
    }

    if (cloudRecommended && signedIn) {
      const cloudModel = getCloudModelById(recommendedCloudModel);
      setSelectedCloudModel(cloudModel.id);
      setSelectedProvider(cloudModel.provider);
      return;
    }

    setSelectedProvider("ollama");
  }, [autoApplyRecommendations, cloudRecommended, recommendedCloudModel, setSelectedCloudModel, setSelectedProvider, signedIn]);

  return {
    cloudRecommended,
    recommendedCloudModel,
    recommendedCloudModelInfo,
    recommendedModel,
    recommendedModelInfo,
  };
}
