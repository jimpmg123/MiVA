import { PrimaryButton } from "../../components/ui";
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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#191c1d]/35 px-6 backdrop-blur-sm">
      <section className="w-full max-w-[520px] rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_24px_80px_rgba(25,28,29,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">{model.label}</p>
            <h2 className="mt-2 font-heading text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{title}</h2>
          </div>
          <div
            className={`relative grid h-11 w-11 place-items-center rounded-full ${
              downloadProgress.error ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#cae6ff] text-[#35607f]"
            }`}
          >
            {!downloadProgress.done && !downloadProgress.error && (
              <span className="absolute inset-1 rounded-full border-2 border-[#35607f]/20 border-t-[#35607f] animate-spin" />
            )}
            <span className="material-symbols-outlined relative z-10">
              {downloadProgress.error ? "error" : downloadProgress.done ? "check_circle" : "arrow_downward"}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-[#42474d]">{downloadProgress.status || t.preparingDownload}</span>
            <span className="text-sm font-bold text-[#35607f]">{Math.round(visiblePercent)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#e1e3e4]">
            <div className="h-full rounded-full bg-[#35607f] transition-all duration-300" style={{ width: `${visiblePercent}%` }} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.downloaded}</p>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">{formatBytes(downloadProgress.completed)}</p>
          </div>
          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.downloadSize}</p>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">{formatBytes(downloadProgress.total)}</p>
          </div>
        </div>

        {downloadProgress.error && (
          <p className="mt-5 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{downloadProgress.error}</p>
        )}

        {(downloadProgress.done || downloadProgress.error) && (
          <div className="mt-6 flex justify-end">
            <PrimaryButton onClick={onClose}>{t.close}</PrimaryButton>
          </div>
        )}
      </section>
    </div>
  );
}
