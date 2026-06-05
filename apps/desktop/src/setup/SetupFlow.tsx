import type { ComponentProps, ReactNode } from "react";
import type { Locale } from "../i18n";
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
  ClawCodeRuntimeInfo,
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
  chooseClawCodeWorkspace: () => Promise<string | null> | string | null;
  choosePythonInstallPath: () => Promise<void> | void;
  clawCodeStatus: ClawCodeRuntimeInfo | null;
  clawCodeStatusError: string | null;
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
  installClawCode: (workspaceRoot: string | null) => Promise<void> | void;
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
  refreshClawCodeStatus: () => Promise<void> | void;
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
  signedIn: boolean;
  serviceLabel: string;
  startOllama: () => Promise<void> | void;
  setActiveStep: (step: ComponentProps<typeof SetupPage>["activeStep"]) => void;
  setSelectedCloudModel: (modelId: string) => void;
  setSelectedModel: ComponentProps<typeof DownloadStep>["setSelectedModel"];
  setClawCodeWorkspace: (workspaceRoot: string) => Promise<void> | void;
  setSelectedProvider: (provider: ProviderId) => void;
  setSurvey: ComponentProps<typeof SurveyStep>["setSurvey"];
  setSurveyQuestionIndex: ComponentProps<typeof SurveyStep>["setSurveyQuestionIndex"];
  settingsStep: ReactNode;
  status: OllamaStatus | null;
  survey: SurveyState;
  surveyQuestionIndex: number;
  surveyQuestions: ComponentProps<typeof SurveyStep>["surveyQuestions"];
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
  chooseClawCodeWorkspace,
  choosePythonInstallPath,
  clawCodeStatus,
  clawCodeStatusError,
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
  installClawCode,
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
  refreshClawCodeStatus,
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
  signedIn,
  serviceLabel,
  startOllama,
  setActiveStep,
  setSelectedCloudModel,
  setSelectedModel,
  setClawCodeWorkspace,
  setSelectedProvider,
  setSurvey,
  setSurveyQuestionIndex,
  settingsStep,
  status,
  survey,
  surveyQuestionIndex,
  surveyQuestions,
  tauriRuntime,
  t,
}: SetupFlowProps) {
  return (
    <SetupPage
      activeStep={activeStep}
      chatStep={chatStep}
      clawCodeStep={(
        <ClawCodeStep
          busyAction={busyAction}
          chooseClawCodeWorkspace={chooseClawCodeWorkspace}
          choosePythonInstallPath={choosePythonInstallPath}
          clawCodeStatus={clawCodeStatus}
          clawCodeStatusError={clawCodeStatusError}
          goToNextStep={goToNextStep}
          installClawCode={installClawCode}
          installPython={installPython}
          pythonInstallPath={pythonInstallPath}
          refreshClawCodeStatus={refreshClawCodeStatus}
          refreshRuntimeRequirements={refreshRuntimeRequirements}
          runtimeRequirements={runtimeRequirements}
          runtimeRequirementsError={runtimeRequirementsError}
          setClawCodeWorkspace={setClawCodeWorkspace}
          t={t}
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
          serviceLabel={serviceLabel}
          startOllama={startOllama}
          status={status}
          t={t}
          tauriRuntime={tauriRuntime}
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
          signedIn={signedIn}
          setSelectedCloudModel={setSelectedCloudModel}
          setSelectedModel={setSelectedModel}
          setSelectedProvider={setSelectedProvider}
          t={t}
        />
      )}
      settingsStep={settingsStep}
      surveyStep={(
        <SurveyStep
          activeLocale={activeLocale}
          goToNextStep={goToNextStep}
          goToPreviousStep={goToPreviousStep}
          setSurvey={setSurvey}
          setSurveyQuestionIndex={setSurveyQuestionIndex}
          survey={survey}
          surveyQuestionIndex={surveyQuestionIndex}
          surveyQuestions={surveyQuestions}
          t={t}
        />
      )}
      welcomeStep={<WelcomeStep t={t} onStart={goToNextStep} />}
    />
  );
}
