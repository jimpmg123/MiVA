import {
  Badge,
  Panel,
  SectionHeader,
  SelectionOptionCard,
  SetupStepActionCard,
  SetupStepShell,
  StatusAlert,
  TextIconAction,
} from "../components/ui";
import { ModelCardIcon, ModelCardIconOrFallback } from "../features/models/modelIcons";
import type { CloudModelInfo, HardwareInfo, ModelInfo, ProviderId, ProviderMode } from "../types";
import { formatGb } from "../utils";

type ProviderMeta = Record<ProviderId, { label: string; mode: ProviderMode; icon: string }>;

type RecommendationStepProps = {
  activeLocale: "en" | "ko";
  cloudModelCatalog: CloudModelInfo[];
  cloudRecommended: boolean;
  hardware: HardwareInfo | null;
  installedModels: string[];
  modelCatalog: ModelInfo[];
  providerMeta: ProviderMeta;
  providerText: Record<string, string>;
  recommendedCloudModelInfo: CloudModelInfo;
  recommendedModel: string;
  recommendedModelInfo: ModelInfo;
  recommendedModelInstalled: boolean;
  selectedCloudModel: string;
  selectedModel: string;
  selectedProvider: ProviderId;
  signedIn: boolean;
  t: Record<string, string>;
  onContinue: () => void;
  setSelectedCloudModel: (modelId: string) => void;
  setSelectedModel: (modelName: string) => void;
  setSelectedProvider: (provider: ProviderId) => void;
};

export function RecommendationStep({
  activeLocale,
  cloudModelCatalog,
  cloudRecommended,
  hardware,
  installedModels,
  modelCatalog,
  providerMeta,
  providerText,
  recommendedCloudModelInfo,
  recommendedModel,
  recommendedModelInfo,
  recommendedModelInstalled,
  selectedCloudModel,
  selectedModel,
  selectedProvider,
  signedIn,
  t,
  onContinue,
  setSelectedCloudModel,
  setSelectedModel,
  setSelectedProvider,
}: RecommendationStepProps) {
  const localCards = [
    ...modelCatalog.map((model) => ({
      id: model.name,
      label: model.label,
      category: model.category,
      bestFor: model.bestFor[activeLocale],
      selectable: true,
      model,
    })),
    {
      id: "custom-ollama",
      label: providerText.customOllama,
      category: "Placeholder",
      bestFor: providerText.comingSoon,
      selectable: false,
      model: null,
    },
  ];
  const topIsCloud = cloudRecommended;
  const topProvider = topIsCloud ? providerMeta[recommendedCloudModelInfo.provider] : providerMeta.ollama;
  const topLabel = topIsCloud ? recommendedCloudModelInfo.label : recommendedModelInfo.label;
  const topSummary = topIsCloud ? recommendedCloudModelInfo.summary[activeLocale] : recommendedModelInfo.summary[activeLocale];
  const topBestFor = topIsCloud ? recommendedCloudModelInfo.bestFor[activeLocale] : recommendedModelInfo.bestFor[activeLocale];

  function selectRecommendedModel() {
    if (topIsCloud) {
      if (!signedIn) return;
      setSelectedProvider(recommendedCloudModelInfo.provider);
      setSelectedCloudModel(recommendedCloudModelInfo.id);
      return;
    }

    setSelectedProvider("ollama");
    setSelectedModel(recommendedModel);
  }

  function selectLocalModel(modelName: string) {
    setSelectedProvider("ollama");
    setSelectedModel(modelName);
  }

  return (
    <SetupStepShell>
      <SectionHeader body={t.recommendationBody} title={t.recommendationTitle} />

      <Panel className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="action">{providerText.recommended}</Badge>
          <Badge tone={topProvider.mode === "local" ? "success" : "action"}>
            {topProvider.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] px-3 py-1 text-xs font-bold text-[var(--miva-text-muted)]">
            <span className="material-symbols-outlined text-[14px]">{topProvider.icon}</span>
            {topProvider.label}
          </span>
        </div>

        <h3 className="mt-4 font-heading text-3xl font-bold text-[var(--miva-text)]">{topLabel}</h3>
        <p className="mt-3 max-w-[640px] text-sm leading-6 text-[var(--miva-text-muted)]">{topSummary}</p>

        {topIsCloud && !signedIn && (
          <StatusAlert className="mt-4" tone="danger">
            Sign in is required to use cloud models.
          </StatusAlert>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>{topBestFor}</Badge>
          <Badge>{t.totalRam}: {formatGb(hardware?.totalMemoryGb)}</Badge>
          <Badge>
            {topIsCloud ? recommendedCloudModelInfo.status[activeLocale] : recommendedModelInstalled ? t.installed : t.notInstalled}
          </Badge>
        </div>

        <TextIconAction
          actionAriaLabel={t.selectThis}
          actionIcon="done"
          disabled={topIsCloud && !signedIn}
          label={t.selectThis}
          layout="spread"
          onAction={selectRecommendedModel}
        />
      </Panel>

      <Panel className="mt-6">
        <SectionHeader
          actions={<Badge tone="success">Ollama</Badge>}
          body={providerText.localDataNotice}
          className="mb-0"
          title={providerText.localModels}
        />

        <div className="mt-4 overflow-x-auto pb-1 pt-1">
          <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
            {localCards.map((card, index) => {
              const active = selectedProvider === "ollama" && card.model?.name === selectedModel;
              const installed = card.model ? installedModels.includes(card.model.name) : false;

              return (
                <SelectionOptionCard
                  active={active}
                  as="article"
                  className="min-w-[260px]"
                  description={card.bestFor}
                  disabled={!card.selectable}
                  eyebrow={card.category}
                  icon={<ModelCardIcon imageClassName="h-5 w-5" modelKey={card.model?.name ?? card.id} />}
                  interaction="border"
                  key={card.id}
                  onClick={() => {
                    if (!card.model) return;
                    selectLocalModel(card.model.name);
                  }}
                  staggerIndex={index}
                  title={card.label}
                  trailing={(
                    <>
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {installed && <Badge tone="success">{t.installed}</Badge>}
                      {!card.selectable && <Badge>{providerText.comingSoon}</Badge>}
                    </>
                  )}
                />
              );
            })}
          </div>
        </div>
      </Panel>

      <Panel className="mt-6">
        <SectionHeader
          actions={<Badge tone="action">OpenAI / Gemini</Badge>}
          body={providerText.cloudDataNotice}
          className="mb-0"
          title={providerText.cloudModels}
        />
        {!signedIn && (
          <StatusAlert className="mt-4" tone="danger">
            Sign in is required to use cloud models.
          </StatusAlert>
        )}

        <div className="mt-4 overflow-x-auto pb-1 pt-1">
          <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
            {cloudModelCatalog.map((model, index) => {
              const active = selectedProvider === model.provider && selectedCloudModel === model.id;
              const selectable = model.id !== "custom-cloud" && signedIn;

              return (
                <SelectionOptionCard
                  active={active}
                  className="min-w-[260px]"
                  description={model.bestFor[activeLocale]}
                  disabled={!selectable}
                  eyebrow={`${providerMeta[model.provider].label} / ${model.category}`}
                  icon={(
                    <ModelCardIconOrFallback
                      fallback={<span className="material-symbols-outlined text-[20px]">{providerMeta[model.provider].icon}</span>}
                      imageClassName="h-5 w-5"
                      modelKey={`${model.provider} ${model.id} ${model.label}`}
                    />
                  )}
                  interaction="border"
                  key={model.id}
                  onClick={() => {
                    if (!selectable) return;
                    setSelectedProvider(model.provider);
                    setSelectedCloudModel(model.id);
                  }}
                  staggerIndex={index}
                  title={model.label}
                  trailing={(
                    <>
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {!selectable && <Badge>{signedIn ? providerText.comingSoon : "Sign in required"}</Badge>}
                    </>
                  )}
                />
              );
            })}
          </div>
        </div>
      </Panel>

      <SetupStepActionCard
        body={t.recommendationReadyBody}
        continueLabel={providerText.continueToOllama}
        onContinue={onContinue}
        statusIcon="tune"
        statusTone="action"
        title={t.recommendationReadyTitle}
      />
    </SetupStepShell>
  );
}
