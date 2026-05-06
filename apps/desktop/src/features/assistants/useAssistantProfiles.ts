import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../../i18n";
import { upsertCloudAssistantProfile } from "../cloud/client";
import { defaultProfileDetails, defaultPromptSettings, normalizePromptSettings } from "./profile";
import { buildLocalAssistantProfile } from "./profileFactory";
import {
  createLocalProfileId,
  getAssistantProfileFingerprint,
  getCurrentNewAssistantDraftFingerprint as getNewAssistantDraftFingerprint,
  getNewAssistantDraftBaseline as getDefaultNewAssistantDraftFingerprint,
  hasDuplicateAssistantProfileName,
} from "./profileIdentity";
import { emptyAssistantProfileStore, loadLocalAssistantProfileStore, saveLocalAssistantProfileStore } from "./storage";
import {
  addAssistantProfileStore,
  removeAssistantProfileStore,
  replaceSyncedAssistantProfileStore,
  upsertAssistantProfileStore,
} from "./storeOperations";
import type {
  AppMode,
  AssistantProfileSyncState,
  AuthSession,
  HardwareInfo,
  LocalAssistantProfile,
  LocalAssistantProfileStatus,
  LocalAssistantProfileStore,
  ProfileDetailsDraft,
  PromptSettings,
  ProviderId,
  ProviderMode,
  StepId,
  StudioSection,
  SurveyState,
} from "../../types";

export const DEFAULT_LOCAL_PROFILE_ID = "local_default";
export const NEW_LOCAL_PROFILE_DRAFT_ID = "local_new_draft";

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
  const newAssistantDraftBaselineRef = useRef<string | null>(null);
  const signedIn = Boolean(authSession);

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

  function buildCurrentLocalAssistantProfile(
    status: LocalAssistantProfileStatus,
    options?: { forceNew?: boolean; profileId?: string },
  ): LocalAssistantProfile {
    return buildLocalAssistantProfile({
      status,
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
    setSelectedProvider(profile.provider ?? "ollama");
    setSelectedModel(profile.recommendation?.selectedModel ?? (profile.provider === "ollama" ? profile.model : selectedModel));
    setSelectedCloudModel(profile.recommendation?.selectedCloudModel ?? (profile.provider !== "ollama" ? profile.model : selectedCloudModel));
    setPromptSettingsDraft(normalizePromptSettings(profile.prompt?.settings));
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
      const currentProfile = buildCurrentLocalAssistantProfile(activeLocalProfile.status);
      return getAssistantProfileFingerprint(activeLocalProfile) !== getAssistantProfileFingerprint(currentProfile);
    }

    if (activeLocalProfileId === NEW_LOCAL_PROFILE_DRAFT_ID) {
      return (newAssistantDraftBaselineRef.current ?? getNewAssistantDraftBaseline()) !== getCurrentNewAssistantDraftFingerprint();
    }

    return false;
  }

  function confirmDiscardStudioChanges() {
    if (!hasUnsavedStudioDraftChanges()) {
      return true;
    }

    return window.confirm("You have unsaved changes. Leave without saving?");
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

  async function saveCurrentLocalAssistantProfile(status: LocalAssistantProfileStatus) {
    clearAssistantProfileSyncStatus();
    const profile = buildCurrentLocalAssistantProfile(status);
    validateUniqueProfileName(profile, "save");
    const nextStore = upsertAssistantProfileStore(assistantProfileStore, profile);

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      newAssistantDraftBaselineRef.current = null;
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
      return profile;
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      onLog(`Assistant profile save failed: ${message}`);
      throw error;
    }
  }

  async function addCurrentLocalAssistantProfile(status: LocalAssistantProfileStatus) {
    clearAssistantProfileSyncStatus();
    const profile = buildCurrentLocalAssistantProfile(status, {
      forceNew: true,
      profileId: createLocalProfileId(),
    });
    validateUniqueProfileName(profile, "add");
    const nextStore = addAssistantProfileStore(assistantProfileStore, profile);

    setAssistantProfileSaveState("saving");
    setAssistantProfileError(null);
    setAssistantProfileStore(nextStore);
    setActiveLocalProfileId(profile.id);

    try {
      const savedStore = await saveLocalAssistantProfileStore(nextStore);
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      newAssistantDraftBaselineRef.current = null;
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
      onLog(`Added assistant profile: ${profile.name}.`);
      return profile;
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

    if (!window.confirm(`Delete "${profile.name}" from this computer?`)) {
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
      setAssistantProfileStore(savedStore);
      setAssistantProfileSaveState("saved");
      onLog(`Deleted assistant profile: ${profile.name}.`);
      window.setTimeout(() => setAssistantProfileSaveState("idle"), 1800);
    } catch (error) {
      const message = String(error);
      setAssistantProfileError(message);
      setAssistantProfileSaveState("error");
      onLog(`Assistant profile delete failed: ${message}`);
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
      setAssistantProfileSyncMessage("Sign in before syncing assistant profiles.");
      return;
    }

    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage("Saving current assistant before syncing all profiles...");

    try {
      const currentProfile = await saveCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft");
      const profileMap = new Map<string, LocalAssistantProfile>();
      assistantProfileStore.profiles.forEach((profile) => profileMap.set(profile.id, profile));
      profileMap.set(currentProfile.id, currentProfile);
      const profiles = [...profileMap.values()];

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
      setAssistantProfileSyncMessage(`Synced ${syncedProfiles.length} assistant profile${syncedProfiles.length === 1 ? "" : "s"} to the web console.`);
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

  async function syncAssistantProfileToCloud(profile: LocalAssistantProfile) {
    if (!authSession) {
      setAssistantProfileSyncState("error");
      setAssistantProfileSyncMessage("Sign in before syncing assistant profiles.");
      return;
    }

    setAssistantProfileSyncState("syncing");
    setAssistantProfileSyncMessage(`Syncing ${profile.name || "assistant profile"}...`);

    try {
      const profileToSync = profile.id === activeLocalProfileId
        ? await saveCurrentLocalAssistantProfile(activeLocalProfile?.status ?? profile.status)
        : profile;
      const syncedProfile = await syncLocalAssistantProfileToCloud(profileToSync);
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

  async function finalizeCurrentLocalAssistantProfile() {
    try {
      const finalizedProfile = await saveCurrentLocalAssistantProfile("finalized");
      onLog("Assistant profile finalized locally.");
      if (authSession && !finalizedProfile.sync.cloudEnabled) {
        setAssistantProfileSyncState("syncing");
        setAssistantProfileSyncMessage("Uploading finalized assistant profile...");
        const syncedProfile = await syncLocalAssistantProfileToCloud(finalizedProfile);
        await persistLocalAssistantProfile(syncedProfile);
        setAssistantProfileSyncState("synced");
        setAssistantProfileSyncMessage("Initial assistant profile uploaded to the web console.");
      }
    } catch {
      // The save function already records the visible error state.
    }
  }

  function startNewAssistantDraft() {
    if (!confirmDiscardStudioChanges()) {
      return;
    }

    newAssistantDraftBaselineRef.current = getNewAssistantDraftBaseline();
    setActiveLocalProfileId(NEW_LOCAL_PROFILE_DRAFT_ID);
    setProfileDetailsDraft(defaultProfileDetails);
    setPromptSettingsDraft(defaultPromptSettings);
    setAssistantProfileError(null);
    setAssistantProfileSaveState("idle");
    setStudioSection("overview");
  }

  function saveStudioDraft() {
    void saveCurrentLocalAssistantProfile(activeLocalProfile?.status ?? "draft").catch(() => undefined);
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
  }, [authSession, assistantProfileLoaded, assistantProfileStore.profiles, activeLocalProfileId]);

  return {
    assistantProfileStore,
    visibleAssistantProfileStore,
    activeLocalProfileId,
    activeLocalProfile,
    promptProfileId,
    assistantProfileLoaded,
    assistantProfileSaveState,
    assistantProfileError,
    assistantProfileSyncState,
    assistantProfileSyncMessage,
    setActiveLocalProfileId,
    buildCurrentLocalAssistantProfile,
    applyLocalAssistantProfile,
    saveCurrentLocalAssistantProfile,
    addCurrentLocalAssistantProfile,
    deleteLocalAssistantProfile,
    syncAllAssistantProfilesToCloud,
    syncAssistantProfileToCloud,
    finalizeCurrentLocalAssistantProfile,
    confirmDiscardStudioChanges,
    startNewAssistantDraft,
    saveStudioDraft,
  };
}
