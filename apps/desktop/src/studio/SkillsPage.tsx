import { useRef, useState } from "react";
import type { Locale } from "../i18n";
import type { ImportedSkill } from "../types";
import { parseImportedSkillFile, readMarkdownFilesFromInput } from "../features/skills/skillImport";
import {
  Badge,
  Panel,
  SecondaryButton,
  SectionHeader,
  StatusAlert,
} from "../components/ui";

type SkillsStudioPanelProps = {
  locale: Locale;
  skills: ImportedSkill[];
  onSkillsChange: (skills: ImportedSkill[]) => void;
};

type SkillChipProps = {
  skill: ImportedSkill;
  deleteMode: boolean;
  onDelete: (skillId: string) => void;
  onToggle: (skillId: string) => void;
};

function SkillChip({ skill, deleteMode, onDelete, onToggle }: SkillChipProps) {
  return (
    <div
      className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-sm font-semibold transition ${
        deleteMode
          ? "border-[var(--miva-danger)]/40 bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)] hover:border-[var(--miva-danger)] hover:bg-[var(--miva-danger-soft)]"
          : "border-violet-300/40 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100"
      }`}
      onClick={() => {
        if (deleteMode) {
          onDelete(skill.id);
        } else {
          onToggle(skill.id);
        }
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        if (deleteMode) {
          onDelete(skill.id);
        } else {
          onToggle(skill.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        {deleteMode ? "delete" : skill.icon}
      </span>
      <span className="truncate">{skill.name}</span>
    </div>
  );
}

type SkillColumnProps = {
  title: string;
  subtitle: string;
  skills: ImportedSkill[];
  emptyLabel: string;
  deleteMode: boolean;
  onDelete: (skillId: string) => void;
  onToggle: (skillId: string) => void;
};

function SkillColumn({
  title,
  subtitle,
  skills,
  emptyLabel,
  deleteMode,
  onDelete,
  onToggle,
}: SkillColumnProps) {
  return (
    <div className="min-h-[220px] rounded-lg border border-dashed border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[var(--miva-text)]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.length === 0 ? (
          <p className="text-xs text-[var(--miva-text-soft)]">{emptyLabel}</p>
        ) : (
          skills.map((skill) => (
            <SkillChip
              key={skill.id}
              deleteMode={deleteMode}
              onDelete={onDelete}
              onToggle={onToggle}
              skill={skill}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function SkillsStudioPanel({ locale, skills, onSkillsChange }: SkillsStudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"success" | "warning" | "neutral">("success");
  const [deleteMode, setDeleteMode] = useState(false);

  const enabledSkills = skills.filter((skill) => skill.enabled);
  const disabledSkills = skills.filter((skill) => !skill.enabled);

  const toggleSkill = (skillId: string) => {
    onSkillsChange(skills.map((skill) => (
      skill.id === skillId ? { ...skill, enabled: !skill.enabled } : skill
    )));
  };

  const deleteSkill = (skillId: string) => {
    const deletedSkill = skills.find((skill) => skill.id === skillId);
    onSkillsChange(skills.filter((skill) => skill.id !== skillId));
    setNotice(
      locale === "en"
        ? `Deleted ${deletedSkill?.name ?? "skill"}. Click another skill to delete, or press Delete skill again to exit.`
        : `${deletedSkill?.name ?? "스킬"}을(를) 삭제했습니다. 다른 스킬을 클릭해 삭제하거나 Delete skill을 다시 눌러 종료하세요.`,
    );
    setNoticeTone("warning");
  };

  const toggleDeleteMode = () => {
    setDeleteMode((current) => {
      const next = !current;
      if (next) {
        setNotice(locale === "en" ? "Click to delete skill" : "삭제할 스킬을 클릭하세요");
        setNoticeTone("warning");
      } else {
        setNotice(null);
      }
      return next;
    });
  };

  const handleImportFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    setDeleteMode(false);

    const parsedFiles = await readMarkdownFilesFromInput(files);
    if (parsedFiles.length === 0) {
      setNotice(locale === "en" ? "Only .md skill files are supported." : ".md 스킬 파일만 가져올 수 있습니다.");
      setNoticeTone("neutral");
      return;
    }

    let nextSkills = [...skills];
    for (const file of parsedFiles) {
      nextSkills = [...nextSkills, parseImportedSkillFile(file.fileName, file.content, nextSkills)];
    }

    onSkillsChange(nextSkills);
    setNotice(
      locale === "en"
        ? `Imported ${parsedFiles.length} skill file${parsedFiles.length === 1 ? "" : "s"}. Enabled skills appear in runtime chat slash menu.`
        : `${parsedFiles.length}개의 스킬 파일을 가져왔습니다. 활성화된 스킬은 런타임 채팅 슬래시 메뉴에 표시됩니다.`,
    );
    setNoticeTone("success");
  };

  return (
    <div className="grid gap-6">
      <Panel>
        <SectionHeader
          eyebrow="Skills"
          title="Imported skill files"
          body={
            locale === "en"
              ? "Upload .md skill files, click chips to move them between enabled and disabled, then use /skill-name in runtime chat."
              : ".md 스킬 파일을 업로드하고 스킬 칩을 클릭해 활성/비활성으로 옮긴 뒤, 런타임 채팅에서 /스킬이름 으로 사용하세요."
          }
          actions={(
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <input
                accept=".md,text/markdown"
                className="hidden"
                multiple
                onChange={(event) => {
                  void handleImportFiles(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
              <SecondaryButton onClick={() => fileInputRef.current?.click()}>
                <span className="material-symbols-outlined text-[19px]">upload_file</span>
                Import skill
              </SecondaryButton>
              <SecondaryButton
                className={deleteMode ? "border-[var(--miva-danger)]/40 bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)]" : undefined}
                onClick={toggleDeleteMode}
              >
                <span className="material-symbols-outlined text-[19px]">delete</span>
                Delete skill
              </SecondaryButton>
            </div>
          )}
        />

        {notice ? <StatusAlert className="mt-5" tone={noticeTone}>{notice}</StatusAlert> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SkillColumn
            deleteMode={deleteMode}
            emptyLabel={locale === "en" ? "No enabled skills" : "활성화된 스킬 없음"}
            onDelete={deleteSkill}
            onToggle={toggleSkill}
            skills={enabledSkills}
            subtitle={
              locale === "en"
                ? "Click a skill to disable it."
                : "스킬을 클릭하면 비활성화됩니다."
            }
            title={locale === "en" ? "Enabled" : "활성화"}
          />
          <SkillColumn
            deleteMode={deleteMode}
            emptyLabel={locale === "en" ? "No disabled skills" : "비활성화된 스킬 없음"}
            onDelete={deleteSkill}
            onToggle={toggleSkill}
            skills={disabledSkills}
            subtitle={
              locale === "en"
                ? "Click a skill to enable it."
                : "스킬을 클릭하면 활성화됩니다."
            }
            title={locale === "en" ? "Disabled" : "비활성화"}
          />
        </div>

        {skills.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill.id} tone={skill.enabled ? "success" : "neutral"}>
                /{skill.slug}
              </Badge>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel className="bg-[var(--miva-primary-surface)]">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]">
            <span className="material-symbols-outlined text-[22px]">menu_book</span>
          </span>
          <div>
            <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">
              {locale === "en" ? "How runtime uses skills" : "런타임에서 스킬 사용 방법"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              {locale === "en"
                ? "Select a skill with /, press Enter to see usage help, then send your request. MiVA injects the skill markdown into the prompt only for that message."
                : "채팅에서 / 로 스킬을 선택하고 Enter로 사용법을 확인한 뒤 요청을 보내세요. MiVA는 그 메시지에만 스킬 md 내용을 프롬프트에 넣습니다."}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
