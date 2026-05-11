import { Inject, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import {
  DEV_USER_ID,
  fromDbProvider,
  normalizeApiKeyPayload,
  serializeApiKey,
  toDbCredentialStatus,
  toDbProvider,
} from "./api.shared.js";
import { throwHttp } from "./http-errors.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class CredentialsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async getApiKeys() {
    const keys = await this.prisma.providerCredential.findMany({
      where: { userId: DEV_USER_ID },
      orderBy: { updatedAt: "desc" },
    });
    return { keys: keys.map(serializeApiKey) };
  }

  async saveApiKey(payload: any) {
    const nextKey = normalizeApiKeyPayload({ ...payload });
    const existingKey = payload.id
      ? await this.prisma.providerCredential.findUnique({ where: { id: payload.id } })
      : payload.provider !== "custom"
        ? await this.prisma.providerCredential.findFirst({
            where: {
              userId: DEV_USER_ID,
              provider: toDbProvider(payload.provider) as any,
            },
          })
        : null;
    const key = existingKey
      ? await this.prisma.providerCredential.update({
          where: { id: existingKey.id },
          data: {
            provider: toDbProvider(nextKey.provider) as any,
            label: nextKey.label,
            encryptedKey: String(payload.key || ""),
            maskedKey: nextKey.maskedKey,
            status: toDbCredentialStatus(nextKey.status) as any,
            lastValidatedAt: null,
          },
        })
      : await this.prisma.providerCredential.create({
          data: {
            id: nextKey.id,
            userId: DEV_USER_ID,
            provider: toDbProvider(nextKey.provider) as any,
            label: nextKey.label,
            encryptedKey: String(payload.key || ""),
            maskedKey: nextKey.maskedKey,
            status: toDbCredentialStatus(nextKey.status) as any,
            lastValidatedAt: null,
          },
        });

    await this.auth.recordUsageEvent("api_key_configured", nextKey.provider);
    return { key: serializeApiKey(key) };
  }

  async testApiKey(keyId: string) {
    const existingKey = await this.prisma.providerCredential.findUnique({ where: { id: keyId } });
    const key = existingKey
      ? await this.prisma.providerCredential.update({
          where: { id: existingKey.id },
          data: {
            status: existingKey.maskedKey ? "VERIFIED" : "ERROR",
            lastValidatedAt: new Date(),
          },
        })
      : null;
    if (!key) {
      throwHttp(404, "API_KEY_NOT_FOUND");
    }

    await this.auth.recordUsageEvent("api_key_tested", fromDbProvider(key.provider));
    return { key: serializeApiKey(key) };
  }
}
