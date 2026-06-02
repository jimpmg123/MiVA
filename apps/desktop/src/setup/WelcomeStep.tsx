import { IconTile, Panel, PrimaryButton, SetupStepShell } from "../components/ui";

type WelcomeStepProps = {
  t: Record<string, string>;
  onStart: () => void;
};

const features = [
  { icon: "lock", tone: "action" as const, titleKey: "privacyTitle", bodyKey: "privacyBody" },
  { icon: "bolt", tone: "success" as const, titleKey: "localModelTitle", bodyKey: "localModelBody" },
  { icon: "cloud_off", tone: "neutral" as const, titleKey: "guidedTitle", bodyKey: "guidedBody" },
];

export function WelcomeStep({ t, onStart }: WelcomeStepProps) {
  return (
    <SetupStepShell className="items-center justify-center text-center" variant="hero">
      <div className="miva-welcome-reveal mb-10 space-y-4">
        <h2 className="font-heading text-[42px] font-black leading-tight tracking-tight text-[var(--miva-text)]">
          {t.welcomeTitle}
        </h2>
        <p className="mx-auto max-w-xl text-base leading-6 text-[var(--miva-text-muted)]">{t.welcomeBody}</p>
      </div>

      <div className="mb-12 grid w-full grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Panel
            className={`miva-soft-card miva-stagger-item miva-stagger-${index} flex flex-col items-center p-6 text-center transition hover:-translate-y-0.5 hover:shadow-[var(--miva-shadow-md)]`}
            key={feature.titleKey}
          >
            <IconTile className="mb-4 h-12 w-12 rounded-full" tone={feature.tone}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {feature.icon}
              </span>
            </IconTile>
            <h3 className="font-heading mb-1 text-base font-bold text-[var(--miva-text)]">{t[feature.titleKey]}</h3>
            <p className="text-sm leading-5 text-[var(--miva-text-muted)]">{t[feature.bodyKey]}</p>
          </Panel>
        ))}
      </div>

      <div className="miva-welcome-reveal animation-delay-300 flex flex-col items-center gap-4">
        <PrimaryButton className="group rounded-full px-12" onClick={onStart}>
          {t.startSetup}
          <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
        </PrimaryButton>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--miva-text-soft)]">{t.estimatedTime}</p>
      </div>
    </SetupStepShell>
  );
}
