import type { AssistantProfileSyncState, CodingProviderPolicy, LocalAssistantProfile } from "../types";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import { MyAssistantCard } from "./MyAssistantCard";

type MyAssistantsPanelProps = {
  profiles: LocalAssistantProfile[];
  activeProfileId: string;
  syncState: AssistantProfileSyncState;
  getProviderLabel: (profile: LocalAssistantProfile) => string;
  getCodingLabel: (profile: LocalAssistantProfile) => string;
  getCodingProviderPolicy: (profile: LocalAssistantProfile) => CodingProviderPolicy;
  getCodingProviderPolicyLabel: (profile: LocalAssistantProfile) => string;
  onSelect: (profile: LocalAssistantProfile) => void;
  onEdit: (profile: LocalAssistantProfile) => void;
  onSync: (profile: LocalAssistantProfile) => void;
  onSyncAll: () => void;
  onAddAssistant: () => void;
  onRun: (profile: LocalAssistantProfile) => void;
  onDelete: (profile: LocalAssistantProfile) => void;
};

export function MyAssistantsPanel({
  profiles,
  activeProfileId,
  syncState,
  getProviderLabel,
  getCodingLabel,
  getCodingProviderPolicy,
  getCodingProviderPolicyLabel,
  onSelect,
  onEdit,
  onSync,
  onSyncAll,
  onAddAssistant,
  onRun,
  onDelete,
}: MyAssistantsPanelProps) {
  return (
    <div className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">My Assistants</h3>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#42474d]">
              Choose which saved assistant you want to edit in Studio or run in Runtime.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-start gap-3 lg:justify-end">
            <Badge className="min-w-[88px] px-4" tone="action">{profiles.length} saved</Badge>
            <PrimaryButton onClick={onAddAssistant}>Add assistant</PrimaryButton>
            <SecondaryButton disabled={syncState === "syncing"} onClick={onSyncAll}>
              {syncState === "syncing" ? "Syncing..." : "Sync all"}
            </SecondaryButton>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {profiles.map((profile) => {
          const active = profile.id === activeProfileId;
          const codingProviderPolicy = getCodingProviderPolicy(profile);

          return (
            <MyAssistantCard
              active={active}
              codingLabel={getCodingLabel(profile)}
              codingProviderPolicyLabel={getCodingProviderPolicyLabel(profile)}
              codingProviderPolicyTone={codingProviderPolicy === "cloudRequired" ? "action" : "neutral"}
              key={profile.id}
              onDelete={() => onDelete(profile)}
              onEdit={() => onEdit(profile)}
              onRun={() => onRun(profile)}
              onSelect={() => onSelect(profile)}
              onSync={() => onSync(profile)}
              profile={profile}
              providerLabel={getProviderLabel(profile)}
              syncState={syncState}
            />
          );
        })}
      </div>
    </div>
  );
}
