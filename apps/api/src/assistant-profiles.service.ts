import { Inject, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import {
  RequestLike,
  normalizeAssistantProfile,
  serializeAssistantProfile,
  toAssistantProfileDbData,
} from "./api.shared.js";
import { throwHttp } from "./http-errors.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class AssistantProfilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async getAssistantProfiles(req: RequestLike) {
    const requestUser = await this.auth.getRequestUser(req);
    const profiles = await this.prisma.assistantProfile.findMany({
      where: { userId: requestUser.id },
      orderBy: [
        { isDefault: "desc" },
        { updatedAt: "desc" },
      ],
    });
    return { profiles: profiles.map(serializeAssistantProfile) };
  }

  async createAssistantProfile(req: RequestLike, payload: any) {
    const requestUser = await this.auth.getRequestUser(req);
    const requestedProfileId = typeof payload.id === "string" && payload.id.trim()
      ? payload.id.trim()
      : null;
    const profileWithRequestedId = requestedProfileId
      ? await this.prisma.assistantProfile.findUnique({ where: { id: requestedProfileId } })
      : null;
    const existingProfile = profileWithRequestedId?.userId === requestUser.id
      ? profileWithRequestedId
      : null;
    const canReuseRequestedId = Boolean(requestedProfileId && (!profileWithRequestedId || existingProfile));
    const normalizedProfile = normalizeAssistantProfile({
      ...existingProfile,
      ...(existingProfile ? serializeAssistantProfile(existingProfile) : {}),
      ...payload,
      id: existingProfile?.id || (canReuseRequestedId ? requestedProfileId : undefined),
      createdAt: existingProfile?.createdAt?.toISOString() || payload.createdAt,
    }, requestUser.id);

    if (normalizedProfile.isDefault) {
      await this.prisma.assistantProfile.updateMany({
        where: { userId: requestUser.id },
        data: { isDefault: false },
      });
    }

    const profile = existingProfile
      ? await this.prisma.assistantProfile.update({
          where: { id: existingProfile.id },
          data: toAssistantProfileDbData(normalizedProfile),
        })
      : await this.prisma.assistantProfile.create({
          data: {
            ...(canReuseRequestedId ? { id: normalizedProfile.id } : {}),
            ...toAssistantProfileDbData(normalizedProfile, requestUser.id),
          },
        });

    await this.recordAssistantProfileSyncEvents(serializeAssistantProfile(profile));
    return { profile: serializeAssistantProfile(profile) };
  }

  async getAssistantProfile(req: RequestLike, profileId: string) {
    const profile = await this.findUserProfile(req, profileId);
    return { profile: serializeAssistantProfile(profile) };
  }

  async patchAssistantProfile(req: RequestLike, profileId: string, payload: any) {
    const requestUser = await this.auth.getRequestUser(req);
    const profile = await this.findUserProfile(req, profileId);
    const normalizedProfile = normalizeAssistantProfile({
      ...serializeAssistantProfile(profile),
      ...payload,
      id: profile.id,
      createdAt: profile.createdAt.toISOString(),
    }, requestUser.id);
    if (normalizedProfile.isDefault) {
      await this.prisma.assistantProfile.updateMany({
        where: { userId: requestUser.id },
        data: { isDefault: false },
      });
    }
    const updatedProfile = await this.prisma.assistantProfile.update({
      where: { id: profile.id },
      data: toAssistantProfileDbData(normalizedProfile),
    });
    await this.recordAssistantProfileSyncEvents(normalizedProfile);
    return { profile: serializeAssistantProfile(updatedProfile) };
  }

  async deleteAssistantProfile(req: RequestLike, profileId: string) {
    const requestUser = await this.auth.getRequestUser(req);
    const profile = await this.findUserProfile(req, profileId);
    const deletedProfile = await this.prisma.assistantProfile.delete({ where: { id: profile.id } });
    if (deletedProfile.isDefault) {
      const fallbackProfile = await this.prisma.assistantProfile.findFirst({
        where: { userId: requestUser.id },
        orderBy: { updatedAt: "desc" },
      });
      if (fallbackProfile) {
        await this.prisma.assistantProfile.update({
          where: { id: fallbackProfile.id },
          data: { isDefault: true },
        });
      }
    }

    await this.auth.recordUsageEvent("assistant_profile_deleted", profileId, requestUser.id);
    return {
      ok: true,
      profile: serializeAssistantProfile(deletedProfile),
    };
  }

  private async recordAssistantProfileSyncEvents(profile: any) {
    await Promise.all([
      this.auth.recordUsageEvent("assistant_profile_synced", profile.id, profile.userId),
      this.auth.recordUsageEvent("assistant_use_case_selected", profile.useCase, profile.userId),
      this.auth.recordUsageEvent("provider_selected", profile.provider, profile.userId),
      this.auth.recordUsageEvent("model_selected", profile.model, profile.userId),
      this.auth.recordUsageEvent("local_mode_selected", profile.localMode, profile.userId),
      this.auth.recordUsageEvent("coding_capability_selected", profile.prompt?.settings?.coding?.capability || "chatOnly", profile.userId),
    ]);
  }

  private async findUserProfile(req: RequestLike, profileId: string) {
    const requestUser = await this.auth.getRequestUser(req);
    const profile = await this.prisma.assistantProfile.findFirst({
      where: { id: profileId, userId: requestUser.id },
    });
    if (!profile) {
      throwHttp(404, "PROFILE_NOT_FOUND");
    }
    return profile;
  }
}
