import type { HardwareInfo } from "../types";
import {
  Badge,
  IconButton,
  IconTile,
  Panel,
  ProgressBar,
  SectionHeader,
  SetupStepActionCard,
  SetupStepShell,
  StatPanel,
  StatusAlert,
} from "../components/ui";
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
  const scanKey = hardware
    ? `${hardware.cpuBrand ?? ""}-${hardware.totalMemoryGb ?? 0}-${hardware.gpuName ?? ""}`
    : "pending";

  return (
    <SetupStepShell>
      <SectionHeader
        actions={(
          <IconButton
            aria-label={t.scanPc}
            className="group relative shrink-0 border border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-primary)] shadow-sm hover:border-[var(--miva-primary)] hover:bg-[var(--miva-primary-surface)]"
            disabled={!tauriRuntime || busyAction === "hardware"}
            onClick={refreshHardware}
            title={t.scanPc}
          >
            <span className={`material-symbols-outlined ${busyAction === "hardware" ? "animate-spin" : ""}`}>sync</span>
          </IconButton>
        )}
        body={t.hardwareBody}
        title={t.hardwareTitle}
      />

      <StatusAlert className="mt-6 flex items-center gap-3 font-normal" tone="success">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--miva-success-soft)] text-[var(--miva-success)]">
          <span className="material-symbols-outlined text-[20px]">lock</span>
        </span>
        <p>{t.hardwarePrivacyBody}</p>
      </StatusAlert>

      {!tauriRuntime && (
        <StatusAlert className="mt-4" tone="danger">
          {t.runtimeRequired}
        </StatusAlert>
      )}

      {hardwareError && (
        <StatusAlert className="mt-4" tone="danger">
          {hardwareError}
        </StatusAlert>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" key={scanKey}>
        <StatPanel
          badge={<Badge tone="success">{cpuBadge}</Badge>}
          body={`${hardware?.cpuBrand || t.unknown}${cpuCores > 0 ? ` - ${cpuCores} ${t.cores}` : ""}`}
          footerLabel={t.verdict}
          footerValue={hardware ? cpuVerdict : t.checking}
          icon={<span className="material-symbols-outlined">memory</span>}
          staggerIndex={0}
          title={t.processor}
        />

        <StatPanel
          badge={<Badge tone="success">{memoryBadge}</Badge>}
          body={`${formatGb(hardware?.totalMemoryGb)} RAM`}
          footerLabel={t.verdict}
          footerValue={hardware ? memoryVerdict : t.checking}
          icon={<span className="material-symbols-outlined">database</span>}
          staggerIndex={1}
          title={t.memory}
        />

        <StatPanel
          badge={<Badge tone="action">{gpuBadge}</Badge>}
          body={hardware ? gpuDisplayName : t.unknown}
          className="row-span-2"
          footerLabel={t.verdict}
          footerValue={hardware ? gpuVerdict : t.checking}
          icon={<span className="material-symbols-outlined">videogame_asset</span>}
          staggerIndex={2}
          title={t.graphics}
        >
          <div className="mb-8 mt-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--miva-text-soft)]">{t.vramUsage}</span>
              <span className="text-xs font-bold text-[var(--miva-primary)]">{t.vramPlaceholder}</span>
            </div>
            <ProgressBar value={12} />
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)]">
            <div className="grid h-32 place-items-center bg-[radial-gradient(circle_at_center,var(--miva-surface-muted),var(--miva-border))] text-[var(--miva-primary)]">
              <span className="material-symbols-outlined text-5xl">memory</span>
            </div>
          </div>
        </StatPanel>

        <Panel className="group miva-stagger-item miva-stagger-3 md:col-span-2 transition hover:shadow-[var(--miva-shadow-md)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <IconTile className="transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined">hard_drive</span>
            </IconTile>
            <div className="flex gap-2">
              <Badge tone="success">{t.driveDetected}</Badge>
              <Badge>{t.healthy}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-8 md:flex-row">
            <div className="flex-1">
              <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] text-[var(--miva-text)]">{t.disk}</h3>
              <p className="mb-6 text-sm leading-5 text-[var(--miva-text-muted)]">{formatGb(hardware?.primaryDiskTotalGb)} Capacity</p>
              <div className="mb-2 h-4 overflow-hidden rounded-full bg-[var(--miva-surface-muted)]">
                <div
                  className="miva-progress-bar-fill h-full rounded-full bg-[var(--miva-success)]"
                  style={{ width: `${diskUsedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold text-[var(--miva-text-soft)]">
                <span>{formatGb(diskUsedGb)} {t.used}</span>
                <span>{formatGb(diskAvailableGb)} {t.available}</span>
              </div>
            </div>

            <div className="flex-1 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--miva-text)]">{t.modelCapacity}</p>
              <p className="text-sm leading-relaxed text-[var(--miva-text-muted)]">
                {t.modelCapacityBody.replace("{count}", String(modelCapacityCount))}
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <SetupStepActionCard
        className="miva-stagger-item miva-stagger-4"
        body={t.hardwareMinimumMet}
        continueDisabled={!hardware && tauriRuntime}
        continueLabel={t.continueRecommendations}
        onContinue={goToNextStep}
        title={t.systemVerificationComplete}
      />
    </SetupStepShell>
  );
}
