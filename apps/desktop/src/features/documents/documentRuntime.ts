import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { invokeCommand } from "../../app/tauri";
import type { DocumentAnalysisResult } from "../../types";

const ATTACHMENT_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export function isAttachmentImagePath(path: string) {
  const name = path.split(/[\\/]/).pop() || "";
  const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() || "" : "";
  return ATTACHMENT_IMAGE_EXTENSIONS.has(extension);
}

export async function chooseDocumentPaths() {
  const selected = await openDialog({
    title: "Attach file",
    multiple: true,
    directory: false,
    filters: [
      {
        name: "Files",
        extensions: ["pdf", "xlsx", "xls", "csv", "png", "jpg", "jpeg", "webp", "gif"],
      },
    ],
  });

  if (!selected) {
    return [];
  }

  return Array.isArray(selected) ? selected : [selected];
}

export function analyzeDocument(path: string) {
  return invokeCommand<DocumentAnalysisResult>("analyze_document", { path });
}

export function openDocument(path: string) {
  return openPath(path);
}
