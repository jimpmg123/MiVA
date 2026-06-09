import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Lock,
  Save,
  Share2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { AssistantProfile } from '../services/mivaApi';

type ShareVisibility = 'public' | 'unlisted';

type ShareDraft = {
  assistantProfileId: string;
  title: string;
  description: string;
  visibility: ShareVisibility;
  includes: {
    prompt: boolean;
    model: boolean;
    voice: boolean;
    character: boolean;
  };
  savedAt: string;
};

const SHARE_DRAFT_STORAGE_KEY = 'miva.web.persona-share-draft.v1';

const fieldClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-primary-container/20 transition focus:ring-4 dark:border-[#243044] dark:bg-[#172033] dark:text-slate-100';

function SectionCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-[#243044] dark:bg-[#111827] ${className}`}>
      {children}
    </section>
  );
}

function IncludeToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-[104px] items-start gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
        checked
          ? 'border-primary-container bg-primary-container/5 text-slate-900 dark:bg-primary-container/15 dark:text-slate-100'
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-[#243044] dark:bg-[#172033] dark:text-slate-300'
      }`}
    >
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-primary-container bg-primary-container text-white' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#111827]'}`}>
        {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
      </span>
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </button>
  );
}

export function PersonaSharePage({
  profiles,
  onBackToHub,
}: {
  profiles: AssistantProfile[];
  onBackToHub: () => void;
}) {
  const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ShareVisibility>('public');
  const [includes, setIncludes] = useState({
    prompt: true,
    model: true,
    voice: false,
    character: false,
  });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedProfileId((current) => (
      profiles.some((profile) => profile.id === current)
        ? current
        : profiles[0]?.id ?? ''
    ));
  }, [profiles]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  useEffect(() => {
    if (!selectedProfile) {
      return;
    }

    setTitle((current) => current || `${selectedProfile.name} preset`);
    setDescription((current) => current || selectedProfile.description || 'Reusable MiVA assistant preset.');
  }, [selectedProfile]);

  const previewTitle = title.trim() || selectedProfile?.name || 'Untitled preset';
  const previewDescription = description.trim() || selectedProfile?.description || 'No description yet.';
  const canSave = Boolean(selectedProfile && previewTitle.trim());

  const updateInclude = (key: keyof ShareDraft['includes'], checked: boolean) => {
    setIncludes((current) => ({ ...current, [key]: checked }));
    setSaveMessage(null);
  };

  const saveDraft = () => {
    if (!selectedProfile || !canSave) {
      return;
    }

    const draft: ShareDraft = {
      assistantProfileId: selectedProfile.id,
      title: previewTitle,
      description: previewDescription,
      visibility,
      includes,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(SHARE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setSaveMessage('Share draft saved locally. Server publishing will be connected after the preset schema is finalized.');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToHub}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-[#172033] dark:text-slate-300 dark:hover:bg-[#243044]"
              title="Back to Persona Hub"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="rounded-full bg-primary-container/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-primary-container">
              Persona Hub
            </span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Share an assistant preset
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Prepare a shareable preset from a synced assistant. Chat logs and provider keys are never included.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-[#172033] dark:text-slate-300 dark:ring-[#243044]"
        >
          <X className="h-4 w-4" />
          Close window
        </button>
      </div>

      {saveMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {profiles.length === 0 ? (
        <SectionCard>
          <div className="flex min-h-[320px] items-center justify-center text-center">
            <div className="max-w-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-100 text-slate-500 dark:bg-[#172033] dark:text-slate-300">
                <Share2 className="h-7 w-7" />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                No synced assistants available
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Sync an assistant from MiVA Desktop first, then return here to prepare a share preset.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 space-y-6 xl:col-span-7">
            <SectionCard>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container/10 text-primary-container">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">Preset source</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Choose the assistant profile that will become the preset.</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Assistant</span>
                  <select
                    value={selectedProfileId}
                    onChange={(event) => {
                      setSelectedProfileId(event.target.value);
                      setTitle('');
                      setDescription('');
                      setSaveMessage(null);
                    }}
                    className={fieldClass}
                  >
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.name}</option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Preset title</span>
                    <input
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setSaveMessage(null);
                      }}
                      className={fieldClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Visibility</span>
                    <select
                      value={visibility}
                      onChange={(event) => {
                        setVisibility(event.target.value as ShareVisibility);
                        setSaveMessage(null);
                      }}
                      className={fieldClass}
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setSaveMessage(null);
                    }}
                    className={`${fieldClass} min-h-[120px] resize-y leading-relaxed`}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-[#172033] dark:text-slate-300">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">Included preset data</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Select what other users can import into their own MiVA Desktop.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <IncludeToggle
                  checked={includes.prompt}
                  label="Prompt settings"
                  description="Persona, answer rules, language mode, and tool policy."
                  onChange={(checked) => updateInclude('prompt', checked)}
                />
                <IncludeToggle
                  checked={includes.model}
                  label="Model preference"
                  description="Provider and model recommendation. API keys are excluded."
                  onChange={(checked) => updateInclude('model', checked)}
                />
                <IncludeToggle
                  checked={includes.voice}
                  label="Voice settings"
                  description="TTS profile, speaking style, speed, and volume preferences."
                  onChange={(checked) => updateInclude('voice', checked)}
                />
                <IncludeToggle
                  checked={includes.character}
                  label="Character settings"
                  description="Display name, personality, and prepared Live2D metadata."
                  onChange={(checked) => updateInclude('character', checked)}
                />
              </div>
            </SectionCard>
          </div>

          <div className="col-span-12 space-y-6 xl:col-span-5">
            <SectionCard>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-white">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">Share preview</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This is the bundle card users will see later.</p>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-[#243044] dark:bg-[#172033]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words font-display text-xl font-bold text-slate-900 dark:text-slate-100">{previewTitle}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      {selectedProfile?.useCase || 'assistant'} / {selectedProfile?.localMode || 'hybrid'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-[#111827] dark:ring-[#243044]">
                    {visibility}
                  </span>
                </div>
                <p className="mt-4 break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">{previewDescription}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111827]">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Provider</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{selectedProfile?.provider || '-'}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 dark:bg-[#111827]">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Model</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{selectedProfile?.model || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <div className="flex gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="leading-relaxed">
                    Chat logs, OAuth tokens, provider API keys, and raw local files are excluded from share drafts.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!canSave}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-container/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  <Save className="h-4 w-4" />
                  Save draft
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-400 dark:bg-[#172033]"
                >
                  <Share2 className="h-4 w-4" />
                  Publish later
                </button>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </motion.div>
  );
}
