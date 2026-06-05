import type { CloudProviderId, ProviderId } from "../../types";
import {
  cloudProviderManifests as sharedCloudProviderManifests,
  providerManifestList as sharedProviderManifestList,
} from "../../../../../packages/shared/src/index.js";
import { cloudModelCatalog } from "../models/catalog";
import type { CloudProviderManifest, ProviderManifest, ProviderMetaRecord } from "./schema";

function modelsForProvider(provider: CloudProviderId) {
  return cloudModelCatalog.filter((model) => model.provider === provider);
}

export const cloudProviderManifests: CloudProviderManifest[] = sharedCloudProviderManifests.map((provider) => {
  const providerId = provider.id as CloudProviderId;
  return {
    id: providerId,
    label: provider.label,
    mode: "cloud",
    icon: provider.icon,
    auth: provider.auth,
    defaultModel: provider.defaultModel,
    capabilities: provider.capabilities as CloudProviderManifest["capabilities"],
    models: modelsForProvider(providerId),
  };
});

export const providerManifestList: ProviderManifest[] = sharedProviderManifestList.map((provider) => {
  if (provider.mode === "cloud") {
    return cloudProviderManifests.find((cloudProvider) => cloudProvider.id === provider.id) ?? (provider as ProviderManifest);
  }

  return {
    id: provider.id as ProviderId,
    label: provider.label,
    mode: provider.mode,
    icon: provider.icon,
    auth: provider.auth,
    defaultModel: provider.defaultModel,
    capabilities: provider.capabilities as ProviderManifest["capabilities"],
  };
});

export const providerManifests = Object.fromEntries(
  providerManifestList.map((provider) => [provider.id, provider]),
) as Record<ProviderId, ProviderManifest>;

export const providerMetaFromManifests: ProviderMetaRecord = Object.fromEntries(
  providerManifestList.map((provider) => [
    provider.id,
    {
      label: provider.label,
      mode: provider.mode,
      icon: provider.icon,
    },
  ]),
) as ProviderMetaRecord;
