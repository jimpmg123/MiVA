import { Inject, Injectable } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { AssistantProfilesService } from "./assistant-profiles.service.js";
import { AuthService } from "./auth.service.js";
import { CatalogService } from "./catalog.service.js";
import { CredentialsService } from "./credentials.service.js";
import { DevicesService } from "./devices.service.js";
import { RequestLike } from "./api.shared.js";
import { SeedService } from "./seed.service.js";
import { UsageService } from "./usage.service.js";

@Injectable()
export class MivaApiService {
  constructor(
    @Inject(SeedService) private readonly seed: SeedService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(DevicesService) private readonly devices: DevicesService,
    @Inject(CredentialsService) private readonly credentials: CredentialsService,
    @Inject(AssistantProfilesService) private readonly assistantProfiles: AssistantProfilesService,
    @Inject(UsageService) private readonly usage: UsageService,
    @Inject(AdminService) private readonly admin: AdminService,
  ) {}

  ensureDevData() {
    return this.seed.ensureDevData();
  }

  health() {
    return {
      ok: true,
      service: "miva-api",
      note: "MiVA cloud API backed by NestJS, Prisma, and PostgreSQL.",
    };
  }

  me(req: RequestLike) {
    return this.auth.me(req);
  }

  login(payload: any) {
    return this.auth.login(payload);
  }

  googleLogin(payload: any) {
    return this.auth.googleLogin(payload);
  }

  startDeviceAuth() {
    return this.auth.startDeviceAuth();
  }

  getDeviceAuth(deviceCode: string) {
    return this.auth.getDeviceAuth(deviceCode);
  }

  completeDeviceAuth(payload: any) {
    return this.auth.completeDeviceAuth(payload);
  }

  getCatalogModels() {
    return this.catalog.getCatalogModels();
  }

  getDevices(req: RequestLike) {
    return this.devices.getDevices(req);
  }

  upsertDevice(req: RequestLike, payload: any) {
    return this.devices.upsertDevice(req, payload);
  }

  getApiKeys() {
    return this.credentials.getApiKeys();
  }

  saveApiKey(payload: any) {
    return this.credentials.saveApiKey(payload);
  }

  testApiKey(keyId: string) {
    return this.credentials.testApiKey(keyId);
  }

  getAssistantProfiles(req: RequestLike) {
    return this.assistantProfiles.getAssistantProfiles(req);
  }

  createAssistantProfile(req: RequestLike, payload: any) {
    return this.assistantProfiles.createAssistantProfile(req, payload);
  }

  getAssistantProfile(req: RequestLike, profileId: string) {
    return this.assistantProfiles.getAssistantProfile(req, profileId);
  }

  patchAssistantProfile(req: RequestLike, profileId: string, payload: any) {
    return this.assistantProfiles.patchAssistantProfile(req, profileId, payload);
  }

  deleteAssistantProfile(req: RequestLike, profileId: string) {
    return this.assistantProfiles.deleteAssistantProfile(req, profileId);
  }

  recordSimpleUsageEvent(payload: any) {
    return this.usage.recordSimpleUsageEvent(payload);
  }

  getUsageSummary() {
    return this.usage.getUsageSummary();
  }

  recordLocalUsageEvents(req: RequestLike, payload: any) {
    return this.usage.recordLocalUsageEvents(req, payload);
  }

  getAdminStats() {
    return this.admin.getAdminStats();
  }
}
