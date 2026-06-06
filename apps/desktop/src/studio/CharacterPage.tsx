import type { CharacterReactionMode, CharacterRendererId, PromptSettings } from "../types";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  Badge,
  Button,
  IconTile,
  Input,
  ModalBackdrop,
  ModalPanel,
  Panel,
  PrimaryButton,
  SecondaryButton,
  Select,
  Switch,
  Textarea,
} from "../components/ui";
import { characterAssetCatalog, type CharacterAsset } from "../features/characters/catalog";
import { defaultPromptSettings } from "../features/assistants/profile";
import { getLive2DRuntimeStatus, installLive2DRuntime } from "../features/characters/live2dRuntime";

type CharacterStudioPanelProps = {
  settings: PromptSettings;
  tauriRuntime: boolean;
  onPromptSettingsChange: (updater: (current: PromptSettings) => PromptSettings) => void;
};

type CharacterTextFieldKey = "displayName" | "userAddress" | "personality" | "speakingStyle" | "live2dModelPath";
type Live2DSetupStatus = "idle" | "checked" | "pending";
type Live2DInstallProgress = {
  status: string;
  completed: number;
  total: number;
  percent: number;
  done: boolean;
  error?: string | null;
};

type Live2DInstallResult = {
  installDir: string;
  modelBaseDir: string;
  coreScriptPath: string | null;
  installedModels: string[];
  totalSizeMb: number;
  ready: boolean;
};

const reactionModeCopy: Record<CharacterReactionMode, string> = {
  statusOnly: "Use app status only. The model should not invent expressions or motions.",
  aiCues: "Allow lightweight expression cues in text so Runtime can map them later.",
};

export function CharacterStudioPanel({ settings, tauriRuntime, onPromptSettingsChange }: CharacterStudioPanelProps) {
  const [focusedCharacterField, setFocusedCharacterField] = useState<CharacterTextFieldKey | null>(null);
  const [live2dSetupStatus, setLive2dSetupStatus] = useState<Live2DSetupStatus>("idle");
  const [live2dSetupNotice, setLive2dSetupNotice] = useState<string | null>(null);
  const [isInstallingLive2d, setIsInstallingLive2d] = useState(false);
  const [live2dInstallProgress, setLive2dInstallProgress] = useState<Live2DInstallProgress | null>(null);
  const [live2dRuntimeStatus, setLive2dRuntimeStatus] = useState<Live2DInstallResult | null>(null);
  const character = settings.character;
  const live2dModelCount = characterAssetCatalog.filter((preset) => preset.renderer === "live2d").length;
  const selectedLive2dReady = character.renderer === "live2d" && Boolean(character.live2dModelPath);
  const live2dRuntimeReady = live2dRuntimeStatus?.ready === true;
  const live2dRendererBadge = live2dRuntimeReady
    ? "Installed"
    : live2dSetupStatus === "checked"
      ? "Checked"
      : "Not installed";

  const updateCharacter = (updater: (current: PromptSettings["character"]) => PromptSettings["character"]) => {
    onPromptSettingsChange((current) => ({
      ...current,
      character: updater(current.character),
    }));
  };

  const selectPreset = (preset: CharacterAsset) => {
    updateCharacter((current) => ({
      ...current,
      characterId: preset.id,
      displayName: preset.name,
      renderer: preset.renderer,
      live2dModelPath: preset.live2dModelPath,
      personality: preset.personality,
      speakingStyle: preset.speakingStyle,
    }));
  };

  const characterFieldClass = (key: CharacterTextFieldKey, className = "") => {
    const isDefault = character[key] === defaultPromptSettings.character[key];
    return `${className} ${isDefault ? "text-[var(--miva-text-soft)]" : "text-[var(--miva-text)]"}`;
  };

  const getCharacterFieldValue = (key: CharacterTextFieldKey) => {
    if (focusedCharacterField === key && character[key] === defaultPromptSettings.character[key]) {
      return "";
    }

    return character[key];
  };

  const changeCharacterField = (key: CharacterTextFieldKey, nextValue: string) => {
    const defaultValue = defaultPromptSettings.character[key];
    if (character[key] === defaultValue && nextValue.startsWith(defaultValue)) {
      updateCharacter((current) => ({ ...current, [key]: nextValue.slice(defaultValue.length) }));
      return;
    }

    updateCharacter((current) => ({ ...current, [key]: nextValue }));
  };

  const blurCharacterField = (key: CharacterTextFieldKey, value: string) => {
    setFocusedCharacterField(null);
    if (!value.trim()) {
      updateCharacter((current) => ({ ...current, [key]: defaultPromptSettings.character[key] }));
    }
  };

  const checkBundledLive2dAssets = () => {
    setLive2dSetupStatus("checked");
    const sizeCopy = live2dRuntimeStatus?.totalSizeMb
      ? ` Current installed runtime size is ${live2dRuntimeStatus.totalSizeMb} MB.`
      : " Bundled model assets are about 19 MB before install.";
    setLive2dSetupNotice(`${live2dModelCount} bundled Live2D character profiles are registered. Select one below to prepare it for Runtime.${sizeCopy}`);
  };

  const prepareLive2dRuntimeInstall = async () => {
    if (!tauriRuntime) {
      setLive2dSetupNotice("Live2D installation must be run inside the MiVA Desktop app, not the browser preview.");
      return;
    }

    setIsInstallingLive2d(true);
    setLive2dInstallProgress({
      status: "Starting Live2D runtime install",
      completed: 0,
      total: 100,
      percent: 0,
      done: false,
      error: null,
    });
    setLive2dSetupNotice("Installing Live2D renderer, Cubism Core, and bundled model assets...");

    try {
      const result = await installLive2DRuntime();
      setLive2dRuntimeStatus(result);
      setLive2dSetupStatus("checked");
      setLive2dSetupNotice(`Live2D runtime installed at ${result.installDir}. ${result.installedModels.length} models are ready. Total size: ${result.totalSizeMb} MB.`);
    } catch (error) {
      const message = String(error);
      setLive2dSetupNotice(`Live2D runtime install failed: ${message}`);
      setLive2dInstallProgress((current) => ({
        status: "Install failed",
        completed: current?.completed ?? 0,
        total: current?.total ?? 100,
        percent: current?.percent ?? 0,
        done: true,
        error: message,
      }));
    } finally {
      setIsInstallingLive2d(false);
    }
  };

  useEffect(() => {
    if (!tauriRuntime) {
      return;
    }

    void getLive2DRuntimeStatus()
      .then((status) => {
        setLive2dRuntimeStatus(status);
        if (status.ready) {
          setLive2dSetupStatus("checked");
          setLive2dSetupNotice(`Live2D runtime is already installed. ${status.installedModels.length} models are ready. Total size: ${status.totalSizeMb} MB.`);
        }
      })
      .catch(() => undefined);

    let unlisten: (() => void) | undefined;
    void listen<Live2DInstallProgress>("live2d-install-progress", (event) => {
      setLive2dInstallProgress(event.payload);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      unlisten?.();
    };
  }, [tauriRuntime]);

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">2D character setup</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">Prepare Live2D for this device</h3>
            <p className="mt-2 max-w-[760px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Use this area as the user-facing install flow for downloaded builds. Bundled models can be checked now; the renderer installer button is separated so it can be wired to a Tauri command when the Live2D runtime is added.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone={live2dModelCount > 0 ? "success" : "neutral"}>{live2dModelCount} models</Badge>
            <Badge tone={selectedLive2dReady ? "action" : "neutral"}>{selectedLive2dReady ? "Selected model ready" : "Select Live2D model"}</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-[var(--miva-bg-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <IconTile>
                <span className="material-symbols-outlined text-[22px]">deployed_code</span>
              </IconTile>
              <Badge tone={live2dRuntimeReady ? "success" : live2dSetupStatus === "checked" ? "action" : "neutral"}>{live2dRendererBadge}</Badge>
            </div>
            <h4 className="mt-4 font-heading text-base font-bold text-[var(--miva-text)]">Live2D renderer</h4>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">Installs Pixi Live2D support, Cubism Core, and model files needed to load model3.json in Runtime.</p>
          </div>

          <div className="rounded-lg bg-[var(--miva-bg-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <IconTile tone="success">
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
              </IconTile>
              <Badge tone={live2dRuntimeStatus?.installedModels.length ? "success" : live2dModelCount > 0 ? "action" : "neutral"}>
                {live2dRuntimeStatus?.installedModels.length ? `${live2dRuntimeStatus.installedModels.length} installed` : live2dModelCount > 0 ? "Bundled" : "Missing"}
              </Badge>
            </div>
            <h4 className="mt-4 font-heading text-base font-bold text-[var(--miva-text)]">Character models</h4>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">Checks the built-in Live2D catalog so users can choose Mao, Shizuku, Knight, or Takodachi.</p>
          </div>

          <div className="rounded-lg bg-[var(--miva-bg-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <IconTile tone="warning">
                <span className="material-symbols-outlined text-[22px]">graphic_eq</span>
              </IconTile>
              <Badge>Planned</Badge>
            </div>
            <h4 className="mt-4 font-heading text-base font-bold text-[var(--miva-text)]">Voice lip sync</h4>
            <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">Reserved for the audio analyser bridge that drives mouth parameters while TTS is playing.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton disabled={isInstallingLive2d} onClick={() => void prepareLive2dRuntimeInstall()}>
            <span className="material-symbols-outlined text-[20px]">download</span>
            {isInstallingLive2d ? "Installing Live2D runtime" : live2dRuntimeReady ? "Reinstall Live2D runtime" : "Install Live2D runtime"}
          </PrimaryButton>
          <SecondaryButton onClick={checkBundledLive2dAssets}>
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            Check bundled models
          </SecondaryButton>
        </div>

        {live2dSetupNotice && (
          <div className="mt-5 rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] px-4 py-3 text-sm leading-6 text-[var(--miva-text-muted)]">
            {live2dSetupNotice}
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Character profile</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">Configure this assistant's visual persona</h3>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Choose the character identity, address style, and reaction policy that Runtime can use later. Actual Live2D rendering is prepared here, but not connected yet.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone={character.enabled ? "success" : "neutral"}>{character.enabled ? "Character on" : "Character off"}</Badge>
            <Badge tone={character.renderer === "live2d" ? "action" : "neutral"}>{character.renderer === "live2d" ? "Live2D prepared" : "Placeholder"}</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-lg bg-[var(--miva-bg-soft)] p-4">
            <span>
              <span className="block text-sm font-bold text-[var(--miva-text)]">Enable character for this assistant</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--miva-text-muted)]">Stores character settings with the assistant profile.</span>
            </span>
            <Switch checked={character.enabled} onCheckedChange={(checked) => updateCharacter((current) => ({ ...current, enabled: checked }))} />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-lg bg-[var(--miva-bg-soft)] p-4">
            <span>
              <span className="block text-sm font-bold text-[var(--miva-text)]">Show in Runtime</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--miva-text-muted)]">Runtime can decide whether to display a character panel later.</span>
            </span>
            <Switch checked={character.showInRuntime} onCheckedChange={(checked) => updateCharacter((current) => ({ ...current, showInRuntime: checked }))} />
          </label>

          <div className="rounded-lg border border-dashed border-[var(--miva-border)] bg-[var(--miva-bg-soft)] p-4 md:col-span-2">
            <p className="text-sm font-bold text-[var(--miva-text)]">Floating overlay window</p>
            <p className="mt-1 text-xs leading-5 text-[var(--miva-text-muted)]">
              In Runtime, use the picture-in-picture button on the character panel to open a transparent always-on-top window you can drag anywhere on screen.
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">Character selection</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-[var(--miva-text)]">Choose a character base</h3>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-[var(--miva-text-muted)]">
              Previews show each Live2D model in its assembled look. Install the Live2D runtime below to use them in Runtime.
            </p>
          </div>
          <Badge>{character.characterId}</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {characterAssetCatalog.map((preset) => {
            const active = character.characterId === preset.id;
            return (
              <Button
                className={`flex h-auto min-h-[188px] w-full flex-col items-stretch justify-start whitespace-normal rounded-lg border bg-[var(--miva-surface)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--miva-shadow-md)] ${
                  active ? "border-[var(--miva-primary)] ring-4 ring-[var(--miva-primary-soft)]" : "border-[var(--miva-border)] hover:border-[var(--miva-primary)]"
                }`}
                key={preset.id}
                onClick={() => selectPreset(preset)}
                variant="ghost"
              >
                <div className="flex items-start justify-between gap-4">
                  {preset.previewImage ? (
                    <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--miva-primary-soft)]">
                      <img
                        alt={`${preset.name} preview`}
                        className="h-full w-full object-contain p-1"
                        src={preset.previewImage}
                        style={preset.previewImagePosition ? { objectPosition: preset.previewImagePosition } : undefined}
                      />
                    </span>
                  ) : (
                    <IconTile>
                      <span className="material-symbols-outlined text-[22px]">{preset.icon}</span>
                    </IconTile>
                  )}
                  {active && <Badge tone="action">Selected</Badge>}
                </div>
                <h4 className="mt-5 font-heading text-lg font-bold text-[var(--miva-text)]">{preset.name}</h4>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">{preset.role}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--miva-text-muted)]">{preset.personality}</p>
              </Button>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="flex items-start gap-4">
            <IconTile>
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </IconTile>
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Persona details</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--miva-text-muted)]">These values are added to the assistant prompt when the character is enabled.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Character display name</span>
              <Input
                className={characterFieldClass("displayName")}
                value={getCharacterFieldValue("displayName")}
                onFocus={() => setFocusedCharacterField("displayName")}
                onBlur={(event) => blurCharacterField("displayName", event.target.value)}
                onChange={(event) => changeCharacterField("displayName", event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">How the character calls you</span>
              <Input
                className={characterFieldClass("userAddress")}
                placeholder="Example: call me Sinu, use casual Korean, or call me manager"
                value={getCharacterFieldValue("userAddress")}
                onFocus={() => setFocusedCharacterField("userAddress")}
                onBlur={(event) => blurCharacterField("userAddress", event.target.value)}
                onChange={(event) => changeCharacterField("userAddress", event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Personality</span>
              <Textarea
                className={characterFieldClass("personality", "min-h-[112px] resize-none")}
                value={getCharacterFieldValue("personality")}
                onFocus={() => setFocusedCharacterField("personality")}
                onBlur={(event) => blurCharacterField("personality", event.target.value)}
                onChange={(event) => changeCharacterField("personality", event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Speaking style</span>
              <Textarea
                className={characterFieldClass("speakingStyle", "min-h-[112px] resize-none")}
                value={getCharacterFieldValue("speakingStyle")}
                onFocus={() => setFocusedCharacterField("speakingStyle")}
                onBlur={(event) => blurCharacterField("speakingStyle", event.target.value)}
                onChange={(event) => changeCharacterField("speakingStyle", event.target.value)}
              />
            </label>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-4">
            <IconTile>
              <span className="material-symbols-outlined text-[22px]">motion_photos_auto</span>
            </IconTile>
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-bold text-[var(--miva-text)]">Runtime behavior</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--miva-text-muted)]">Prepare how the character will be interpreted by Runtime and future Live2D rendering.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Renderer</span>
              <Select
                value={character.renderer}
                onChange={(event) => updateCharacter((current) => ({ ...current, renderer: event.target.value as CharacterRendererId }))}
              >
                <option value="placeholder">Placeholder character</option>
                <option value="live2d">Live2D model path prepared</option>
              </Select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Live2D model path</span>
              <Input
                className={characterFieldClass("live2dModelPath")}
                placeholder="Add model3.json path later"
                value={getCharacterFieldValue("live2dModelPath")}
                onFocus={() => setFocusedCharacterField("live2dModelPath")}
                onBlur={(event) => blurCharacterField("live2dModelPath", event.target.value)}
                onChange={(event) => changeCharacterField("live2dModelPath", event.target.value)}
              />
              <span className="text-xs leading-5 text-[var(--miva-text-muted)]">This is stored for later. Runtime rendering is not connected in this step.</span>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">Reaction mode</span>
              <Select
                value={character.reactionMode}
                onChange={(event) => updateCharacter((current) => ({ ...current, reactionMode: event.target.value as CharacterReactionMode }))}
              >
                <option value="statusOnly">Status only</option>
                <option value="aiCues">AI reaction cues</option>
              </Select>
              <span className="text-xs leading-5 text-[var(--miva-text-muted)]">{reactionModeCopy[character.reactionMode]}</span>
            </label>

            <div className="rounded-lg bg-[var(--miva-bg-soft)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--miva-text-soft)]">Prepared later</p>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--miva-text-muted)]">
                <p>Idle, listening, thinking, speaking, and happy motion mapping.</p>
                <p>Character image previews and per-character asset import.</p>
                <p>Runtime position, size, and transparency controls.</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {(isInstallingLive2d || live2dInstallProgress?.error) && (
        <ModalBackdrop>
          <ModalPanel className="max-w-[420px]">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[var(--miva-primary-soft)] text-[var(--miva-primary)]">
                <span className={`material-symbols-outlined text-[24px] ${live2dInstallProgress?.error ? "" : "animate-spin"}`}>
                  {live2dInstallProgress?.error ? "error" : "progress_activity"}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--miva-text-soft)]">
                  {live2dInstallProgress?.error ? "Install failed" : "Installing"}
                </p>
                <h3 className="mt-1 font-heading text-lg font-bold text-[var(--miva-text)]">
                  {live2dInstallProgress?.error ? "Live2D runtime was not installed" : "Installing Live2D runtime"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--miva-text-muted)]">
                  {live2dInstallProgress?.status ?? "Preparing bundled character models for this device."}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--miva-text-soft)]">
                <span>Download progress</span>
                <span>{Math.round(live2dInstallProgress?.percent ?? 0)}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--miva-surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--miva-primary)] transition-[width] duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, live2dInstallProgress?.percent ?? 0))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--miva-text-muted)]">
                {live2dInstallProgress?.completed ?? 0} / {live2dInstallProgress?.total ?? 100} files
              </p>
            </div>

            <div className="mt-5 grid gap-3 rounded-lg bg-[var(--miva-bg-soft)] p-4 text-sm text-[var(--miva-text-muted)]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">sync</span>
                Checking Live2D renderer package
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">inventory_2</span>
                Checking bundled model assets
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--miva-primary)]">settings_applications</span>
                Preparing Runtime connection
              </div>
            </div>

            {live2dInstallProgress?.error && (
              <div className="mt-5 flex justify-end">
                <SecondaryButton onClick={() => setLive2dInstallProgress(null)}>Close</SecondaryButton>
              </div>
            )}
          </ModalPanel>
        </ModalBackdrop>
      )}
    </div>
  );
}
