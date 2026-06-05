import { useState } from "react";
import type { Locale } from "../i18n";
import type { CloudModelInfo, CloudProviderId, ModelInfo, OllamaStatus, ProviderId, ProviderMode } from "../types";
import { Badge, IconButton, IconTile, InfoTile, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import { ModelCardIcon, ModelCardIconOrFallback } from "../features/models/modelIcons";

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
  const [localModelsExpanded, setLocalModelsExpanded] = useState(true);
  const visibleCloudModels = cloudModelCatalog.filter((model) => model.id !== "custom-cloud");

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Local model library</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Select and download Ollama models for this computer. Recommendation only chooses a first model; Studio is where users can manage more models later.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={status?.running ? "success" : "neutral"}>
              {status?.running ? "Ollama running" : "Ollama offline"}
            </Badge>
            <IconButton
              aria-label={localModelsExpanded ? "Collapse local models" : "Expand local models"}
              className="h-9 w-9 rounded-full border border-[var(--miva-border)] text-[var(--miva-primary)] hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
              onClick={() => setLocalModelsExpanded((value) => !value)}
            >
              <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${localModelsExpanded ? "rotate-180" : "rotate-0"}`}>
                {localModelsExpanded ? "remove" : "add"}
              </span>
            </IconButton>
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
                  className={`rounded-lg border bg-[var(--miva-surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--miva-shadow-md)] ${
                    active ? "border-[var(--miva-primary)] ring-4 ring-[var(--miva-primary-soft)]" : "border-[var(--miva-border)] hover:border-[var(--miva-primary)]"
                  }`}
                  key={model.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <IconTile>
                      <ModelCardIcon modelKey={model.name} />
                    </IconTile>
                    <div className="flex flex-wrap justify-end gap-2">
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {installed && <Badge tone="success">{t.installed}</Badge>}
                    </div>
                  </div>
                  <h4 className="mt-5 font-heading text-lg font-bold text-[var(--miva-text)]">{model.label}</h4>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{model.category}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--miva-text-muted)]">{model.summary[activeLocale]}</p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <InfoTile label="RAM" value={`${model.recommendedRamGb} GB+`} />
                    <InfoTile label="Size" value={model.downloadSizeLabel ?? "Ollama tag"} />
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
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Cloud models</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Cloud models do not need downloads. API key management remains in Settings &gt; AI models.
            </p>
            {!signedIn && (
              <p className="mt-2 text-sm font-semibold text-[var(--miva-danger-hover)]">
                Sign in is required to use cloud models.
              </p>
            )}
          </div>
          <Badge tone="action">OpenAI / Gemini / Groq</Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visibleCloudModels.map((model) => (
            <button
              className={`rounded-lg border bg-[var(--miva-surface)] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--miva-shadow-sm)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${
                selectedProvider === model.provider && selectedCloudModel === model.id
                  ? "border-[var(--miva-primary)] ring-4 ring-[var(--miva-primary-soft)]"
                  : signedIn
                    ? "border-[var(--miva-border)] hover:border-[var(--miva-primary)]"
                    : "border-[var(--miva-danger-soft)]"
              }`}
              disabled={!signedIn}
              key={model.id}
              onClick={() => onSelectCloudModel(model.provider, model.id)}
              type="button"
            >
              <IconTile className="h-10 w-10 overflow-hidden">
                <ModelCardIconOrFallback
                  fallback={<span className="material-symbols-outlined text-[20px]">{providerMeta[model.provider].icon}</span>}
                  imageClassName="h-6 w-6"
                  modelKey={`${model.provider} ${model.id} ${model.label}`}
                />
              </IconTile>
              <p className="mt-4 font-heading text-base font-bold text-[var(--miva-text)]">{model.label}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">
                {providerMeta[model.provider].label}
              </p>
              {!signedIn && <p className="mt-3 text-xs font-semibold text-[var(--miva-danger-hover)]">Sign in required</p>}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
