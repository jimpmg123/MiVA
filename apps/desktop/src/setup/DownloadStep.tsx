import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Locale } from "../i18n";
import type { ModelDownloadProgress, ModelInfo, OllamaStatus } from "../types";
import { Badge, Panel, PrimaryButton } from "../components/ui";

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
  renderFooter: (primaryLabel?: string, primaryAction?: () => void, primaryDisabled?: boolean) => ReactNode;
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
  renderFooter,
  setSelectedModel,
}: DownloadStepProps) {
  const ACTIVE_LOCALE = activeLocale;
const downloadBusy = busyAction === `download:${selectedModel}`;
    const activeProgress = downloadProgress?.model === selectedModel ? downloadProgress : null;
    const progress = selectedModelInstalled ? 100 : activeProgress?.percent ?? 0;

    return (
      <div className="mx-auto max-w-[880px]">
        <header className="mb-8">
          <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.downloadTitle}</h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">{t.downloadBody}</p>
        </header>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
          <Panel>
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge tone={selectedModelInstalled ? "success" : "action"}>
                  {selectedModelInstalled ? t.installed : t.notInstalled}
                </Badge>
                <h3 className="mt-4 font-heading text-3xl font-bold text-[#191c1d]">{selectedModelInfo.label}</h3>
                <p className="mt-3 text-sm leading-6 text-[#42474d]">{selectedModelInfo.summary[ACTIVE_LOCALE]}</p>
              </div>
              <select
                className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-2 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
              >
                {modelCatalog.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8">
              <div className="h-2 overflow-hidden rounded-full bg-[#e1e3e4]">
                <div className="h-full rounded-full bg-[#35607f] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#42474d]">
                <span>{t.modelStorage}: {t.defaultStorage}</span>
                <span>{progress}%</span>
              </div>
            </div>

            <div className="mt-8">
              <PrimaryButton
                disabled={!tauriRuntime || !status?.running || selectedModelInstalled || busyAction !== null}
                onClick={() => downloadModel(selectedModel)}
              >
                {downloadBusy ? t.downloading : t.downloadModel}
              </PrimaryButton>
            </div>
          </Panel>

          <Panel>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">{t.installedModels}</h3>
            <div className="mt-4 grid gap-3">
              {installedModels.length === 0 ? (
                <p className="rounded-xl bg-[#f3f4f5] p-4 text-sm text-[#42474d]">{t.none}</p>
              ) : (
                installedModels.map((model) => (
                  <div className="flex items-center justify-between rounded-xl bg-[#f3f4f5] p-4 text-sm" key={model}>
                    <span className="font-semibold text-[#191c1d]">{model}</span>
                    <Badge tone="success">{t.installed}</Badge>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        {renderFooter(t.continue, goToNextStep, !selectedModelInstalled)}
      </div>
    );
}
