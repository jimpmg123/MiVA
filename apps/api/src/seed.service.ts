import { Inject, Injectable } from "@nestjs/common";
import { DEV_PASSWORDS, DEV_USER_ID, assistantProfiles, hashSecret, toDbProvider, toDbProfileSource } from "./api.shared.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class SeedService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureDevData() {
    await this.prisma.user.upsert({
      where: { id: DEV_USER_ID },
      update: {
        passwordHash: hashSecret(DEV_PASSWORDS["dev@miva.local"]),
      },
      create: {
        id: DEV_USER_ID,
        email: "dev@miva.local",
        displayName: "MiVA User",
        passwordHash: hashSecret(DEV_PASSWORDS["dev@miva.local"]),
        role: "USER",
        locale: "ko",
      },
    });

    await this.prisma.user.upsert({
      where: { id: "admin_user" },
      update: {
        passwordHash: hashSecret(DEV_PASSWORDS["admin@miva.local"]),
      },
      create: {
        id: "admin_user",
        email: "admin@miva.local",
        displayName: "MiVA Admin",
        passwordHash: hashSecret(DEV_PASSWORDS["admin@miva.local"]),
        role: "ADMIN",
        locale: "ko",
      },
    });

    const profileCount = await this.prisma.assistantProfile.count({ where: { userId: DEV_USER_ID } });
    if (profileCount === 0) {
      await this.prisma.assistantProfile.createMany({
        data: assistantProfiles.map((profile) => ({
          id: profile.id,
          userId: profile.userId,
          name: profile.name,
          description: profile.description,
          useCase: profile.useCase,
          answerStyle: profile.answerStyle,
          priority: profile.priority,
          languageUse: profile.languageUse,
          localMode: profile.localMode,
          provider: toDbProvider(profile.provider) as any,
          model: profile.model,
          futureFeatures: profile.futureFeatures,
          isDefault: profile.isDefault,
          source: toDbProfileSource(profile.source) as any,
        })),
      });
    }

    await this.prisma.device.upsert({
      where: { id: "device_local_dev" },
      update: {
        lastSeenAt: new Date(),
        localStatus: { status: "connected" },
      },
      create: {
        id: "device_local_dev",
        userId: DEV_USER_ID,
        name: "Local Development PC",
        os: "Windows",
        appVersion: "0.1.0",
        lastSeenAt: new Date(),
        localStatus: { status: "connected" },
      },
    });

    const credentialCount = await this.prisma.providerCredential.count({ where: { userId: DEV_USER_ID } });
    if (credentialCount === 0) {
      await this.prisma.providerCredential.create({
        data: {
          id: "key_gemini_dev",
          userId: DEV_USER_ID,
          provider: "GEMINI",
          label: "Gemini",
          encryptedKey: "",
          maskedKey: "AIza...demo",
          status: "CONFIGURED",
        },
      });
    }
  }
}
