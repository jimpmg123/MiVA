import type { AssistantProfileSyncState, LocalAssistantProfile, ProfileDetailsDraft, StudioSection } from "../types";
import { Badge, IconTile, InfoTile, Input, Panel, Textarea } from "../components/ui";

type StudioOverviewPanelProps = {
  configuredNewAssistantSections: Partial<Record<StudioSection, boolean>>;
  profile: LocalAssistantProfile;
  profileDetailsDraft: ProfileDetailsDraft;
  syncBadgeTone: "neutral" | "success" | "action";
  syncLabel: string;
  syncState: AssistantProfileSyncState;
  syncMessage: string | null;
  providerLabel: string;
  codingLabel: string;
  isNewAssistantDraft: boolean;
  assistantProfileError: string | null;
  duplicateNameMessage: string | null;
  onProfileDetailsChange: (next: ProfileDetailsDraft) => void;
};

function displayValue(value: string | null | undefined, fallback = "Not set") {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

type GeneratedAssistantRecipe = {
  name: string;
  purpose: string;
  targetUser: string;
  profileContext: string;
  workflowSteps: string[];
  responseFormat: string[];
  rules: string[];
  examples: Array<{
    userMessage: string;
    assistantResponse: string;
  }>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.flatMap((item) => {
    const text = stringValue(item);
    return text ? [text] : [];
  }) : [];
}

function readGeneratedRecipe(variables: Record<string, unknown>): GeneratedAssistantRecipe | null {
  const source = variables.assistantRecipe;
  if (!source || typeof source !== "object") {
    return null;
  }

  const recipe = source as Record<string, unknown>;
  const examples = Array.isArray(recipe.examples)
    ? recipe.examples.flatMap((example) => {
      if (!example || typeof example !== "object") {
        return [];
      }

      const raw = example as Record<string, unknown>;
      const userMessage = stringValue(raw.userMessage);
      const assistantResponse = stringValue(raw.assistantResponse);
      return userMessage || assistantResponse ? [{ userMessage, assistantResponse }] : [];
    })
    : [];

  const generated: GeneratedAssistantRecipe = {
    name: stringValue(recipe.name),
    purpose: stringValue(recipe.purpose),
    targetUser: stringValue(recipe.targetUser),
    profileContext: stringValue(recipe.profileContext),
    workflowSteps: stringList(recipe.workflowSteps),
    responseFormat: stringList(recipe.responseFormat),
    rules: stringList(recipe.rules),
    examples,
  };

  return Object.values(generated).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value))
    ? generated
    : null;
}

export function StudioOverviewPanel({
  configuredNewAssistantSections,
  profile,
  profileDetailsDraft,
  syncBadgeTone,
  syncLabel,
  syncState,
  syncMessage,
  providerLabel,
  codingLabel,
  isNewAssistantDraft,
  assistantProfileError,
  duplicateNameMessage,
  onProfileDetailsChange,
}: StudioOverviewPanelProps) {
  const nameValidationMessage = duplicateNameMessage
    ?? (assistantProfileError === "An assistant with this name already exists." ? assistantProfileError : null);
  const summaryCards: Array<[string, string]> = [];

  if (!isNewAssistantDraft || configuredNewAssistantSections.prompts) {
    summaryCards.push(["Prompts", "Complete"]);
  }

  if (!isNewAssistantDraft || configuredNewAssistantSections.models) {
    summaryCards.push(["Provider", providerLabel], ["Model", profile.modelLabel || profile.model]);
  }

  if (!isNewAssistantDraft || configuredNewAssistantSections.code) {
    summaryCards.push(["Coding", codingLabel]);
  }

  const generatedRecipe = readGeneratedRecipe(profile.prompt.variables);
  const promptStackItems: Array<[string, string, string]> = generatedRecipe ? [
    ["Assistant name", displayValue(generatedRecipe.name, "Not generated"), "Generated assistant identity"],
    ["User reference", displayValue(generatedRecipe.targetUser, "Not generated"), "Generated description of who this assistant is built to address"],
    ["Primary work", displayValue(generatedRecipe.purpose, "Not generated"), "Generated job this assistant should perform"],
    ["Profile context", displayValue(generatedRecipe.profileContext, "Not generated"), "User or workflow context captured during setup"],
    ["Response format", generatedRecipe.responseFormat.slice(0, 3).join(", ") || "Not generated", "Generated answer structure"],
  ] : [];
  const visibleRules = generatedRecipe?.rules.slice(0, 4) ?? [];
  const visibleWorkflowSteps = generatedRecipe?.workflowSteps.slice(0, 5) ?? [];
  const sampleExample = generatedRecipe?.examples[0] ?? null;
  const showPromptStack = !isNewAssistantDraft && Boolean(generatedRecipe);

  return (
    <div className="grid gap-6">
      <Panel className="relative min-h-[260px]">
        <div className="flex items-start justify-between gap-4">
          <IconTile>
            <span className="material-symbols-outlined text-[22px]">account_circle</span>
          </IconTile>
          <Badge tone={syncBadgeTone}>{syncLabel}</Badge>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Assistant name</span>
            <Input
              className={`font-heading text-xl font-bold ${
                nameValidationMessage ? "border-[var(--miva-danger)] focus-visible:border-[var(--miva-danger)]" : ""
              }`}
              value={profileDetailsDraft.name}
              onChange={(event) => onProfileDetailsChange({ ...profileDetailsDraft, name: event.target.value })}
            />
            {nameValidationMessage && (
              <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-[var(--miva-danger-soft)] bg-[var(--miva-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--miva-danger-hover)] shadow-sm">
                <span>{nameValidationMessage}</span>
                <span className="material-symbols-outlined text-[16px]">close</span>
              </div>
            )}
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Description</span>
            <Textarea
              className="min-h-[96px] resize-none"
              value={profileDetailsDraft.description}
              onChange={(event) => onProfileDetailsChange({ ...profileDetailsDraft, description: event.target.value })}
            />
          </label>
        </div>

        {summaryCards.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map(([label, value]) => (
              <InfoTile key={label} label={label} value={value} />
            ))}
          </div>
        )}

        {profile.sync.lastSyncedAt && (
          <p className="mt-4 text-xs leading-5 text-[var(--miva-text-muted)]">
            Last synced at {new Date(profile.sync.lastSyncedAt).toLocaleString()}.
          </p>
        )}

        {syncState === "error" && syncMessage && !assistantProfileError && !syncMessage.includes("An assistant with this name already exists.") && (
          <p className="mt-4 rounded-lg bg-[var(--miva-danger-soft)] p-3 text-xs leading-5 text-[var(--miva-danger-hover)]">{syncMessage}</p>
        )}
      </Panel>

      {showPromptStack && (
      <Panel className="min-h-[320px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <IconTile>
              <span className="material-symbols-outlined text-[22px]">edit_note</span>
            </IconTile>
            <h3 className="mt-5 font-heading text-xl font-bold text-[var(--miva-text)]">Prompt stack</h3>
            <p className="mt-2 max-w-[760px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Generated assistant blueprint from the Add Assistant flow. Default runtime settings are intentionally excluded here.
            </p>
          </div>
          <Badge>{generatedRecipe?.rules.length ?? 0} generated rules</Badge>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {promptStackItems.map(([label, value, hint]) => (
            <div className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-4" key={label}>
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{label}</p>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--miva-text)]">{value}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--miva-text-muted)]">{hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Generated behavior rules</p>
            <span className="text-xs font-semibold text-[var(--miva-text-muted)]">Created during assistant setup</span>
          </div>
          {visibleRules.length ? (
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {visibleRules.map((rule) => (
                <li className="rounded-lg bg-[var(--miva-bg-soft)] px-3 py-2 text-sm leading-6 text-[var(--miva-text)]" key={rule}>
                  {rule}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg bg-[var(--miva-bg-soft)] px-3 py-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              No generated behavior rules were stored for this assistant.
            </p>
          )}
        </div>

        {(visibleWorkflowSteps.length > 0 || sampleExample) && (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {visibleWorkflowSteps.length > 0 && (
              <div className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Generated workflow</p>
                <ol className="mt-3 grid gap-2">
                  {visibleWorkflowSteps.map((step, index) => (
                    <li className="flex gap-3 rounded-lg bg-[var(--miva-bg-soft)] px-3 py-2 text-sm leading-6 text-[var(--miva-text)]" key={step}>
                      <span className="shrink-0 font-bold text-[var(--miva-primary)]">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {sampleExample && (
              <div className="rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Generated sample</p>
                {sampleExample.userMessage && (
                  <p className="mt-3 rounded-lg bg-[var(--miva-bg-soft)] px-3 py-2 text-sm leading-6 text-[var(--miva-text)]">
                    {sampleExample.userMessage}
                  </p>
                )}
                {sampleExample.assistantResponse && (
                  <p className="mt-2 line-clamp-3 rounded-lg bg-[var(--miva-primary-surface)] px-3 py-2 text-sm leading-6 text-[var(--miva-text)]">
                    {sampleExample.assistantResponse}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>
      )}
    </div>
  );
}
