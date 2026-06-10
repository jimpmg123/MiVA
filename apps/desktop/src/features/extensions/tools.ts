import { toolManifestList as sharedToolManifestList } from "../../../../../packages/shared/src/index.js";
import type { ToolManifest } from "./schema";

export const toolManifestList: ToolManifest[] = sharedToolManifestList.map((tool) => ({
  id: tool.id,
  title: tool.title,
  label: tool.label,
  icon: tool.icon,
  description: tool.description,
  role: tool.role,
  features: tool.features,
  auth: tool.auth,
  capabilities: tool.capabilities as ToolManifest["capabilities"],
  confirmation: tool.confirmation,
}));

export const toolManifests = Object.fromEntries(
  toolManifestList.map((tool) => [tool.id, tool]),
) as Record<ToolManifest["id"], ToolManifest>;

export function buildToolPromptPreviewLines(toolConnections: Record<string, unknown>) {
  return toolManifestList.flatMap((tool) => {
    const enabled = toolConnections[tool.id] === true;
    if (!enabled) {
      return [];
    }

    const confirmation = tool.confirmation.writeActions === "required"
      ? " Write actions require confirmation."
      : "";
    return [`- ${tool.title}: on. ${tool.role}${confirmation}`];
  });
}
