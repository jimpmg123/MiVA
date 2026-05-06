import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import type { CloudModelInfo, HardwareInfo, ModelInfo, ProviderId, ProviderMode, SurveyState } from "../types";
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
  survey: SurveyState;
  t: Record<string, string>;
  goToPreviousStep: () => void;
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
  survey,
  t,
  goToPreviousStep,
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
  const reasons = [t.reasonNeed, t.reasonRam];
  if (survey.priority === "speed" || survey.useCase === "fast") {
    reasons.push(t.reasonSpeed);
  }
  if (topIsCloud) {
    reasons.push(providerText.apiKeysNext);
  }

  function selectRecommendedModel() {
    if (topIsCloud) {
      if (!signedIn) {
        return;
      }
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
    <div className="mx-auto max-w-[1080px]">
      <header className="mb-8">
        <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.recommendationTitle}</h2>
        <p className="mt-2 text-base leading-7 text-[#42474d]">{t.recommendationBody}</p>
      </header>

      <Panel className="overflow-hidden border-[#35607f] bg-[#fafdff]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="action">{providerText.recommended}</Badge>
              <Badge tone={topProvider.mode === "local" ? "success" : "action"}>
                {topProvider.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#42474d] shadow-sm">
                <span className="material-symbols-outlined text-[14px]">{topProvider.icon}</span>
                {topProvider.label}
              </span>
            </div>
            <h3 className="mt-4 font-heading text-3xl font-bold text-[#191c1d]">{topLabel}</h3>
            <p className="mt-3 max-w-[640px] text-sm leading-6 text-[#42474d]">{topSummary}</p>
            {topIsCloud && !signedIn && (
              <p className="mt-3 text-sm font-semibold text-[#ba1a1a]">
                Sign in is required to use cloud models.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{topBestFor}</Badge>
              <Badge>{t.totalRam}: {formatGb(hardware?.totalMemoryGb)}</Badge>
              <Badge>
                {topIsCloud ? recommendedCloudModelInfo.status[activeLocale] : recommendedModelInstalled ? t.installed : t.notInstalled}
              </Badge>
            </div>
          </div>
          <PrimaryButton disabled={topIsCloud && !signedIn} onClick={selectRecommendedModel}>{t.selectThis}</PrimaryButton>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {reasons.map((reason) => (
            <div className="rounded-xl bg-[#cae6ff]/45 p-4 text-sm font-semibold leading-6 text-[#1c4b69]" key={reason}>
              {reason}
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">{providerText.localModels}</h3>
            <p className="mt-1 text-sm text-[#72787e]">{providerText.localDataNotice}</p>
          </div>
          <Badge tone="success">Ollama</Badge>
        </div>

        <div className="mt-4 overflow-x-auto pb-3">
          <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
            {localCards.map((card) => {
              const active = selectedProvider === "ollama" && card.model?.name === selectedModel;
              const installed = card.model ? installedModels.includes(card.model.name) : false;

              return (
                <article
                  className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                    active
                      ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                      : card.selectable
                        ? "border-[#c2c7ce]/70 hover:border-[#35607f] hover:shadow-md"
                        : "cursor-not-allowed border-[#e1e3e4] opacity-70"
                  }`}
                  key={card.id}
                  onClick={() => {
                    if (!card.model) return;
                    selectLocalModel(card.model.name);
                  }}
                  role={card.selectable ? "button" : undefined}
                  tabIndex={card.selectable ? 0 : -1}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                      <span className="material-symbols-outlined text-[20px]">memory</span>
                    </span>
                    {active && <Badge tone="action">{providerText.selected}</Badge>}
                    {installed && <Badge tone="success">{t.installed}</Badge>}
                    {!card.selectable && <Badge>{providerText.comingSoon}</Badge>}
                  </div>
                  <p className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{card.label}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">{card.category}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#42474d]">{card.bestFor}</p>
                  {card.model && (
                    <div className="mt-4 flex gap-2">
                      <SecondaryButton
                        className="px-3 py-2 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectLocalModel(card.model.name);
                        }}
                      >
                        {providerText.selectModel}
                      </SecondaryButton>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#e1e3e4]">
          <div className="h-full w-1/3 rounded-full bg-[#35607f]/70" />
        </div>
      </Panel>

      <Panel className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">{providerText.cloudModels}</h3>
            <p className="mt-1 text-sm text-[#72787e]">{providerText.cloudDataNotice}</p>
            {!signedIn && (
              <p className="mt-2 text-sm font-semibold text-[#ba1a1a]">
                Sign in is required to use cloud models.
              </p>
            )}
          </div>
          <Badge tone="action">OpenAI / Gemini</Badge>
        </div>

        <div className="mt-4 overflow-x-auto pb-3">
          <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
            {cloudModelCatalog.map((model) => {
              const active = selectedProvider === model.provider && selectedCloudModel === model.id;
              const selectable = model.id !== "custom-cloud" && signedIn;

              return (
                <button
                  className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                    active
                      ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                      : selectable
                        ? "border-[#c2c7ce]/70 hover:border-[#35607f] hover:shadow-md"
                        : signedIn
                          ? "cursor-not-allowed border-[#e1e3e4] opacity-70"
                          : "cursor-not-allowed border-[#ffb4ab] opacity-70"
                  }`}
                  disabled={!selectable}
                  key={model.id}
                  onClick={() => {
                    if (!selectable) {
                      return;
                    }
                    setSelectedProvider(model.provider);
                    setSelectedCloudModel(model.id);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                      <span className="material-symbols-outlined text-[20px]">{providerMeta[model.provider].icon}</span>
                    </span>
                    {active && <Badge tone="action">{providerText.selected}</Badge>}
                    {!selectable && <Badge>{signedIn ? providerText.comingSoon : "Sign in required"}</Badge>}
                  </div>
                  <p className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{model.label}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">
                    {providerMeta[model.provider].label} / {model.category}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#42474d]">{model.bestFor[activeLocale]}</p>
                  {!signedIn && <p className="mt-3 text-xs font-semibold text-[#ba1a1a]">Sign in required</p>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#e1e3e4]">
          <div className="h-full w-1/3 rounded-full bg-[#35607f]/70" />
        </div>
      </Panel>

      <div className="mt-8 flex items-center justify-between">
        <SecondaryButton onClick={goToPreviousStep}>{t.back}</SecondaryButton>
        <PrimaryButton onClick={onContinue}>{providerText.continueToOllama}</PrimaryButton>
      </div>
    </div>
  );
}
