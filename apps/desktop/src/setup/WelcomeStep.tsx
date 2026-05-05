type WelcomeStepProps = {
  t: Record<string, string>;
  onStart: () => void;
};

export function WelcomeStep({ t, onStart }: WelcomeStepProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-144px)] w-full max-w-4xl flex-col items-center justify-center text-center">
      <div className="mb-10 space-y-4">
        <h2 className="font-heading text-[42px] font-black leading-tight tracking-tight text-[#191c1d]">{t.welcomeTitle}</h2>
        <p className="mx-auto max-w-xl font-sans text-base leading-6 text-[#42474d] opacity-80">{t.welcomeBody}</p>
      </div>

      <div className="mb-12 grid w-full grid-cols-3 gap-6">
        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#35607f]/10 text-[#35607f]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.privacyTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.privacyBody}</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#4a654e]/10 text-[#4a654e]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.localModelTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.localModelBody}</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#555d63]/10 text-[#555d63]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud_off
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.guidedTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.guidedBody}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          className="group flex items-center gap-2 rounded-full bg-[#35607f] px-12 py-4 font-heading text-base font-semibold text-white transition-all duration-300 hover:bg-[#4f7999] hover:shadow-lg active:scale-95"
          onClick={onStart}
          type="button"
        >
          {t.startSetup}
          <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#72787e] opacity-60">{t.estimatedTime}</p>
      </div>
    </div>
  );
}
