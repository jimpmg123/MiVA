import { Check, Copy } from "lucide-react";
import { isValidElement, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatGeneratedImage } from "../types";

type ChatAssistantMarkdownContentProps = {
  content: string;
  images?: ChatGeneratedImage[];
  imageKeyPrefix?: string;
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

const markdownComponents: Components = {
  pre({ children }) {
    return <MarkdownCodeBlock>{children}</MarkdownCodeBlock>;
  },
};

export function ChatAssistantMarkdownContent({
  content,
  images = [],
  imageKeyPrefix = "assistant-image",
}: ChatAssistantMarkdownContentProps) {
  return (
    <div className="miva-assistant-markdown">
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
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
