import { Badge, Button, Panel, SelectionOptionCard, StatusAlert, Switch } from "../components/ui";
import type { GoogleWorkspaceStatus, PromptSettings, WorkspaceServiceId } from "../types";

type GoogleWorkspacePanelProps = {
  authConnected: boolean;
  googleWorkspaceStatus: GoogleWorkspaceStatus | null;
  settings: PromptSettings;
  onOpenWorkspaceConsent: () => void;
  onPromptSettingsChange: (updater: (current: PromptSettings) => PromptSettings) => void;
  onRefreshGoogleWorkspaceStatus: () => void;
};

type WorkspaceServiceOption = {
  id: WorkspaceServiceId;
  title: string;
  body: string;
  icon: string;
};

const workspaceServices: WorkspaceServiceOption[] = [
  {
    id: "drive",
    title: "Google Drive",
    body: "Read file metadata and find relevant files after the user connects Google.",
    icon: "folder",
  },
  {
    id: "gmail",
    title: "Gmail",
    body: "Read recent messages and email metadata for user-approved context.",
    icon: "mail",
  },
  {
    id: "calendar",
    title: "Google Calendar",
    body: "Read upcoming events and prepare schedule suggestions with confirmation.",
    icon: "calendar_month",
  },
  {
    id: "docs",
    title: "Google Docs",
    body: "Read recent document titles and excerpts when the assistant needs context.",
    icon: "description",
  },
  {
    id: "sheets",
    title: "Google Sheets",
    body: "Read spreadsheet metadata and structured context later.",
    icon: "table",
  },
];

const workspaceSteps = [
  {
    label: "Step 1",
    title: "Sign in with Google",
    body: "The account connection is handled by MiVA OAuth.",
  },
  {
    label: "Step 2",
    title: "Select products",
    body: "Choose Gmail, Drive, Docs, Calendar, or Sheets per assistant.",
  },
  {
    label: "Step 3",
    title: "Confirm write actions",
    body: "MiVA asks before changing Docs, Calendar, Gmail, Drive, or Sheets.",
  },
];

export function GoogleWorkspacePanel({
  authConnected,
  googleWorkspaceStatus,
  settings,
  onOpenWorkspaceConsent,
  onPromptSettingsChange,
  onRefreshGoogleWorkspaceStatus,
}: GoogleWorkspacePanelProps) {
  const selectedServices = settings.toolConnections.googleWorkspaceServices;
  const enabled = settings.toolConnections.googleWorkspace;
  const googleConnected = googleWorkspaceStatus?.connected === true;
  const connectionLabel = !authConnected
    ? "Sign in required"
    : googleConnected
      ? googleWorkspaceStatus?.accountEmail || "Connected"
      : "Needs Google consent";

  const toggleService = (service: WorkspaceServiceId) => {
    onPromptSettingsChange((current) => {
      const selected = current.toolConnections.googleWorkspaceServices.includes(service)
        ? current.toolConnections.googleWorkspaceServices.filter((item) => item !== service)
        : [...current.toolConnections.googleWorkspaceServices, service];
      const nextEnabled = selected.length > 0;

      return {
        ...current,
        toolConnections: {
          ...current.toolConnections,
          googleWorkspace: nextEnabled,
          googleWorkspaceServices: selected,
        },
        workspaceRules: {
          ...current.workspaceRules,
          googleWorkspace: nextEnabled ? "askFirst" : "disabled",
          calendar: selected.includes("calendar") ? "askFirst" : "disabled",
          gmail: selected.includes("gmail") ? "askFirst" : "disabled",
          drive: selected.includes("drive") ? "askFirst" : "disabled",
        },
      };
    });
  };

  const setAllServicesEnabled = (nextEnabled: boolean) => {
    onPromptSettingsChange((current) => {
      const selected = nextEnabled ? workspaceServices.map((service) => service.id) : [];
      return {
        ...current,
        toolConnections: {
          ...current.toolConnections,
          googleWorkspace: nextEnabled,
          googleWorkspaceServices: selected,
        },
        workspaceRules: {
          ...current.workspaceRules,
          googleWorkspace: nextEnabled ? "askFirst" : "disabled",
          calendar: nextEnabled ? "askFirst" : "disabled",
          gmail: nextEnabled ? "askFirst" : "disabled",
          drive: nextEnabled ? "askFirst" : "disabled",
        },
      };
    });
  };

  const activeServiceCount = selectedServices.length;

  const productAccessStatus = enabled
    ? `${activeServiceCount} product${activeServiceCount === 1 ? "" : "s"} on`
    : "All products off";

  const productToggleAriaLabel = enabled ? "Turn all Google Workspace products off" : "Turn all Google Workspace products on";

  const productAccessDescription = enabled
    ? "MiVA can retrieve context from selected Google products. Write actions still ask for confirmation in chat."
    : "Turn on Product access to let this assistant use Google Workspace context.";

  const productAccessHint = enabled
    ? "Individual products can still be turned off below."
    : "Turning this on enables Gmail, Drive, Docs, Calendar, and Sheets for this assistant.";

  const productAccessSummary = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[var(--miva-text-muted)]">{productAccessStatus}</span>
    </div>
  );

  const productAccessHelper = (
    <StatusAlert className="mt-3" tone="neutral">
      <p className="text-sm leading-5 text-[var(--miva-text)]">{productAccessDescription}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">{productAccessHint}</p>
    </StatusAlert>
  );

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Workspace integration</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">Connect Google Workspace</h3>
            <p className="mt-2 max-w-[760px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Choose which Google products this assistant can use as read-only context. MiVA will use the connected Google account and direct Google APIs for Gmail, Drive, Docs, Calendar, and Sheets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge>
            <Badge tone={googleConnected ? "success" : "neutral"}>{connectionLabel}</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {workspaceSteps.map((step) => (
            <article className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-4" key={step.label}>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">{step.label}</p>
              <p className="mt-2 text-sm font-bold text-[var(--miva-text)]">{step.title}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--miva-text-muted)]">{step.body}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Google account permission</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              MiVA needs Google consent before it can read or update Docs and Calendar through direct Google APIs.
            </p>
            {googleWorkspaceStatus?.connectedAt && (
              <p className="mt-2 text-xs font-semibold text-[var(--miva-text-soft)]">Connected at {new Date(googleWorkspaceStatus.connectedAt).toLocaleString()}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-full"
              onClick={onRefreshGoogleWorkspaceStatus}
              variant="secondary"
            >
              Refresh status
            </Button>
            <Button
              className="rounded-full"
              disabled={!authConnected}
              onClick={onOpenWorkspaceConsent}
            >
              {googleConnected ? "Reconnect Google" : "Connect Google"}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Product access</h3>
              {productAccessSummary}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Select which Google products this assistant may read for context. Save changes to store this in the assistant profile.
            </p>
            {productAccessHelper}
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-full border border-[var(--miva-border)] bg-[var(--miva-surface)] px-3 py-2 shadow-sm">
            <span className="min-w-7 text-sm font-bold text-[var(--miva-text)]">{enabled ? "On" : "Off"}</span>
            <Switch
              aria-label={productToggleAriaLabel}
              checked={enabled}
              onCheckedChange={setAllServicesEnabled}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspaceServices.map((service) => {
            const selected = selectedServices.includes(service.id);
            return (
              <SelectionOptionCard
                active={selected}
                description={service.body}
                icon={<span className="material-symbols-outlined text-[20px]">{service.icon}</span>}
                key={service.id}
                onClick={() => toggleService(service.id)}
                title={service.title}
                trailing={<Badge tone={selected ? "action" : "neutral"}>{selected ? "Selected" : "Off"}</Badge>}
                interaction="border"
              />
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
