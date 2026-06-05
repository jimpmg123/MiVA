import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invokeCommand } from "../../app/tauri";
import type { ImageAttachment } from "../../types";

type ReadImageAttachmentResult = {
  name: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
};

export async function chooseImagePaths() {
  const selected = await openDialog({
    title: "Attach image",
    multiple: true,
    directory: false,
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp", "gif"],
      },
    ],
  });

  if (!selected) {
    return [];
  }

  return Array.isArray(selected) ? selected : [selected];
}

export async function readImageAttachment(path: string) {
  return invokeCommand<ReadImageAttachmentResult>("read_image_attachment", { path });
}

export function createImageAttachment(path: string, payload: ReadImageAttachmentResult): ImageAttachment {
  const previewUrl = `data:${payload.mimeType};base64,${payload.dataBase64}`;
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    path,
    name: payload.name,
    mimeType: payload.mimeType,
    dataBase64: payload.dataBase64,
    sizeBytes: payload.sizeBytes,
    previewUrl,
  };
}
