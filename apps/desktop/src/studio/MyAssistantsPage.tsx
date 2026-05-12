import { useState } from "react";
import type { AssistantProfileSyncState, LocalAssistantProfile } from "../types";
import { Badge, Panel, PrimaryButton, SecondaryButton } from "../components/ui";
import { MyAssistantCard } from "./MyAssistantCard";

type MyAssistantsPanelProps = {
  profiles: LocalAssistantProfile[];
  activeProfileId: string;
  syncState: AssistantProfileSyncState;
  onEdit: (profile: LocalAssistantProfile) => void;
  onSync: (profile: LocalAssistantProfile) => void;
  onSyncAll: () => void;
  onAddAssistant: () => void;
  onRun: (profile: LocalAssistantProfile) => void;
  onDelete: (profile: LocalAssistantProfile) => Promise<void> | void;
  onRename: (profile: LocalAssistantProfile, name: string) => Promise<void> | void;
};

export function MyAssistantsPanel({
  profiles,
  activeProfileId,
  syncState,
  onEdit,
  onSync,
  onSyncAll,
  onAddAssistant,
  onRun,
  onDelete,
  onRename,
}: MyAssistantsPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<LocalAssistantProfile | null>(null);
  const [renameTarget, setRenameTarget] = useState<LocalAssistantProfile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const openRename = (profile: LocalAssistantProfile) => {
    setRenameTarget(profile);
    setRenameValue(profile.name);
    setRenameError(null);
  };

  const confirmRename = async () => {
    if (!renameTarget) {
      return;
    }

    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      setRenameError("Assistant name is required.");
      return;
    }

    const duplicate = profiles.some((profile) => (
      profile.id !== renameTarget.id && profile.name.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
    ));
    if (duplicate) {
      setRenameError("An assistant with this name already exists.");
      return;
    }

    await onRename(renameTarget, trimmedName);
    setRenameTarget(null);
    setRenameValue("");
    setRenameError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const target = deleteTarget;
    setDeleteTarget(null);
    await onDelete(target);
  };

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
        {profiles.map((profile) => (
          <MyAssistantCard
            active={profile.id === activeProfileId}
            key={profile.id}
            onDelete={() => setDeleteTarget(profile)}
            onEdit={() => onEdit(profile)}
            onRename={() => openRename(profile)}
            onRun={() => onRun(profile)}
            onSync={() => onSync(profile)}
            profile={profile}
            syncState={syncState}
          />
        ))}
      </div>

      {renameTarget && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-[#191c1d]/35 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_24px_60px_rgba(25,28,29,0.28)]">
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">Rename assistant</h3>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">Update the assistant name shown in Studio and Runtime.</p>
            <input
              autoFocus
              className="mt-5 w-full rounded-xl border border-[#c2c7ce] bg-white px-4 py-3 text-base font-semibold text-[#191c1d] outline-none transition focus:border-[#35607f] focus:ring-4 focus:ring-[#cae6ff]"
              onChange={(event) => {
                setRenameValue(event.target.value);
                setRenameError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void confirmRename();
                }
              }}
              value={renameValue}
            />
            {renameError && (
              <p className="mt-3 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm font-semibold text-[#93000a]">{renameError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <SecondaryButton onClick={() => setRenameTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => void confirmRename()}>Save name</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-[#191c1d]/35 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[460px] rounded-2xl border border-[#ffdad6] bg-white p-6 text-center shadow-[0_24px_60px_rgba(25,28,29,0.28)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ffdad6] text-[#93000a]">
              <span className="material-symbols-outlined">delete</span>
            </div>
            <h3 className="mt-5 font-heading text-xl font-bold text-[#191c1d]">Delete this assistant?</h3>
            <p className="mt-3 text-sm leading-6 text-[#42474d]">
              Deleting this assistant will permanently remove its settings and conversation history from this device.
            </p>
            <p className="mt-3 rounded-xl bg-[#f3f4f5] px-4 py-3 text-sm font-semibold text-[#191c1d]">{deleteTarget.name}</p>
            <div className="mt-6 flex justify-center gap-3">
              <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton className="bg-[#ba1a1a] hover:bg-[#93000a]" onClick={() => void confirmDelete()}>
                Delete assistant
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
