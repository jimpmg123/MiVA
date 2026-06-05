import { useState } from "react";
import {
  Badge,
  IconButton,
  IconTile,
  Input,
  ModalBackdrop,
  ModalPanel,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Select,
  StatusAlert,
  Switch,
} from "../components/ui";

type McpServerPreview = {
  id: string;
  name: string;
  transport: string;
  detail: string;
  tools: number;
  access: string;
  localFit: "High" | "Medium" | "Low";
  enabled: boolean;
};

const initialServers: McpServerPreview[] = [
  {
    id: "daiso",
    name: "Daiso CLI",
    transport: "Local bridge",
    detail: "Focused retail, place, fuel, and cinema lookups.",
    tools: 2,
    access: "Read only",
    localFit: "High",
    enabled: true,
  },
  {
    id: "local-files",
    name: "Local Files",
    transport: "stdio",
    detail: "Search and read files inside user-approved folders.",
    tools: 4,
    access: "Read only",
    localFit: "High",
    enabled: false,
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    transport: "HTTP + OAuth",
    detail: "Calendar, Gmail, Drive, Docs, and Sheets tools.",
    tools: 5,
    access: "Confirm writes",
    localFit: "Medium",
    enabled: false,
  },
  {
    id: "browser",
    name: "Browser Automation",
    transport: "stdio",
    detail: "Page inspection, navigation, forms, and screenshots.",
    tools: 15,
    access: "Interactive",
    localFit: "Low",
    enabled: false,
  },
];

export function McpStudioPanel() {
  const [servers, setServers] = useState(initialServers);
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleServer = (serverId: string, enabled: boolean) => {
    setServers((current) => current.map((server) => (
      server.id === serverId ? { ...server, enabled } : server
    )));
  };

  return (
    <div className="grid gap-6">
      <StatusAlert>
        Preview only. Server discovery, process execution, authentication, and MCP tool calls are not connected yet.
      </StatusAlert>

      <Panel>
        <SectionHeader
          eyebrow="Tool routing"
          title="Keep the tool set small for local models"
          body="MiVA should select one relevant server first, then expose only a few matching tool schemas to the active model."
          actions={<Badge tone="action">Max 6 tools per request</Badge>}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["filter_alt", "Server routing", "Choose one relevant MCP server before model inference."],
            ["data_object", "Schema budget", "Send compact tool schemas instead of every installed tool."],
            ["verified_user", "Action safety", "Read actions may run directly; writes require confirmation."],
          ].map(([icon, title, body]) => (
            <div className="rounded-lg bg-[var(--miva-bg-soft)] p-5" key={title}>
              <span className="material-symbols-outlined text-[22px] text-[var(--miva-primary)]">{icon}</span>
              <h3 className="mt-4 text-sm font-bold text-[var(--miva-text)]">{title}</h3>
              <p className="mt-2 text-sm leading-5 text-[var(--miva-text-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="MCP servers"
          title="Assistant connections"
          body="Local stdio servers and remote Streamable HTTP servers will be managed from this list."
          actions={
            <SecondaryButton onClick={() => setAddServerOpen(true)}>
              <span className="material-symbols-outlined text-[19px]">add</span>
              New MCP server
            </SecondaryButton>
          }
        />

        {notice && <StatusAlert className="mt-5" tone="warning">{notice}</StatusAlert>}

        <div className="mt-6 divide-y divide-[var(--miva-border)] rounded-lg border border-[var(--miva-border)]">
          {servers.map((server) => {
            const fitTone = server.localFit === "High" ? "success" : server.localFit === "Medium" ? "action" : "neutral";
            return (
              <div className="flex min-h-[112px] items-center gap-4 px-5 py-4" key={server.id}>
                <IconTile tone={server.enabled ? "action" : "neutral"}>
                  <span className="material-symbols-outlined text-[21px]">
                    {server.transport.includes("HTTP") ? "cloud" : server.id === "daiso" ? "terminal" : "dns"}
                  </span>
                </IconTile>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--miva-text)]">{server.name}</h3>
                    <Badge>{server.transport}</Badge>
                    <Badge>{server.tools} tools</Badge>
                    <Badge tone={fitTone}>Local fit: {server.localFit}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[var(--miva-text-muted)]">{server.detail}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--miva-text-soft)]">{server.access}</p>
                </div>
                <Switch checked={server.enabled} onCheckedChange={(enabled) => toggleServer(server.id, enabled)} />
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="bg-[var(--miva-primary-surface)]">
        <div className="flex items-start gap-4">
          <IconTile>
            <span className="material-symbols-outlined text-[22px]">speed</span>
          </IconTile>
          <div>
            <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Good MCP choices for lightweight models</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Calculator, time, local note search, bounded file reading, calendar lookup, and focused APIs such as Daiso work well. Broad browser automation, large GitHub toolsets, and autonomous multi-step agents are poor defaults for small models.
            </p>
          </div>
        </div>
      </Panel>

      {addServerOpen && (
        <ModalBackdrop>
          <ModalPanel className="max-w-[560px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">MCP server</p>
                <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">Add a connection</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
                  This form demonstrates the planned local stdio and remote HTTP setup flow.
                </p>
              </div>
              <IconButton aria-label="Close MCP server dialog" onClick={() => setAddServerOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </IconButton>
            </div>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2 text-sm font-bold text-[var(--miva-text)]">
                Server name
                <Input placeholder="My MCP server" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[var(--miva-text)]">
                Transport
                <Select defaultValue="stdio">
                  <option value="stdio">Local stdio</option>
                  <option value="http">Streamable HTTP</option>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-[var(--miva-text)]">
                Command or endpoint
                <Input placeholder="npx server-package or https://example.com/mcp" />
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <SecondaryButton onClick={() => setAddServerOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => {
                setAddServerOpen(false);
                setNotice("Connection creation is not active in this mockup.");
              }}>
                Add preview
              </PrimaryButton>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      )}
    </div>
  );
}
