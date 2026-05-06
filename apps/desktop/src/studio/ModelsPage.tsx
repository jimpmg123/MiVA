import { useState } from "react";
import type { Locale } from "../i18n";
import type { CloudModelInfo, CloudProviderId, ModelInfo, OllamaStatus, ProviderId, ProviderMode } from "../types";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";

type ProviderMeta = Record<ProviderId, { label: string; mode: ProviderMode; icon: string }>;

type ModelsPanelProps = {
  activeLocale: Locale;
  busyAction: string | null;
  cloudModelCatalog: CloudModelInfo[];
  installedModels: string[];
  modelCatalog: ModelInfo[];
  providerMeta: ProviderMeta;
  providerText: Record<string, string>;
  selectedCloudModel: string;
  selectedModel: string;
  selectedProvider: ProviderId;
  signedIn: boolean;
  status: OllamaStatus | null;
  t: Record<string, string>;
  tauriRuntime: boolean;
  onDownloadModel: (modelName: string) => void;
  onSelectCloudModel: (provider: CloudProviderId, modelId: string) => void;
  onSelectLocalModel: (modelName: string) => void;
};

export function ModelsPanel({
  activeLocale,
  busyAction,
  cloudModelCatalog,
  installedModels,
  modelCatalog,
  providerMeta,
  providerText,
  selectedCloudModel,
  selectedModel,
  selectedProvider,
  signedIn,
  status,
  t,
  tauriRuntime,
  onDownloadModel,
  onSelectCloudModel,
  onSelectLocalModel,
}: ModelsPanelProps) {
  const [localModelsExpanded, setLocalModelsExpanded] = useState(false);
  const visibleCloudModels = cloudModelCatalog.filter((model) => model.id !== "custom-cloud").slice(0, 3);

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">Local model library</h3>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              Select and download Ollama models for this computer. Recommendation only chooses a first model; Studio is where users can manage more models later.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={status?.running ? "success" : "neutral"}>
              {status?.running ? "Ollama running" : "Ollama offline"}
            </Badge>
            <button
              aria-label={localModelsExpanded ? "Collapse local models" : "Expand local models"}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#c2c7ce] text-[#35607f] transition hover:border-[#35607f] hover:bg-[#cae6ff]/35"
              onClick={() => setLocalModelsExpanded((value) => !value)}
              type="button"
            >
              <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${localModelsExpanded ? "rotate-180" : "rotate-0"}`}>
                {localModelsExpanded ? "remove" : "add"}
              </span>
            </button>
          </div>
        </div>

        <div
          className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out ${
            localModelsExpanded ? "mt-6 grid-rows-[1fr] opacity-100 translate-y-0" : "mt-0 grid-rows-[0fr] opacity-0 -translate-y-2"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="grid gap-4 lg:grid-cols-2">
            {modelCatalog.map((model) => {
              const active = selectedProvider === "ollama" && selectedModel === model.name;
              const installed = installedModels.includes(model.name);
              const downloadBusy = busyAction === `download:${model.name}`;
              const canDownload = tauriRuntime && Boolean(status?.running) && !installed && busyAction === null;

              return (
                <article
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                    active ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                  }`}
                  key={model.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                      <span className="material-symbols-outlined text-[22px]">memory</span>
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {installed && <Badge tone="success">{t.installed}</Badge>}
                    </div>
                  </div>
                  <h4 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{model.label}</h4>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">{model.category}</p>
                  <p className="mt-3 text-sm leading-6 text-[#42474d]">{model.summary[activeLocale]}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-[#f3f4f5] p-3">
                      <span className="font-bold uppercase tracking-[0.12em] text-[#72787e]">RAM</span>
                      <p className="mt-1 font-semibold text-[#191c1d]">{model.recommendedRamGb} GB+</p>
                    </div>
                    <div className="rounded-xl bg-[#f3f4f5] p-3">
                      <span className="font-bold uppercase tracking-[0.12em] text-[#72787e]">Size</span>
                      <p className="mt-1 font-semibold text-[#191c1d]">{model.downloadSizeLabel ?? "Ollama tag"}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <SecondaryButton className="px-3 py-2 text-xs" onClick={() => onSelectLocalModel(model.name)}>
                      {providerText.selectModel}
                    </SecondaryButton>
                    <PrimaryButton
                      className="px-3 py-2 text-xs"
                      disabled={!canDownload}
                      onClick={() => {
                        onSelectLocalModel(model.name);
                        onDownloadModel(model.name);
                      }}
                    >
                      {downloadBusy ? t.downloading : installed ? t.installed : t.downloadModel}
                    </PrimaryButton>
                  </div>
                </article>
              );
            })}
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">Cloud models</h3>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">
              Cloud models do not need downloads. API key management remains in Settings &gt; AI models.
            </p>
            {!signedIn && (
              <p className="mt-2 text-sm font-semibold text-[#ba1a1a]">
                Sign in is required to use cloud models.
              </p>
            )}
          </div>
          <Badge tone="action">OpenAI / Gemini</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {visibleCloudModels.map((model) => (
            <button
              className={`rounded-2xl border bg-white p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selectedProvider === model.provider && selectedCloudModel === model.id
                  ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                  : signedIn
                    ? "border-[#c2c7ce]/70 hover:border-[#35607f]"
                    : "border-[#ffb4ab]"
              }`}
              disabled={!signedIn}
              key={model.id}
              onClick={() => onSelectCloudModel(model.provider, model.id)}
              type="button"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                <span className="material-symbols-outlined text-[20px]">{providerMeta[model.provider].icon}</span>
              </span>
              <p className="mt-4 font-heading text-base font-bold text-[#191c1d]">{model.label}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">
                {providerMeta[model.provider].label}
              </p>
              {!signedIn && <p className="mt-3 text-xs font-semibold text-[#ba1a1a]">Sign in required</p>}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
