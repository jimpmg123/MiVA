import { useState } from "react";
import type { AssistantProfileSyncState, LocalAssistantProfile } from "../types";
import { Badge, IconTile, Input, ModalBackdrop, ModalPanel, Panel, PrimaryButton, SecondaryButton, SectionHeader } from "../components/ui";
import { MyAssistantCard } from "./MyAssistantCard";
import { SyncIconButton, SyncIconButtonGroup } from "./SyncIconButton";

type MyAssistantsPanelProps = {
  profiles: LocalAssistantProfile[];
  activeProfileId: string;
  syncState: AssistantProfileSyncState;
  syncMessage: string | null;
  onEdit: (profile: LocalAssistantProfile) => void;
  onSync: (profile: LocalAssistantProfile) => void;
  onSyncAll: () => void;
  onSyncAllFromWeb: () => void;
  onAddAssistant: () => void;
  onRun: (profile: LocalAssistantProfile) => void;
  onDelete: (profile: LocalAssistantProfile) => Promise<void> | void;
  onRename: (profile: LocalAssistantProfile, name: string) => Promise<void> | void;
};

export function MyAssistantsPanel({
  profiles,
  activeProfileId,
  syncState,
  syncMessage,
  onEdit,
  onSync,
  onSyncAll,
  onSyncAllFromWeb,
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
        <SectionHeader
          title="My Assistants"
          body="Choose which saved assistant you want to edit in Studio or run in Runtime."
          actions={
            <>
            <Badge className="min-w-[88px] px-4" tone="action">{profiles.length} saved</Badge>
            <PrimaryButton onClick={onAddAssistant}>Add assistant</PrimaryButton>
            <SyncIconButtonGroup>
              <SyncIconButton
                active={syncState === "synced"}
                description="Push every saved assistant on this device to the MiVA web console."
                disabled={syncState === "syncing"}
                icon={syncState === "syncing" ? "progress_activity" : "cloud_upload"}
                onClick={onSyncAll}
                title="Sync all to web"
              />
              <SyncIconButton
                description="Download assistant profiles from the web console and merge them into this device."
                disabled={syncState === "syncing"}
                icon="cloud_download"
                onClick={onSyncAllFromWeb}
                title="Sync from web"
              />
            </SyncIconButtonGroup>
            </>
          }
        />
        {syncMessage && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
              syncState === "error"
                ? "border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] text-[var(--miva-danger-hover)]"
                : "border-[var(--miva-border)] bg-[var(--miva-bg-soft)] text-[var(--miva-text-muted)]"
            }`}
            role={syncState === "error" ? "alert" : "status"}
          >
            {syncMessage}
          </div>
        )}
      </Panel>

      <div className="grid items-start gap-3">
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
        <ModalBackdrop>
          <ModalPanel className="max-w-[420px]">
            <h3 className="font-heading text-xl font-bold text-[var(--miva-text)]">Rename assistant</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">Update the assistant name shown in Studio and Runtime.</p>
            <Input
              autoFocus
              className="mt-5 text-base font-semibold"
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
              <p className="mt-3 rounded-lg bg-[var(--miva-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--miva-danger-hover)]">{renameError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <SecondaryButton onClick={() => setRenameTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => void confirmRename()}>Save name</PrimaryButton>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}

      {deleteTarget && (
        <ModalBackdrop>
          <ModalPanel className="max-w-[460px] border-[var(--miva-danger-soft)] text-center">
            <IconTile className="mx-auto h-14 w-14" tone="danger">
              <span className="material-symbols-outlined">delete</span>
            </IconTile>
            <h3 className="mt-5 font-heading text-xl font-bold text-[var(--miva-text)]">Delete this assistant?</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--miva-text-muted)]">
              Deleting this assistant will permanently remove its settings and conversation history from this device.
            </p>
            <p className="mt-3 rounded-lg bg-[var(--miva-bg-soft)] px-4 py-3 text-sm font-semibold text-[var(--miva-text)]">{deleteTarget.name}</p>
            <div className="mt-6 flex justify-center gap-3">
              <SecondaryButton onClick={() => setDeleteTarget(null)}>Cancel</SecondaryButton>
              <PrimaryButton className="bg-[var(--miva-danger)] hover:bg-[var(--miva-danger-hover)]" onClick={() => void confirmDelete()}>
                Delete assistant
              </PrimaryButton>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </div>
  );
}
