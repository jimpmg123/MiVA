import type { AssistantProfileSyncState, LocalAssistantProfile } from "../types";
import { Badge, Button, IconButton, IconTile } from "../components/ui";

type MyAssistantCardProps = {
  profile: LocalAssistantProfile;
  active: boolean;
  syncState: AssistantProfileSyncState;
  onEdit: () => void;
  onRename: () => void;
  onSync: () => void;
  onRun: () => void;
  onDelete: () => void;
};

const defaultPurpose = "Help me organize daily tasks, answer questions, and plan practical next actions.";
const defaultTasks = "Write what you want this assistant to help with. Example: plan my study schedule, summarize notes, prepare calendar reminders.";

function formatCardDate(value?: string | null) {
  if (!value) {
    return "Not started";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not started";
  }

  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sentenceSummary(value: string, fallback: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  const firstSentence = normalized.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? normalized;
  return firstSentence.length > 142 ? `${firstSentence.slice(0, 139)}...` : firstSentence;
}

function getAssistantRole(profile: LocalAssistantProfile) {
  const purpose = profile.prompt?.settings?.simple?.assistantPurpose?.trim();
  if (purpose && purpose !== defaultPurpose) {
    return sentenceSummary(purpose.split(" - ")[0] ?? purpose, "Custom assistant");
  }

  if (profile.useCase) {
    return `${profile.useCase[0].toUpperCase()}${profile.useCase.slice(1)} assistant`;
  }

  return "Custom assistant";
}

function getPromptCharacter(profile: LocalAssistantProfile) {
  const desiredTasks = profile.prompt?.settings?.simple?.desiredTasks?.trim();
  if (desiredTasks && desiredTasks !== defaultTasks) {
    return sentenceSummary(desiredTasks, "No prompt brief yet.");
  }

  if (profile.description && profile.description !== "Local MiVA assistant profile created from setup choices.") {
    return sentenceSummary(profile.description, "No prompt brief yet.");
  }

  return "No prompt brief yet.";
}

function AssistantActionButton({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="h-10 w-10 rounded-lg p-0"
      disabled={disabled}
      onClick={onClick}
      size="icon"
      title={label}
      variant={active ? "default" : "secondary"}
    >
      <span className="material-symbols-outlined text-[21px]" aria-hidden="true">
        {icon}
      </span>
    </Button>
  );
}

export function MyAssistantCard({
  profile,
  active,
  syncState,
  onEdit,
  onRename,
  onSync,
  onRun,
  onDelete,
}: MyAssistantCardProps) {
  const syncLabel = profile.sync?.cloudEnabled ? "Cloud synced" : "Local only";
  const syncTone = profile.sync?.cloudEnabled ? "success" : "neutral";
  const roleLabel = getAssistantRole(profile);
  const promptCharacter = getPromptCharacter(profile);

  const renameButton = (
    <IconButton
      aria-label={`Rename ${profile.name}`}
      className="h-8 w-8 shrink-0 rounded-lg text-[var(--miva-text-muted)] hover:bg-[var(--miva-primary-surface)] hover:text-[var(--miva-primary)]"
      onClick={onRename}
      title="Rename assistant"
    >
      <span className="material-symbols-outlined text-[18px]">drive_file_rename_outline</span>
    </IconButton>
  );

  return (
    <article
      className={`relative grid gap-4 rounded-lg border bg-[var(--miva-surface)] p-4 shadow-sm transition hover:border-[var(--miva-border-strong)] hover:shadow-[var(--miva-shadow-md)] xl:grid-cols-[auto_minmax(180px,1.1fr)_minmax(220px,1.7fr)_auto] xl:items-center ${
        active ? "border-[var(--miva-primary)] ring-4 ring-[var(--miva-primary-soft)]" : "border-[var(--miva-border)]"
      }`}
    >
      <IconButton
        aria-label={`Delete ${profile.name}`}
        className="absolute right-4 top-4 z-10 h-9 w-9 rounded-lg text-[var(--miva-text-muted)] hover:bg-[var(--miva-danger-soft)] hover:text-[var(--miva-danger-hover)]"
        onClick={onDelete}
        title="Delete assistant"
      >
        <span className="material-symbols-outlined text-[20px]">delete</span>
      </IconButton>

      <div className="flex items-start gap-3 xl:items-center">
        <IconTile className="h-10 w-10">
          <span className="material-symbols-outlined text-[21px]">smart_toy</span>
        </IconTile>
        <div className="min-w-0 xl:hidden">
          <div className="flex min-w-0 items-center gap-1.5">
            <h4 className="min-w-0 truncate font-heading text-lg font-bold text-[var(--miva-text)]">{profile.name}</h4>
            {renameButton}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--miva-text-muted)]">{profile.description}</p>
        </div>
      </div>

      <div className="hidden min-w-0 xl:block">
        <div className="flex min-w-0 items-center gap-1.5">
          <h4 className="min-w-0 truncate font-heading text-lg font-bold text-[var(--miva-text)]">{profile.name}</h4>
          {renameButton}
          {active ? <Badge tone="action">Active</Badge> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--miva-text-muted)]">{profile.description}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg bg-[var(--miva-bg-soft)] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Role</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--miva-text)]">{roleLabel}</p>
        </div>
        <div className="rounded-lg bg-[var(--miva-bg-soft)] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Prompt character</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--miva-text)]">{promptCharacter}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
        <div className="flex flex-wrap gap-2">
          <Badge tone={syncTone}>{syncLabel}</Badge>
          <Badge tone="neutral">{profile.modelLabel || profile.model}</Badge>
          <Badge tone="neutral">{formatCardDate(profile.updatedAt)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <AssistantActionButton icon="edit" label={`Edit ${profile.name}`} onClick={onEdit} />
          <AssistantActionButton
            disabled={syncState === "syncing"}
            icon="sync"
            label={syncState === "syncing" ? `Syncing ${profile.name}` : `Sync ${profile.name}`}
            onClick={onSync}
          />
          <AssistantActionButton active icon="play_arrow" label={`Run ${profile.name}`} onClick={onRun} />
        </div>
      </div>
    </article>
  );
}
