import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { AssistantProfilesService } from "./assistant-profiles.service.js";
import { ApiController } from "./api.controller.js";
import { MivaApiService } from "./api.service.js";
import { AuthService } from "./auth.service.js";
import { CatalogService } from "./catalog.service.js";
import { CredentialsService } from "./credentials.service.js";
import { DevicesService } from "./devices.service.js";
import { PrismaService } from "./prisma.service.js";
import { SeedService } from "./seed.service.js";
import { StudioService } from "./studio.service.js";
import { UsageService } from "./usage.service.js";
import { WorkspaceService } from "./workspace.service.js";

@Module({
  controllers: [ApiController],
  providers: [
    MivaApiService,
    PrismaService,
    SeedService,
    AuthService,
    CatalogService,
    DevicesService,
    CredentialsService,
    AssistantProfilesService,
    UsageService,
    AdminService,
    StudioService,
    WorkspaceService,
  ],
})
export class AppModule {}
