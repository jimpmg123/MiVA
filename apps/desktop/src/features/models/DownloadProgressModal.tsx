import { InfoTile, ModalBackdrop, ModalPanel, PrimaryButton, ProgressBar } from "../../components/ui";
import type { ModelDownloadProgress, ModelInfo } from "../../types";
import { formatBytes } from "../../utils";

type DownloadProgressModalProps = {
  downloadProgress: ModelDownloadProgress | null;
  getModelByName: (modelName: string) => ModelInfo;
  t: Record<string, string>;
  onClose: () => void;
};

export function DownloadProgressModal({ downloadProgress, getModelByName, t, onClose }: DownloadProgressModalProps) {
  if (!downloadProgress) {
    return null;
  }

  const model = getModelByName(downloadProgress.model);
  const percent = downloadProgress.error ? downloadProgress.percent ?? 0 : downloadProgress.done ? 100 : downloadProgress.percent ?? 0;
  const visiblePercent = Math.min(100, Math.max(downloadProgress.done ? 100 : 0, percent));
  const title = downloadProgress.error
    ? t.downloadFailed
    : downloadProgress.done
      ? t.downloadComplete
      : t.downloadProgressTitle;

  return (
    <ModalBackdrop>
      <ModalPanel className="max-w-[520px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">{model.label}</p>
            <h2 className="mt-2 font-heading text-[22px] font-semibold leading-[30px] text-[var(--miva-text)]">{title}</h2>
          </div>
          <div
            className={`relative grid h-11 w-11 place-items-center rounded-full ${
              downloadProgress.error ? "bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)]" : "bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]"
            }`}
          >
            {!downloadProgress.done && !downloadProgress.error && (
              <span className="absolute inset-1 rounded-full border-2 border-[var(--miva-primary)]/20 border-t-[var(--miva-primary)] animate-spin" />
            )}
            <span className="material-symbols-outlined relative z-10">
              {downloadProgress.error ? "error" : downloadProgress.done ? "check_circle" : "arrow_downward"}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-[var(--miva-text-muted)]">{downloadProgress.status || t.preparingDownload}</span>
            <span className="text-sm font-bold text-[var(--miva-primary)]">{Math.round(visiblePercent)}%</span>
          </div>
          <ProgressBar
            shimmer={!downloadProgress.done && !downloadProgress.error && visiblePercent > 0}
            success={downloadProgress.done}
            size="lg"
            value={visiblePercent}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile className="p-4" label={t.downloaded} value={formatBytes(downloadProgress.completed)} />
          <InfoTile className="p-4" label={t.downloadSize} value={formatBytes(downloadProgress.total)} />
        </div>

        {downloadProgress.error && (
          <p className="mt-5 rounded-lg bg-[var(--miva-danger-soft)] p-4 text-sm leading-6 text-[var(--miva-danger-hover)]">
            {downloadProgress.error}
          </p>
        )}

        {(downloadProgress.done || downloadProgress.error) && (
          <div className="mt-6 flex justify-end">
            <PrimaryButton className="miva-setup-primary" onClick={onClose}>{t.close}</PrimaryButton>
          </div>
        )}
      </ModalPanel>
    </ModalBackdrop>
  );
}
