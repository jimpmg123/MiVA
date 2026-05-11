import { Inject, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import {
  RequestLike,
  normalizeLocalUsagePayload,
  serializeLocalUsageEvent,
  toDbUsageMode,
  toTopList,
} from "./api.shared.js";
import { throwHttp } from "./http-errors.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class UsageService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async recordSimpleUsageEvent(payload: any) {
    if (typeof payload.type !== "string" || typeof payload.value !== "string") {
      throwHttp(400, "INVALID_USAGE_EVENT");
    }

    await this.auth.recordUsageEvent(payload.type, payload.value);
    return { ok: true };
  }

  async getUsageSummary() {
    const events = await this.prisma.usageEvent.findMany({
      where: {
        eventType: "chat",
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const totals = events.reduce((acc, event) => {
      acc.events += 1;
      if (event.mode === "LOCAL") {
        acc.localEvents += 1;
      } else {
        acc.cloudEvents += 1;
      }
      acc.estimatedInputChars += Number(event.inputChars || 0);
      acc.estimatedOutputChars += Number(event.outputChars || 0);
      acc.totalLatencyMs += Number(event.durationMs || 0);
      return acc;
    }, {
      events: 0,
      localEvents: 0,
      cloudEvents: 0,
      estimatedInputChars: 0,
      estimatedOutputChars: 0,
      totalLatencyMs: 0,
    });

    return {
      totals: {
        events: totals.events,
        localEvents: totals.localEvents,
        cloudEvents: totals.cloudEvents,
        estimatedInputChars: totals.estimatedInputChars,
        estimatedOutputChars: totals.estimatedOutputChars,
        averageLatencyMs: totals.events ? Math.round(totals.totalLatencyMs / totals.events) : 0,
      },
      byProvider: toTopList(events.reduce<Record<string, number>>((acc, event) => {
        acc[event.provider] = (acc[event.provider] || 0) + 1;
        return acc;
      }, {})),
      byModel: toTopList(events.reduce<Record<string, number>>((acc, event) => {
        acc[event.model] = (acc[event.model] || 0) + 1;
        return acc;
      }, {})),
      recentEvents: events.slice(0, 10).map(serializeLocalUsageEvent),
    };
  }

  async recordLocalUsageEvents(req: RequestLike, payload: any) {
    const requestUser = await this.auth.getRequestUser(req);
    const events = Array.isArray(payload.events) ? payload.events : [payload];
    const normalizedEvents = events.map((event) => normalizeLocalUsagePayload(event, requestUser.id));
    const [knownDevices, knownProfiles] = await Promise.all([
      this.prisma.device.findMany({
        where: {
          id: {
            in: [...new Set(normalizedEvents.map((event) => event.deviceId).filter(Boolean))] as string[],
          },
        },
        select: { id: true },
      }),
      this.prisma.assistantProfile.findMany({
        where: {
          id: {
            in: [...new Set(normalizedEvents.map((event) => event.assistantProfileId).filter(Boolean))] as string[],
          },
        },
        select: { id: true },
      }),
    ]);
    const knownDeviceIds = new Set(knownDevices.map((device) => device.id));
    const knownProfileIds = new Set(knownProfiles.map((profile) => profile.id));
    await this.prisma.usageEvent.createMany({
      data: normalizedEvents.map((event) => ({
        id: event.id,
        userId: event.userId,
        deviceId: knownDeviceIds.has(event.deviceId) ? event.deviceId : null,
        assistantProfileId: knownProfileIds.has(event.assistantProfileId) ? event.assistantProfileId : null,
        mode: toDbUsageMode(event.mode),
        provider: event.provider,
        model: event.model,
        eventType: "chat",
        inputChars: event.inputChars,
        outputChars: event.outputChars,
        durationMs: event.durationMs,
        success: event.success,
        createdAt: event.createdAt,
      })),
    });
    await Promise.all(normalizedEvents.map((event) => this.auth.recordUsageEvent("local_usage_synced", `${event.provider}:${event.model}`, requestUser.id)));
    return {
      ok: true,
      accepted: normalizedEvents.length,
    };
  }
}
