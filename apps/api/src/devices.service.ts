import { Inject, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { RequestLike, normalizeDevicePayload, serializeDevice } from "./api.shared.js";
import { PrismaService } from "./prisma.service.js";

@Injectable()
export class DevicesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async getDevices(req: RequestLike) {
    const requestUser = await this.auth.getRequestUser(req);
    const deviceRows = await this.prisma.device.findMany({
      where: { userId: requestUser.id },
      orderBy: { updatedAt: "desc" },
    });
    return { devices: deviceRows.map(serializeDevice) };
  }

  async upsertDevice(req: RequestLike, payload: any) {
    const requestUser = await this.auth.getRequestUser(req);
    const devicePayload = normalizeDevicePayload(payload, requestUser.id);
    const { id: deviceId, ...deviceData } = devicePayload;
    const resolvedDeviceId = deviceId || "device_local_dev";
    const existingDevice = await this.prisma.device.findUnique({ where: { id: resolvedDeviceId } });
    const device = existingDevice
      ? await this.prisma.device.update({
          where: { id: resolvedDeviceId },
          data: deviceData,
        })
      : await this.prisma.device.create({
          data: {
            ...deviceData,
            id: resolvedDeviceId,
          },
        });
    if (!existingDevice) {
      await this.auth.recordUsageEvent("device_registered", device.id, requestUser.id);
    }
    return { device: serializeDevice(device) };
  }
}
