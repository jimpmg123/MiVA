import type { AssistantProfileSyncState, LocalAssistantProfile } from "../types";
import { Badge, PrimaryButton, SecondaryButton } from "../components/ui";

type MyAssistantCardProps = {
  profile: LocalAssistantProfile;
  active: boolean;
  syncState: AssistantProfileSyncState;
  providerLabel: string;
  codingLabel: string;
  codingProviderPolicyLabel: string;
  codingProviderPolicyTone: "neutral" | "action";
  onSelect: () => void;
  onEdit: () => void;
  onSync: () => void;
  onRun: () => void;
  onDelete: () => void;
};

export function MyAssistantCard({
  profile,
  active,
  syncState,
  providerLabel,
  codingLabel,
  codingProviderPolicyLabel,
  codingProviderPolicyTone,
  onSelect,
  onEdit,
  onSync,
  onRun,
  onDelete,
}: MyAssistantCardProps) {
  const syncLabel = profile.sync?.cloudEnabled ? "Cloud synced" : "Local only";
  const syncTone = profile.sync?.cloudEnabled ? "success" : "neutral";
  const formatCardDate = (value?: string | null) => {
    if (!value) {
      return "Not started";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not started";
    }

    const pad = (number: number) => String(number).padStart(2, "0");
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const promptSummary = profile.prompt.settings.simple.assistantPurpose
    || profile.prompt.systemPrompt
    || profile.description
    || "No prompt summary yet.";

  return (
    <article
      className={`group relative z-0 rounded-2xl border bg-white p-4 shadow-sm transition hover:z-30 ${
        active ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
          <span className="material-symbols-outlined text-[21px]">smart_toy</span>
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          {active && <Badge tone="action">Active</Badge>}
          <Badge tone={syncTone}>{syncLabel}</Badge>
        </div>
      </div>

      <h4 className="mt-3 truncate font-heading text-lg font-bold text-[#191c1d]">{profile.name}</h4>
      <p className="mt-1 line-clamp-1 text-sm leading-6 text-[#42474d]">{profile.description}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          ["Role", profile.useCase ?? "daily"],
          ["Model", profile.modelLabel || profile.model],
        ].map(([label, value]) => (
          <div className="rounded-xl bg-[#f3f4f5] p-2.5" key={label}>
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">{label}</span>
            <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{value}</p>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-[calc(100%-6px)] z-50 translate-y-1 opacity-0 transition duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <div className="rounded-2xl border border-[#c2c7ce]/70 bg-white p-4 shadow-[0_18px_42px_rgba(53,96,127,0.22)]">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f3f4f5] p-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">Provider</span>
              <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{providerLabel}</p>
            </div>
            <div className="rounded-xl bg-[#f3f4f5] p-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">Coding</span>
              <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{codingLabel}</p>
            </div>
            <div className="rounded-xl bg-[#f3f4f5] p-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">Last updated</span>
              <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">{formatCardDate(profile.updatedAt)}</p>
            </div>
            <div className="rounded-xl bg-[#f3f4f5] p-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">Last chatted</span>
              <p className="mt-1 truncate text-sm font-semibold text-[#191c1d]">Not started</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-[#f3f4f5] p-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#72787e]">Prompt summary</span>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#42474d]">{promptSummary}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={codingProviderPolicyTone}>{codingProviderPolicyLabel}</Badge>
            {profile.futureFeatures.map((feature) => (
              <Badge key={feature}>{feature}</Badge>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SecondaryButton onClick={onSelect}>{active ? "Selected" : "Select"}</SecondaryButton>
            <SecondaryButton onClick={onEdit}>Edit</SecondaryButton>
            <SecondaryButton disabled={syncState === "syncing"} onClick={onSync}>
              {syncState === "syncing" ? "Syncing..." : "Sync"}
            </SecondaryButton>
            <PrimaryButton onClick={onRun}>Run</PrimaryButton>
            <SecondaryButton className="border-[#ffdad6] text-[#93000a] hover:bg-[#ffdad6]/40" onClick={onDelete}>
              Delete
            </SecondaryButton>
          </div>
        </div>
      </div>
    </article>
  );
}
