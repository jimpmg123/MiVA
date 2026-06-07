import { useEffect } from "react";

type ChatImageLightboxProps = {
  alt?: string;
  dataUrl: string;
  onClose: () => void;
};

export function ChatImageLightbox({ alt, dataUrl, onClose }: ChatImageLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[90vh] max-w-[min(920px,92vw)] overflow-hidden rounded-xl border border-[var(--miva-border)] bg-[var(--miva-surface)] shadow-[var(--miva-shadow-lg)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Close image preview"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-[var(--miva-overlay)] text-white transition hover:bg-black/80"
          onClick={onClose}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
        <img
          alt={alt || "Attached image"}
          className="max-h-[85vh] w-full object-contain"
          src={dataUrl}
        />
      </div>
    </div>
  );
}
