import { APP_VERSION } from "./version";

type BootScreenProps = {
  progress: number;
  statusLine: string;
};

export function BootScreen({ progress, statusLine }: BootScreenProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <main className="relative flex h-screen min-w-[1000px] items-center justify-center bg-[#f8fafc] text-[#0f172a]">
      <div className="flex w-full max-w-[420px] flex-col items-center px-8 text-center">
        <div className="grid h-[72px] w-[72px] place-items-center rounded-[20px] bg-[#2563eb] shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
          <span className="material-symbols-outlined text-[34px] text-white">auto_awesome</span>
        </div>

        <h1 className="mt-7 font-heading text-[2rem] font-bold tracking-[-0.03em] text-[#0f172a]">miva</h1>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#94a3b8]">LOCAL AI ASSISTANT</p>

        <div className="mt-14 h-[3px] w-full overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-[#2563eb] transition-[width] duration-500 ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        <p className="mt-8 text-sm font-medium text-[#64748b]">로컬 AI 환경을 준비하고 있습니다...</p>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#94a3b8]">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#cbd5e1] border-t-[#64748b]" />
          <span>{statusLine}</span>
        </div>
      </div>

      <footer className="absolute bottom-8 text-[11px] font-medium uppercase tracking-[0.18em] text-[#cbd5e1]">
        Version {APP_VERSION} &bull; Secure Local Host
      </footer>
    </main>
  );
}
