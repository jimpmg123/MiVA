import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import {
  DEV_PASSWORDS,
  DEV_USER_ID,
  GOOGLE_OAUTH_CLIENT_ID,
  RequestLike,
  deviceAuthRequests,
  hashSecret,
  serializeUser,
} from "./api.shared.js";
import { throwHttp } from "./http-errors.js";
import { PrismaService } from "./prisma.service.js";

const googleOAuthClient = GOOGLE_OAUTH_CLIENT_ID ? new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID) : null;

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async me(req: RequestLike) {
    const sessionUser = await this.getUserFromSessionToken(this.getBearerToken(req));
    const user = sessionUser || await this.prisma.user.findUnique({ where: { id: DEV_USER_ID } });
    return serializeUser(user);
  }

  async login(payload: any) {
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.passwordHash !== hashSecret(password)) {
      throwHttp(401, "INVALID_CREDENTIALS", "Use dev@miva.local / miva1234 or admin@miva.local / admin1234 for local testing.");
    }

    return {
      ...await this.createAuthSession(user),
      isNewUser: false,
    };
  }

  async googleLogin(payload: any) {
    const credential = String(payload.credential || "");
    if (!credential) {
      throwHttp(400, "GOOGLE_CREDENTIAL_REQUIRED");
    }

    const googlePayload = await this.verifyGoogleCredential(credential);
    const { user, isNewUser } = await this.upsertGoogleUser(googlePayload);
    await this.recordUsageEvent("google_login_completed", serializeUser(user).role);
    return {
      ...await this.createAuthSession(user),
      isNewUser,
    };
  }

  startDeviceAuth() {
    const request = this.createDeviceAuthRequest();
    const webConsoleUrl = (process.env.MIVA_WEB_CONSOLE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
    return {
      deviceCode: request.deviceCode,
      userCode: request.userCode,
      verificationUrl: `${webConsoleUrl}/?desktopLogin=1&deviceCode=${encodeURIComponent(request.deviceCode)}&userCode=${encodeURIComponent(request.userCode)}`,
      expiresAt: request.expiresAt,
      intervalMs: 1500,
    };
  }

  getDeviceAuth(deviceCode: string) {
    const request = deviceAuthRequests.get(deviceCode);
    if (!request) {
      throwHttp(404, "DEVICE_AUTH_NOT_FOUND");
    }

    if (new Date(request.expiresAt).getTime() < Date.now()) {
      request.status = "expired";
    }

    return {
      status: request.status,
      userCode: request.userCode,
      expiresAt: request.expiresAt,
      session: request.status === "authorized" ? request.session : null,
    };
  }

  async completeDeviceAuth(payload: any) {
    const deviceCode = String(payload.deviceCode || "");
    const request = deviceAuthRequests.get(deviceCode);
    if (!request) {
      throwHttp(404, "DEVICE_AUTH_NOT_FOUND");
    }

    if (new Date(request.expiresAt).getTime() < Date.now()) {
      request.status = "expired";
      throwHttp(410, "DEVICE_AUTH_EXPIRED");
    }

    const user = await this.getUserFromSessionToken(String(payload.token || ""));
    if (!user) {
      throwHttp(401, "INVALID_SESSION_TOKEN");
    }

    request.status = "authorized";
    request.session = await this.createAuthSession(user);
    await this.recordUsageEvent("desktop_device_login_completed", serializeUser(user).role);
    return {
      status: request.status,
      session: request.session,
    };
  }

  getBearerToken(req: RequestLike) {
    const authorization = String(req.headers.authorization || "");
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : "";
  }

  async getRequestUser(req: RequestLike) {
    const sessionUser = await this.getUserFromSessionToken(this.getBearerToken(req));
    if (sessionUser) {
      return sessionUser;
    }

    return this.prisma.user.findUnique({ where: { id: DEV_USER_ID } });
  }

  async createAuthSession(user: any) {
    const token = `miva_${randomBytes(32).toString("hex")}`;
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: hashSecret(token),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      token,
      user: serializeUser(user),
    };
  }

  async getUserFromSessionToken(token: string) {
    if (!token) {
      return null;
    }

    if (token === "dev-token-admin") {
      return this.prisma.user.findUnique({ where: { id: "admin_user" } });
    }

    if (token === "dev-token-user") {
      return this.prisma.user.findUnique({ where: { id: DEV_USER_ID } });
    }

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashSecret(token) },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      await this.prisma.authSession.delete({ where: { id: session.id } });
      return null;
    }

    return session.user;
  }

  async recordUsageEvent(type: string, value: string, userId = DEV_USER_ID) {
    await this.prisma.usageEvent.create({
      data: {
        userId,
        mode: "CLOUD",
        provider: "system",
        model: "system",
        eventType: "admin_metric",
        metadata: {
          type,
          value,
        },
      },
    });
  }

  private async verifyGoogleCredential(credential: string) {
    if (!googleOAuthClient || !GOOGLE_OAUTH_CLIENT_ID) {
      throwHttp(
        503,
        "GOOGLE_OAUTH_NOT_CONFIGURED",
        "Google sign-in is not configured on this API server. Use the development email and password below.",
      );
    }

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throwHttp(401, "INVALID_GOOGLE_ID_TOKEN");
    }

    if (payload.email_verified === false) {
      throwHttp(401, "GOOGLE_EMAIL_NOT_VERIFIED");
    }

    return payload;
  }

  private async upsertGoogleUser(payload: any) {
    const email = String(payload.email).toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      const user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleSubject: payload.sub,
          displayName: payload.name || existingUser.displayName,
          locale: payload.locale || existingUser.locale,
          lastLoginAt: new Date(),
        },
      });
      return { user, isNewUser: false };
    }

    const user = await this.prisma.user.create({
      data: {
        id: `google_${payload.sub}`,
        email,
        displayName: payload.name || email.split("@")[0] || "MiVA User",
        googleSubject: payload.sub,
        role: "USER",
        locale: payload.locale || "en",
        lastLoginAt: new Date(),
      },
    });
    return { user, isNewUser: true };
  }

  private createDeviceAuthRequest() {
    const now = Date.now();
    const deviceCode = `device_${now}_${Math.random().toString(36).slice(2, 10)}`;
    const userCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
    const request = {
      deviceCode,
      userCode,
      status: "pending",
      session: null,
      createdAt: new Date(now).toISOString(),
      expiresAt,
    };

    deviceAuthRequests.set(deviceCode, request);
    return request;
  }
}
