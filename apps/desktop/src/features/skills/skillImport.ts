import type { ImportedSkill } from "../../types";
import { inferSkillIcon } from "./skillIcons";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "skill";
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      meta: {} as Record<string, string>,
      body: raw.trim(),
    };
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) {
      meta[key] = value;
    }
  }

  return {
    meta,
    body: match[2].trim(),
  };
}

function createSkillId() {
  return globalThis.crypto?.randomUUID?.() ?? `skill_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function uniqueSlug(baseSlug: string, existing: ImportedSkill[]) {
  const taken = new Set(existing.map((skill) => skill.slug));
  if (!taken.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;
  while (taken.has(`${baseSlug}-${index}`)) {
    index += 1;
  }

  return `${baseSlug}-${index}`;
}

export function parseImportedSkillFile(fileName: string, rawContent: string, existing: ImportedSkill[] = []) {
  const { meta, body } = parseFrontmatter(rawContent);
  const baseSlug = slugify(meta.name || fileName);
  const slug = uniqueSlug(baseSlug, existing);
  const name = (meta.name || fileName.replace(/\.md$/i, "") || slug).trim();
  const description = (meta.description || body.split(/\r?\n/).find((line) => line.trim()) || `${name} skill`).trim().slice(0, 180);
  const content = body || rawContent.trim();

  const skill: ImportedSkill = {
    id: createSkillId(),
    slug,
    name,
    description,
    icon: inferSkillIcon(name, description, content),
    content,
    sourceFileName: fileName,
    enabled: true,
    importedAt: new Date().toISOString(),
  };

  return skill;
}

export async function readMarkdownFilesFromInput(files: FileList | File[]) {
  const list = Array.from(files).filter((file) => file.name.toLowerCase().endsWith(".md"));
  const results: Array<{ fileName: string; content: string }> = [];

  for (const file of list) {
    results.push({
      fileName: file.name,
      content: await file.text(),
    });
  }

  return results;
}
