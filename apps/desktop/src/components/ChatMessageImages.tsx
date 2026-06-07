import { useState } from "react";
import type { ChatGeneratedImage } from "../types";
import { ChatImageLightbox } from "./ChatImageLightbox";

type ChatMessageImagesProps = {
  images: ChatGeneratedImage[];
  variant?: "user" | "assistant";
};

export function ChatMessageImages({ images, variant = "user" }: ChatMessageImagesProps) {
  const [activeImage, setActiveImage] = useState<ChatGeneratedImage | null>(null);

  if (images.length === 0) {
    return null;
  }

  const thumbnailBorder = variant === "user"
    ? "border-white/25 hover:border-white/50"
    : "border-[var(--miva-border)] hover:border-[var(--miva-primary)]";

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((image, index) => (
          <button
            aria-label={image.alt ? `Open ${image.alt}` : "Open attached image"}
            className={`overflow-hidden rounded-md border transition ${thumbnailBorder}`}
            key={`${image.dataUrl}-${index}`}
            onClick={() => setActiveImage(image)}
            type="button"
          >
            <img
              alt={image.alt || "Attached image"}
              className="h-16 w-16 object-cover"
              src={image.dataUrl}
            />
          </button>
        ))}
      </div>
      {activeImage ? (
        <ChatImageLightbox
          alt={activeImage.alt}
          dataUrl={activeImage.dataUrl}
          onClose={() => setActiveImage(null)}
        />
      ) : null}
    </>
  );
}
