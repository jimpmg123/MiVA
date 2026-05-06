import type { AssistantProfileSyncState, LocalAssistantProfile, ProfileDetailsDraft } from "../types";
import { Badge, Panel } from "../components/ui";

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
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
            <span className="material-symbols-outlined text-[22px]">account_circle</span>
          </span>
          <Badge tone={syncBadgeTone}>{syncLabel}</Badge>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Assistant name</span>
            <input
              className={`rounded-xl border bg-white px-4 py-3 font-heading text-xl font-bold text-[#191c1d] outline-none ${
                nameValidationMessage ? "border-[#ba1a1a] focus:border-[#ba1a1a]" : "border-[#c2c7ce] focus:border-[#35607f]"
              }`}
              value={profileDetailsDraft.name}
              onChange={(event) => onProfileDetailsChange({ ...profileDetailsDraft, name: event.target.value })}
            />
            {nameValidationMessage && (
              <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-[#ffb4ab] bg-[#ffdad6] px-3 py-2 text-xs font-semibold text-[#93000a] shadow-sm">
                <span>{nameValidationMessage}</span>
                <span className="material-symbols-outlined text-[16px]">close</span>
              </div>
            )}
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">Description</span>
            <textarea
              className="min-h-[96px] resize-none rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-sm leading-6 text-[#42474d] outline-none focus:border-[#35607f]"
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
            <div className="rounded-xl bg-[#f3f4f5] p-3" key={label}>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">{label}</span>
              <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{value}</p>
            </div>
          ))}
        </div>

        {profile.sync.lastSyncedAt && (
          <p className="mt-4 text-xs leading-5 text-[#72787e]">
            Last synced at {new Date(profile.sync.lastSyncedAt).toLocaleString()}.
          </p>
        )}

        {syncState === "error" && syncMessage && !assistantProfileError && !syncMessage.includes("An assistant with this name already exists.") && (
          <p className="mt-4 rounded-xl bg-[#ffdad6] p-3 text-xs leading-5 text-[#93000a]">{syncMessage}</p>
        )}

      </Panel>

      {placeholderCards.map(([title, body, icon]) => (
        <Panel className="min-h-[260px]" key={title}>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </span>
          <h3 className="mt-5 font-heading text-lg font-bold text-[#191c1d]">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-[#42474d]">{body}</p>
          <Badge>Placeholder</Badge>
        </Panel>
      ))}
    </div>
  );
}
