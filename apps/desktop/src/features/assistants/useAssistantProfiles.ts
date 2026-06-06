import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "../../app/tauri";
import type { Locale } from "../../i18n";
import { deleteCloudAssistantProfile, listCloudAssistantProfiles, upsertCloudAssistantProfile } from "../cloud/client";
import { mapCloudAssistantProfileToLocal } from "./cloudPayload";
import { deleteRuntimeChatMessagesForAssistant } from "../chat/storage";
import { defaultProfileDetails, defaultPromptSettings, normalizePromptSettings } from "./profile";
import { buildLocalAssistantProfile } from "./profileFactory";
import {
  createLocalProfileId,
  getAssistantProfileFingerprint,
  getCurrentNewAssistantDraftFingerprint as getNewAssistantDraftFingerprint,
  getNewAssistantDraftBaseline as getDefaultNewAssistantDraftFingerprint,
  hasDuplicateAssistantProfileName,
} from "./profileIdentity";
import { markSetupCompleted } from "../app/storage";
import { emptyAssistantProfileStore, loadLocalAssistantProfileStore, saveLocalAssistantProfileStore } from "./storage";
import {
  addAssistantProfileStore,
  removeAssistantProfileStore,
  replaceAssistantProfileStoreByName,
  replaceSyncedAssistantProfileStore,
  upsertAssistantProfileStore,
} from "./storeOperations";
import type {
  AppMode,
  AssistantProfileSyncState,
  AuthSession,
  HardwareInfo,
  LocalAssistantProfile,
  LocalAssistantProfileStore,
  ProfileDetailsDraft,
  PromptSettings,
  ImportedSkill,
  ProviderId,
  ProviderMode,
  RuntimeMemorySummary,
  StepId,
  StudioSection,
  SurveyState,
} from "../../types";

export const DEFAULT_LOCAL_PROFILE_ID = "local_default";
export const NEW_LOCAL_PROFILE_DRAFT_ID = "local_new_draft";
const SIGN_IN_BEFORE_SYNC_MESSAGE = "Sign in before syncing assistant profiles.";

type UseAssistantProfilesOptions = {
  appMode: AppMode;
  activeStep: StepId;
  studioSection: StudioSection;
  activeLocale: Locale;
  authSession: AuthSession | null;
  activeProviderMode: ProviderMode;
  activeModelLabel: string;
  profileDetailsDraft: ProfileDetailsDraft;
  promptSettingsDraft: PromptSettings;
  selectedProvider: ProviderId;
  selectedModel: string;
  selectedCloudModel: string;
  recommendedModel: string;
  recommendedCloudModel: string;
  survey: SurveyState;
  hardware: HardwareInfo | null;
  setProfileDetailsDraft: Dispatch<SetStateAction<ProfileDetailsDraft>>;
  setPromptSettingsDraft: Dispatch<SetStateAction<PromptSettings>>;
  setSurvey: Dispatch<SetStateAction<SurveyState>>;
  setSelectedProvider: Dispatch<SetStateAction<ProviderId>>;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  setSelectedCloudModel: Dispatch<SetStateAction<string>>;
  setStudioSection: Dispatch<SetStateAction<StudioSection>>;
  onLog: (message: string) => void;
};

export function useAssistantProfiles({
  appMode,
  activeStep,
  studioSection,
  activeLocale,
  authSession,
  activeProviderMode,
  activeModelLabel,
  profileDetailsDraft,
  promptSettingsDraft,
  selectedProvider,
  selectedModel,
  selectedCloudModel,
  recommendedModel,
  recommendedCloudModel,
  survey,
  hardware,
  setProfileDetailsDraft,
  setPromptSettingsDraft,
  setSurvey,
  setSelectedProvider,
  setSelectedModel,
  setSelectedCloudModel,
  setStudioSection,
  onLog,
}: UseAssistantProfilesOptions) {
  const [assistantProfileStore, setAssistantProfileStore] = useState<LocalAssistantProfileStore>(emptyAssistantProfileStore);
  const [activeLocalProfileId, setActiveLocalProfileId] = useState(DEFAULT_LOCAL_PROFILE_ID);
  const [assistantProfileLoaded, setAssistantProfileLoaded] = useState(false);
  const [assistantProfileSaveState, setAssistantProfileSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [assistantProfileError, setAssistantProfileError] = useState<string | null>(null);
  const [assistantProfileSyncState, setAssistantProfileSyncState] = useState<AssistantProfileSyncState>("idle");
  const [assistantProfileSyncMessage, setAssistantProfileSyncMessage] = useState<string | null>(null);
  const [importedSkillsDraft, setImportedSkillsDraft] = useState<ImportedSkill[]>([]);
  const newAssistantDraftBaselineRef = useRef<string | null>(null);
  const studioDraftBaselineFingerprintRef = useRef<string | null>(null);
  const signedIn = Boolean(authSession);

  function syncStudioDraftBaseline(profile: LocalAssistantProfile) {
    studioDraftBaselineFingerprintRef.current = getAssistantProfileFingerprint(profile);
  }

  const visibleAssistantProfiles = assistantProfileStore.profiles.filter((profile) => signedIn || profile.provider === "ollama");
  const visibleAssistantProfileStore = {
    ...assistantProfileStore,
    profiles: visibleAssistantProfiles,
  };
  const savedActiveLocalProfile = assistantProfileStore.profiles.find((profile) => profile.id === activeLocalProfileId) ?? null;
  const activeLocalProfile = activeLocalProfileId === NEW_LOCAL_PROFILE_DRAFT_ID
    ? null
    : savedActiveLocalProfile && visibleAssistantProfiles.some((profile) => profile.id === savedActiveLocalProfile.id)
      ? savedActiveLocalProfile
      : visibleAssistantProfiles[0] ?? null;
  const promptProfileId = activeLocalProfile?.id ?? (signedIn ? activeLocalProfileId : DEFAULT_LOCAL_PROFILE_ID);

  function buildCurrentLocalAssistantProfile(options?: { forceNew?: boolean; profileId?: string }): LocalAssistantProfile {
    return buildLocalAssistantProfile({
      forceNew: options?.forceNew,
      profileId: options?.profileId,
      activeLocalProfileId,
      appMode,
      activeStep,
      locale: activeLocale,
      activeProviderMode,
      activeModelLabel,
      assistantProfiles: assistantProfileStore.profiles,
      profileDetailsDraft,
      promptSettingsDraft,
      importedSkillsDraft,
      selectedProvider,
      selectedModel,
      selectedCloudModel,
      recommendedModel,
      recommendedCloudModel,
      survey,
      hardware,
    });
  }

  function applyLocalAssistantProfile(profile: LocalAssistantProfile) {
    newAssistantDraftBaselineRef.current = null;
    setProfileDetailsDraft({
      name: profile.name || defaultProfileDetails.name,
      description: profile.description || defaultProfileDetails.description,
    });
    setSurvey({
      useCase: profile.survey?.useCase ?? profile.useCase ?? null,
      answerStyle: profile.survey?.answerStyle ?? profile.answerStyle ?? null,
      priority: profile.survey?.priority ?? profile.priority ?? null,
      languageUse: profile.survey?.languageUse ?? profile.languageUse ?? null,
      localMode: profile.survey?.localMode ?? profile.localMode ?? null,
      futureFeatures: Array.isArray(profile.survey?.futureFeatures) ? profile.survey.futureFeatures : profile.futureFeatures ?? [],
      memorySyncMode: profile.survey?.memorySyncMode ?? profile.capabilities?.memory?.syncMode ?? "profileOnly",
    });
    const provider = profile.provider ?? "ollama";
    const savedModel = profile.model?.trim();
    const savedLocalModel = provider === "ollama"
      ? savedModel || profile.recommendation?.selectedModel || selectedModel
      : profile.recommendation?.selectedModel || selectedModel;
    const savedCloudModel = provider !== "ollama"
      ? savedModel || profile.recommendation?.selectedCloudModel || selectedCloudModel
      : profile.recommendation?.selectedCloudModel || selectedCloudModel;

    setSelectedProvider(provider);
    setSelectedModel(savedLocalModel);
    setSelectedCloudModel(savedCloudModel);
    setPromptSettingsDraft(normalizePromptSettings(profile.prompt?.settings));
    setImportedSkillsDraft(profile.capabilities?.skills?.imported ?? []);
    syncStudioDraftBaseline(profile);
  }

  function editLocalAssistantProfile(profile: LocalAssistantProfile) {
    setActiveLocalProfileId(profile.id);
    applyLocalAssistantProfile(profile);
    setAssistantProfileError(null);
    setAssistantProfileSaveState("idle");
    setStudioSection("overview");
  }

  function getNewAssistantDraftBaseline() {
    return getDefaultNewAssistantDraftFingerprint({
      selectedProvider,
      selectedModel,
      selectedCloudModel,
    });
  }

  function getCurrentNewAssistantDraftFingerprint() {
    return getNewAssistantDraftFingerprint({
      profileDetailsDraft,
      promptSettingsDraft,
      selectedProvider,
      selectedModel,
      selectedCloudModel,
    });
  }

  function hasUnsavedStudioDraftChanges() {
    if (appMode !== "studio" || studioSection === "myAssistants") {
      return false;
    }

    if (activeLocalProfile) {
      const baseline = studioDraftBaselineFingerprintRef.current;
      const currentFingerprint = getAssistantProfileFingerprint(buildCurrentLocalAssistantProfile());
      if (baseline) {
        return baseline !== currentFingerprint;
      }

      return getAssistantProfileFingerprint(activeLocalProfile) !== currentFingerprint;
    }

    if (activeLocalProfileId === NEW_LOCAL_PROFILE_DRAFT_ID) {
      return (newAssistantDraftBaselineRef.current ?? getNewAssistantDraftBaseline()) !== getCurrentNewAssistantDraftFingerprint();
    }

    return false;
  }

  function discardUnsavedStudioChanges() {
    newAssistantDraftBaselineRef.current = null;
    studioDraftBaselineFingerprintRef.current = null;
    setAssistantProfileError(null);
    setAssistantProfileSaveState("idle");

    if (activeLocalProfile) {
      applyLocalAssistantProfile(activeLocalProfile);
      return;
    }

    setActiveLocalProfileId(assistantProfileStore.activeProfileId ?? assistantProfileStore.profiles[0]?.id ?? DEFAULT_LOCAL_PROFILE_ID);
    const fallbackProfile = assistantProfileStore.profiles.find((profile) => profile.id === assistantProfileStore.activeProfileId) ?? assistantProfileStore.profiles[0] ?? null;
    if (fallbackProfile) {
      applyLocalAssistantProfile(fallbackProfile);
      return;
    }

    setProfileDetailsDraft(defaultProfileDetails);
    setPromptSettingsDraft(defaultPromptSettings);
    setImportedSkillsDraft([]);
    setSurvey({
      useCase: null,
      answerStyle: null,
      priority: null,
      languageUse: null,
      localMode: null,
      futureFeatures: [],
      memorySyncMode: "profileOnly",
    });
    setSelectedProvider("ollama");
    setSelectedModel("qwen3:4b");
    setSelectedCloudModel("gemini-2.5-flash");
  }

  function clearAssistantProfileSyncStatus() {
    setAssistantProfileSyncState("idle");
    setAssistantProfileSyncMessage(null);
  }

  function validateUniqueProfileName(profile: LocalAssistantProfile, action: "save" | "add") {
    if (!hasDuplicateAssistantProfileName(profile, assistantProfileStore.profiles)) {
      return;
    }

    const message = "An assistant with this name already exists.";
    setAssistantProfileError(message);
    setAssistantProfileSaveState("error");
    onLog(`Assistant profile ${action} blocked: ${message}`);
    throw new Error(message);
  }

  function validateProfileAuth(profile: LocalAssistantProfile, action: "save" | "add") {
    if (authSession || profile.provider === "ollama") {
      return;
    }

    const message = "Sign in is required to save cloud assistants.";
    setAssistantProfileError(message);
    setAssistantProfileSaveState("error");
    onLog(`Assistant profile ${action} blocked: ${message}`);
    throw new Error(message);
  }

  async function saveCurrentLocalAssistantProfile() {
    clearAssistantProfileSyncStatus();
    const profile = buildCurrentLocalAssistantProfile();
    validateProfileAuth(profile, "save");
    validateUniqueProfileName(profile, "save");
    const nextStore = upsertAssistantProfileStore(assistantProfileStore, profile);

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      const savedProfile = savedStore.profiles.find((item) => item.id === profile.id) ?? profile;
      setAssistantProfileStore(savedStore);
      applyLocalAssistantProfile(savedProfile);
      setAssistantProfileSaveState("saved");
      newAssistantDraftBaselineRef.current = null;
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
      return savedProfile;
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      onLog(`Assistant profile save failed: ${message}`);
      throw error;
    }
  }

  async function addCurrentLocalAssistantProfile() {
    clearAssistantProfileSyncStatus();
    const profile = buildCurrentLocalAssistantProfile({
      forceNew: true,
      profileId: createLocalProfileId(),
    });
    validateProfileAuth(profile, "add");
    validateUniqueProfileName(profile, "add");
    const nextStore = addAssistantProfileStore(assistantProfileStore, profile);

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      const savedProfile = savedStore.profiles.find((item) => item.id === profile.id) ?? profile;
      setAssistantProfileStore(savedStore);
      applyLocalAssistantProfile(savedProfile);
      setAssistantProfileSaveState("saved");
      newAssistantDraftBaselineRef.current = null;
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
      onLog(`Added assistant profile: ${profile.name}.`);
      return savedProfile;
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      onLog(`Assistant profile add failed: ${message}`);
      throw error;
    }
  }

  async function persistLocalAssistantProfile(profile: LocalAssistantProfile) {
    const nextStore = upsertAssistantProfileStore(assistantProfileStore, profile);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);
    const savedStore = await saveLocalAssistantProfileStore(nextStore);
    setAssistantProfileStore(savedStore);
    return savedStore;
  }

  async function deleteLocalAssistantProfile(profileId: string) {
    const profile = assistantProfileStore.profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    const { nextStore, nextActiveProfile } = removeAssistantProfileStore(assistantProfileStore, profileId);
    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);

    if (nextActiveProfile) {
      setActiveLocalProfileId(nextActiveProfile.id);
      applyLocalAssistantProfile(nextActiveProfile);
    } else {
      setActiveLocalProfileId(DEFAULT_LOCAL_PROFILE_ID);
      setProfileDetailsDraft(defaultProfileDetails);
      setPromptSettingsDraft(defaultPromptSettings);
      setImportedSkillsDraft([]);
      setSurvey({
        useCase: null,
        answerStyle: null,
        priority: null,
        languageUse: null,
        localMode: null,
        futureFeatures: [],
        memorySyncMode: "profileOnly",
      });
      setSelectedProvider("ollama");
      setSelectedModel("qwen3:4b");
      setSelectedCloudModel("gemini-2.5-flash");
    }

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      await deleteRuntimeChatMessagesForAssistant(profileId);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("idle");
      onLog(`Deleted assistant profile: ${profile.name}.`);
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      onLog(`Assistant profile delete failed: ${message}`);
    }
  }

  async function renameLocalAssistantProfile(profileId: string, name: string) {
    const profile = assistantProfileStore.profiles.find((item) => item.id === profileId);
    const trimmedName = name.trim();
    if (!profile || !trimmedName) {
      return;
    }

    const renamedProfile = {
      ...profile,
      name: trimmedName,
      updatedAt: new Date().toISOString(),
    };
    validateUniqueProfileName(renamedProfile, "save");
    const nextStore = upsertAssistantProfileStore(assistantProfileStore, renamedProfile);
    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      if (profileId === activeLocalProfileId) {
        applyLocalAssistantProfile(renamedProfile);
      }
      onLog(`Renamed assistant profile: ${trimmedName}.`);
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      onLog(`Assistant profile rename failed: ${message}`);
      throw error;
    }
  }

  async function updateAssistantProfileRollingSummary(profileId: string, summary: RuntimeMemorySummary) {
    const profile = assistantProfileStore.profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }

    const updatedProfile: LocalAssistantProfile = {
      ...profile,
      updatedAt: summary.updatedAt,
      capabilities: {
        ...profile.capabilities,
        memory: {
          ...profile.capabilities.memory,
          syncMode: "summaryMemory",
          rollingSummary: {
            content: summary.content,
            updatedAt: summary.updatedAt,
            provider: summary.provider,
            model: summary.model,
            sourceMessageCount: summary.sourceMessageCount,
            estimatedTokens: summary.estimatedTokens,
          },
        },
      },
    };
    const nextStore = upsertAssistantProfileStore(assistantProfileStore, updatedProfile);
    const savedStore = await saveLocalAssistantProfileStore(nextStore);
    setAssistantProfileStore(savedStore);

    if (authSession && updatedProfile.sync.cloudEnabled) {
      const syncedProfile = await syncLocalAssistantProfileToCloud(updatedProfile);
      const syncedStore = upsertAssistantProfileStore(savedStore, syncedProfile);
      setAssistantProfileStore(await saveLocalAssistantProfileStore(syncedStore));
    }
  }

  async function syncLocalAssistantProfileToCloud(profile: LocalAssistantProfile) {
    const response = await upsertCloudAssistantProfile({ authSession, profile });
    const cloudProfileId = response.profile?.id ?? profile.sync.cloudProfileId ?? profile.id;
    const syncedAt = new Date().toISOString();
    return {
      ...profile,
      updatedAt: syncedAt,
      sync: {
        cloudEnabled: true,
        cloudProfileId,
        lastSyncedAt: syncedAt,
      },
    } satisfies LocalAssistantProfile;
  }

  async function syncAllAssistantProfilesToCloud() {
    if (!authSession) {
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(SIGN_IN_BEFORE_SYNC_MESSAGE);
      return;
    }

    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage("Preparing saved assistant profiles for sync...");

    try {
      const profiles = assistantProfileStore.profiles;

      setAssistantProfileSyncMessage("Reconciling deleted assistant profiles...");
      const localCloudProfileIds = new Set(profiles.map((profile) => profile.sync.cloudProfileId ?? profile.id));
      const cloudProfiles = await listCloudAssistantProfiles({ authSession });
      const deletedCloudProfiles = cloudProfiles.profiles.filter((profile) => !localCloudProfileIds.has(profile.id));
      for (const profile of deletedCloudProfiles) {
        await deleteCloudAssistantProfile({ authSession, profileId: profile.id });
      }

      setAssistantProfileSyncMessage(`Syncing ${profiles.length} assistant profile${profiles.length === 1 ? "" : "s"}...`);
      const syncedProfiles: LocalAssistantProfile[] = [];
      for (const profile of profiles) {
        syncedProfiles.push(await syncLocalAssistantProfileToCloud(profile));
      }

      const activeProfileId = syncedProfiles.some((profile) => profile.id === activeLocalProfileId)
        ? activeLocalProfileId
        : syncedProfiles[0]?.id ?? null;
      const syncedAt = new Date().toISOString();
      const nextStore = replaceSyncedAssistantProfileStore({
        activeProfileId,
        profiles: syncedProfiles,
        syncedAt,
      });
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      if (activeProfileId) {
        setActiveLocalProfileId(activeProfileId);
        const activeProfile = savedStore.profiles.find((profile) => profile.id === activeProfileId);
        if (activeProfile) {
          applyLocalAssistantProfile(activeProfile);
        }
      }
      setAssistantProfileSyncState("synced");
      const deleteMessage = deletedCloudProfiles.length > 0
        ? ` Removed ${deletedCloudProfiles.length} deleted assistant profile${deletedCloudProfiles.length === 1 ? "" : "s"} from the web console.`
        : "";
      setAssistantProfileSyncMessage(`Synced ${syncedProfiles.length} assistant profile${syncedProfiles.length === 1 ? "" : "s"} to the web console.${deleteMessage}`);
    } catch (error) {
      const rawMessage = String(error);
      if (rawMessage.includes("An assistant with this name already exists.")) {
        setAssistantProfileSyncState("idle");
        setAssistantProfileSyncMessage(null);
        onLog(`Sync all blocked by local save validation: ${rawMessage}`);
        return;
      }

      const message = `Cloud API offline or sync failed: ${rawMessage}`;
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(message);
      onLog(message);
    }
  }

  async function syncAllAssistantProfilesFromCloud() {
    if (!authSession) {
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(SIGN_IN_BEFORE_SYNC_MESSAGE);
      return;
    }

    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage("Fetching assistant profiles from the web console...");

    try {
      const { profiles: cloudProfiles } = await listCloudAssistantProfiles({ authSession });
      const syncedAt = new Date().toISOString();
      let nextProfiles = [...assistantProfileStore.profiles];
      let importedCount = 0;
      let updatedCount = 0;

      for (const cloudProfile of cloudProfiles) {
        const existing = nextProfiles.find((profile) => (
          profile.sync.cloudProfileId === cloudProfile.id || profile.id === cloudProfile.id
        ));
        const mapped = mapCloudAssistantProfileToLocal(cloudProfile, {
          existing,
          locale: activeLocale,
          syncedAt,
        });

        if (existing) {
          nextProfiles = nextProfiles.map((profile) => (profile.id === existing.id ? mapped : profile));
          updatedCount += 1;
        } else {
          nextProfiles = [mapped, ...nextProfiles.filter((profile) => profile.id !== mapped.id)];
          importedCount += 1;
        }
      }

      const nextActiveProfileId = nextProfiles.some((profile) => profile.id === activeLocalProfileId)
        ? activeLocalProfileId
        : nextProfiles[0]?.id ?? activeLocalProfileId;
      const nextStore = replaceSyncedAssistantProfileStore({
        activeProfileId: nextActiveProfileId,
        profiles: nextProfiles,
        syncedAt,
      });
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      if (nextActiveProfileId) {
        setActiveLocalProfileId(nextActiveProfileId);
        const activeProfile = savedStore.profiles.find((profile) => profile.id === nextActiveProfileId);
        if (activeProfile) {
          applyLocalAssistantProfile(activeProfile);
        }
      }

      setAssistantProfileSyncState("synced");
      if (cloudProfiles.length === 0) {
        setAssistantProfileSyncMessage("No assistant profiles were found in the web console.");
      } else {
        setAssistantProfileSyncMessage(
          `Imported ${importedCount} and updated ${updatedCount} assistant profile${cloudProfiles.length === 1 ? "" : "s"} from the web console.`,
        );
      }
    } catch (error) {
      const message = `Cloud API offline or sync failed: ${String(error)}`;
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(message);
      onLog(message);
    }
  }

  async function syncAssistantProfileToCloud(profile: LocalAssistantProfile) {
    if (!authSession) {
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(SIGN_IN_BEFORE_SYNC_MESSAGE);
      return;
    }

    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage(`Syncing ${profile.name || "assistant profile"}...`);

    try {
      const syncedProfile = await syncLocalAssistantProfileToCloud(profile);
      await persistLocalAssistantProfile(syncedProfile);
      setAssistantProfileSyncState("synced");
      setAssistantProfileSyncMessage(`Synced ${syncedProfile.name || "assistant profile"} to the web console.`);
    } catch (error) {
      const rawMessage = String(error);
      if (rawMessage.includes("An assistant with this name already exists.")) {
        setAssistantProfileSyncState("idle");
        setAssistantProfileSyncMessage(null);
        onLog(`Sync blocked by local save validation: ${rawMessage}`);
        return;
      }

      const message = `Cloud API offline or sync failed: ${rawMessage}`;
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage(message);
      onLog(message);
    }
  }

  async function saveSetupAssistantProfile() {
    try {
      clearAssistantProfileSyncStatus();
      const savedProfile = buildCurrentLocalAssistantProfile({
        forceNew: !activeLocalProfile,
        profileId: activeLocalProfile?.id ?? createLocalProfileId(),
      });
      validateProfileAuth(savedProfile, activeLocalProfile ? "save" : "add");
      const nextStore = replaceAssistantProfileStoreByName(assistantProfileStore, savedProfile);

      setAssistantProfileSaveState("saving");
      setAssistantProfileError(null);
      setAssistantProfileStore(nextStore);
      setActiveLocalProfileId(savedProfile.id);

      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      const persistedProfile = savedStore.profiles.find((item) => item.id === savedProfile.id) ?? savedProfile;
      setAssistantProfileStore(savedStore);
      applyLocalAssistantProfile(persistedProfile);
      setAssistantProfileSaveState("saved");
      newAssistantDraftBaselineRef.current = null;
      onLog("Assistant profile saved locally.");
      if (authSession && !savedProfile.sync.cloudEnabled) {
        try {
          setAssistantProfileSyncState("syncing");
          setAssistantProfileSyncMessage("Uploading assistant profile...");
          const syncedProfile = await syncLocalAssistantProfileToCloud(savedProfile);
          await persistLocalAssistantProfile(syncedProfile);
          setAssistantProfileSyncState("synced");
          setAssistantProfileSyncMessage("Initial assistant profile uploaded to the web console.");
        } catch (error) {
          const message = `Assistant saved locally, but cloud sync failed: ${String(error)}`;
          setAssistantProfileSyncState("error");
          setAssistantProfileSyncMessage(message);
          onLog(message);
        }
      }
      setAssistantProfileSaveState("idle");
      await markSetupCompleted("studio");
      onLog("Initial setup marked complete.");
      return true;
    } catch (error) {
      onLog(`Enter MiVA blocked: ${String(error)}`);
      return false;
    }
  }

  function startNewAssistantDraft() {
    studioDraftBaselineFingerprintRef.current = null;
    newAssistantDraftBaselineRef.current = getNewAssistantDraftBaseline();
    setActiveLocalProfileId(NEW_LOCAL_PROFILE_DRAFT_ID);
    setProfileDetailsDraft(defaultProfileDetails);
    setPromptSettingsDraft(defaultPromptSettings);
    setImportedSkillsDraft([]);
    setAssistantProfileError(null);
    setAssistantProfileSaveState("idle");
    setStudioSection("overview");
  }

  function saveStudioDraft() {
    void (activeLocalProfile ? saveCurrentLocalAssistantProfile() : addCurrentLocalAssistantProfile()).catch(() => undefined);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const store = await loadLocalAssistantProfileStore();
        if (cancelled) {
          return;
        }

        setAssistantProfileStore(store);
        const activeProfile = store.profiles.find((profile) => profile.id === store.activeProfileId) ?? store.profiles[0] ?? null;
        if (activeProfile) {
          setActiveLocalProfileId(activeProfile.id);
          applyLocalAssistantProfile(activeProfile);
        }

        setAssistantProfileLoaded(true);
        onLog(activeProfile ? "Assistant profile loaded from local storage." : "No local assistant profile found yet.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAssistantProfileLoaded(true);
        setAssistantProfileError(String(error));
        setAssistantProfileSaveState("error");
        onLog(`Assistant profile load failed: ${String(error)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let unlisten: (() => void) | undefined;

    void listen<{
      deletedModel: string;
      migrated: number;
      provider: ProviderId;
      model: string;
    }>("assistant-profiles-migrated", async (event) => {
      try {
        const store = await loadLocalAssistantProfileStore();
        setAssistantProfileStore(store);

        const activeProfile = store.profiles.find((profile) => profile.id === store.activeProfileId)
          ?? store.profiles[0]
          ?? null;

        if (activeProfile) {
          setActiveLocalProfileId(activeProfile.id);
          applyLocalAssistantProfile(activeProfile);
        } else if (selectedProvider === "ollama" && selectedModel === event.payload.deletedModel) {
          setSelectedProvider("openai");
          setSelectedCloudModel(event.payload.model);
        }

        onLog(
          `${event.payload.migrated} assistant(s) switched to ${event.payload.provider} (${event.payload.model}) after ${event.payload.deletedModel} was removed.`,
        );
      } catch (error) {
        onLog(`Assistant profile reload after model deletion failed: ${String(error)}`);
      }
    }).then((dispose) => {
      unlisten = dispose;
    });

    return () => {
      unlisten?.();
    };
  }, [onLog]);

  useEffect(() => {
    if (!authSession || assistantProfileSyncMessage !== SIGN_IN_BEFORE_SYNC_MESSAGE) {
      return;
    }

    setAssistantProfileSyncState("idle");
    setAssistantProfileSyncMessage(null);
  }, [authSession, assistantProfileSyncMessage]);

  useEffect(() => {
    if (authSession || !assistantProfileLoaded) {
      return;
    }

    const activeProfile = assistantProfileStore.profiles.find((profile) => profile.id === activeLocalProfileId);
    if (!activeProfile || activeProfile.provider === "ollama") {
      return;
    }

    const nextLocalProfile = assistantProfileStore.profiles.find((profile) => profile.provider === "ollama") ?? null;
    if (nextLocalProfile) {
      setActiveLocalProfileId(nextLocalProfile.id);
      applyLocalAssistantProfile(nextLocalProfile);
      return;
    }

    setActiveLocalProfileId(DEFAULT_LOCAL_PROFILE_ID);
    setSelectedProvider("ollama");
    setSelectedModel("qwen3:4b");
    setSelectedCloudModel("gemini-2.5-flash");
    setProfileDetailsDraft(defaultProfileDetails);
    setPromptSettingsDraft(defaultPromptSettings);
    setImportedSkillsDraft([]);
  }, [authSession, assistantProfileLoaded, assistantProfileStore.profiles, activeLocalProfileId]);

  return {
    assistantProfileStore,
    visibleAssistantProfileStore,
    activeLocalProfileId,
    activeLocalProfile,
    isNewAssistantDraft: activeLocalProfileId === NEW_LOCAL_PROFILE_DRAFT_ID,
    promptProfileId,
    assistantProfileLoaded,
    assistantProfileSaveState,
    assistantProfileError,
    assistantProfileSyncState,
    assistantProfileSyncMessage,
    importedSkillsDraft,
    setImportedSkillsDraft,
    setActiveLocalProfileId,
    editLocalAssistantProfile,
    buildCurrentLocalAssistantProfile,
    applyLocalAssistantProfile,
    saveCurrentLocalAssistantProfile,
    addCurrentLocalAssistantProfile,
    renameLocalAssistantProfile,
    deleteLocalAssistantProfile,
    syncAllAssistantProfilesToCloud,
    syncAllAssistantProfilesFromCloud,
    syncAssistantProfileToCloud,
    updateAssistantProfileRollingSummary,
    saveSetupAssistantProfile,
    hasUnsavedStudioDraftChanges,
    discardUnsavedStudioChanges,
    startNewAssistantDraft,
    saveStudioDraft,
  };
}
