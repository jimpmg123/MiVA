import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function getLocalModelIconSrc(modelKey: string): string | null {
  const key = modelKey.toLowerCase();

  if (key.includes("qwen")) {
    return "/images/qwen-icon.png";
  }

  if (key.includes("exaone")) {
    return "/images/exaone-icon.png";
  }

  if (key.includes("llama")) {
    return "/images/llama-icon.png";
  }

  if (key.includes("gemma")) {
    return "/images/gemma-icon.png";
  }

  if (key.includes("gemini")) {
    return "/images/gemini-icon.png";
  }

  if (key.includes("gpt") || key.includes("openai")) {
    return "/images/gpt-icon.png";
  }

  return null;
}

export function ModelCardIcon({
  modelKey,
  className,
  imageClassName,
}: {
  modelKey: string;
  className?: string;
  imageClassName?: string;
}) {
  const src = getLocalModelIconSrc(modelKey);

  if (src) {
    return (
      <img
        alt=""
        className={cn("h-6 w-6 object-contain", imageClassName, className)}
        src={src}
      />
    );
  }

  return <span className={cn("material-symbols-outlined text-[22px]", className)}>memory</span>;
}

export function ModelCardIconOrFallback({
  modelKey,
  fallback,
  className,
  imageClassName,
}: {
  modelKey: string;
  fallback: ReactNode;
  className?: string;
  imageClassName?: string;
}) {
  if (getLocalModelIconSrc(modelKey)) {
    return <ModelCardIcon className={className} imageClassName={imageClassName} modelKey={modelKey} />;
  }

  return <>{fallback}</>;
}
