import type { AssistantProfileSyncState, LocalAssistantProfile, ProfileDetailsDraft } from "../types";
import { Badge, IconTile, InfoTile, Input, Panel, Textarea } from "../components/ui";

type PlaceholderCard = [string, string, string];

type StudioOverviewPanelProps = {
  profile: LocalAssistantProfile;
  profileDetailsDraft: ProfileDetailsDraft;
  syncBadgeTone: "neutral" | "success" | "action";
  syncLabel: string;
  syncState: AssistantProfileSyncState;
  syncMessage: string | null;
  providerLabel: string;
  codingLabel: string;
  placeholderCards: PlaceholderCard[];
  assistantProfileError: string | null;
  duplicateNameMessage: string | null;
  onProfileDetailsChange: (next: ProfileDetailsDraft) => void;
};

export function StudioOverviewPanel({
  profile,
  profileDetailsDraft,
  syncBadgeTone,
  syncLabel,
  syncState,
  syncMessage,
  providerLabel,
  codingLabel,
  placeholderCards,
  assistantProfileError,
  duplicateNameMessage,
  onProfileDetailsChange,
}: StudioOverviewPanelProps) {
  const nameValidationMessage = duplicateNameMessage
    ?? (assistantProfileError === "An assistant with this name already exists." ? assistantProfileError : null);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Panel className="relative min-h-[260px] pb-28 md:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <IconTile>
            <span className="material-symbols-outlined text-[22px]">account_circle</span>
          </IconTile>
          <Badge tone={syncBadgeTone}>{syncLabel}</Badge>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Assistant name</span>
            <Input
              className={`font-heading text-xl font-bold ${
                nameValidationMessage ? "border-[var(--miva-danger)] focus-visible:border-[var(--miva-danger)]" : ""
              }`}
              value={profileDetailsDraft.name}
              onChange={(event) => onProfileDetailsChange({ ...profileDetailsDraft, name: event.target.value })}
            />
            {nameValidationMessage && (
              <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--miva-danger-hover)] shadow-sm">
                <span>{nameValidationMessage}</span>
                <span className="material-symbols-outlined text-[16px]">close</span>
              </div>
            )}
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Description</span>
            <Textarea
              className="min-h-[96px] resize-none"
              value={profileDetailsDraft.description}
              onChange={(event) => onProfileDetailsChange({ ...profileDetailsDraft, description: event.target.value })}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Provider", providerLabel],
            ["Model", profile.modelLabel || profile.model],
            ["Coding", codingLabel],
          ].map(([label, value]) => (
            <InfoTile key={label} label={label} value={value} />
          ))}
        </div>

        {profile.sync.lastSyncedAt && (
          <p className="mt-4 text-xs leading-5 text-[var(--miva-text-muted)]">
            Last synced at {new Date(profile.sync.lastSyncedAt).toLocaleString()}.
          </p>
        )}

        {syncState === "error" && syncMessage && !assistantProfileError && !syncMessage.includes("An assistant with this name already exists.") && (
          <p className="mt-4 rounded-lg bg-[var(--miva-danger-soft)] p-3 text-xs leading-5 text-[var(--miva-danger-hover)]">{syncMessage}</p>
        )}

      </Panel>

      {placeholderCards.map(([title, body, icon]) => (
        <Panel className="min-h-[260px]" key={title}>
          <IconTile>
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </IconTile>
          <h3 className="mt-5 font-heading text-lg font-bold text-[var(--miva-text)]">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--miva-text-muted)]">{body}</p>
          <Badge>Placeholder</Badge>
        </Panel>
      ))}
    </div>
  );
}
