import { Inject, Injectable } from "@nestjs/common";
import { countMetric, toTopList } from "./api.shared.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAdminStats() {
    const [userCount, deviceRows, profiles, metricEvents] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.device.findMany(),
      this.prisma.assistantProfile.findMany(),
      this.prisma.usageEvent.findMany({
        where: {
          eventType: "admin_metric",
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    return {
      users: {
        total: userCount,
        active: userCount,
      },
      devices: {
        total: deviceRows.length,
        connected: deviceRows.filter((device) => (device.localStatus as any)?.status === "connected" || device.lastSeenAt).length,
      },
      assistantProfiles: {
        total: profiles.length,
        useCases: toTopList(countMetric(metricEvents, "assistant_use_case_selected")),
        localModes: toTopList(countMetric(metricEvents, "local_mode_selected")),
        codingCapabilities: toTopList(countMetric(metricEvents, "coding_capability_selected")),
      },
      providers: toTopList(countMetric(metricEvents, "provider_selected")),
      models: toTopList(countMetric(metricEvents, "model_selected")),
      recentEvents: metricEvents.slice(0, 8).map((event) => ({
        id: event.id,
        type: (event.metadata as any)?.type || event.eventType,
        value: (event.metadata as any)?.value || "",
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }
}
