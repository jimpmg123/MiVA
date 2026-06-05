import { useState } from "react";
import {
  Badge,
  IconTile,
  Panel,
  SecondaryButton,
  SectionHeader,
  StatusAlert,
  Switch,
} from "../components/ui";

type SkillPreview = {
  id: string;
  name: string;
  description: string;
  mode: string;
  fit: "Excellent" | "Good" | "Cloud recommended";
  enabled: boolean;
};

const initialSkills: SkillPreview[] = [
  {
    id: "concise-writing",
    name: "Concise writing",
    description: "Rewrites, summarizes, and formats text using prompt-only guidance.",
    mode: "Prompt only",
    fit: "Excellent",
    enabled: true,
  },
  {
    id: "document-summary",
    name: "Document summary",
    description: "Summarizes a selected document with a bounded context window.",
    mode: "Read only",
    fit: "Good",
    enabled: true,
  },
  {
    id: "calendar-brief",
    name: "Calendar brief",
    description: "Turns a small set of retrieved events into a daily briefing.",
    mode: "One data source",
    fit: "Good",
    enabled: false,
  },
  {
    id: "repository-agent",
    name: "Repository agent",
    description: "Plans multi-file edits, shell commands, and longer coding workflows.",
    mode: "Multi-step",
    fit: "Cloud recommended",
    enabled: false,
  },
];

export function SkillsStudioPanel() {
  const [includeThirdParty, setIncludeThirdParty] = useState(true);
  const [workspaceRules, setWorkspaceRules] = useState(true);
  const [skills, setSkills] = useState(initialSkills);
  const [notice, setNotice] = useState<string | null>(null);

  const toggleSkill = (skillId: string, enabled: boolean) => {
    setSkills((current) => current.map((skill) => (
      skill.id === skillId ? { ...skill, enabled } : skill
    )));
  };

  return (
    <div className="grid gap-6">
      <StatusAlert>
        Preview only. These controls demonstrate the planned assistant-level Rules and Agent Skills workflow.
      </StatusAlert>

      <Panel>
        <SectionHeader
          eyebrow="Rules"
          title="Control the guidance this assistant receives"
          body="Rules remain lightweight: MiVA can attach short behavior guidance at runtime without loading every skill file into the model context."
          actions={<Badge tone="action">Local friendly</Badge>}
        />

        <div className="mt-6 divide-y divide-[var(--miva-border)] rounded-lg border border-[var(--miva-border)] bg-[var(--miva-bg-soft)] px-5">
          <label className="flex min-h-[84px] items-center justify-between gap-5 py-4">
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[var(--miva-text)]">Assistant workspace rules</span>
              <span className="mt-1 block text-sm leading-5 text-[var(--miva-text-muted)]">
                Apply this assistant's safety, tone, and tool-use rules to every conversation.
              </span>
            </span>
            <Switch checked={workspaceRules} onCheckedChange={setWorkspaceRules} />
          </label>
          <label className="flex min-h-[84px] items-center justify-between gap-5 py-4">
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[var(--miva-text)]">Include third-party skills</span>
              <span className="mt-1 block text-sm leading-5 text-[var(--miva-text-muted)]">
                Allow validated SKILL.md packages imported from outside MiVA.
              </span>
            </span>
            <Switch checked={includeThirdParty} onCheckedChange={setIncludeThirdParty} />
          </label>
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Skills"
          title="Installed capabilities"
          body="MiVA will expose names and short descriptions first. Full instructions load only when a skill is selected."
          actions={
            <SecondaryButton onClick={() => setNotice("Skill import is represented in this mockup. File validation and installation are not connected yet.")}>
              <span className="material-symbols-outlined text-[19px]">add</span>
              Import skill
            </SecondaryButton>
          }
        />

        {notice && <StatusAlert className="mt-5" tone="warning">{notice}</StatusAlert>}

        <div className="mt-6 divide-y divide-[var(--miva-border)] rounded-lg border border-[var(--miva-border)]">
          {skills.map((skill) => {
            const fitTone = skill.fit === "Excellent" ? "success" : skill.fit === "Good" ? "action" : "neutral";
            return (
              <div className="flex min-h-[108px] items-center gap-4 px-5 py-4" key={skill.id}>
                <IconTile tone={skill.fit === "Cloud recommended" ? "neutral" : "action"}>
                  <span className="material-symbols-outlined text-[21px]">
                    {skill.id === "repository-agent" ? "terminal" : "auto_awesome"}
                  </span>
                </IconTile>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--miva-text)]">{skill.name}</h3>
                    <Badge>{skill.mode}</Badge>
                    <Badge tone={fitTone}>{skill.fit}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[var(--miva-text-muted)]">{skill.description}</p>
                </div>
                <Switch
                  checked={skill.enabled}
                  disabled={!includeThirdParty && skill.id !== "concise-writing"}
                  onCheckedChange={(enabled) => toggleSkill(skill.id, enabled)}
                />
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="bg-[var(--miva-primary-surface)]">
        <div className="flex items-start gap-4">
          <IconTile>
            <span className="material-symbols-outlined text-[22px]">memory</span>
          </IconTile>
          <div>
            <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Best fit for small local models</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
              Prompt-only writing rules, bounded summaries, translation, structured extraction, and single-source read workflows work well. Multi-file coding agents and long autonomous plans should remain cloud-recommended.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
