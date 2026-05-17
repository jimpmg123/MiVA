import { Inject, Injectable } from "@nestjs/common";
import type { RequestLike } from "./api.shared.js";
import { AuthService } from "./auth.service.js";
import { throwHttp } from "./http-errors.js";
import { PrismaService } from "./prisma.service.js";

const MAX_CONTEXT_CHARS = 6000;

function truncate(value: unknown, maxLength = MAX_CONTEXT_CHARS) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...[truncated]` : text;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
        scopes,
        status: "CONNECTED",
        connectedAt: new Date(),
      },
      update: {
        accountEmail,
        encryptedAccessToken: accessToken,
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

    return {
      connected: connection?.status === "CONNECTED" && Boolean(connection.encryptedAccessToken),
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

    const connection = await this.prisma.workspaceConnection.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "google",
        },
      },
    });
    const accessToken = asString(connection?.encryptedAccessToken);
    if (!accessToken || connection?.status !== "CONNECTED") {
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
        "Use this context only as supporting information. Do not claim create/update/delete actions were completed.",
        "If the user asks to modify Calendar, Gmail, Drive, Docs, or Sheets, ask for confirmation and explain that write actions are not enabled in this runtime yet.",
        "",
        ...blocks,
      ].join("\n"),
      services,
      status: "CONNECTED",
    };
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

  private async googleFetch(url: string, accessToken: string) {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
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

  private async fetchCalendarContext(accessToken: string) {
    const now = new Date();
    const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: max.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "10",
    });
    const events = await this.googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, accessToken);
    const summaries = Array.isArray(events.items)
      ? events.items.map((event: any) => ({
        id: event.id,
        summary: event.summary || "(no title)",
        start: event.start?.dateTime || event.start?.date || "",
        end: event.end?.dateTime || event.end?.date || "",
      }))
      : [];
    return `Upcoming Google Calendar events:\n${JSON.stringify(summaries, null, 2)}`;
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
}
