import { Inject, Injectable } from "@nestjs/common";
import { getDemoProviderKey } from "../../../packages/shared/src/demo-env.mjs";
import { DEV_PASSWORDS, DEV_USER_ID, assistantProfiles, hashSecret, maskApiKey, toDbProvider, toDbProfileSource } from "./api.shared.js";
import { PrismaService } from "./prisma.service.js";

const demoProviderCredentials = [
  { id: "key_openai_demo", provider: "OPENAI", label: "OpenAI" },
  { id: "key_gemini_demo", provider: "GEMINI", label: "Gemini" },
  { id: "key_groq_demo", provider: "GROQ", label: "Groq" },
] as const;

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

    for (const credential of demoProviderCredentials) {
      const provider = credential.provider.toLowerCase();
      const key = getDemoProviderKey(provider);
      if (!key) {
        continue;
      }

      const existing = await this.prisma.providerCredential.findFirst({
        where: {
          userId: DEV_USER_ID,
          provider: credential.provider,
        },
      });

      if (existing) {
        await this.prisma.providerCredential.update({
          where: { id: existing.id },
          data: {
            label: credential.label,
            encryptedKey: key,
            maskedKey: maskApiKey(key),
            status: "CONFIGURED",
          },
        });
        continue;
      }

      await this.prisma.providerCredential.create({
        data: {
          id: credential.id,
          userId: DEV_USER_ID,
          provider: credential.provider,
          label: credential.label,
          encryptedKey: key,
          maskedKey: maskApiKey(key),
          status: "CONFIGURED",
        },
      });
    }
  }
}
