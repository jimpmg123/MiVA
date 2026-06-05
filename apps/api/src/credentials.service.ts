import { Inject, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import {
  DEV_USER_ID,
  fromDbProvider,
  normalizeApiKeyPayload,
  RequestLike,
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

  private async resolveUserId(req?: RequestLike) {
    if (!req) {
      return DEV_USER_ID;
    }

    const user = await this.auth.getRequestUser(req);
    return user?.id || DEV_USER_ID;
  }

  async getApiKeys(req?: RequestLike) {
    const userId = await this.resolveUserId(req);
    const keys = await this.prisma.providerCredential.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return { keys: keys.map(serializeApiKey) };
  }

  async syncApiKeys(req: RequestLike) {
    const token = this.auth.getBearerToken(req);
    const sessionUser = await this.auth.getUserFromSessionToken(token);
    if (!sessionUser) {
      throwHttp(401, "UNAUTHORIZED", "Sign in before syncing provider API keys.");
    }

    const keys = await this.prisma.providerCredential.findMany({
      where: { userId: sessionUser.id },
      orderBy: { updatedAt: "desc" },
    });

    const syncProviders = new Set(["openai", "gemini", "groq"]);
    const synced: Record<string, string> = {};

    for (const key of keys) {
      const provider = fromDbProvider(key.provider);
      if (!syncProviders.has(provider) || synced[provider]) {
        continue;
      }

      const value = String(key.encryptedKey || "").trim();
      if (value) {
        synced[provider] = value;
      }
    }

    return {
      keys: synced,
      syncedAt: new Date().toISOString(),
    };
  }

  async saveApiKey(req: RequestLike, payload: any) {
    const userId = await this.resolveUserId(req);
    const nextKey = normalizeApiKeyPayload({ ...payload });
    const existingKey = payload.id
      ? await this.prisma.providerCredential.findUnique({ where: { id: payload.id } })
      : payload.provider !== "custom"
        ? await this.prisma.providerCredential.findFirst({
            where: {
              userId,
              provider: toDbProvider(payload.provider) as any,
            },
          })
        : null;
    const incomingKey = String(payload.key || "").trim();
    const key = existingKey
      ? await this.prisma.providerCredential.update({
          where: { id: existingKey.id },
          data: {
            provider: toDbProvider(nextKey.provider) as any,
            label: nextKey.label,
            encryptedKey: incomingKey || existingKey.encryptedKey,
            maskedKey: incomingKey ? nextKey.maskedKey : existingKey.maskedKey,
            status: toDbCredentialStatus(nextKey.status) as any,
            lastValidatedAt: incomingKey ? null : existingKey.lastValidatedAt,
          },
        })
      : await this.prisma.providerCredential.create({
          data: {
            id: nextKey.id,
            userId,
            provider: toDbProvider(nextKey.provider) as any,
            label: nextKey.label,
            encryptedKey: incomingKey,
            maskedKey: nextKey.maskedKey,
            status: toDbCredentialStatus(nextKey.status) as any,
            lastValidatedAt: null,
          },
        });

    await this.auth.recordUsageEvent("api_key_configured", nextKey.provider, userId);
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
