import { LOCAL_PROFILE_SCHEMA_VERSION } from "./storage";
import type { LocalAssistantProfile, LocalAssistantProfileStore } from "../../types";

export function upsertAssistantProfileStore(
  currentStore: LocalAssistantProfileStore,
  profile: LocalAssistantProfile,
): LocalAssistantProfileStore {
  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    activeProfileId: profile.id,
    profiles: [
      profile,
      ...currentStore.profiles.filter((item) => item.id !== profile.id),
    ],
    updatedAt: profile.updatedAt,
  };
}

export function addAssistantProfileStore(
  currentStore: LocalAssistantProfileStore,
  profile: LocalAssistantProfile,
): LocalAssistantProfileStore {
  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    activeProfileId: profile.id,
    profiles: [
      profile,
      ...currentStore.profiles,
    ],
    updatedAt: profile.updatedAt,
  };
}

export function replaceAssistantProfileStoreByName(
  currentStore: LocalAssistantProfileStore,
  profile: LocalAssistantProfile,
): LocalAssistantProfileStore {
  const normalizedName = profile.name.trim().toLocaleLowerCase();
  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    activeProfileId: profile.id,
    profiles: [
      profile,
      ...currentStore.profiles.filter((item) => item.name.trim().toLocaleLowerCase() !== normalizedName),
    ],
    updatedAt: profile.updatedAt,
  };
}

export function removeAssistantProfileStore(
  currentStore: LocalAssistantProfileStore,
  profileId: string,
): { nextStore: LocalAssistantProfileStore; nextActiveProfile: LocalAssistantProfile | null } {
  const remainingProfiles = currentStore.profiles.filter((item) => item.id !== profileId);
  const nextActiveProfile = remainingProfiles[0] ?? null;

  return {
    nextActiveProfile,
    nextStore: {
      schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
      activeProfileId: nextActiveProfile?.id ?? null,
      profiles: remainingProfiles,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function replaceSyncedAssistantProfileStore(input: {
  activeProfileId: string | null;
  profiles: LocalAssistantProfile[];
  syncedAt: string;
}): LocalAssistantProfileStore {
  return {
    schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
    activeProfileId: input.activeProfileId,
    profiles: input.profiles,
    updatedAt: input.syncedAt,
  };
}
