import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../i18n";
import type { ModelDownloadProgress, ModelInfo, OllamaStatus } from "../types";
import {
  Badge,
  InfoTile,
  Panel,
  PrimaryButton,
  ProgressBar,
  SectionHeader,
  Select,
  SetupStepActionCard,
  SetupStepShell,
} from "../components/ui";

type DownloadStepProps = {
  activeLocale: Locale;
  busyAction: string | null;
  downloadModel: (modelName: string) => Promise<void> | void;
  downloadProgress: ModelDownloadProgress | null;
  installedModels: string[];
  modelCatalog: ModelInfo[];
  selectedModel: string;
  selectedModelInfo: ModelInfo;
  selectedModelInstalled: boolean;
  status: OllamaStatus | null;
  tauriRuntime: boolean;
  t: Record<string, string>;
  goToNextStep: () => void;
  setSelectedModel: Dispatch<SetStateAction<string>>;
};

export function DownloadStep({
  activeLocale,
  busyAction,
  downloadModel,
  downloadProgress,
  installedModels,
  modelCatalog,
  selectedModel,
  selectedModelInfo,
  selectedModelInstalled,
  status,
  tauriRuntime,
  t,
  goToNextStep,
  setSelectedModel,
}: DownloadStepProps) {
  const downloadBusy = busyAction === `download:${selectedModel}`;
  const activeProgress = downloadProgress?.model === selectedModel ? downloadProgress : null;
  const progress = selectedModelInstalled ? 100 : activeProgress?.percent ?? 0;

  return (
    <SetupStepShell variant="narrow">
      <SectionHeader body={t.downloadBody} title={t.downloadTitle} />

      <div className="mt-8 grid grid-cols-[1.1fr_0.9fr] gap-6">
        <Panel className="transition hover:shadow-[var(--miva-shadow-md)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Badge glow={selectedModelInstalled} tone={selectedModelInstalled ? "success" : "action"}>
                {selectedModelInstalled ? t.installed : t.notInstalled}
              </Badge>
              <h3 className="mt-4 font-heading text-3xl font-bold text-[var(--miva-text)]">{selectedModelInfo.label}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--miva-text-muted)]">{selectedModelInfo.summary[activeLocale]}</p>
            </div>
            <Select
              className="w-auto min-w-[160px]"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
            >
              {modelCatalog.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-8">
            <ProgressBar
              shimmer={downloadBusy || (progress > 0 && progress < 100)}
              success={selectedModelInstalled}
              value={progress}
            />
            <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[var(--miva-text-muted)]">
              <span>{t.modelStorage}: {t.defaultStorage}</span>
              <span>{progress}%</span>
            </div>
          </div>

          <div className="mt-8">
            <PrimaryButton
              className="miva-setup-primary"
              disabled={!tauriRuntime || !status?.running || selectedModelInstalled || busyAction !== null}
              onClick={() => downloadModel(selectedModel)}
            >
              {downloadBusy ? t.downloading : t.downloadModel}
            </PrimaryButton>
          </div>
        </Panel>

        <Panel>
          <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">{t.installedModels}</h3>
          <div className="mt-4 grid gap-3">
            {installedModels.length === 0 ? (
              <InfoTile className="p-4" label={t.installedModels} value={t.none} />
            ) : (
              installedModels.map((model, index) => (
                <div
                  className={`miva-stagger-item miva-stagger-${Math.min(index, 5)} flex items-center justify-between rounded-lg bg-[var(--miva-bg-soft)] p-4 text-sm`}
                  key={model}
                >
                  <span className="font-semibold text-[var(--miva-text)]">{model}</span>
                  <Badge tone="success">{t.installed}</Badge>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <SetupStepActionCard
        body={selectedModelInstalled ? t.downloadReadyBody : t.downloadPendingBody}
        continueDisabled={!selectedModelInstalled}
        continueLabel={t.continue}
        onContinue={goToNextStep}
        statusIcon={selectedModelInstalled ? "check_circle" : "download"}
        statusTone={selectedModelInstalled ? "success" : "warning"}
        title={selectedModelInstalled ? t.downloadComplete : t.downloadPendingTitle}
      />
    </SetupStepShell>
  );
}
