import { useState } from "react";
import { InfoTile, ModalBackdrop, ModalPanel, PrimaryButton, ProgressBar, SecondaryButton } from "../../components/ui";
import type { ModelDownloadDockMode, ModelDownloadProgress, ModelInfo } from "../../types";
import { formatBytes } from "../../utils";

type ModelDownloadOverlayProps = {
  downloadProgress: ModelDownloadProgress | null;
  dockMode: ModelDownloadDockMode;
  getModelByName: (modelName: string) => ModelInfo;
  t: Record<string, string>;
  onClose: () => void;
  onDockModeChange: (mode: ModelDownloadDockMode) => void;
  onPause: (model: string) => void;
  onResume: (model: string) => void;
  onCancel: (model: string) => void;
};

export function ModelDownloadOverlay({
  downloadProgress,
  dockMode,
  getModelByName,
  t,
  onClose,
  onDockModeChange,
  onPause,
  onResume,
  onCancel,
}: ModelDownloadOverlayProps) {
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  if (!downloadProgress) {
    return null;
  }

  const model = getModelByName(downloadProgress.model);
  const percent = downloadProgress.error
    ? downloadProgress.percent ?? 0
    : downloadProgress.done
      ? 100
      : downloadProgress.percent ?? 0;
  const visiblePercent = Math.min(100, Math.max(downloadProgress.done ? 100 : 0, percent));
  const isPaused = Boolean(downloadProgress.paused);
  const isActive = !downloadProgress.done && !downloadProgress.error;
  const title = downloadProgress.error
    ? t.downloadFailed
    : downloadProgress.done
      ? t.downloadComplete
      : isPaused
        ? t.downloadPaused
        : t.downloadProgressTitle;

  const actionRow = isActive ? (
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <SecondaryButton
        className="min-w-[108px]"
        onClick={() => (isPaused ? onResume(downloadProgress.model) : onPause(downloadProgress.model))}
        type="button"
      >
        {isPaused ? t.resumeDownload : t.pauseDownload}
      </SecondaryButton>
      <button
        className="inline-flex min-w-[108px] items-center justify-center rounded-xl border border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] px-4 py-2.5 text-sm font-bold text-[var(--miva-danger-hover)] transition hover:opacity-90"
        onClick={() => setShowStopConfirm(true)}
        type="button"
      >
        {t.stopDownload}
      </button>
    </div>
  ) : (
    <div className="mt-6 flex justify-end">
      <PrimaryButton className="miva-setup-primary" onClick={onClose} type="button">{t.close}</PrimaryButton>
    </div>
  );

  if (dockMode === "minimal") {
    return (
      <button
        className="fixed bottom-6 right-6 z-[120] rounded-full bg-[var(--miva-primary)] px-3 py-2 text-xs font-black text-white shadow-2xl transition hover:opacity-90"
        onClick={() => onDockModeChange("compact")}
        type="button"
      >
        {Math.round(visiblePercent)}%
      </button>
    );
  }

  if (dockMode === "compact") {
    return (
      <div className="fixed bottom-6 right-6 z-[120] w-[min(calc(100vw-2rem),320px)] overflow-hidden rounded-2xl border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4 shadow-2xl">
        {showStopConfirm && (
          <div className="mb-3 rounded-xl border border-[var(--miva-border)] bg-[var(--miva-surface-muted)] p-3">
            <p className="text-sm font-bold text-[var(--miva-text)]">{t.stopDownloadConfirmTitle}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">{t.stopDownloadConfirmBody}</p>
            <div className="mt-3 flex justify-end gap-2">
              <SecondaryButton onClick={() => setShowStopConfirm(false)} type="button">{t.keepDownloading}</SecondaryButton>
              <button
                className="rounded-xl bg-[var(--miva-danger-hover)] px-3 py-2 text-xs font-bold text-white"
                onClick={() => {
                  setShowStopConfirm(false);
                  onCancel(downloadProgress.model);
                }}
                type="button"
              >
                {t.confirmStopDownload}
              </button>
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{model.label}</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--miva-text)]">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)]"
              onClick={() => onDockModeChange("modal")}
              title={t.expandDownload}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_full</span>
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)]"
              onClick={() => onDockModeChange("minimal")}
              title={t.collapseDownload}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="truncate text-xs font-semibold text-[var(--miva-text-muted)]">{downloadProgress.status || t.preparingDownload}</span>
          <span className="shrink-0 text-sm font-bold text-[var(--miva-primary)]">{Math.round(visiblePercent)}%</span>
        </div>
        <div className="mt-2">
          <ProgressBar shimmer={isActive && !isPaused && visiblePercent > 0} success={downloadProgress.done} size="sm" value={visiblePercent} />
        </div>
        {isActive && (
          <div className="mt-3 flex gap-2">
            <SecondaryButton className="flex-1" onClick={() => (isPaused ? onResume(downloadProgress.model) : onPause(downloadProgress.model))} type="button">
              {isPaused ? t.resumeDownload : t.pauseDownload}
            </SecondaryButton>
            <button
              className="flex-1 rounded-xl border border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] px-3 py-2 text-xs font-bold text-[var(--miva-danger-hover)]"
              onClick={() => setShowStopConfirm(true)}
              type="button"
            >
              {t.stopDownload}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ModalBackdrop>
      <ModalPanel className="max-w-[520px]">
        {showStopConfirm && (
          <div className="mb-4 rounded-xl border border-[var(--miva-border)] bg-[var(--miva-surface-muted)] p-4">
            <p className="text-sm font-bold text-[var(--miva-text)]">{t.stopDownloadConfirmTitle}</p>
            <p className="mt-2 text-xs leading-6 text-[var(--miva-text-muted)]">{t.stopDownloadConfirmBody}</p>
            <div className="mt-4 flex justify-end gap-2">
              <SecondaryButton onClick={() => setShowStopConfirm(false)} type="button">{t.keepDownloading}</SecondaryButton>
              <button
                className="rounded-xl bg-[var(--miva-danger-hover)] px-4 py-2 text-sm font-bold text-white"
                onClick={() => {
                  setShowStopConfirm(false);
                  onCancel(downloadProgress.model);
                }}
                type="button"
              >
                {t.confirmStopDownload}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">{model.label}</p>
            <h2 className="mt-2 font-heading text-[22px] font-semibold leading-[30px] text-[var(--miva-text)]">{title}</h2>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {isActive && (
              <button
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--miva-border)] text-[var(--miva-text-muted)] transition hover:bg-[var(--miva-surface-muted)]"
                onClick={() => onDockModeChange("compact")}
                title={t.minimizeDownload}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">minimize</span>
              </button>
            )}
            <div
              className={`relative grid h-11 w-11 place-items-center rounded-full ${
                downloadProgress.error ? "bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)]" : "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]"
              }`}
            >
              {isActive && !isPaused && (
                <span className="absolute inset-1 rounded-full border-2 border-[var(--miva-primary)]/20 border-t-[var(--miva-primary)] animate-spin" />
              )}
              <span className="material-symbols-outlined relative z-10">
                {downloadProgress.error ? "error" : downloadProgress.done ? "check_circle" : isPaused ? "pause" : "arrow_downward"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="min-w-0 truncate text-sm font-semibold text-[var(--miva-text-muted)]">{downloadProgress.status || t.preparingDownload}</span>
            <span className="shrink-0 text-sm font-bold text-[var(--miva-primary)]">{Math.round(visiblePercent)}%</span>
          </div>
          <ProgressBar
            shimmer={isActive && !isPaused && visiblePercent > 0}
            success={downloadProgress.done}
            size="lg"
            value={visiblePercent}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile className="min-w-0 p-4" label={t.downloaded} value={formatBytes(downloadProgress.completed)} />
          <InfoTile className="min-w-0 p-4" label={t.downloadSize} value={formatBytes(downloadProgress.total)} />
        </div>

        {downloadProgress.error && (
          <p className="mt-5 break-words rounded-lg bg-[var(--miva-danger-soft)] p-4 text-sm leading-6 text-[var(--miva-danger-hover)]">
            {downloadProgress.error}
          </p>
        )}

        {actionRow}
      </ModalPanel>
    </ModalBackdrop>
  );
}
