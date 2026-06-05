import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { MivaApiService } from "./api.service.js";

@Controller()
export class ApiController {
  constructor(@Inject(MivaApiService) private readonly api: MivaApiService) {}

  @Get("health")
  health() {
    return this.api.health();
  }

  @Get("me")
  me(@Req() req: Request) {
    return this.api.me(req);
  }

  @Post("auth/login")
  login(@Body() body: unknown) {
    return this.api.login(body);
  }

  @Post("auth/google")
  googleLogin(@Body() body: unknown) {
    return this.api.googleLogin(body);
  }

  @Post("auth/device/start")
  @HttpCode(201)
  startDeviceAuth() {
    return this.api.startDeviceAuth();
  }

  @Get("auth/device/:deviceCode")
  getDeviceAuth(@Param("deviceCode") deviceCode: string) {
    return this.api.getDeviceAuth(deviceCode);
  }

  @Post("auth/device/complete")
  completeDeviceAuth(@Body() body: unknown) {
    return this.api.completeDeviceAuth(body);
  }

  @Get("catalog/models")
  getCatalogModels() {
    return this.api.getCatalogModels();
  }

  @Get("devices")
  getDevices(@Req() req: Request) {
    return this.api.getDevices(req);
  }

  @Post("devices")
  @HttpCode(201)
  upsertDevice(@Req() req: Request, @Body() body: unknown) {
    return this.api.upsertDevice(req, body);
  }

  @Get("api-keys")
  getApiKeys(@Req() req: Request) {
    return this.api.getApiKeys(req);
  }

  @Get("api-keys/sync")
  syncApiKeys(@Req() req: Request) {
    return this.api.syncApiKeys(req);
  }

  @Post("api-keys")
  saveApiKey(@Req() req: Request, @Body() body: unknown) {
    return this.api.saveApiKey(req, body);
  }

  @Post("api-keys/:keyId/test")
  testApiKey(@Param("keyId") keyId: string) {
    return this.api.testApiKey(keyId);
  }

  @Get("assistant-profiles")
  getAssistantProfiles(@Req() req: Request) {
    return this.api.getAssistantProfiles(req);
  }

  @Post("assistant-profiles")
  createAssistantProfile(@Req() req: Request, @Body() body: unknown) {
    return this.api.createAssistantProfile(req, body);
  }

  @Get("assistant-profiles/:profileId")
  getAssistantProfile(@Req() req: Request, @Param("profileId") profileId: string) {
    return this.api.getAssistantProfile(req, profileId);
  }

  @Patch("assistant-profiles/:profileId")
  patchAssistantProfile(@Req() req: Request, @Param("profileId") profileId: string, @Body() body: unknown) {
    return this.api.patchAssistantProfile(req, profileId, body);
  }

  @Delete("assistant-profiles/:profileId")
  deleteAssistantProfile(@Req() req: Request, @Param("profileId") profileId: string) {
    return this.api.deleteAssistantProfile(req, profileId);
  }

  @Post("usage-events")
  @HttpCode(201)
  recordSimpleUsageEvent(@Body() body: unknown) {
    return this.api.recordSimpleUsageEvent(body);
  }

  @Get("usage/summary")
  getUsageSummary() {
    return this.api.getUsageSummary();
  }

  @Post("usage/local-events")
  @HttpCode(201)
  recordLocalUsageEvents(@Req() req: Request, @Body() body: unknown) {
    return this.api.recordLocalUsageEvents(req, body);
  }

  @Get("admin/stats")
  getAdminStats() {
    return this.api.getAdminStats();
  }

  @Get("workspace/google/status")
  getGoogleWorkspaceStatus(@Req() req: Request) {
    return this.api.getGoogleWorkspaceStatus(req);
  }

  @Get("workspace/google/auth-url")
  getGoogleWorkspaceAuthUrl(@Req() req: Request) {
    return this.api.getGoogleWorkspaceAuthUrl(req);
  }

  @Get("workspace/google/callback")
  @Header("content-type", "text/html; charset=utf-8")
  completeGoogleWorkspaceOAuthCallback(@Query() query: Record<string, unknown>) {
    return this.api.completeGoogleWorkspaceOAuthCallback(query);
  }

  @Post("workspace/google/token")
  saveGoogleWorkspaceToken(@Req() req: Request, @Body() body: unknown) {
    return this.api.saveGoogleWorkspaceToken(req, body);
  }

  @Post("workspace/context")
  getGoogleWorkspaceContext(@Req() req: Request, @Body() body: unknown) {
    return this.api.getGoogleWorkspaceContext(req, body);
  }

  @Post("workspace/actions")
  runGoogleWorkspaceAction(@Req() req: Request, @Body() body: unknown) {
    return this.api.runGoogleWorkspaceAction(req, body);
  }
}
