import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { RequestLike } from "./api.shared.js";
import { GOOGLE_OAUTH_CLIENT_ID } from "./api.shared.js";
import { AuthService } from "./auth.service.js";
import { throwHttp } from "./http-errors.js";
import { PrismaService } from "./prisma.service.js";

const MAX_CONTEXT_CHARS = 6000;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
const GOOGLE_WORKSPACE_REDIRECT_URI = process.env.GOOGLE_WORKSPACE_REDIRECT_URI || "http://127.0.0.1:4000/workspace/google/callback";
const GOOGLE_WORKSPACE_SUCCESS_URL = process.env.GOOGLE_WORKSPACE_SUCCESS_URL || "http://127.0.0.1:5173/?workspaceConnected=1";
const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];
const workspaceOAuthStates = new Map<string, { userId: string; expiresAt: number }>();

function truncate(value: unknown, maxLength = MAX_CONTEXT_CHARS) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...[truncated]` : text;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getStringQuery(value: unknown) {
  return Array.isArray(value) ? asString(value[0]) : asString(value);
}

function getAccessTokenExpiresAt(expiresIn: unknown) {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(Date.now() + Math.max(0, seconds - 60) * 1000);
}

function normalizeServices(value: unknown) {
  const allowed = new Set(["calendar", "gmail", "drive", "docs", "sheets"]);
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => (
    typeof item === "string" && allowed.has(item)
  )))).slice(0, 3);
}

function getHeader(headers: Array<{ name?: unknown; value?: unknown }> | undefined, name: string) {
  const lowerName = name.toLowerCase();
  const match = headers?.find((header) => String(header?.name || "").toLowerCase() === lowerName);
  return asString(match?.value);
}

class GoogleWorkspaceAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleWorkspaceAuthError";
  }
}

function extractDocsText(document: any) {
  const chunks: string[] = [];
  const content = Array.isArray(document?.body?.content) ? document.body.content : [];

  for (const block of content) {
    const elements = Array.isArray(block?.paragraph?.elements) ? block.paragraph.elements : [];
    for (const element of elements) {
      const text = element?.textRun?.content;
      if (typeof text === "string" && text.trim()) {
        chunks.push(text.trim());
      }
    }
  }

  return chunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async getGoogleAuthUrl(req: RequestLike) {
    const user = await this.requireUser(req);
    if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
      throwHttp(500, "GOOGLE_OAUTH_CLIENT_NOT_CONFIGURED");
    }

    const state = randomBytes(24).toString("base64url");
    workspaceOAuthStates.set(state, {
      userId: user.id,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: GOOGLE_WORKSPACE_REDIRECT_URI,
      response_type: "code",
      scope: GOOGLE_WORKSPACE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async completeGoogleOAuthCallback(query: Record<string, unknown>) {
    const error = getStringQuery(query.error);
    if (error) {
      return this.renderGoogleOAuthResult(false, `Google authorization failed: ${error}`);
    }

    const code = getStringQuery(query.code);
    const state = getStringQuery(query.state);
    const stateRecord = workspaceOAuthStates.get(state);
    workspaceOAuthStates.delete(state);

    if (!code || !state || !stateRecord || stateRecord.expiresAt < Date.now()) {
      return this.renderGoogleOAuthResult(false, "Google authorization expired or had an invalid state. Return to MiVA and reconnect Google Workspace.");
    }

    try {
      const token = await this.exchangeGoogleCode(code);
      const accessToken = asString(token.access_token);
      const refreshToken = asString(token.refresh_token);
      if (!accessToken) {
        throw new Error("Google did not return an access token.");
      }

      const existing = await this.prisma.workspaceConnection.findUnique({
        where: {
          userId_provider: {
            userId: stateRecord.userId,
            provider: "google",
          },
        },
      });
      const accountEmail = await this.fetchGoogleAccountEmail(accessToken).catch(() => existing?.accountEmail || null);
      const scopes = asString(token.scope).split(/\s+/).filter(Boolean);
      const accessTokenExpiresAt = getAccessTokenExpiresAt(token.expires_in);

      await this.prisma.workspaceConnection.upsert({
        where: {
          userId_provider: {
            userId: stateRecord.userId,
            provider: "google",
          },
        },
        create: {
          userId: stateRecord.userId,
          provider: "google",
          accountEmail,
          encryptedAccessToken: accessToken,
          encryptedRefreshToken: refreshToken || null,
          accessTokenExpiresAt,
          scopes,
          status: "CONNECTED",
          connectedAt: new Date(),
        },
        update: {
          accountEmail,
          encryptedAccessToken: accessToken,
          encryptedRefreshToken: refreshToken || existing?.encryptedRefreshToken || null,
          accessTokenExpiresAt,
          scopes: scopes.length ? scopes : existing?.scopes || [],
          status: "CONNECTED",
          connectedAt: new Date(),
        },
      });

      return this.renderGoogleOAuthResult(true, "Google Workspace is connected. You can return to MiVA.");
    } catch (callbackError) {
      return this.renderGoogleOAuthResult(false, `Google Workspace connection failed: ${String((callbackError as Error)?.message || callbackError)}`);
    }
  }

  async saveGoogleToken(req: RequestLike, payload: any) {
    const user = await this.requireUser(req);
    const accessToken = asString(payload.accessToken);
    if (!accessToken) {
      throwHttp(400, "GOOGLE_ACCESS_TOKEN_REQUIRED");
    }

    const scopes = typeof payload.scope === "string"
      ? payload.scope.split(/\s+/).filter(Boolean)
      : Array.isArray(payload.scopes)
        ? payload.scopes.filter((scope: unknown): scope is string => typeof scope === "string")
        : [];
    const accountEmail = asString(payload.accountEmail) || await this.fetchGoogleAccountEmail(accessToken).catch(() => user.email);

    const connection = await this.prisma.workspaceConnection.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "google",
        },
      },
      create: {
        userId: user.id,
        provider: "google",
        accountEmail,
        encryptedAccessToken: accessToken,
        accessTokenExpiresAt: getAccessTokenExpiresAt(payload.expiresIn),
        scopes,
        status: "CONNECTED",
        connectedAt: new Date(),
      },
      update: {
        accountEmail,
        encryptedAccessToken: accessToken,
        accessTokenExpiresAt: getAccessTokenExpiresAt(payload.expiresIn),
        scopes,
        status: "CONNECTED",
        connectedAt: new Date(),
      },
    });

    return {
      ok: true,
      connection: {
        provider: connection.provider,
        accountEmail: connection.accountEmail,
        scopes: connection.scopes,
        status: connection.status,
        connectedAt: connection.connectedAt,
      },
    };
  }

  async getGoogleStatus(req: RequestLike) {
    const user = await this.requireUser(req);
    const connection = await this.prisma.workspaceConnection.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "google",
        },
      },
    });

    const connected = connection?.status === "CONNECTED" && Boolean(connection.encryptedAccessToken || connection.encryptedRefreshToken);
    if (connected) {
      try {
        const accessToken = await this.getValidGoogleAccessToken(user.id);
        await this.fetchGoogleAccountEmail(accessToken);
      } catch (error) {
        if (error instanceof GoogleWorkspaceAuthError) {
          await this.markGoogleNeedsAuth(user.id);
          return {
            connected: false,
            accountEmail: connection?.accountEmail ?? null,
            scopes: connection?.scopes ?? [],
            status: "NEEDS_AUTH",
            connectedAt: connection?.connectedAt ?? null,
          };
        }
      }
    }

    return {
      connected: connection?.status === "CONNECTED" && Boolean(connection.encryptedAccessToken || connection.encryptedRefreshToken),
      accountEmail: connection?.accountEmail ?? null,
      scopes: connection?.scopes ?? [],
      status: connection?.status ?? "NEEDS_AUTH",
      connectedAt: connection?.connectedAt ?? null,
    };
  }

  async buildContext(req: RequestLike, payload: any) {
    const user = await this.requireUser(req);
    const services = normalizeServices(payload.services);
    if (services.length === 0) {
      return { context: null, services: [] };
    }

    let accessToken = "";
    try {
      accessToken = await this.getValidGoogleAccessToken(user.id);
    } catch {
      return {
        context: "Google Workspace context was requested, but this account has not connected Google Workspace permissions yet. Do not claim Workspace data was checked.",
        services,
        status: "NEEDS_AUTH",
      };
    }

    const blocks: string[] = [];
    for (const service of services) {
      try {
        const content = await this.fetchServiceContext(service, accessToken);
        blocks.push(`## ${service}\n${truncate(content, service === "docs" ? 4600 : service === "gmail" ? 3200 : 1800)}`);
      } catch (error) {
        blocks.push(`## ${service}\nWorkspace lookup failed: ${String((error as Error)?.message || error)}\nDo not claim ${service} data was checked successfully.`);
      }
    }

    return {
      context: [
        "Google Workspace read-only context is available for this request.",
        "Use this context only as supporting information. Do not claim create/update/delete actions were completed from read-only context alone.",
        "If a separate Google Workspace write action result is provided, treat that result as authoritative for whether an action completed.",
        "",
        ...blocks,
      ].join("\n"),
      services,
      status: "CONNECTED",
    };
  }

  async runAction(req: RequestLike, payload: any) {
    const user = await this.requireUser(req);
    let accessToken = "";
    try {
      accessToken = await this.getValidGoogleAccessToken(user.id);
    } catch {
      return {
        ok: false,
        status: "NEEDS_AUTH",
        message: "Google Workspace write action requires a connected Google account with Workspace permissions.",
      };
    }

    const action = asString(payload.action);
    const params = asObject(payload.params);

    try {
      if (action === "calendar.create") {
        return await this.createCalendarEvent(accessToken, params);
      }

      if (action === "calendar.update") {
        return await this.updateCalendarEvent(accessToken, params);
      }

      if (action === "calendar.delete") {
        return await this.deleteCalendarEvent(accessToken, params);
      }

      if (action === "docs.append") {
        return await this.appendGoogleDoc(accessToken, params);
      }
    } catch (error) {
      if (error instanceof GoogleWorkspaceAuthError) {
        await this.markGoogleNeedsAuth(user.id);
        return {
          ok: false,
          status: "NEEDS_AUTH",
          message: "Google Workspace access token expired or was rejected. Reconnect Google Workspace permissions, then retry.",
        };
      }

      throw error;
    }

    throwHttp(400, "UNSUPPORTED_WORKSPACE_ACTION");
  }

  private async requireUser(req: RequestLike) {
    const user = await this.auth.getRequestUser(req);
    if (!user) {
      throwHttp(401, "AUTH_REQUIRED");
    }
    return user;
  }

  private async fetchGoogleAccountEmail(accessToken: string) {
    const userInfo = await this.googleFetch("https://www.googleapis.com/oauth2/v3/userinfo", accessToken);
    return asString(userInfo.email);
  }

  private async markGoogleNeedsAuth(userId: string) {
    await this.prisma.workspaceConnection.updateMany({
      where: {
        userId,
        provider: "google",
      },
      data: {
        status: "NEEDS_AUTH",
      },
    });
  }

  private async getValidGoogleAccessToken(userId: string) {
    const connection = await this.prisma.workspaceConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: "google",
        },
      },
    });

    if (!connection || connection.status !== "CONNECTED") {
      throw new GoogleWorkspaceAuthError("Google Workspace is not connected.");
    }

    const accessToken = asString(connection.encryptedAccessToken);
    const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0;
    if (accessToken && (!expiresAt || expiresAt > Date.now() + 60_000)) {
      return accessToken;
    }

    const refreshToken = asString(connection.encryptedRefreshToken);
    if (!refreshToken) {
      if (accessToken) {
        return accessToken;
      }
      throw new GoogleWorkspaceAuthError("Google Workspace refresh token is missing.");
    }

    const refreshed = await this.refreshGoogleAccessToken(refreshToken);
    const nextAccessToken = asString(refreshed.access_token);
    if (!nextAccessToken) {
      throw new GoogleWorkspaceAuthError("Google token refresh did not return an access token.");
    }

    const nextScopes = asString(refreshed.scope).split(/\s+/).filter(Boolean);
    await this.prisma.workspaceConnection.update({
      where: {
        userId_provider: {
          userId,
          provider: "google",
        },
      },
      data: {
        encryptedAccessToken: nextAccessToken,
        accessTokenExpiresAt: getAccessTokenExpiresAt(refreshed.expires_in),
        scopes: nextScopes.length ? nextScopes : connection.scopes,
        status: "CONNECTED",
      },
    });

    return nextAccessToken;
  }

  private async exchangeGoogleCode(code: string) {
    return this.fetchGoogleToken({
      code,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: GOOGLE_WORKSPACE_REDIRECT_URI,
      grant_type: "authorization_code",
    });
  }

  private async refreshGoogleAccessToken(refreshToken: string) {
    return this.fetchGoogleToken({
      refresh_token: refreshToken,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      grant_type: "refresh_token",
    });
  }

  private async fetchGoogleToken(params: Record<string, string>) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(payload?.error_description || payload?.error || `${response.status} ${response.statusText}`);
    }
    return payload;
  }

  private renderGoogleOAuthResult(ok: boolean, message: string) {
    const escapedMessage = message.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[char] || char));
    const redirect = ok
      ? `<script>setTimeout(() => { window.location.href = ${JSON.stringify(GOOGLE_WORKSPACE_SUCCESS_URL)}; }, 1200);</script>`
      : "";
    return [
      "<!doctype html>",
      "<html><head><meta charset=\"utf-8\"><title>MiVA Google Workspace</title>",
      "<style>body{font-family:Arial,sans-serif;margin:48px;color:#191c1d}main{max-width:640px}h1{font-size:24px}</style>",
      "</head><body><main>",
      `<h1>${ok ? "Google Workspace connected" : "Google Workspace connection failed"}</h1>`,
      `<p>${escapedMessage}</p>`,
      ok ? "<p>This page will return to MiVA Web Console shortly. You can close it after MiVA updates.</p>" : "<p>Return to MiVA and try reconnecting Google Workspace.</p>",
      redirect,
      "</main></body></html>",
    ].join("");
  }

  private async googleFetch(url: string, accessToken: string) {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      if (response.status === 401) {
        throw new GoogleWorkspaceAuthError(payload?.error_description || payload?.error?.message || "Google credentials are invalid or expired.");
      }
      throw new Error(payload?.error_description || payload?.error?.message || `${response.status} ${response.statusText}`);
    }
    return payload;
  }

  private async googleFetchWithBody(url: string, accessToken: string, init: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      if (response.status === 401) {
        throw new GoogleWorkspaceAuthError(payload?.error_description || payload?.error?.message || "Google credentials are invalid or expired.");
      }
      throw new Error(payload?.error_description || payload?.error?.message || `${response.status} ${response.statusText}`);
    }
    return payload;
  }

  private async fetchServiceContext(service: string, accessToken: string) {
    if (service === "gmail") {
      return this.fetchGmailContext(accessToken);
    }
    if (service === "docs") {
      return this.fetchDocsContext(accessToken);
    }
    if (service === "calendar") {
      return this.fetchCalendarContext(accessToken);
    }
    if (service === "sheets") {
      return this.fetchDriveListContext(accessToken, "application/vnd.google-apps.spreadsheet", "Recent Google Sheets files");
    }
    return this.fetchDriveListContext(accessToken, "", "Recent Google Drive files");
  }

  private async fetchGmailContext(accessToken: string) {
    const list = await this.googleFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5", accessToken);
    const messages = Array.isArray(list.messages) ? list.messages : [];
    const summaries = [];

    for (const item of messages.slice(0, 5)) {
      const id = asString(item?.id);
      if (!id) {
        continue;
      }
      const message = await this.googleFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        accessToken,
      );
      const headers = Array.isArray(message?.payload?.headers) ? message.payload.headers : [];
      summaries.push({
        id: message.id,
        threadId: message.threadId,
        from: getHeader(headers, "from"),
        subject: getHeader(headers, "subject") || "(no subject)",
        date: getHeader(headers, "date"),
        snippet: asString(message.snippet),
      });
    }

    return `Recent Gmail messages:\n${JSON.stringify(summaries, null, 2)}`;
  }

  private async fetchDocsContext(accessToken: string) {
    const files = await this.fetchDriveFiles(accessToken, "application/vnd.google-apps.document", 3);
    const summaries = [];
    for (const file of files) {
      const document = await this.googleFetch(
        `https://docs.googleapis.com/v1/documents/${encodeURIComponent(file.id)}`,
        accessToken,
      );
      summaries.push({
        id: file.id,
        name: file.name || document.title || "(untitled)",
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        excerpt: truncate(extractDocsText(document), 1200),
      });
    }
    return `Recent Google Docs documents and excerpts:\n${JSON.stringify(summaries, null, 2)}`;
  }

  private normalizeSearchText(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "");
  }

  private eventMatchesSummary(event: any, summaryQuery: string) {
    const eventSummary = this.normalizeSearchText(asString(event?.summary) || "");
    const query = this.normalizeSearchText(summaryQuery);
    if (!query) {
      return true;
    }

    return eventSummary.includes(query) || query.includes(eventSummary);
  }

  private eventMatchesStart(event: any, startHint: string) {
    if (!startHint) {
      return true;
    }

    const eventStart = asString(event?.start?.dateTime || event?.start?.date);
    const hintDigits = startHint.replace(/[^\d]/g, "");
    const eventDigits = eventStart.replace(/[^\d]/g, "");
    if (!hintDigits || !eventDigits) {
      return true;
    }

    return eventDigits.includes(hintDigits.slice(0, 12)) || hintDigits.includes(eventDigits.slice(0, 12));
  }

  private async listCalendarEvents(accessToken: string, timeMin: Date, timeMax: Date, maxResults = 25) {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(maxResults),
    });
    const events = await this.googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, accessToken);
    return Array.isArray(events.items) ? events.items : [];
  }

  private async resolveCalendarDeleteEventId(accessToken: string, params: Record<string, unknown>) {
    const explicitId = asString(params.eventId);
    if (explicitId) {
      return explicitId;
    }

    const summary = asString(params.summary) || asString(params.query);
    const start = asString(params.start);
    if (!summary && !start) {
      return null;
    }

    const now = new Date();
    const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const items = await this.listCalendarEvents(accessToken, timeMin, timeMax, 50);
    const matches = items.filter((event) => (
      this.eventMatchesSummary(event, summary) && this.eventMatchesStart(event, start)
    ));

    if (matches.length === 1) {
      return asString(matches[0]?.id);
    }

    if (matches.length > 1) {
      throwHttp(409, "CALENDAR_DELETE_AMBIGUOUS", "Multiple matching calendar events were found. Ask the user which event to cancel.");
    }

    return null;
  }

  private async fetchCalendarContext(accessToken: string) {
    const now = new Date();
    const min = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const events = await this.listCalendarEvents(accessToken, min, max, 10);
    const summaries = events.map((event: any) => ({
      id: event.id,
      summary: event.summary || "(no title)",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
    }));
    return `Recent and upcoming Google Calendar events:\n${JSON.stringify(summaries, null, 2)}`;
  }

  private async createCalendarEvent(accessToken: string, params: Record<string, unknown>) {
    const summary = asString(params.summary);
    const start = asString(params.start);
    const end = asString(params.end);
    const timeZone = asString(params.timeZone) || "Asia/Seoul";
    const description = asString(params.description);
    const location = asString(params.location);

    if (!summary || !start || !end) {
      throwHttp(400, "CALENDAR_EVENT_REQUIRES_SUMMARY_START_END");
    }

    const event = await this.googleFetchWithBody(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          summary,
          description: description || undefined,
          location: location || undefined,
          start: { dateTime: start, timeZone },
          end: { dateTime: end, timeZone },
        }),
      },
    );

    return {
      ok: true,
      status: "DONE",
      action: "calendar.create",
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink,
        start: event.start,
        end: event.end,
      },
    };
  }

  private async updateCalendarEvent(accessToken: string, params: Record<string, unknown>) {
    const eventId = asString(params.eventId);
    if (!eventId) {
      throwHttp(400, "CALENDAR_UPDATE_REQUIRES_EVENT_ID");
    }

    const timeZone = asString(params.timeZone) || "Asia/Seoul";
    const summary = asString(params.summary);
    const start = asString(params.start);
    const end = asString(params.end);
    const description = asString(params.description);
    const location = asString(params.location);
    const patch: Record<string, unknown> = {};

    if (summary) {
      patch.summary = summary;
    }
    if (description) {
      patch.description = description;
    }
    if (location) {
      patch.location = location;
    }
    if (start) {
      patch.start = { dateTime: start, timeZone };
    }
    if (end) {
      patch.end = { dateTime: end, timeZone };
    }

    if (Object.keys(patch).length === 0) {
      throwHttp(400, "CALENDAR_UPDATE_REQUIRES_CHANGES");
    }

    const event = await this.googleFetchWithBody(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      },
    );

    return {
      ok: true,
      status: "DONE",
      action: "calendar.update",
      event: {
        id: event.id,
        summary: event.summary,
        htmlLink: event.htmlLink,
        start: event.start,
        end: event.end,
      },
    };
  }

  private async deleteCalendarEvent(accessToken: string, params: Record<string, unknown>) {
    const eventId = await this.resolveCalendarDeleteEventId(accessToken, params);
    if (!eventId) {
      throwHttp(400, "CALENDAR_DELETE_REQUIRES_EVENT_ID", "No matching calendar event was found to cancel. Check the calendar and try again with the event title or id.");
    }

    await this.googleFetchWithBody(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      accessToken,
      {
        method: "DELETE",
      },
    );

    return {
      ok: true,
      status: "DONE",
      action: "calendar.delete",
      event: {
        id: eventId,
        deleted: true,
      },
    };
  }

  private async fetchDriveListContext(accessToken: string, mimeType: string, label: string) {
    const files = await this.fetchDriveFiles(accessToken, mimeType, 10);
    return `${label}:\n${JSON.stringify(files, null, 2)}`;
  }

  private async fetchDriveFiles(accessToken: string, mimeType: string, pageSize: number) {
    const params = new URLSearchParams({
      pageSize: String(pageSize),
      fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    });
    if (mimeType) {
      params.set("q", `mimeType='${mimeType}'`);
    }
    const response = await this.googleFetch(`https://www.googleapis.com/drive/v3/files?${params}`, accessToken);
    return Array.isArray(response.files)
      ? response.files.map((file: any) => ({
        id: asString(file.id),
        name: asString(file.name),
        mimeType: asString(file.mimeType),
        modifiedTime: asString(file.modifiedTime),
        webViewLink: asString(file.webViewLink),
      })).filter((file: { id: string }) => file.id)
      : [];
  }

  private async appendGoogleDoc(accessToken: string, params: Record<string, unknown>) {
    let documentId = asString(params.documentId);
    const text = asString(params.text);
    if (!text) {
      throwHttp(400, "DOCS_APPEND_REQUIRES_TEXT");
    }

    if (!documentId) {
      const files = await this.fetchDriveFiles(accessToken, "application/vnd.google-apps.document", 1);
      documentId = files[0]?.id || "";
    }

    if (!documentId) {
      throwHttp(400, "DOCS_APPEND_REQUIRES_DOCUMENT_ID");
    }

    const document = await this.googleFetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
      accessToken,
    );
    const content = Array.isArray(document?.body?.content) ? document.body.content : [];
    const lastBlock = content.at(-1);
    const insertIndex = Math.max(1, Number(lastBlock?.endIndex || 1) - 1);
    const insertText = text.startsWith("\n") ? text : `\n${text}`;

    const result = await this.googleFetchWithBody(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: insertIndex },
                text: insertText,
              },
            },
          ],
        }),
      },
    );

    return {
      ok: true,
      status: "DONE",
      action: "docs.append",
      document: {
        id: documentId,
        title: document.title || "(untitled)",
      },
      replies: result.replies || [],
    };
  }
}
