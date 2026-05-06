import type { ComponentProps, ReactNode } from "react";
import type { Locale } from "../i18n";
import { PrimaryButton, SecondaryButton } from "../components/ui";
import { SetupPage } from "../pages/SetupPage";
import { cloudModelCatalog, modelCatalog, providerMeta } from "../features/models/catalog";
import { ClawCodeStep } from "./ClawCodeStep";
import { DownloadStep } from "./DownloadStep";
import { HardwareStep } from "./HardwareStep";
import { OllamaStep } from "./OllamaStep";
import { ProfileStep } from "./ProfileStep";
import { RecommendationStep } from "./RecommendationStep";
import { SurveyStep } from "./SurveyStep";
import { WelcomeStep } from "./WelcomeStep";
import type {
  CloudModelInfo,
  HardwareInfo,
  LocalAssistantProfile,
  ModelDownloadProgress,
  ModelInfo,
  OllamaStatus,
  ProviderId,
  ProviderMode,
  SurveyState,
} from "../types";

type SetupFlowProps = {
  activeLocale: Locale;
  activeModelLabel: string;
  activeProviderLabel: string;
  activeProviderMode: ProviderMode;
  activeStep: ComponentProps<typeof SetupPage>["activeStep"];
  assistantProfileError: string | null;
  busyAction: string | null;
  chatStep: ReactNode;
  choosePythonInstallPath: () => Promise<void> | void;
  cloudRecommended: boolean;
  downloadModel: (modelName: string) => Promise<void> | void;
  downloadProgress: ModelDownloadProgress | null;
  enterGeneralSettings: () => void;
  enterLogs: () => void;
  finalizeProfile: () => Promise<void> | void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  hardware: HardwareInfo | null;
  hardwareError: string | null;
  installOllama: () => Promise<void> | void;
  installPython: () => Promise<void> | void;
  installedModels: string[];
  logs: string[];
  profile: LocalAssistantProfile;
  providerText: Record<string, string>;
  pythonInstallPath: ComponentProps<typeof ClawCodeStep>["pythonInstallPath"];
  recommendedCloudModelInfo: CloudModelInfo;
  recommendedModel: string;
  recommendedModelInfo: ModelInfo;
  recommendedModelInstalled: boolean;
  refreshHardware: () => Promise<void> | void;
  refreshRuntimeRequirements: () => Promise<void> | void;
  refreshStatus: () => Promise<void> | void;
  runtimeRequirements: ComponentProps<typeof ClawCodeStep>["runtimeRequirements"];
  runtimeRequirementsError: string | null;
  selectedCloudModel: string;
  selectedModel: string;
  selectedModelInfo: ModelInfo;
  selectedModelInstalled: boolean;
  selectedProvider: ProviderId;
  serviceLabel: string;
  startOllama: () => Promise<void> | void;
  setActiveStep: (step: ComponentProps<typeof SetupPage>["activeStep"]) => void;
  setSelectedCloudModel: (modelId: string) => void;
  setSelectedModel: ComponentProps<typeof DownloadStep>["setSelectedModel"];
  setSelectedProvider: (provider: ProviderId) => void;
  setSurvey: ComponentProps<typeof SurveyStep>["setSurvey"];
  setSurveyQuestionIndex: ComponentProps<typeof SurveyStep>["setSurveyQuestionIndex"];
  setSurveyTipExpanded: ComponentProps<typeof SurveyStep>["setSurveyTipExpanded"];
  settingsStep: ReactNode;
  status: OllamaStatus | null;
  survey: SurveyState;
  surveyQuestionIndex: number;
  surveyQuestions: ComponentProps<typeof SurveyStep>["surveyQuestions"];
  surveyTipContentVisible: boolean;
  surveyTipExpanded: boolean;
  tauriRuntime: boolean;
  t: Record<string, string>;
};

export function SetupFlow({
  activeLocale,
  activeModelLabel,
  activeProviderLabel,
  activeProviderMode,
  activeStep,
  assistantProfileError,
  busyAction,
  chatStep,
  choosePythonInstallPath,
  cloudRecommended,
  downloadModel,
  downloadProgress,
  enterGeneralSettings,
  enterLogs,
  finalizeProfile,
  goToNextStep,
  goToPreviousStep,
  hardware,
  hardwareError,
  installOllama,
  installPython,
  installedModels,
  logs,
  profile,
  providerText,
  pythonInstallPath,
  recommendedCloudModelInfo,
  recommendedModel,
  recommendedModelInfo,
  recommendedModelInstalled,
  refreshHardware,
  refreshRuntimeRequirements,
  refreshStatus,
  runtimeRequirements,
  runtimeRequirementsError,
  selectedCloudModel,
  selectedModel,
  selectedModelInfo,
  selectedModelInstalled,
  selectedProvider,
  serviceLabel,
  startOllama,
  setActiveStep,
  setSelectedCloudModel,
  setSelectedModel,
  setSelectedProvider,
  setSurvey,
  setSurveyQuestionIndex,
  setSurveyTipExpanded,
  settingsStep,
  status,
  survey,
  surveyQuestionIndex,
  surveyQuestions,
  surveyTipContentVisible,
  surveyTipExpanded,
  tauriRuntime,
  t,
}: SetupFlowProps) {
  const renderFooter = (primaryLabel = t.continue, primaryAction = goToNextStep, primaryDisabled = false) => (
    <div className="mt-8 flex items-center justify-between">
      <SecondaryButton disabled={activeStep === "welcome"} onClick={goToPreviousStep}>
        {t.back}
      </SecondaryButton>
      <PrimaryButton disabled={primaryDisabled} onClick={primaryAction}>
        {primaryLabel}
      </PrimaryButton>
    </div>
  );

  return (
    <SetupPage
      activeStep={activeStep}
      chatStep={chatStep}
      clawCodeStep={(
        <ClawCodeStep
          busyAction={busyAction}
          choosePythonInstallPath={choosePythonInstallPath}
          goToNextStep={goToNextStep}
          installPython={installPython}
          pythonInstallPath={pythonInstallPath}
          refreshRuntimeRequirements={refreshRuntimeRequirements}
          renderFooter={renderFooter}
          runtimeRequirements={runtimeRequirements}
          runtimeRequirementsError={runtimeRequirementsError}
          tauriRuntime={tauriRuntime}
        />
      )}
      downloadStep={(
        <DownloadStep
          activeLocale={activeLocale}
          busyAction={busyAction}
          downloadModel={downloadModel}
          downloadProgress={downloadProgress}
          goToNextStep={goToNextStep}
          installedModels={installedModels}
          modelCatalog={modelCatalog}
          renderFooter={renderFooter}
          selectedModel={selectedModel}
          selectedModelInfo={selectedModelInfo}
          selectedModelInstalled={selectedModelInstalled}
          setSelectedModel={setSelectedModel}
          status={status}
          tauriRuntime={tauriRuntime}
          t={t}
        />
      )}
      hardwareStep={(
        <HardwareStep
          busyAction={busyAction}
          hardware={hardware}
          hardwareError={hardwareError}
          goToNextStep={goToNextStep}
          refreshHardware={refreshHardware}
          tauriRuntime={tauriRuntime}
          t={t}
        />
      )}
      ollamaStep={(
        <OllamaStep
          busyAction={busyAction}
          enterLogs={enterLogs}
          goToNextStep={goToNextStep}
          installOllama={installOllama}
          logs={logs}
          refreshStatus={refreshStatus}
          renderFooter={renderFooter}
          serviceLabel={serviceLabel}
          startOllama={startOllama}
          status={status}
          tauriRuntime={tauriRuntime}
          t={t}
        />
      )}
      profileStep={(
        <ProfileStep
          activeModelLabel={activeModelLabel}
          activeProviderLabel={activeProviderLabel}
          activeProviderMode={activeProviderMode}
          assistantProfileError={assistantProfileError}
          enterGeneralSettings={enterGeneralSettings}
          finalizeProfile={finalizeProfile}
          profile={profile}
        />
      )}
      recommendationStep={(
        <RecommendationStep
          activeLocale={activeLocale}
          cloudModelCatalog={cloudModelCatalog}
          cloudRecommended={cloudRecommended}
          goToPreviousStep={goToPreviousStep}
          hardware={hardware}
          installedModels={installedModels}
          modelCatalog={modelCatalog}
          onContinue={() => setActiveStep("ollama")}
          providerMeta={providerMeta}
          providerText={providerText}
          recommendedCloudModelInfo={recommendedCloudModelInfo}
          recommendedModel={recommendedModel}
          recommendedModelInfo={recommendedModelInfo}
          recommendedModelInstalled={recommendedModelInstalled}
          selectedCloudModel={selectedCloudModel}
          selectedModel={selectedModel}
          selectedProvider={selectedProvider}
          setSelectedCloudModel={setSelectedCloudModel}
          setSelectedModel={setSelectedModel}
          setSelectedProvider={setSelectedProvider}
          survey={survey}
          t={t}
        />
      )}
      settingsStep={settingsStep}
      surveyStep={(
        <SurveyStep
          activeLocale={activeLocale}
          enterSettings={enterGeneralSettings}
          goToNextStep={goToNextStep}
          goToPreviousStep={goToPreviousStep}
          setSurvey={setSurvey}
          setSurveyQuestionIndex={setSurveyQuestionIndex}
          setSurveyTipExpanded={setSurveyTipExpanded}
          survey={survey}
          surveyQuestionIndex={surveyQuestionIndex}
          surveyQuestions={surveyQuestions}
          surveyTipContentVisible={surveyTipContentVisible}
          surveyTipExpanded={surveyTipExpanded}
          t={t}
        />
      )}
      welcomeStep={<WelcomeStep t={t} onStart={goToNextStep} />}
    />
  );
}
