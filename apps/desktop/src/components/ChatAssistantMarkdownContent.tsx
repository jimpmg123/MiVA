import { Check, Copy, Download } from "lucide-react";
import { isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatGeneratedFile, ChatGeneratedImage } from "../types";

type ChatAssistantMarkdownContentProps = {
  content: string;
  images?: ChatGeneratedImage[];
  files?: ChatGeneratedFile[];
  imageKeyPrefix?: string;
};

type CopyVariation = {
  heading: string;
  body: string;
};

type CopyVariationContent = {
  intro: string;
  variations: CopyVariation[];
};

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
}

function getCodeClassName(node: ReactNode): string {
  if (Array.isArray(node)) {
    return node.map(getCodeClassName).find(Boolean) ?? "";
  }

  if (isValidElement<{ className?: string; children?: ReactNode }>(node)) {
    const className = typeof node.props.className === "string" ? node.props.className : "";
    if (className.includes("language-")) {
      return className;
    }

    return getCodeClassName(node.props.children);
  }

  return "";
}

function getLanguageLabel(className: string) {
  const match = className.match(/language-([^\s]+)/);
  if (!match) {
    return "Code";
  }

  return match[1].replace(/[^\w#+.-]/g, "").toUpperCase() || "Code";
}

function fallbackCopyToClipboard(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function getCopyText(markdown: string) {
  return markdown
    .trim()
    .replace(/^>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^["\u201c]|["\u201d]$/g, "")
    .trim();
}

async function copyTextToClipboard(text: string) {
  if (!text) {
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyToClipboard(text);
    }
  } catch {
    fallbackCopyToClipboard(text);
  }
}

function parseCopyVariationContent(content: string): CopyVariationContent | null {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const headingPattern = /^(#{2,4})\s*(?:option\s*)?(\d+)[\s:.)-]+(.+)$/i;
  const variations: CopyVariation[] = [];
  const introLines: string[] = [];
  let current: CopyVariation | null = null;

  for (const line of lines) {
    const headingMatch = line.trim().match(headingPattern);
    if (headingMatch) {
      if (current?.body.trim()) {
        variations.push({ ...current, body: current.body.trim() });
      }

      current = {
        heading: `Option ${headingMatch[2]}: ${headingMatch[3].trim()}`,
        body: "",
      };
      continue;
    }

    if (current) {
      current.body = `${current.body}${current.body ? "\n" : ""}${line}`;
    } else {
      introLines.push(line);
    }
  }

  if (current?.body.trim()) {
    variations.push({ ...current, body: current.body.trim() });
  }

  if (variations.length < 2) {
    return null;
  }

  const copyLikeBodies = variations.filter((variation) => {
    const body = variation.body.trim();
    return /^([*_"]|[\u201c"]|>)/.test(body) || body.length <= 360;
  });

  if (copyLikeBodies.length < variations.length) {
    return null;
  }

  return {
    intro: introLines.join("\n").trim(),
    variations,
  };
}

function MarkdownCodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeText = useMemo(() => getNodeText(children).replace(/\n$/, ""), [children]);
  const languageLabel = useMemo(() => getLanguageLabel(getCodeClassName(children)), [children]);

  async function copyCode() {
    if (!codeText) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        fallbackCopyToClipboard(codeText);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      fallbackCopyToClipboard(codeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  return (
    <div className="miva-markdown-codeblock">
      <div className="miva-markdown-codebar">
        <span>{languageLabel}</span>
        <button
          aria-label={copied ? "Code copied" : "Copy code"}
          className="miva-markdown-copy-button"
          onClick={() => void copyCode()}
          title={copied ? "Copied" : "Copy code"}
          type="button"
        >
          {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.4} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

function CopyVariationCard({ variation }: { variation: CopyVariation }) {
  const [copied, setCopied] = useState(false);
  const copyText = useMemo(() => getCopyText(variation.body), [variation.body]);

  async function copyVariation() {
    await copyTextToClipboard(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className="miva-copy-variation-card">
      <div className="miva-copy-variation-header">
        <span>{variation.heading}</span>
        <button
          aria-label={copied ? "Variation copied" : "Copy variation"}
          className="miva-copy-variation-copy"
          onClick={() => void copyVariation()}
          title={copied ? "Copied" : "Copy"}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="miva-copy-variation-body">
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
          {variation.body}
        </ReactMarkdown>
      </div>
    </article>
  );
}

function getDownloadFileName(name: string) {
  const normalized = name.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  return normalized || "generated-code.txt";
}

function GeneratedFileDownloadLink({ file }: { file: ChatGeneratedFile }) {
  const [url, setUrl] = useState("");
  const downloadName = useMemo(() => getDownloadFileName(file.name), [file.name]);

  useEffect(() => {
    const blob = new Blob([file.content], {
      type: file.mimeType || "text/plain;charset=utf-8",
    });
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file.content, file.mimeType]);

  return (
    <a
      className="miva-generated-file-link"
      download={downloadName}
      href={url}
      title={`Download ${file.name}`}
    >
      <Download size={14} strokeWidth={2.3} />
      <span>{file.name}</span>
    </a>
  );
}

function GeneratedFileDownloads({ files }: { files: ChatGeneratedFile[] }) {
  if (!files.length) {
    return null;
  }

  return (
    <div className="miva-generated-file-list">
      {files.map((file) => (
        <GeneratedFileDownloadLink file={file} key={file.id || file.name} />
      ))}
    </div>
  );
}

const markdownComponents: Components = {
  pre({ children }) {
    return <MarkdownCodeBlock>{children}</MarkdownCodeBlock>;
  },
};

export function ChatAssistantMarkdownContent({
  content,
  files = [],
  images = [],
  imageKeyPrefix = "assistant-image",
}: ChatAssistantMarkdownContentProps) {
  const copyVariationContent = useMemo(() => parseCopyVariationContent(content), [content]);

  return (
    <div className="miva-assistant-markdown">
      <GeneratedFileDownloads files={files} />
      {copyVariationContent ? (
        <div className="miva-copy-variation-layout">
          {copyVariationContent.intro ? (
            <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
              {copyVariationContent.intro}
            </ReactMarkdown>
          ) : null}
          <div className="miva-copy-variation-list">
            {copyVariationContent.variations.map((variation) => (
              <CopyVariationCard key={`${variation.heading}-${variation.body.slice(0, 24)}`} variation={variation} />
            ))}
          </div>
        </div>
      ) : (
        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      )}
      {images.map((image, imageIndex) => (
        <img
          alt={image.alt || "Generated image"}
          className="mt-3 max-h-[360px] w-full rounded-lg border border-[var(--miva-border)] object-contain"
          key={`${imageKeyPrefix}-${imageIndex}`}
          src={image.dataUrl}
        />
      ))}
    </div>
  );
}
