import type { AssistantProfileSyncState, LocalAssistantProfile } from "../types";
import { Badge, Button, IconButton, IconTile, InfoTile } from "../components/ui";

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

function getPromptSummary(profile: LocalAssistantProfile) {
  const purpose = profile.prompt?.settings?.simple?.assistantPurpose?.trim();
  const desiredTasks = profile.prompt?.settings?.simple?.desiredTasks?.trim();
  const defaultPurpose = "Help me organize daily tasks, answer questions, and plan practical next actions.";
  const defaultTasks = "Write what you want this assistant to help with. Example: plan my study schedule, summarize notes, prepare calendar reminders.";

  if (!purpose || purpose === defaultPurpose) {
    return "Default";
  }

  if (desiredTasks && desiredTasks !== defaultTasks) {
    return `${purpose} ${desiredTasks}`;
  }

  return purpose;
}

type AssistantActionButtonProps = {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function AssistantActionButton({ label, icon, active = false, disabled = false, onClick }: AssistantActionButtonProps) {
  return (
    <Button
      aria-label={label}
      className="h-12 w-full rounded-lg p-0"
      disabled={disabled}
      onClick={onClick}
      size="icon"
      title={label}
      variant={active ? "default" : "secondary"}
    >
      <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
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
  const promptSummary = getPromptSummary(profile);
  const roleLabel = profile.useCase ? profile.useCase[0].toUpperCase() + profile.useCase.slice(1) : "General";

  return (
    <article
      className={`group relative overflow-hidden rounded-lg border bg-[var(--miva-surface)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--miva-shadow-md)] focus-within:-translate-y-0.5 focus-within:shadow-[var(--miva-shadow-md)] ${
        active ? "border-[var(--miva-primary)] ring-4 ring-[var(--miva-primary-soft)]" : "border-[var(--miva-border)] hover:border-[var(--miva-border-strong)] focus-within:border-[var(--miva-border-strong)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <IconTile className="h-10 w-10">
          <span className="material-symbols-outlined text-[21px]">smart_toy</span>
        </IconTile>
        <div className="flex flex-wrap justify-end gap-2">
          {active && <Badge tone="action">Active</Badge>}
          <Badge tone={syncTone}>{syncLabel}</Badge>
        </div>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2">
        <h4 className="min-w-0 flex-1 truncate font-heading text-lg font-bold text-[var(--miva-text)]">{profile.name}</h4>
        <IconButton
          aria-label={`Rename ${profile.name}`}
          className="h-8 w-8 shrink-0 rounded-full text-[var(--miva-text-muted)] hover:bg-[var(--miva-primary-surface)] hover:text-[var(--miva-primary)]"
          onClick={onRename}
          title="Rename assistant"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </IconButton>
        <IconButton
          aria-label={`Delete ${profile.name}`}
          className="h-8 w-8 shrink-0 rounded-full text-[var(--miva-text-muted)] hover:bg-[var(--miva-danger-soft)] hover:text-[var(--miva-danger-hover)]"
          onClick={onDelete}
          title="Delete assistant"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </IconButton>
      </div>
      <p className="mt-1 line-clamp-1 text-sm leading-6 text-[var(--miva-text-muted)]">{profile.description}</p>

      <div className="mt-3 grid gap-2">
        <div className="rounded-lg bg-[var(--miva-bg-soft)] p-3">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Prompt character</span>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--miva-text)]">{promptSummary}</p>
        </div>
      </div>

      <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-200 ease-out group-hover:mt-4 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:mt-4 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[var(--miva-border)] pt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoTile label="Role" value={roleLabel} />
              <InfoTile label="Last updated" value={formatCardDate(profile.updatedAt)} />
              <InfoTile label="Last chatted" value="Not started" />
              <InfoTile label="Model" value={profile.modelLabel || profile.model} />
            </div>

            <div className="mt-4 grid grid-cols-3 items-center gap-2">
              <div>
                <AssistantActionButton icon="edit" label={`Edit ${profile.name}`} onClick={onEdit} />
              </div>
              <div>
                <AssistantActionButton
                  disabled={syncState === "syncing"}
                  icon="sync"
                  label={syncState === "syncing" ? `Syncing ${profile.name}` : `Sync ${profile.name}`}
                  onClick={onSync}
                />
              </div>
              <div>
                <AssistantActionButton active icon="play_arrow" label={`Run ${profile.name}`} onClick={onRun} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
