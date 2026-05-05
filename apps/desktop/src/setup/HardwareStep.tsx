import type { HardwareInfo } from "../types";
import { Panel, PrimaryButton } from "../components/ui";
import { formatGb, isSupportedGpuName } from "../utils";

type HardwareStepProps = {
  busyAction: string | null;
  hardware: HardwareInfo | null;
  hardwareError: string | null;
  tauriRuntime: boolean;
  t: Record<string, string>;
  refreshHardware: () => void;
  goToNextStep: () => void;
};

export function HardwareStep({
  busyAction,
  hardware,
  hardwareError,
  tauriRuntime,
  t,
  refreshHardware,
  goToNextStep,
}: HardwareStepProps) {
const cpuCores = hardware?.logicalCoreCount ?? 0;
    const ramGb = hardware?.totalMemoryGb ?? 0;
    const diskTotalGb = hardware?.primaryDiskTotalGb ?? 0;
    const diskAvailableGb = hardware?.primaryDiskAvailableGb ?? 0;
    const diskUsedGb = Math.max(diskTotalGb - diskAvailableGb, 0);
    const diskUsedPercent = diskTotalGb > 0 ? Math.min(100, Math.max(0, (diskUsedGb / diskTotalGb) * 100)) : 0;
    const modelCapacityCount = Math.max(1, Math.floor(diskAvailableGb / 4));
    const gpuDetected = isSupportedGpuName(hardware?.gpuName);
    const gpuDisplayName = gpuDetected ? hardware?.gpuName : t.noSupportedGpu;
    const cpuBadge = !hardware ? t.checking : cpuCores >= 12 ? t.highEnd : cpuCores >= 8 ? t.great : cpuCores >= 4 ? t.basic : t.limited;
    const memoryBadge = !hardware ? t.checking : ramGb >= 32 ? t.great : ramGb >= 16 ? t.good : ramGb >= 8 ? t.basic : t.limited;
    const gpuBadge = !hardware ? t.checking : gpuDetected ? t.optimal : t.gpuMissing;
    const cpuVerdict = cpuCores >= 12 ? t.cpuVerdictHigh : cpuCores >= 4 ? t.cpuVerdictGood : t.cpuVerdictBasic;
    const memoryVerdict = ramGb >= 32 ? t.memoryVerdictGreat : ramGb >= 8 ? t.memoryVerdictGood : t.memoryVerdictLimited;
    const gpuVerdict = gpuDetected ? t.gpuVerdictDetected : t.gpuVerdictMissing;

    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h2 className="font-heading mb-2 text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.hardwareTitle}</h2>
            <p className="max-w-3xl text-base leading-6 text-[#72787e]">{t.hardwareBody}</p>
            <div className="mt-6 flex w-fit items-center gap-3 rounded-xl border border-[#c9e8cb]/70 bg-[#c9e8cb]/30 px-5 py-3">
              <span className="material-symbols-outlined text-[#4e6952]">lock</span>
              <p className="text-sm font-medium text-[#4e6952]">{t.hardwarePrivacyBody}</p>
            </div>
          </div>
          <button
            aria-label={t.scanPc}
            className="group relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#c2c7ce] bg-white text-[#35607f] shadow-sm transition hover:border-[#35607f] hover:bg-[#cae6ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!tauriRuntime || busyAction === "hardware"}
            onClick={refreshHardware}
            type="button"
          >
            <span className={`material-symbols-outlined ${busyAction === "hardware" ? "animate-spin" : ""}`}>sync</span>
            <span className="pointer-events-none absolute -bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#2e3132] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              {t.scanPc}
            </span>
          </button>
        </header>

        {!tauriRuntime && (
          <Panel className="mb-6 border-[#ffdad6] bg-[#fff6f4]">
            <p className="text-sm font-semibold text-[#93000a]">{t.runtimeRequired}</p>
          </Panel>
        )}

        {hardwareError && (
          <Panel className="mb-6 border-[#ffdad6] bg-[#fff6f4]">
            <p className="text-sm font-semibold text-[#93000a]">{hardwareError}</p>
          </Panel>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">memory</span>
              </div>
              <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{cpuBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.processor}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">
              {hardware?.cpuBrand || t.unknown} {cpuCores > 0 ? `- ${cpuCores} ${t.cores}` : ""}
            </p>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? cpuVerdict : t.checking}</p>
            </div>
          </div>

          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">database</span>
              </div>
              <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{memoryBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.memory}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">{formatGb(hardware?.totalMemoryGb)} RAM</p>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? memoryVerdict : t.checking}</p>
            </div>
          </div>

          <div className="group row-span-2 flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">videogame_asset</span>
              </div>
              <span className="rounded-full bg-[#cae6ff] px-3 py-1 text-xs font-semibold text-[#1c4b69]">{gpuBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.graphics}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">{hardware ? gpuDisplayName : t.unknown}</p>
            <div className="mb-8">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#72787e]">{t.vramUsage}</span>
                <span className="text-xs font-bold text-[#35607f]">{t.vramPlaceholder}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[12%] rounded-full bg-[#35607f]" />
              </div>
            </div>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? gpuVerdict : t.checking}</p>
            </div>
            <div className="mt-8 overflow-hidden rounded-lg border border-slate-100 bg-[#f3f4f5]">
              <div className="grid h-32 place-items-center bg-[radial-gradient(circle_at_center,#e7e8e9,#c2c7ce)] text-[#35607f]">
                <span className="material-symbols-outlined text-5xl">memory</span>
              </div>
            </div>
          </div>

          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md md:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">hard_drive</span>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{t.driveDetected}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#72787e]">{t.healthy}</span>
              </div>
            </div>
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1">
                <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.disk}</h3>
                <p className="mb-6 text-sm leading-5 text-[#72787e]">{formatGb(hardware?.primaryDiskTotalGb)} Capacity</p>
                <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#4a654e]" style={{ width: `${diskUsedPercent}%` }} />
                </div>
                <div className="flex justify-between text-xs font-semibold text-[#72787e]">
                  <span>{formatGb(diskUsedGb)} {t.used}</span>
                  <span>{formatGb(diskAvailableGb)} {t.available}</span>
                </div>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200/50 bg-[#f3f4f5] p-4">
                <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.modelCapacity}</p>
                <p className="text-sm leading-relaxed text-[#72787e]">
                  {t.modelCapacityBody.replace("{count}", String(modelCapacityCount))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#cceace] text-[#07200f]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-[#191c1d]">{t.systemVerificationComplete}</h4>
              <p className="text-sm text-[#72787e]">{t.hardwareMinimumMet}</p>
            </div>
          </div>
          <PrimaryButton disabled={!hardware && tauriRuntime} onClick={goToNextStep}>
            {t.continueRecommendations}
          </PrimaryButton>
        </div>
      </div>
    );
}
