import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { invokeCommand } from "../../app/tauri";
import type { DocumentAnalysisResult } from "../../types";

export async function chooseDocumentPaths() {
  const selected = await openDialog({
    title: "Attach PDF or spreadsheet",
    multiple: true,
    directory: false,
    filters: [
      {
        name: "Documents",
        extensions: ["pdf", "xlsx", "xls", "csv"],
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
