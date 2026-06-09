import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  Database, 
  UserCircle, 
  Blocks, 
  AudioLines, 
  Settings, 
  Search, 
  Bell, 
  HelpCircle, 
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Bookmark,
  BarChart3,
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Moon,
  Sun,
  Plus,
  KeyRound,
  CreditCard,
  Infinity as InfinityIcon,
  Activity,
  CheckCircle2,
  CircleStop,
  Share2,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  Minus,
  X,
  Bot,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LandingPage } from './pages/LandingPage';
import { PersonaHubPage } from './pages/PersonaHubPage';
import { PersonaSharePage } from './pages/PersonaSharePage';
import { SavedAssistantsPage } from './pages/SavedAssistantsPage';
import {
  getSavedPresets,
  removeSavedPreset,
  toggleSavedPreset,
} from './services/personaLocal';
import type { SavedPreset } from './services/personaLocal';
import { LanguageToggle, useLocale } from './i18n/locale';
import { useTheme } from './i18n/theme';
import type { WebMessages } from './i18n/messages';
import {
  checkCloudApi,
  completeDesktopDeviceLogin,
  fetchJson,
  getAdminStats,
  getApiKeys,
  getAssistantProfiles,
  getUsageSummary,
  initialCloudState,
  login,
  loginWithGoogleCredential,
  patchAssistantProfile,
  recordUsageEvent,
  saveApiKey,
  saveGoogleWorkspaceToken,
  testApiKey,
} from './services/mivaApi';
import type {
  ApiKeyDraft,
  ApiKeyProviderId,
  ApiKeyRecord,
  AuthRole,
  AuthUser,
  CloudState,
  PersonaPreset,
  ProviderId,
} from './services/mivaApi';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: 'popup' | 'redirect';
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            },
          ) => void;
        };
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; scope?: string; expires_in?: number; error?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

// --- Types ---
type PageId = 'dashboard' | 'devices' | 'models' | 'profiles' | 'savedAssistants' | 'apiKeys' | 'usage' | 'billing' | 'integrations' | 'voice' | 'personaHub' | 'personaShare' | 'admin' | 'settings';
type ServiceStatus = 'checking' | 'connected' | 'offline';
type AuthState = {
  role: AuthRole;
  user: AuthUser | null;
  token: string | null;
};

const DESKTOP_BRIDGE_URL = (import.meta.env.VITE_DESKTOP_BRIDGE_URL as string | undefined)?.trim() || 'http://127.0.0.1:43111';
const LOCAL_HELPER_URL = (import.meta.env.VITE_LOCAL_HELPER_URL as string | undefined)?.trim() || 'http://127.0.0.1:43110';
const DEFAULT_MODEL_ID = 'qwen3:4b';

function clientDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  fetch(`${LOCAL_HELPER_URL}/debug/client-log`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'e45fd0',
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
function getLocalModelIconSrc(modelKey: string): string | null {
  const key = modelKey.toLowerCase();
  if (key.includes('qwen')) return '/images/qwen-icon.png';
  if (key.includes('exaone')) return '/images/exaone-icon.png';
  if (key.includes('llama')) return '/images/llama-icon.png';
  if (key.includes('gemma')) return '/images/gemma-icon.png';
  if (key.includes('gemini')) return '/images/gemini-icon.png';
  if (key.includes('gpt') || key.includes('openai')) return '/images/gpt-icon.png';
  return null;
}

function ModelCardIcon({ modelKey, className = 'w-6 h-6' }: { modelKey: string; className?: string }) {
  const src = getLocalModelIconSrc(modelKey);
  if (src) {
    return <img alt="" className={`object-contain ${className}`} src={src} />;
  }
  return <Database className={className} />;
}
const OPENAI_FALLBACK_ROUTE = {
  provider: 'openai' as const,
  model: 'gpt-4o-mini',
};
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GOOGLE_WORKSPACE_SCOPE = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
].join(' ');
const DESKTOP_APP_DOWNLOAD_URL = import.meta.env.VITE_DESKTOP_DOWNLOAD_URL as string | undefined;
const DEFAULT_DESKTOP_APP_DOWNLOAD_URL = '/downloads/MiVA-Desktop-setup.exe';

function resolveDesktopAppDownloadUrl() {
  return DESKTOP_APP_DOWNLOAD_URL?.trim() || DEFAULT_DESKTOP_APP_DOWNLOAD_URL;
}

function triggerDesktopAppDownload() {
  const downloadUrl = resolveDesktopAppDownloadUrl();
  const fileName = downloadUrl.split('/').filter(Boolean).pop() || 'MiVA-Desktop-setup.exe';
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const DesktopDownloadNotice = ({
  copy,
  visible,
  onDismiss,
}: {
  copy: WebMessages['desktopDownload'];
  visible: boolean;
  onDismiss: () => void;
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[120] border-b border-amber-200 bg-amber-50 px-4 py-4 shadow-md sm:px-6">
      <div className="mx-auto flex max-w-5xl items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-amber-950">{copy.noticeTitle}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900/90">{copy.noticeBody}</p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
          onClick={onDismiss}
          type="button"
        >
          <X className="h-4 w-4" />
          {copy.dismiss}
        </button>
      </div>
    </div>
  );
};

interface OllamaStatus {
  installed?: boolean;
  running?: boolean;
  version?: string;
  installedModelCount?: number;
  installedModels?: string[];
  baseUrl?: string;
  error?: string;
}

interface LocalModel {
  id: string;
  ollamaName: string;
  label: string;
  category?: string;
  summary?: string;
  recommendedRamGb?: number;
  installed?: boolean;
}

interface HardwareInfo {
  cpu?: {
    brand?: string;
    physical_cores?: number;
  };
  memory?: {
    total_gb?: number;
    available_gb?: number;
  };
  gpu?: {
    name?: string;
    vram_gb?: number;
  };
  disk?: {
    total_gb?: number;
    available_gb?: number;
  };
  os?: {
    name?: string;
    version?: string;
  };
}

interface ConnectionState {
  desktop: ServiceStatus;
  helper: ServiceStatus;
  ollama: OllamaStatus | null;
  catalog: LocalModel[];
  hardware: HardwareInfo | null;
  lastChecked: Date | null;
  error?: string;
}

interface WebConsoleActions {
  refreshConnection: () => Promise<void>;
  startOllama: () => Promise<void>;
  pullModel: (model: string) => Promise<void>;
  requestDeleteModel: (model: string) => void;
  confirmDeleteModel: (model: string) => Promise<void>;
}

type ModelDownloadDockMode = 'modal' | 'compact' | 'minimal';

interface ActionState {
  type: 'idle' | 'refreshing' | 'starting-ollama' | 'pulling-model' | 'deleting-model';
  message?: string;
  progress?: number;
  model?: string;
  paused?: boolean;
  completedBytes?: number;
  totalBytes?: number;
}

const initialConnection: ConnectionState = {
  desktop: 'checking',
  helper: 'checking',
  ollama: null,
  catalog: [],
  hardware: null,
  lastChecked: null,
};

const fallbackCatalog: LocalModel[] = [
  {
    id: 'qwen3-4b',
    ollamaName: 'qwen3:4b',
    label: 'Qwen3 4B',
    category: 'korean-recommended',
    summary: 'Default lightweight Korean/general assistant candidate.',
    recommendedRamGb: 12,
  },
  {
    id: 'llama3.2-3b',
    ollamaName: 'llama3.2:3b',
    label: 'Llama 3.2 3B',
    category: 'low-spec',
    summary: 'Small fallback model for low-spec PCs.',
    recommendedRamGb: 8,
  },
  {
    id: 'gemma3-4b',
    ollamaName: 'gemma3:4b',
    label: 'Gemma 3 4B',
    category: 'lightweight',
    summary: 'Lightweight general assistant candidate.',
    recommendedRamGb: 12,
  },
  {
    id: 'phi3-mini',
    ollamaName: 'phi3:mini',
    label: 'Phi-3 Mini',
    category: 'ultralight',
    summary: 'Very small fallback model for quick tests.',
    recommendedRamGb: 8,
  },
];

function statusLabel(status: ServiceStatus, shell?: WebMessages['shell']) {
  if (status === 'connected') return shell?.connected ?? 'Connected';
  if (status === 'checking') return shell?.checking ?? 'Checking';
  return shell?.offline ?? 'Offline';
}

function statusBadgeVariant(status: ServiceStatus): 'info' | 'success' | 'warning' | 'error' {
  if (status === 'connected') return 'success';
  if (status === 'checking') return 'warning';
  return 'error';
}

function formatRelativeTime(date: Date | null) {
  if (!date) return 'Not checked yet';
  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)} mins ago`;
}

function modelNamesMatch(left: string, right: string) {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }

  return a.startsWith(`${b}:`) || b.startsWith(`${a}:`);
}

function isModelInstalledOnDevice(model: LocalModel, connection: ConnectionState) {
  const installedModels = connection.ollama?.installedModels || [];
  return installedModels.some((name) => modelNamesMatch(name, model.ollamaName));
}

function applyDeletedModelToConnection(connection: ConnectionState, deletedModel: string): ConnectionState {
  const installedModels = (connection.ollama?.installedModels || []).filter(
    (name) => !modelNamesMatch(name, deletedModel),
  );

  return {
    ...connection,
    catalog: connection.catalog.map((item) =>
      modelNamesMatch(item.ollamaName, deletedModel) ? { ...item, installed: false } : item,
    ),
    ollama: connection.ollama
      ? {
          ...connection.ollama,
          installedModels,
          installedModelCount: installedModels.length,
        }
      : connection.ollama,
  };
}

function normalizeOllamaStatus(raw: OllamaStatus & { installed_models?: string[]; installed_model_count?: number }): OllamaStatus {
  return {
    ...raw,
    installedModels: raw.installedModels ?? raw.installed_models,
    installedModelCount: raw.installedModelCount ?? raw.installed_model_count ?? raw.installedModels?.length ?? raw.installed_models?.length,
  };
}

function getActiveModel(connection: ConnectionState) {
  const catalog = connection.catalog.length > 0 ? connection.catalog : fallbackCatalog;
  return catalog.find((model) => isModelInstalledOnDevice(model, connection) && model.ollamaName === DEFAULT_MODEL_ID)
    || catalog.find((model) => isModelInstalledOnDevice(model, connection))
    || catalog.find((model) => model.ollamaName === DEFAULT_MODEL_ID)
    || catalog[0];
}

interface NavItem {
  id: PageId;
  label: string;
  icon: any;
}

function buildNavItems(nav: WebMessages['nav']): NavItem[] {
  return [
    { id: 'dashboard', label: nav.dashboard, icon: LayoutDashboard },
    { id: 'devices', label: nav.devices, icon: Cpu },
    { id: 'models', label: nav.models, icon: Database },
    { id: 'profiles', label: nav.profiles, icon: UserCircle },
    { id: 'apiKeys', label: nav.apiKeys, icon: KeyRound },
    { id: 'usage', label: nav.usage, icon: Activity },
    { id: 'billing', label: nav.billing, icon: CreditCard },
    { id: 'integrations', label: nav.integrations, icon: Blocks },
    { id: 'voice', label: nav.voice, icon: AudioLines },
    { id: 'personaHub', label: nav.personaHub, icon: Share2 },
    { id: 'admin', label: nav.admin, icon: BarChart3 },
    { id: 'settings', label: nav.settings, icon: Settings },
  ];
}

const authStorageKey = 'miva.web.auth.v1';

const pageParamMap: Record<string, PageId> = {
  dashboard: 'dashboard',
  devices: 'devices',
  models: 'models',
  profiles: 'profiles',
  savedAssistants: 'savedAssistants',
  'saved-assistants': 'savedAssistants',
  apiKeys: 'apiKeys',
  usage: 'usage',
  billing: 'billing',
  integrations: 'integrations',
  voice: 'voice',
  personaHub: 'personaHub',
  'persona-hub': 'personaHub',
  personaShare: 'personaShare',
  'persona-share': 'personaShare',
  admin: 'admin',
  settings: 'settings',
};

// Canonical URL slug for each page. Used when writing `?page=` so every screen
// has its own distinct, shareable address (e.g. ?page=billing, ?page=persona-hub).
const pageToSlug: Record<PageId, string> = {
  dashboard: 'dashboard',
  devices: 'devices',
  models: 'models',
  profiles: 'profiles',
  savedAssistants: 'saved-assistants',
  apiKeys: 'apiKeys',
  usage: 'usage',
  billing: 'billing',
  integrations: 'integrations',
  voice: 'voice',
  personaHub: 'persona-hub',
  personaShare: 'persona-share',
  admin: 'admin',
  settings: 'settings',
};

// Build the address for a given page, preserving any other query params/hash.
// The dashboard is the default screen and keeps a clean URL (no `page` param).
function buildPageHref(page: PageId): string {
  const url = new URL(window.location.href);
  if (page === 'dashboard') {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', pageToSlug[page]);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function getInitialPage(): PageId {
  try {
    const page = new URLSearchParams(window.location.search).get('page');
    if (page && pageParamMap[page]) {
      return pageParamMap[page];
    }
  } catch {
    // Fall back to the dashboard.
  }

  return 'dashboard';
}

function getPostLoginPage(role: AuthRole): PageId {
  if (role === 'admin') {
    return 'admin';
  }

  const requestedPage = getInitialPage();
  return requestedPage === 'admin' ? 'dashboard' : requestedPage;
}

function getDesktopLoginRequest() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const deviceCode = params.get('deviceCode');
  if (params.get('desktopLogin') !== '1' || !deviceCode) {
    return null;
  }

  return {
    deviceCode,
    userCode: params.get('userCode') || '',
  };
}

function getWorkspaceConsentRequest() {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('workspaceConsent') === '1';
}

// --- Sub-components ---

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Badge = ({ children, variant = 'info' }: { children: React.ReactNode, variant?: 'info' | 'success' | 'warning' | 'error' | 'active' }) => {
  const styles = {
    info: 'bg-slate-100 text-slate-500',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    active: 'bg-primary-container text-white',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[variant]}`}>
      {children}
    </span>
  );
};

const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`miva-card ${className}`}>
    {children}
  </div>
);

function formatDownloadBytes(value?: number) {
  if (!value || value <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? size.toFixed(1) : size.toFixed(2)} ${units[unitIndex]}`;
}

const ModelDownloadFloatingCard = ({
  action,
  dockMode,
  showCancelConfirm,
  onConfirmCancel,
  onDismissCancelConfirm,
  onRequestCancel,
  onMinimize,
  onExpand,
  onCollapse,
  onPause,
  onResume,
}: {
  action: ActionState;
  dockMode: ModelDownloadDockMode;
  showCancelConfirm: boolean;
  onConfirmCancel: () => void;
  onDismissCancelConfirm: () => void;
  onRequestCancel: () => void;
  onMinimize: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onPause: () => void;
  onResume: () => void;
}) => {
  if (action.type !== 'pulling-model') {
    return null;
  }

  const progress = typeof action.progress === 'number' ? action.progress : 0;
  const isPaused = Boolean(action.paused);
  const isActive = !isPaused;

  if (dockMode === 'minimal') {
    return (
      <button
        className="pointer-events-auto fixed bottom-8 right-8 z-[100] rounded-full bg-primary-container px-3 py-2 text-xs font-black text-white shadow-2xl transition hover:opacity-90"
        onClick={onExpand}
        type="button"
      >
        {progress}%
      </button>
    );
  }

  return (
    <div className={`pointer-events-auto fixed z-[100] ${dockMode === 'compact' ? 'bottom-8 right-8 w-[min(calc(100vw-2rem),320px)]' : 'inset-0 flex items-center justify-center bg-slate-900/35 p-4'}`}>
      {showCancelConfirm && (
        <div className={`${dockMode === 'compact' ? 'mb-3' : 'absolute bottom-6 right-6 w-[min(calc(100vw-2rem),320px)]'} rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl`}>
          <p className="text-sm font-bold text-slate-900">Stop this download?</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">
            This cancels the download and removes any partial files that were already received.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100" onClick={onDismissCancelConfirm} type="button">
              Keep downloading
            </button>
            <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600 active:scale-[0.98]" onClick={onConfirmCancel} type="button">
              Stop download
            </button>
          </div>
        </div>
      )}

      <Card className={`border-primary-container/15 shadow-2xl shadow-primary-container/10 ${dockMode === 'compact' ? 'p-4' : 'w-[min(calc(100vw-2rem),520px)] p-6'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{action.model}</p>
            <p className="mt-1 truncate text-lg font-bold text-slate-900">{isPaused ? 'Download paused' : 'Downloading model'}</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{action.message || action.model}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={dockMode === 'compact' ? onExpand : onMinimize}
              type="button"
            >
              {dockMode === 'compact' ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            {dockMode === 'compact' && (
              <button className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={onCollapse} type="button">
                <Minus className="h-4 w-4" />
              </button>
            )}
            <span className="text-lg font-black text-primary-container">{progress}%</span>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary-container transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {dockMode === 'modal' && (
          <div className="mt-5 grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0 overflow-hidden rounded-2xl bg-slate-50 px-4 py-3">
              <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">Downloaded</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-800">{formatDownloadBytes(action.completedBytes)}</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl bg-slate-50 px-4 py-3">
              <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">Download size</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-800">{formatDownloadBytes(action.totalBytes)}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={isPaused ? onResume : onPause}
            type="button"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:border-red-200 hover:bg-red-100 active:scale-[0.98]"
            onClick={onRequestCancel}
            type="button"
          >
            <CircleStop className="h-4 w-4" />
            Stop
          </button>
        </div>
      </Card>
    </div>
  );
};

// --- Pages ---

const DashboardPage = ({ connection, action, actions }: { connection: ConnectionState; action: ActionState; actions: WebConsoleActions }) => {
  const activeModel = getActiveModel(connection);
  const installedCount = connection.ollama?.installedModelCount ?? connection.ollama?.installedModels?.length ?? 0;
  const ollamaServiceStatus: ServiceStatus = connection.ollama
    ? connection.ollama.running
      ? 'connected'
      : 'offline'
    : 'checking';
  const healthItems = [
    { name: 'MiVA Desktop', status: statusLabel(connection.desktop), state: connection.desktop, icon: Cpu },
    { name: 'Local Helper', status: statusLabel(connection.helper), state: connection.helper, icon: TerminalIcon },
    { name: 'Ollama Engine', status: connection.ollama?.running ? 'Running' : connection.ollama?.installed ? 'Stopped' : 'Not Found', state: ollamaServiceStatus, icon: Database },
  ];

  return (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-3xl font-bold font-display tracking-tight">Dashboard</h2>
        <p className="text-slate-500 mt-1">System operational. Last checked: {formatRelativeTime(connection.lastChecked)}.</p>
      </div>
      <div className="flex gap-3">
        <button className="px-5 py-2.5 bg-slate-100 text-primary-container font-semibold rounded-xl hover:bg-slate-200 transition-all active:scale-[0.98]">
          Open setup guide
        </button>
        <button
          onClick={actions.refreshConnection}
          disabled={action.type === 'refreshing'}
          className="px-5 py-2.5 bg-primary-container text-white font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] shadow-md shadow-primary-container/20 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${action.type === 'refreshing' ? 'animate-spin' : ''}`} />
          Refresh connection
        </button>
      </div>
    </div>

    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12 lg:col-span-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold font-display">System Health</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Status</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {healthItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-primary-container/20 transition-all">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm text-primary-container">
                <item.icon className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800">{item.name}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.state === 'connected' ? 'bg-green-500 status-glow' : item.state === 'checking' ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                <span className={`text-sm font-medium ${item.state === 'connected' ? 'text-green-600' : item.state === 'checking' ? 'text-amber-600' : 'text-red-600'}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      </Card>

      <Card className="col-span-12 lg:col-span-4">
        <h3 className="text-xl font-bold font-display mb-6">Inventory Summary</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-500">
                <Database className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-700">Models Installed</p>
            </div>
            <p className="text-xl font-bold text-slate-900">{installedCount}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Active Model</p>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-primary-container">
                <UserCircle className="w-5 h-5" />
                <p className="font-bold text-slate-800">{activeModel?.label || 'No model selected'}</p>
              </div>
              <Badge variant={connection.ollama?.running ? 'active' : 'warning'}>{connection.ollama?.running ? 'Loaded' : 'Pending'}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-7">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold font-display">Active Assistant</h3>
        </div>
        <div className="flex items-start gap-6 p-6 bg-primary-container/5 rounded-2xl border border-primary-container/10">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-white shadow-lg shadow-primary-container/25">
            <Bot className="h-10 w-10" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-xl font-bold text-slate-900">General Assistant</h4>
              <Badge variant={connection.ollama?.running ? 'active' : 'warning'}>{connection.ollama?.running ? 'Active' : 'Waiting'}</Badge>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Versatile assistant optimized for daily tasks, coding support, and knowledge retrieval using {activeModel?.label || 'a local model'}.
            </p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white rounded-full border border-slate-200 text-xs font-medium text-slate-600">Local Only</span>
              <span className="px-3 py-1 bg-white rounded-full border border-slate-200 text-xs font-medium text-slate-600">Zero-Latency</span>
              <span className="px-3 py-1 bg-white rounded-full border border-slate-200 text-xs font-medium text-slate-600">Privacy-First</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="col-span-12 md:col-span-5 flex flex-col">
        <h3 className="text-xl font-bold font-display mb-6">Recent Events</h3>
        <div className="space-y-4 flex-1">
          {[
            { title: connection.desktop === 'connected' ? 'Desktop Bridge Verified' : 'Desktop Bridge Waiting', time: formatRelativeTime(connection.lastChecked), desc: 'MiVA Desktop Handshake', color: connection.desktop === 'connected' ? 'bg-green-500' : 'bg-amber-400' },
            { title: connection.ollama?.running ? 'Ollama Running' : 'Ollama Not Running', time: formatRelativeTime(connection.lastChecked), desc: activeModel?.ollamaName || 'No active model', color: connection.ollama?.running ? 'bg-primary-container' : 'bg-slate-300' },
            { title: action.message || 'Web Console Ready', time: 'Now', desc: 'Local management UI', color: action.type === 'idle' ? 'bg-slate-300' : 'bg-primary-container' },
          ].map((event, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-px h-full bg-slate-100 relative">
                <div className={`absolute top-1 -left-1 w-2 h-2 rounded-full ${event.color}`}></div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{event.title}</p>
                <p className="text-xs text-slate-500">{event.time} • {event.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button className="mt-6 w-full py-3 border border-slate-200 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors">
          View Full Logs
        </button>
      </Card>
    </div>
  </motion.div>
  );
};

const DevicesPage = ({ connection, actions }: { connection: ConnectionState; actions: WebConsoleActions }) => {
  const hardware = connection.hardware;
  const specs = [
    { label: 'OS', val: hardware?.os?.name ? `${hardware.os.name} ${hardware.os.version || ''}`.trim() : 'Waiting for desktop app' },
    { label: 'CPU', val: hardware?.cpu?.brand || 'Unknown CPU' },
    { label: 'RAM', val: hardware?.memory?.total_gb ? `${hardware.memory.total_gb}GB` : 'Unknown RAM' },
    { label: 'GPU', val: hardware?.gpu?.name || 'Unknown GPU' },
  ];
  const storagePct = hardware?.disk?.total_gb
    ? Math.max(0, Math.min(100, Math.round(((hardware.disk.total_gb - (hardware.disk.available_gb || 0)) / hardware.disk.total_gb) * 100)))
    : 0;

  return (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
    <div>
      <h2 className="text-3xl font-bold font-display tracking-tight">Hardware Visibility</h2>
      <p className="text-slate-500 mt-1">Manage your local computational resources and AI performance metrics.</p>
    </div>

    <div className="grid grid-cols-12 gap-8">
      <Card className="col-span-12 lg:col-span-8 p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-primary-container">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-display text-slate-900">{hardware?.os?.name || 'This PC'}</h3>
              <p className="text-slate-500">Primary local computation node</p>
            </div>
          </div>
          <Badge>Local Device</Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 border-b border-slate-100 pb-8">
          {specs.map((spec, i) => (
            <div key={i} className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{spec.label}</span>
              <p className="font-semibold text-slate-800">{spec.val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-transparent hover:border-primary-container/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary-container" />
                <span className="font-semibold text-sm">Ollama Status</span>
              </div>
              <Badge variant={connection.ollama?.running ? 'success' : 'warning'}>{connection.ollama?.running ? 'Running' : 'Stopped'}</Badge>
            </div>
            <p className="text-xs text-slate-500 mb-2">Installed Models: {connection.ollama?.installedModelCount ?? connection.ollama?.installedModels?.length ?? 0}</p>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full bg-primary-container ${connection.ollama?.running ? 'w-3/4' : 'w-1/4'}`}></div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-transparent hover:border-primary-container/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary-container" />
                <span className="font-semibold text-sm">Storage</span>
              </div>
              <span className="text-xs font-medium text-slate-600">{storagePct}% Full</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">{hardware?.disk?.available_gb ?? '--'}GB Available / {hardware?.disk?.total_gb ?? '--'}GB Total</p>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary-container" style={{ width: `${storagePct}%` }}></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="col-span-12 lg:col-span-4 space-y-8">
        <div className="bg-primary-container text-white p-8 rounded-3xl relative overflow-hidden group">
          <div className="relative z-10">
            <ShieldCheck className="w-10 h-10 mb-4" />
            <h4 className="text-xl font-bold font-display mb-2">Hardware Ready</h4>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">
              MiVA reads this device locally and uses the result to recommend lightweight models.
            </p>
            <button onClick={actions.refreshConnection} className="bg-white text-primary-container px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors shadow-lg">
              Refresh Hardware
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform"></div>
        </div>

        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center py-12">
          <RefreshCw className="w-12 h-12 text-slate-300 mb-4" />
          <h4 className="text-slate-400 font-bold mb-1">Future Multi-device sync</h4>
          <p className="text-slate-400 text-xs max-w-[200px]">Coming soon: Synchronize your AI profiles across multiple local nodes.</p>
        </div>
      </div>

      <Card className="col-span-12 overflow-hidden px-0 py-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-lg font-bold font-display text-slate-900">Resource Utilization</h4>
          <button className="text-sm font-semibold text-primary-container hover:underline">View History</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Resource</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Process</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usage</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Temp</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { res: 'NPU Accelerator', proc: 'Inference Core V2', usage: '45%', temp: '42°C', status: 'Optimized' },
                { res: 'GPU Compute', proc: 'Metal Performance Shaders', usage: '88%', temp: '56°C', status: 'Active' },
                { res: 'Unified Memory', proc: 'System Buffers', usage: '19.2 GB', temp: '--', status: 'Stable' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 flex items-center gap-3">
                    <Database className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{row.res}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-600 text-sm">{row.proc}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-container" style={{ width: row.usage.includes('%') ? row.usage : '30%' }}></div>
                      </div>
                      <span className="text-xs font-bold">{row.usage}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-600 text-sm">{row.temp}</td>
                  <td className="px-8 py-5">
                    <span className="px-2.5 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-wider">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </motion.div>
  );
};

const ModelDeleteConfirmCard = ({
  copy,
  modelName,
  modelLabel,
  onConfirm,
  onDismiss,
}: {
  copy: WebMessages['models'];
  modelName: string;
  modelLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) => (
  <div
    className="rounded-2xl border border-red-100 bg-white p-5 shadow-xl"
    onClick={(event) => event.stopPropagation()}
  >
    <p className="text-sm font-bold text-slate-900">{copy.deleteConfirmTitle}</p>
    <p className="mt-2 text-xs leading-6 text-slate-500">
      <span className="font-semibold text-slate-700">{modelLabel}</span>
      <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{modelName}</code>
      {copy.deleteConfirmBody}
    </p>
    <div className="mt-4 flex justify-end gap-2">
      <button
        className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        onClick={onDismiss}
        type="button"
      >
        {copy.cancel}
      </button>
      <button
        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600 active:scale-[0.98]"
        onClick={onConfirm}
        type="button"
      >
        {copy.delete}
      </button>
    </div>
  </div>
);

const ModelsPage = ({
  connection,
  action,
  actions,
  pendingDeleteModel,
  onDismissDelete,
}: {
  connection: ConnectionState;
  action: ActionState;
  actions: WebConsoleActions;
  pendingDeleteModel: string | null;
  onDismissDelete: () => void;
}) => {
  const { copy } = useLocale();
  const catalog = connection.catalog.length > 0 ? connection.catalog : fallbackCatalog;
  const activeModel = getActiveModel(connection);
  const installedCount = catalog.filter((model) => isModelInstalledOnDevice(model, connection)).length;
  const ramTotal = connection.hardware?.memory?.total_gb;
  const helperReady = connection.helper === 'connected';
  const canDeleteModels = helperReady || connection.desktop === 'connected';
  const isBusy = action.type === 'starting-ollama' || action.type === 'pulling-model' || action.type === 'deleting-model';

  return (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
    <div className="flex justify-between items-end">
      <div>
        <span className="text-primary-container font-bold text-xs uppercase tracking-widest block mb-1">Recommended Choice</span>
        <h2 className="text-4xl font-extrabold font-display tracking-tight">Prime Assistant</h2>
        {(connection.desktop !== 'connected' || connection.helper !== 'connected') && (
          <p className="mt-2 text-sm font-semibold text-amber-700">
            MiVA Desktop must be running to download local models from the web console.
          </p>
        )}
      </div>
      <button
        onClick={actions.refreshConnection}
        className="px-5 py-2.5 bg-slate-100 text-primary-container font-semibold rounded-xl hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${action.type === 'refreshing' ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>

    {action.message && action.type !== 'pulling-model' && action.type !== 'refreshing' && (
      <Card className={`p-5 ${action.type === 'idle' && action.message.toLowerCase().includes('failed') ? 'border-red-100 bg-red-50/40' : 'border-primary-container/10'}`}>
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              {action.type === 'idle' ? 'Status' : action.type.replace('-', ' ')}
            </p>
            <p className="font-bold text-slate-800 mt-1">{action.message}</p>
          </div>
        </div>
      </Card>
    )}

    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-8 h-[380px] group relative rounded-[32px] overflow-hidden shadow-2xl">
         <img src="/images/ai-background.png" alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent p-12 flex flex-col justify-center text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-white/10">Default Model</span>
              <span className={`flex items-center gap-1 text-xs font-bold ${activeModel && isModelInstalledOnDevice(activeModel, connection) ? 'text-green-400' : 'text-amber-300'}`}>
                <RefreshCw className="w-3 h-3" /> {activeModel && isModelInstalledOnDevice(activeModel, connection) ? 'Installed' : 'Available'}
              </span>
            </div>
            <h3 className="text-5xl font-black mb-2">{activeModel?.label || 'Qwen3 4B'}</h3>
            <p className="text-slate-300 max-w-sm text-sm mb-8 leading-relaxed">{activeModel?.summary || 'Optimized lightweight local assistant for Korean and general use.'}</p>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => activeModel?.ollamaName && actions.pullModel(activeModel.ollamaName)}
                disabled={isBusy || !connection.ollama?.running || (activeModel ? isModelInstalledOnDevice(activeModel, connection) : false)}
                className="bg-white text-slate-900 px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl hover:bg-slate-50 disabled:opacity-60 disabled:active:scale-100"
              >
                <Download className="w-4 h-4" /> {activeModel && isModelInstalledOnDevice(activeModel, connection) ? 'Ready' : 'Download Model'}
              </button>
              <div className="text-xs text-white/70">
                <p className="font-bold text-white">{activeModel?.ollamaName || DEFAULT_MODEL_ID}</p>
                <p>Requires {activeModel?.recommendedRamGb || 8}GB RAM</p>
              </div>
            </div>
         </div>
      </div>

      <Card className="col-span-12 lg:col-span-4 bg-white rounded-[32px] p-8 flex flex-col justify-between">
         <div className="space-y-6">
            <div className="w-14 h-14 bg-primary-container/10 rounded-2xl flex items-center justify-center text-primary-container">
               <Cpu className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-2xl font-bold font-display">Ollama Engine</h4>
              <p className="text-slate-500 text-sm leading-relaxed mt-2">
                Required runtime for downloading and running local models from this browser console.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-4">
                <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Install</span>
                <Badge variant={connection.ollama?.installed ? 'success' : 'error'}>{connection.ollama?.installed ? 'Found' : 'Missing'}</Badge>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Runtime</span>
                <Badge variant={connection.ollama?.running ? 'success' : 'warning'}>{connection.ollama?.running ? 'Running' : 'Stopped'}</Badge>
              </div>
            </div>
         </div>
         <div className="mt-8 space-y-3">
            <button
              onClick={actions.startOllama}
              disabled={isBusy || !connection.ollama?.installed || connection.ollama?.running}
              className="w-full bg-primary-container text-white px-5 py-3.5 rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {connection.ollama?.running ? 'Ollama Running' : 'Start Ollama'}
            </button>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {connection.ollama?.version || connection.ollama?.error || 'Waiting for local helper status.'}
            </p>
         </div>
      </Card>

      <div className="col-span-12 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-bold font-display flex items-center gap-3 tracking-tight">
            <Database className="w-6 h-6 text-slate-400" />
            Local Model Catalog
          </h2>
          <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">{installedCount} Installed</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {catalog.map((model) => {
             const installed = isModelInstalledOnDevice(model, connection);
             const active = activeModel?.ollamaName === model.ollamaName;
             const deletePending = pendingDeleteModel === model.ollamaName;

             return (
             <Card key={model.id || model.ollamaName} className="group hover:shadow-xl transition-all p-8 relative">
               <div className="flex justify-between items-start mb-8">
                 <div className="flex gap-4">
                   <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary-container/10 group-hover:text-primary-container transition-colors overflow-hidden">
                     <ModelCardIcon className="w-9 h-9" modelKey={model.ollamaName || model.id || model.label} />
                   </div>
                   <div>
                     <h4 className="font-bold text-xl text-slate-900">{model.label}</h4>
                     <code className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded mt-1 inline-block">{model.ollamaName}</code>
                   </div>
                 </div>
                 {active ? <Badge variant="success">Recommended</Badge> : installed ? <Badge variant="active">Installed</Badge> : <Badge>Available</Badge>}
               </div>
               <p className="text-sm text-slate-500 leading-relaxed mb-8 min-h-10">{model.summary}</p>
               <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-50 p-4 rounded-2xl">
                   <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">RAM Req.</span>
                   <span className="text-sm font-bold text-slate-700">{model.recommendedRamGb || 8}GB</span>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl">
                   <span className="block text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">PC RAM</span>
                   <span className="text-sm font-bold text-slate-700">{ramTotal ? `${ramTotal}GB` : 'Unknown'}</span>
                 </div>
               </div>
               <div className="flex gap-3">
                 <button
                   onClick={() => actions.pullModel(model.ollamaName)}
                   disabled={isBusy || installed || !connection.ollama?.running}
                   className="flex-1 bg-secondary-container text-primary-container px-4 py-3 rounded-2xl text-sm font-bold hover:bg-primary-container hover:text-white transition-all shadow-sm disabled:opacity-50 disabled:hover:bg-secondary-container disabled:hover:text-primary-container"
                 >
                   {installed ? 'Installed' : 'Download'}
                 </button>
                 <button
                   className="px-4 py-3 rounded-2xl border border-slate-100 text-slate-400 transition-all hover:border-transparent hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                   disabled={!installed || isBusy || !canDeleteModels}
                   onClick={() => actions.requestDeleteModel(model.ollamaName)}
                   title={
                     !canDeleteModels
                       ? 'MiVA Desktop or local helper must be running to delete models'
                       : installed
                         ? 'Delete model'
                         : 'Model is not installed'
                   }
                   type="button"
                 >
                   <Trash2 className="w-5 h-5" />
                 </button>
               </div>
               {deletePending && (
                 <div className="absolute inset-x-6 bottom-6">
                   <ModelDeleteConfirmCard
                     copy={copy.models}
                     modelLabel={model.label}
                     modelName={model.ollamaName}
                     onConfirm={() => void actions.confirmDeleteModel(model.ollamaName)}
                     onDismiss={onDismissDelete}
                   />
                 </div>
               )}
             </Card>
             );
           })}
        </div>
      </div>
    </div>
    {action.type !== 'pulling-model' && (
      <button className="fixed bottom-8 right-8 z-40 flex items-center gap-3 rounded-3xl bg-primary-container px-6 py-4 font-bold text-white opacity-70 shadow-2xl transition-all hover:scale-105 active:scale-95" title="Custom model support will be added later" type="button">
        <Plus className="h-6 w-6" /> Add Custom Model
      </button>
    )}
  </motion.div>
  );
};

const MyAssistantsPage = ({
  cloud,
  onRefreshCloud,
}: {
  cloud: CloudState;
  onRefreshCloud: () => Promise<void>;
}) => {
  const profiles = cloud.profiles;
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const activeProfile = profiles.find((profile) => profile.id === selectedProfileId)
    || profiles.find((profile) => profile.isDefault)
    || profiles[0];

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId(null);
      return;
    }

    if (selectedProfileId && profiles.some((profile) => profile.id === selectedProfileId)) {
      return;
    }

    setSelectedProfileId((profiles.find((profile) => profile.isDefault) || profiles[0]).id);
  }, [profiles, selectedProfileId]);

  const promptSettings = activeProfile?.prompt?.settings;
  const defaultCoding = {
    capability: 'chatOnly',
    providerPolicy: 'localAllowed',
    localExperimental: false,
    accessMode: 'readOnly',
    workspaceAllowlistRequired: false,
  };
  const getCodingSettings = (profile = activeProfile) => profile?.prompt?.settings?.coding
    || profile?.capabilities?.coding
    || defaultCoding;
  const codingSettings = getCodingSettings(activeProfile);
  const codingCapabilityLabel = (capability?: string) => {
    if (capability === 'codeExplain') return 'Code explanation';
    if (capability === 'codeEdit') return 'Code editing';
    if (capability === 'clawCode') return 'Claw Code';
    return 'Chat only';
  };
  const codingProviderPolicyLabel = (policy?: string) => {
    if (policy === 'cloudRequired') return 'Cloud API required';
    if (policy === 'cloudRecommended') return 'Cloud recommended';
    return 'Local allowed';
  };
  const codingAccessModeLabel = (accessMode?: string) => {
    if (accessMode === 'fileEdits') return 'File edits';
    if (accessMode === 'shellCommands') return 'Shell commands';
    return 'Read-only';
  };
  const scheduleModeLabel = promptSettings?.scheduleRules.mode === 'confirmBeforeAction'
    ? 'Confirm before action'
    : promptSettings?.scheduleRules.mode === 'connectedActions'
      ? 'Connected actions'
      : 'Draft only';
  const workspacePolicyLabel = promptSettings?.workspaceRules.googleWorkspace === 'askFirst'
    ? 'Ask first'
    : promptSettings?.workspaceRules.googleWorkspace === 'connectedOnly'
      ? 'Connected only'
      : 'Disabled';
  const sourceLabel = (source?: string) => {
    if (source === 'desktop-setup') return 'Desktop Sync';
    if (source === 'web-console') return 'Web Console';
    return source || 'Unknown';
  };
  const enabledFeatures = activeProfile
    ? [
      { label: 'Use case', value: activeProfile.useCase || 'daily' },
      { label: 'Answer style', value: activeProfile.answerStyle || 'moderate' },
      { label: 'Priority', value: activeProfile.priority || 'balanced' },
      { label: 'Language', value: activeProfile.languageUse || 'korean' },
      { label: 'Runtime mode', value: activeProfile.localMode || 'local' },
      { label: 'Provider', value: activeProfile.provider || 'ollama' },
      { label: 'Model', value: activeProfile.model || 'qwen3:4b' },
      { label: 'Coding', value: codingCapabilityLabel(codingSettings.capability) },
      { label: 'Tool policy', value: codingProviderPolicyLabel(codingSettings.providerPolicy) },
      { label: 'Tool access', value: codingAccessModeLabel(codingSettings.accessMode) },
      { label: 'Schedule', value: scheduleModeLabel },
      { label: 'Workspace', value: workspacePolicyLabel },
      ...((activeProfile.futureFeatures || []).map((feature) => ({ label: 'Future feature', value: feature }))),
    ]
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
                My Assistants
            </h2>
            <p className="text-slate-500 mt-1">Review synced assistant prompts and enabled features. Editing happens in MiVA Desktop.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 active:scale-[0.98]"
            onClick={() => void onRefreshCloud()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-display">Saved Assistants</h3>
                </div>
                <div className="space-y-4">
                    {profiles.map((profile) => {
                      const Icon = profile.useCase === 'work' ? Blocks : profile.useCase === 'daily' ? LayoutDashboard : UserCircle;
                      const active = profile.id === activeProfile?.id;
                      const profileCoding = getCodingSettings(profile);

                      return (
                        <button
                          key={profile.id}
                          className={`w-full p-4 text-left rounded-[20px] bg-white shadow-sm border-2 transition-all cursor-pointer ${active ? 'border-primary-container' : 'border-slate-50 hover:border-slate-200'}`}
                          onClick={() => setSelectedProfileId(profile.id)}
                          type="button"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-primary-container/10 text-primary-container' : 'bg-slate-50 text-slate-400'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{profile.name}</h4>
                                    <p className="text-xs text-slate-400">{profile.useCase} / {profile.localMode}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                                      {sourceLabel(profile.source)} / {codingCapabilityLabel(profileCoding.capability)}
                                    </p>
                                </div>
                                {active && <div className="ml-auto w-2 h-2 rounded-full bg-primary-container"></div>}
                            </div>
                        </button>
                      );
                    })}

                    {profiles.length === 0 && (
                      <div className="p-6 rounded-[20px] bg-white border border-dashed border-slate-200 text-sm text-slate-400">
                        No assistants loaded yet. Sync an assistant from MiVA Desktop to review it here.
                      </div>
                    )}
                </div>
            </div>

            {activeProfile ? (
            <Card className="col-span-12 lg:col-span-8 p-0 overflow-hidden">
                <div className="p-10 bg-slate-50 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold font-display">{activeProfile.name}</h3>
                                <Badge>{activeProfile.isDefault ? 'Default' : 'Saved'}</Badge>
                                <Badge variant={activeProfile.source === 'desktop-setup' ? 'success' : 'info'}>
                                  {sourceLabel(activeProfile.source)}
                                </Badge>
                                <Badge variant={codingSettings.providerPolicy === 'cloudRequired' ? 'warning' : 'info'}>
                                  {codingProviderPolicyLabel(codingSettings.providerPolicy)}
                                </Badge>
                            </div>
                            <p className="text-slate-600 max-w-lg">{activeProfile.description || 'Synced assistant profile from MiVA Desktop.'}</p>
                        </div>
                    </div>
                </div>
                <div className="p-10 grid grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Enabled Features</label>
                            <div className="grid grid-cols-2 gap-3">
                              {enabledFeatures.map((feature, index) => (
                                <div className="p-4 bg-slate-50 rounded-2xl" key={`${feature.label}-${feature.value}-${index}`}>
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{feature.label}</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-800">{feature.value}</p>
                                </div>
                              ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Prompt Summary</label>
                            <div className="space-y-3">
                              <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Persona</p>
                                <p className="mt-2 text-sm font-semibold text-slate-800">{promptSettings?.persona || 'Default MiVA assistant persona'}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Schedule</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-800">{scheduleModeLabel}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Workspace</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-800">{workspacePolicyLabel}</p>
                                </div>
                              </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block">System Prompt</label>
                        <div className="bg-slate-900 rounded-3xl p-6 text-xs text-slate-400 font-mono leading-relaxed h-[220px] relative overflow-hidden group">
                           <p className="text-slate-600 mb-4">// Core Instructions</p>
                           <p>
                             <span className="text-white">You are MiVA</span>, a {activeProfile.localMode || 'hybrid'} AI assistant. 
                             Use case: {activeProfile.useCase || 'daily'}. Answer style: {activeProfile.answerStyle || 'moderate'}.
                             Language mode: {activeProfile.languageUse || 'korean'}. Future tools: {(activeProfile.futureFeatures || []).join(', ') || 'none'}.
                             Coding: {codingCapabilityLabel(codingSettings.capability)} / {codingProviderPolicyLabel(codingSettings.providerPolicy)}.
                            </p>
                           {promptSettings && (
                            <div className="mt-5 space-y-2">
                              <p><span className="text-white">Persona:</span> {promptSettings.persona}</p>
                              <p><span className="text-white">Role goal:</span> {promptSettings.roleGoal}</p>
                              <p><span className="text-white">Schedule:</span> {scheduleModeLabel} / {promptSettings.scheduleRules.timezone}</p>
                            </div>
                           )}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/60 pointer-events-none"></div>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-100 p-5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-3">Response Rules</label>
                          <div className="space-y-2">
                            {(promptSettings?.responseRules || ['Direct answer first', 'Ask when ambiguous']).slice(0, 4).map((rule, index) => (
                              <div key={index} className="flex gap-2 text-sm text-slate-600">
                                <span className="text-primary-container font-bold">{index + 1}.</span>
                                <span>{rule}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                    <span>
                      Last modified {formatRelativeTime(new Date(activeProfile.updatedAt))}
                    </span>
                </div>
            </Card>
            ) : (
              <div className="col-span-12 lg:col-span-8 rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-slate-500">
                <h3 className="text-2xl font-bold font-display text-slate-900">No assistant to display</h3>
                <p className="mt-3 max-w-xl">
                  No assistant profiles are available for this account. Sync an assistant from MiVA Desktop, then refresh this page.
                </p>
              </div>
            )}
        </div>
    </motion.div>
  );
};

const apiKeyProviders: Array<{
  provider: ApiKeyProviderId;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    provider: 'openai',
    label: 'OpenAI',
    description: 'Use GPT models for cloud fallback and advanced assistant tasks.',
    placeholder: 'sk-...',
  },
  {
    provider: 'gemini',
    label: 'Gemini',
    description: 'Use Gemini Flash/Pro models for lightweight cloud routing.',
    placeholder: 'AIza...',
  },
  {
    provider: 'groq',
    label: 'Groq',
    description: 'Use Groq-hosted Llama models for very fast cloud routing.',
    placeholder: 'gsk_...',
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    description: 'Reserve Claude support for future provider routing.',
    placeholder: 'sk-ant-...',
  },
  {
    provider: 'custom',
    label: 'Custom Provider',
    description: 'Add another AI or tool API key without changing the web layout.',
    placeholder: 'provider API key',
  },
];

const ApiKeysPage = ({
  cloud,
  savingApiKey,
  testingApiKeyId,
  onSaveKey,
  onTestKey,
}: {
  cloud: CloudState;
  savingApiKey: boolean;
  testingApiKeyId: string | null;
  onSaveKey: (key: ApiKeyDraft) => Promise<void>;
  onTestKey: (keyId: string) => Promise<void>;
}) => {
  const [drafts, setDrafts] = useState<Record<string, { label: string; key: string }>>({});

  const getProviderKey = (provider: ApiKeyProviderId) => cloud.apiKeys.find((key) => key.provider === provider);
  const updateDraft = (provider: ApiKeyProviderId, field: 'label' | 'key', value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [provider]: {
        label: prev[provider]?.label || apiKeyProviders.find((item) => item.provider === provider)?.label || provider,
        key: prev[provider]?.key || '',
        [field]: value,
      },
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display tracking-tight">API Keys</h2>
        <p className="text-slate-500 mt-1 max-w-2xl">
          Add cloud provider keys as separate cards. The API only returns masked keys to the web client.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {apiKeyProviders.map((providerConfig) => {
          const saved = getProviderKey(providerConfig.provider);
          const draft = drafts[providerConfig.provider] || {
            label: saved?.label || providerConfig.label,
            key: '',
          };
          const canTest = Boolean(saved?.id);

          return (
            <Card key={providerConfig.provider} className="col-span-12 lg:col-span-6 p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-container/10 text-primary-container flex items-center justify-center">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display">{providerConfig.label}</h3>
                    <p className="mt-1 text-sm text-slate-500 leading-6">{providerConfig.description}</p>
                  </div>
                </div>
                <Badge variant={saved?.status === 'verified' ? 'success' : saved?.status === 'error' ? 'error' : saved?.maskedKey ? 'warning' : 'info'}>
                  {saved?.status || 'not configured'}
                </Badge>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Card Label</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-primary-container focus:bg-white"
                    value={draft.label}
                    onChange={(event) => updateDraft(providerConfig.provider, 'label', event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">API Key</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-800 outline-none transition focus:border-primary-container focus:bg-white"
                    placeholder={saved?.maskedKey || providerConfig.placeholder}
                    value={draft.key}
                    onChange={(event) => updateDraft(providerConfig.provider, 'key', event.target.value)}
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <div>
                  <p className="text-xs font-bold text-slate-500">{saved?.maskedKey || 'No key saved yet'}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                    {saved?.lastValidatedAt ? `validated ${formatRelativeTime(new Date(saved.lastValidatedAt))}` : 'validation pending'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                    disabled={!canTest || testingApiKeyId === saved?.id}
                    onClick={() => saved && void onTestKey(saved.id)}
                    type="button"
                  >
                    {testingApiKeyId === saved?.id ? 'Testing' : 'Test'}
                  </button>
                  <button
                    className="rounded-xl bg-primary-container px-5 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary-container/20 transition active:scale-[0.98] disabled:opacity-50"
                    disabled={!draft.key.trim() || savingApiKey}
                    onClick={() => void onSaveKey({
                      id: providerConfig.provider === 'custom' ? saved?.id : undefined,
                      provider: providerConfig.provider,
                      label: draft.label,
                      key: draft.key,
                    })}
                    type="button"
                  >
                    {savingApiKey ? 'Saving' : 'Save'}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
};

const UsagePage = ({ cloud, onRefreshCloud }: { cloud: CloudState; onRefreshCloud: () => Promise<void> }) => {
  const usage = cloud.usageSummary;
  const totals = usage?.totals;
  const metricCards = [
    { label: 'Total Events', value: totals?.events ?? 0, detail: 'local and cloud calls' },
    { label: 'Local Events', value: totals?.localEvents ?? 0, detail: 'reported by desktop app' },
    { label: 'Cloud Events', value: totals?.cloudEvents ?? 0, detail: 'provider API calls' },
    { label: 'Avg Latency', value: `${totals?.averageLatencyMs ?? 0}ms`, detail: 'rough request time' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight">Usage</h2>
          <p className="text-slate-500 mt-1 max-w-2xl">
            Local usage is synced as metadata only: provider, model, assistant id, text size, duration, and success state.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200 active:scale-[0.98]"
          onClick={() => void onRefreshCloud()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="col-span-12 md:col-span-6 xl:col-span-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
            <p className="mt-3 text-3xl font-black font-display text-slate-900">{metric.value}</p>
            <p className="mt-1 text-sm text-slate-500">{metric.detail}</p>
          </Card>
        ))}

        <Card className="col-span-12 lg:col-span-6">
          <h3 className="text-xl font-bold font-display mb-5">Provider Split</h3>
          <div className="space-y-3">
            {(usage?.byProvider || []).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-700">{item.name}</span>
                <Badge>{item.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <h3 className="text-xl font-bold font-display mb-5">Model Split</h3>
          <div className="space-y-3">
            {(usage?.byModel || []).map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-700">{item.name}</span>
                <Badge>{item.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xl font-bold font-display">Recent Usage Events</h3>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">No prompt content stored</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4">Chars</th>
                  <th className="px-6 py-4">Latency</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(usage?.recentEvents || []).map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{event.mode}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{event.provider}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{event.model}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{event.inputChars + event.outputChars}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{event.durationMs}ms</td>
                    <td className="px-6 py-4">
                      <Badge variant={event.success ? 'success' : 'error'}>{event.success ? 'ok' : 'failed'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};

type BillingFeature = { label: string; included: boolean; highlight?: boolean; note?: string };
type BillingPlan = {
  id: string;
  name: string;
  price: string;
  tagline: string;
  features: BillingFeature[];
  cta: string;
  featured?: boolean;
  current?: boolean;
  hidePeriod?: boolean;
  priceNote?: string;
};

const BillingPage = () => {
  const { locale } = useLocale();
  const ko = locale === 'ko';

  const t = {
    title: ko ? '요금제' : 'Plans',
    subtitle: ko
      ? '무료 로컬 API로 시작하고, 매월 제공되는 클라우드 토큰 · 공유 · 코드 생성까지 필요한 만큼 확장하세요.'
      : 'Start with the free local API, then scale up with monthly cloud tokens, sharing, and code generation.',
    perMonth: ko ? ' /월' : ' /mo',
    recommended: ko ? '추천' : 'Popular',
    current: ko ? '현재 플랜' : 'Current',
    footer: ko
      ? '이 화면은 프로토타입으로 실제 결제는 처리되지 않습니다. 결제 연동은 추후 추가됩니다.'
      : 'This is a prototype screen — no real payment is processed. Checkout will be connected later.',
  };

  const plans: BillingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      tagline: ko ? '로컬에서 가볍게 시작' : 'Get started locally',
      current: true,
      cta: ko ? '현재 플랜' : 'Current plan',
      features: [
        { label: ko ? '무료 로컬 API만 사용' : 'Free local API only', included: true, highlight: true },
        { label: ko ? '어시스턴트 최대 5개' : 'Up to 5 assistants', included: true },
        { label: ko ? '매월 클라우드 토큰' : 'Monthly cloud tokens', included: false },
        { label: ko ? '웹 비서 공유 · 다운로드' : 'Share & download web assistants', included: false },
        { label: ko ? 'AI 직접 코드 생성' : 'AI code generation', included: false },
      ],
    },
    {
      id: 'plus',
      name: 'Plus',
      price: '$3.99',
      tagline: ko ? '공유하고 코드까지 생성' : 'Share and generate code',
      featured: true,
      cta: ko ? 'Plus로 업그레이드' : 'Upgrade to Plus',
      features: [
        { label: ko ? '매월 500K 토큰 제공' : '500K tokens / month', included: true, highlight: true, note: 'Sonnet · GPT 5.4' },
        { label: ko ? '어시스턴트 최대 10개' : 'Up to 10 assistants', included: true },
        { label: ko ? '웹 비서 공유 · 다운로드' : 'Share & download web assistants', included: true, highlight: true },
        { label: ko ? 'AI 직접 코드 생성' : 'AI code generation', included: true, highlight: true },
        { label: ko ? 'Free의 모든 기능 포함' : 'Everything in Free', included: true },
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$19.99',
      hidePeriod: true,
      priceNote: ko ? '최초 결제 · 이후 매월 $6.99' : 'First payment · then $6.99/mo',
      tagline: ko ? '제한 없이 모든 기능' : 'Everything, unlimited',
      cta: ko ? 'Pro로 업그레이드' : 'Upgrade to Pro',
      features: [
        { label: ko ? '매월 1M 입출력 토큰 제공' : '1M input/output tokens / month', included: true, highlight: true, note: 'Sonnet · GPT 5.4' },
        { label: ko ? '어시스턴트 무제한' : 'Unlimited assistants', included: true, highlight: true },
        { label: ko ? '모든 기능 사용 가능' : 'All features unlocked', included: true },
        { label: ko ? '웹 비서 공유 · 다운로드' : 'Share & download web assistants', included: true },
        { label: ko ? 'AI 직접 코드 생성' : 'AI code generation', included: true },
      ],
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-display tracking-tight">{t.title}</h2>
        <p className="text-slate-500 mt-1 max-w-2xl">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-12 items-stretch gap-6">
        {plans.map((plan) => {
          const featured = Boolean(plan.featured);
          const isPro = plan.id === 'pro';
          return (
            <Card
              key={plan.id}
              className={`relative col-span-12 flex flex-col overflow-hidden p-8 lg:col-span-4 ${
                featured ? 'border-primary-container shadow-xl shadow-primary-container/10 ring-2 ring-primary-container/30' : ''
              }`}
            >
              {featured && (
                <span className="absolute right-6 top-6">
                  <Badge variant="active">{t.recommended}</Badge>
                </span>
              )}

              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black font-display">{plan.name}</h3>
                {plan.current && <Badge variant="success">{t.current}</Badge>}
                {isPro && <InfinityIcon className="h-5 w-5 text-primary-container" />}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">{plan.tagline}</p>

              <p className="mt-6 text-4xl font-black font-display text-slate-900">
                {plan.price}
                {!plan.hidePeriod && <span className="text-base font-bold text-slate-400">{t.perMonth}</span>}
              </p>
              {plan.priceNote && (
                <p className="mt-1 text-xs font-semibold text-slate-400">{plan.priceNote}</p>
              )}

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    {feature.included ? (
                      <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${feature.highlight ? 'text-primary-container' : 'text-green-600'}`} />
                    ) : (
                      <X className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                    )}
                    <span className="min-w-0">
                      <span
                        className={
                          feature.included
                            ? feature.highlight
                              ? 'font-bold text-slate-900'
                              : 'font-medium text-slate-700'
                            : 'text-slate-400 line-through decoration-slate-300'
                        }
                      >
                        {feature.label}
                      </span>
                      {feature.note && (
                        <span className="mt-0.5 block text-[11px] font-medium text-slate-400">{feature.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest transition active:scale-[0.98] ${
                  plan.current
                    ? 'cursor-default bg-slate-100 text-slate-400'
                    : 'bg-primary-container text-white shadow-xl shadow-primary-container/20 hover:opacity-90'
                }`}
                disabled={plan.current}
                type="button"
              >
                {plan.cta}
              </button>
            </Card>
          );
        })}
      </div>

      <Card className="p-8">
        <div className="flex items-center gap-3 text-slate-500">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <p className="text-sm font-semibold">{t.footer}</p>
        </div>
      </Card>
    </motion.div>
  );
};

const TerminalIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
);

function loadAuthState(): AuthState {
  try {
    const saved = window.localStorage.getItem(authStorageKey);
    if (!saved) {
      return { role: 'guest', user: null, token: null };
    }

    const parsed = JSON.parse(saved) as Partial<AuthState>;
    if ((parsed.role === 'user' || parsed.role === 'admin') && parsed.user && parsed.token) {
      return {
        role: parsed.role,
        user: parsed.user,
        token: parsed.token,
      };
    }
  } catch {
    // Fall back to guest state.
  }

  return { role: 'guest', user: null, token: null };
}

const LoginPage = ({
  cloud,
  desktopLoginRequest,
  googleLoginPending,
  loginError,
  loginPending,
  onBack,
  onDownloadDesktop,
  onGoogleCredential,
  onLogin,
}: {
  cloud: CloudState;
  desktopLoginRequest: { deviceCode: string; userCode: string } | null;
  googleLoginPending: boolean;
  loginError: string | null;
  loginPending: boolean;
  onBack?: () => void;
  onDownloadDesktop: () => void;
  onGoogleCredential: (credential: string) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
}) => {
  const { copy } = useLocale();
  const login = copy.login;
  const shell = copy.shell;
  const [email, setEmail] = useState('dev@miva.local');
  const [password, setPassword] = useState('miva1234');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const googleLoginEnabled = Boolean(GOOGLE_CLIENT_ID && cloud.googleOAuthConfigured);

  useEffect(() => {
    if (!googleLoginEnabled) {
      return;
    }

    if (window.google?.accounts?.id) {
      setGoogleScriptReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-miva-google-identity]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setGoogleScriptReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.mivaGoogleIdentity = 'true';
    script.onload = () => setGoogleScriptReady(true);
    document.head.appendChild(script);
  }, [googleLoginEnabled]);

  useEffect(() => {
    if (!googleLoginEnabled || !googleScriptReady || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      ux_mode: 'popup',
      callback: (response) => {
        if (response.credential) {
          void onGoogleCredential(response.credential);
        }
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      width: 336,
      text: 'continue_with',
    });
  }, [googleLoginEnabled, googleScriptReady, onGoogleCredential]);

  const featureCards = [
    [login.featureLocalTitle, login.featureLocalBody],
    [login.featureAssistantsTitle, login.featureAssistantsBody],
    [login.featureStudioTitle, login.featureStudioBody],
  ] as const;

  return (
    <div className="min-h-screen bg-surface-bg text-slate-900 dark:text-slate-100">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100/80 bg-white/90 px-6 py-4 backdrop-blur-md">
        {onBack ? (
          <button
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backToLanding}
          </button>
        ) : (
          <div />
        )}
        <LanguageToggle />
      </div>

      <main className="grid place-items-center p-8">
      <section className="w-full max-w-[980px] grid gap-8 lg:grid-cols-[1fr_420px] items-center">
        <div>
          <div className="w-14 h-14 bg-primary-container rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-container/30 mb-8">
            <span className="font-display text-3xl font-black leading-none">M</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{login.eyebrow}</p>
          <h1 className="mt-4 text-5xl font-black font-display tracking-tight text-slate-950 leading-tight">
            {login.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-500 max-w-xl">
            {login.body}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {featureCards.map(([title, body]) => (
              <div className="rounded-3xl border border-slate-100 bg-white/70 p-5 shadow-sm" key={title}>
                <p className="text-sm font-black text-slate-900">{title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              className="rounded-2xl bg-primary-container px-7 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl shadow-primary-container/20 active:scale-[0.98]"
              onClick={onDownloadDesktop}
              type="button"
            >
              {login.downloadMiVA}
            </button>
            <Badge variant={cloud.status === 'connected' ? 'success' : 'warning'}>
              {login.cloudApi} {statusLabel(cloud.status, shell)}
            </Badge>
          </div>

          {desktopLoginRequest && (
            <div className="mt-6 rounded-3xl border border-primary-container/20 bg-primary-container/5 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-container">{login.desktopLogin}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {login.desktopLoginBody}
              </p>
              <p className="mt-3 font-mono text-xs font-bold text-slate-500">Code: {desktopLoginRequest.userCode || 'linked request'}</p>
            </div>
          )}
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold font-display tracking-tight">{login.signInTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {login.signInBody}
          </p>

          <div className="mt-7 rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-900">{login.continueGoogle}</p>
              </div>
              {googleLoginPending && <Badge variant="warning">{login.signingIn}</Badge>}
            </div>
            <div className="mt-4 flex min-h-[44px] justify-center">
              {googleLoginEnabled ? (
                <div ref={googleButtonRef} />
              ) : (
                <button
                  className="w-full cursor-not-allowed rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-400"
                  disabled
                  type="button"
                >
                  {!GOOGLE_CLIENT_ID
                    ? login.googleNotConfigured
                    : cloud.status === 'checking'
                      ? login.googleChecking
                      : login.googleBackendNotConfigured}
                </button>
              )}
            </div>
          </div>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void onLogin(email, password);
            }}
          >
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{login.email}</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-container/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{login.password}</span>
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-primary-container focus:ring-4 focus:ring-primary-container/10"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {loginError && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">{loginError}</p>
            )}

            <button
              className="w-full rounded-2xl bg-primary-container px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl shadow-primary-container/20 active:scale-[0.98] disabled:opacity-50"
              disabled={loginPending}
              type="submit"
            >
              {loginPending ? login.signInPending : login.signIn}
            </button>
          </form>

          <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
            <button
              className="flex items-center justify-between gap-4 text-left"
              onClick={() => {
                setEmail('dev@miva.local');
                setPassword('miva1234');
              }}
              type="button"
            >
              <span>{login.userLogin}</span>
              <span className="font-mono font-bold">dev@miva.local / miva1234</span>
            </button>
            <button
              className="flex items-center justify-between gap-4 text-left"
              onClick={() => {
                setEmail('admin@miva.local');
                setPassword('admin1234');
              }}
              type="button"
            >
              <span>{login.adminLogin}</span>
              <span className="font-mono font-bold">admin@miva.local / admin1234</span>
            </button>
          </div>
        </Card>
      </section>
      </main>
    </div>
  );
};

// --- Main App Shell ---

const IntegrationsPage = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
                    Integrations
                </h2>
                <p className="text-slate-500 mt-2 max-w-2xl">Connect your local MiVA instance to external capabilities and productivity tools. All data routing remains under your explicit control.</p>
            </div>
            <div className="bg-primary-container/10 px-4 py-2 rounded-xl border border-primary-container/20">
                <span className="text-sm font-bold text-primary-container">Phase 1: Local-First Focus</span>
            </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
            <Card className="col-span-12 lg:col-span-8 p-10 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqArkqT6MmO9_p9bzfYoS_OXVLaGuU0mVQDi2zS0PsEBWG-TaWL8faub6hkDX7rX1dixFJ9rugArQjYy80758Z4Azk2MzKPYvdjfIYS2YISQw71SZPhlA8pLfCu2NASBNoSibuFvJYNbTsoIPTYmTaFdBbQVQJXxrPEGRnA7u_Tda_aCgZXdTtxpeC4bPyRh2u6YgZ_wRF1ltTJrEWF4LcCiy-2Q9rCXvmBz-fHhdoplSbYDigYwsWI4RXiPp2VRzZ-q6pyAi0xcnL" className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold font-display">Google Workspace</h3>
                            <span className="text-[10px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-widest mt-1 inline-block">Not Connected</span>
                        </div>
                    </div>
                    <p className="text-slate-600 text-lg max-w-md mb-8 leading-relaxed">
                        Empower MiVA to search your Drive, draft Gmail responses, and manage your Calendar events through secure local indexing.
                    </p>
                    <div className="flex gap-4">
                        {['Drive', 'Gmail', 'Calendar'].map((item) => (
                            <div key={item} className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                <Database className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-8 flex items-center justify-between pt-8 border-t border-slate-50 relative z-10">
                    <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Future implementation will use OAuth2 local callback.
                    </div>
                    <button className="px-8 py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold text-sm cursor-not-allowed">Coming Soon</button>
                </div>
                <div className="absolute top-0 right-0 h-full w-1/3 opacity-20 pointer-events-none filter grayscale">
                   <img src="https://images.unsplash.com/photo-1558486012-81e836d2170b?q=80&w=400&auto=format&fit=crop" className="h-full w-full object-cover" />
                </div>
            </Card>

            <Card className="col-span-12 lg:col-span-4 p-8 flex flex-col justify-between">
                <div>
                   <div className="w-14 h-14 bg-secondary-container/20 text-primary-container rounded-2xl flex items-center justify-center mb-6">
                       <TerminalIcon className="w-8 h-8" />
                   </div>
                   <div className="flex items-center justify-between mb-2">
                       <h3 className="text-xl font-bold font-display">MCP Skills</h3>
                       <Badge>Planned</Badge>
                   </div>
                   <p className="text-slate-500 text-sm leading-relaxed mb-10">
                       Model Context Protocol integration for local file system access and shell execution.
                   </p>
                   <ul className="space-y-4">
                       {['File System Read/Write', 'Python Sandbox Execution', 'Local Database Querying'].map((skill, i) => (
                           <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                               <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                                <ChevronRight className="w-3 h-3" />
                               </div>
                               {skill}
                           </li>
                       ))}
                   </ul>
                </div>
            </Card>

            <Card className="col-span-12 lg:col-span-6 p-8">
                <div className="flex items-start justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center">
                            <Plus className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-display">External LLM Bridges</h3>
                            <p className="text-sm text-slate-500">Connect to Claude, OpenAI, or Perplexity</p>
                        </div>
                    </div>
                    <Badge variant="info">Development</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-transparent opacity-60">
                        <p className="text-[10px] font-black text-slate-400 mb-3 tracking-widest">ANTHROPIC</p>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">Claude 3.5 Sonnet</span>
                            <Lock className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-transparent opacity-60">
                        <p className="text-[10px] font-black text-slate-400 mb-3 tracking-widest">OPENAI</p>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">GPT-4o</span>
                            <Lock className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>
                </div>
                <p className="mt-8 text-xs text-slate-400 italic font-medium leading-relaxed">
                    Hybrid mode will allow MiVA to route complex queries to external APIs while keeping private context local.
                </p>
            </Card>

            <div className="col-span-12 lg:col-span-6 bg-slate-900 rounded-[32px] p-10 text-white relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                        <ShieldCheck className="w-8 h-8 text-primary-container" />
                        <h3 className="text-2xl font-bold font-display">Privacy Manifesto</h3>
                    </div>
                    <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-md">
                        MiVA is built on a "Local-First" philosophy. External integrations are opt-in only. Your local data is never used to train external models.
                    </p>
                    <div className="flex gap-4">
                        <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Encryption</p>
                            <p className="text-sm font-bold">AES-256 Local</p>
                        </div>
                        <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Tracking</p>
                            <p className="text-sm font-bold">Zero Telemetry</p>
                        </div>
                    </div>
                </div>
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform"></div>
            </div>
        </div>

        <div className="pt-10">
            <h3 className="text-2xl font-bold font-display mb-10 tracking-tight">Upcoming Capability Modules</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                    { label: 'Slack Connect', meta: 'Q3 2024', icon: Bell },
                    { label: 'GitHub Actions', meta: 'Q4 2024', icon: Blocks },
                    { label: 'SQL Bridge', meta: 'Q4 2024', icon: Database },
                    { label: 'Home Assistant', meta: '2025', icon: Settings },
                ].map((item, i) => (
                    <Card key={i} className="group hover:border-primary-container transition-all text-center p-8 border-t-4 border-t-slate-100 flex flex-col items-center">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-6 group-hover:text-primary-container transition-colors">
                            <item.icon className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">{item.label}</h4>
                        <p className="text-xs text-slate-400 font-bold">{item.meta}</p>
                    </Card>
                ))}
            </div>
        </div>
    </motion.div>
);

const MOCK_UI_PERSONAS = [
  { id: 'nova-crystal', label: 'Nova Crystal', imageSrc: '/images/characters/nova-crystal.png' },
  { id: 'mira-wave', label: 'Mira Wave', imageSrc: '/images/characters/mira-wave.png' },
  { id: 'miva-dog', label: 'MiVA Dog', imageSrc: '/images/characters/miva-dog.png' },
  { id: 'john-cena', label: 'John Cena', imageSrc: '/images/characters/john-cena.png' },
] as const;

type MockUiPersona = (typeof MOCK_UI_PERSONAS)[number];

function MockPersonaCharacterSelect({
  personas,
  selectedId,
  onSelect,
}: {
  personas: readonly MockUiPersona[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = personas.find((persona) => persona.id === selectedId) ?? personas[0];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between rounded-2xl bg-slate-100 px-6 py-4 text-left font-bold text-slate-700 transition-all hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-container/30"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>Character: {selected.label}</span>
        <ChevronRight className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0px_12px_32px_rgba(15,23,42,0.12)] dark:border-[#243044] dark:bg-[#111827]"
          role="listbox"
        >
          {personas.map((persona) => {
            const isSelected = persona.id === selectedId;
            return (
              <button
                key={persona.id}
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between rounded-xl px-5 py-3 text-left text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-primary-container/8 text-primary-container shadow-sm dark:bg-primary-container/15'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#172033]'
                }`}
                onClick={() => {
                  onSelect(persona.id);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span>Character: {persona.label}</span>
                {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const VoiceCharacterPage = () => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(MOCK_UI_PERSONAS[0].id);
  const selectedPersona = MOCK_UI_PERSONAS.find((persona) => persona.id === selectedPersonaId) ?? MOCK_UI_PERSONAS[0];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
        <div className="flex justify-between items-end">
            <div>
                 <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
                    Voice & Character
                </h2>
                <p className="text-slate-500 mt-2 max-w-2xl text-lg">Configure the auditory and visual persona of your local AI assistant. Manage how MiVA hears, speaks, and presents itself.</p>
            </div>
            <div className="flex gap-4">
                <button className="bg-slate-100 text-primary-container px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95">
                    <LayoutDashboard className="w-4 h-4" /> Test Voice
                </button>
                <button className="bg-primary-container text-white px-10 py-3 rounded-2xl font-bold shadow-xl shadow-primary-container/20 transition-all active:scale-95">
                    Save Changes
                </button>
            </div>
        </div>

        <div className="bg-white rounded-[24px] p-8 border-l-8 border-primary-container shadow-xl shadow-slate-200/40 flex items-center justify-between">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-primary-container/10 rounded-3xl flex items-center justify-center text-primary-container">
                    <Cpu className="w-8 h-8" />
                </div>
                <div>
                    <h4 className="text-xl font-bold font-display">Desktop App Required</h4>
                    <p className="text-slate-500 leading-relaxed">Real-time local speech and character rendering features run through the MiVA Desktop app for optimal performance.</p>
                </div>
            </div>
            <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 active:scale-95 transition-all">
                Download App <Download className="w-4 h-4" />
            </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
            <Card className="col-span-12 md:col-span-8 p-10 relative">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-2xl font-bold font-display mb-1">Speech Recognition</h3>
                        <p className="text-slate-500">Local runtime for processing verbal commands.</p>
                    </div>
                    <Badge variant="active">Whisper Local</Badge>
                </div>
                <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-[28px] border-2 border-primary-container flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-container shadow-inner">
                                <AudioLines className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-800">OpenAI Whisper (Small)</p>
                                <p className="text-xs text-slate-400 font-medium">Recommended for high speed, low latency.</p>
                            </div>
                        </div>
                        <ShieldCheck className="w-6 h-6 text-primary-container" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        {['Whisper (Large-v3)', 'Whisper (Tiny)'].map((w, i) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-[28px] border border-transparent opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                                <p className="font-bold text-slate-800 mb-1">{w}</p>
                                <p className="text-xs text-slate-400 font-medium">{i === 0 ? 'High accuracy, higher VRAM usage.' : 'Lowest latency for weak hardware.'}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-12 pt-10 border-t border-slate-100 grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <span>Noise Cancellation</span>
                            <span className="text-primary-container">85% Strength</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-container" style={{ width: '85%' }}></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <span>Activation Threshold</span>
                            <span className="text-primary-container">-42dB</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-container" style={{ width: '40%' }}></div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="col-span-12 md:col-span-4 p-10 text-center flex flex-col items-center h-full">
                <h3 className="text-2xl font-bold font-display mb-2">Mock UI Persona</h3>
                <p className="text-slate-500 mb-10 text-sm">Active 2D Avatar Character</p>
                
                <div className="w-full aspect-square rounded-[40px] overflow-hidden mb-10 shadow-2xl relative group bg-gradient-to-br from-primary-container/10 via-blue-50 to-violet-100 flex items-center justify-center p-4">
                    <img
                      alt={selectedPersona.label}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      src={selectedPersona.imageSrc}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white" type="button"><Settings className="w-5 h-5" /></button>
                        <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white" type="button"><Download className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="space-y-6 w-full">
                    <MockPersonaCharacterSelect
                      onSelect={setSelectedPersonaId}
                      personas={MOCK_UI_PERSONAS}
                      selectedId={selectedPersonaId}
                    />
                    <div className="flex gap-2 justify-center">
                        <Badge variant="active">3D Rendered</Badge>
                        <Badge variant="info">Reactive</Badge>
                    </div>
                </div>
            </Card>
        </div>

        <div className="grid grid-cols-12 gap-8">
            <Card className="col-span-12 p-10">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-bold font-display">Text-to-Speech (TTS)</h3>
                        <p className="text-slate-500">Select the default voice for auditory responses.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                         <button className="px-8 py-2.5 rounded-xl bg-white shadow-sm font-bold text-sm text-primary-container">High Fidelity</button>
                         <button className="px-8 py-2.5 rounded-xl font-bold text-sm text-slate-400">Performance</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-8 bg-white border-4 border-primary-container rounded-[40px] shadow-2xl relative cursor-pointer">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-primary-container rounded-3xl flex items-center justify-center text-white">
                                <UserCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Voice A (Solomon)</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Deep, Authoritative</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mb-10">
                            <TerminalIcon className="w-4 h-4 text-primary-container" />
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-container" style={{ width: '70%' }}></div>
                            </div>
                        </div>
                        <button className="w-full bg-primary-container text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                            Selected <ShieldCheck className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {[
                        { n: 'Voice B (Lyra)', d: 'Bright, Friendly', icon: UserCircle },
                        { n: 'Custom Voice', d: 'Clone your own voice', meta: 'COMING SOON', icon: RefreshCw },
                    ].map((v, i) => (
                        <div key={i} className={`p-8 bg-white border-2 border-slate-50 rounded-[40px] hover:border-slate-100 transition-all ${v.meta ? 'opacity-50' : ''}`}>
                            {v.meta && <div className="absolute top-6 right-6 font-black text-[8px] bg-amber-500 text-white px-2 py-1 rounded-full">{v.meta}</div>}
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                                    <v.icon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-slate-900">{v.n}</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{v.d}</p>
                                </div>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full mb-10"></div>
                            {!v.meta && <button className="w-full bg-slate-100 text-primary-container py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-container hover:text-white transition-all">Select Voice</button>}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
        
        <footer className="text-center py-10 opacity-40 border-t border-slate-100 mt-20">
            <p className="text-sm font-bold flex items-center justify-center gap-3">
                <Lock className="w-4 h-4" /> All voice and character processing happens on-device. No audio data ever leaves your local network.
            </p>
        </footer>
    </motion.div>
  );
};

const AdminAnalyticsPage = ({ cloud, refreshCloud }: { cloud: CloudState; refreshCloud: () => Promise<void> }) => {
  const stats = cloud.adminStats;
  const metricCards = [
    { label: 'Users', value: stats?.users.total ?? 0, detail: `${stats?.users.active ?? 0} active` },
    { label: 'Devices', value: stats?.devices.total ?? 0, detail: `${stats?.devices.connected ?? 0} connected` },
    { label: 'My Assistants', value: stats?.assistantProfiles.total ?? cloud.profiles.length, detail: 'Synced profiles' },
    { label: 'Cloud API', value: cloud.status === 'connected' ? 'Online' : 'Offline', detail: formatRelativeTime(cloud.lastChecked) },
  ];

  const topSections = [
    { title: 'Top Models', items: stats?.models || [] },
    { title: 'Top Providers', items: stats?.providers || [] },
    { title: 'Assistant Roles', items: stats?.assistantProfiles.useCases || [] },
    { title: 'Local Modes', items: stats?.assistantProfiles.localModes || [] },
    { title: 'Coding Capabilities', items: stats?.assistantProfiles.codingCapabilities || [] },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
            Admin Analytics
          </h2>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Track product-level choices without storing private chat content. Phase 1 measures selected models, providers, assistant roles, and device status.
          </p>
        </div>
        <button
          onClick={() => void refreshCloud()}
          className="px-5 py-2.5 bg-primary-container text-white font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] shadow-md shadow-primary-container/20"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh stats
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{metric.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{metric.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {topSections.map((section) => (
          <Card key={section.title} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display">{section.title}</h3>
              <Badge>{section.items.length} items</Badge>
            </div>
            <div className="space-y-3">
              {section.items.length === 0 ? (
                <p className="text-sm text-slate-400">No events recorded yet.</p>
              ) : (
                section.items.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <span className="w-6 text-xs font-black text-slate-300">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm font-bold text-slate-700">
                        <span>{item.name}</span>
                        <span>{item.count}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary-container" style={{ width: `${Math.min(100, item.count * 25)}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold font-display">Recent Usage Events</h3>
          <Badge variant={cloud.status === 'connected' ? 'success' : 'warning'}>{statusLabel(cloud.status)}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(stats?.recentEvents || []).map((event) => (
                <tr key={event.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{event.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{event.value}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatRelativeTime(new Date(event.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
};

export default function App() {
  const { copy, locale } = useLocale();
  const shell = copy.shell;
  const navItems = useMemo(() => buildNavItems(copy.nav), [copy.nav]);
  const [activePage, setActivePage] = useState<PageId>(() => getInitialPage());
  const [auth, setAuth] = useState<AuthState>(() => loadAuthState());
  const [desktopLoginRequest] = useState(() => getDesktopLoginRequest());
  const [showLogin, setShowLogin] = useState(() => Boolean(getDesktopLoginRequest()));
  const [workspaceConsentRequest] = useState(() => getWorkspaceConsentRequest());
  const [desktopLoginCompleted, setDesktopLoginCompleted] = useState(false);
  const [workspaceConsentCompleted, setWorkspaceConsentCompleted] = useState(false);
  const [googleOAuthReady, setGoogleOAuthReady] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const [googleLoginPending, setGoogleLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>(initialConnection);
  const [cloud, setCloud] = useState<CloudState>(initialCloudState);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => getSavedPresets());
  const [action, setAction] = useState<ActionState>({ type: 'idle' });
  const [showPullCancelConfirm, setShowPullCancelConfirm] = useState(false);
  const [downloadDockMode, setDownloadDockMode] = useState<ModelDownloadDockMode>('modal');
  const [pendingDeleteModel, setPendingDeleteModel] = useState<string | null>(null);
  const pullAbortRef = useRef<AbortController | null>(null);
  const pullPauseRequestedRef = useRef(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [testingApiKeyId, setTestingApiKeyId] = useState<string | null>(null);
  const [showDesktopDownloadNotice, setShowDesktopDownloadNotice] = useState(false);
  const desktopDownload = copy.desktopDownload;

  const handleDesktopAppDownload = () => {
    triggerDesktopAppDownload();
    setShowDesktopDownloadNotice(true);
  };

  // Navigate to a page and push a matching address so each screen has its own
  // URL and the browser back/forward buttons move between screens.
  const handleNavigate = (page: PageId) => {
    if (page !== activePage) {
      window.history.pushState({}, document.title, buildPageHref(page));
    }
    setActivePage(page);
  };

  const returnToPersonaHub = () => {
    handleNavigate('personaHub');
  };

  const currentUserHandle = auth.user?.displayName?.trim() || 'me';

  const handleToggleSavedPreset = (preset: PersonaPreset) => {
    setSavedPresets(toggleSavedPreset(preset));
  };

  const handleRemoveSavedPreset = (presetId: string) => {
    setSavedPresets(removeSavedPreset(presetId));
  };
  const visibleNavItems = useMemo(
    () => auth.role === 'admin'
      ? navItems.filter((item) => item.id === 'admin')
      : navItems.filter((item) => item.id !== 'admin'),
    [auth.role, navItems]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    if (window.google?.accounts?.oauth2) {
      setGoogleOAuthReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-miva-google-identity]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setGoogleOAuthReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.mivaGoogleIdentity = 'true';
    script.onload = () => setGoogleOAuthReady(true);
    document.head.appendChild(script);
  }, []);

  const refreshCloud = async (roleOverride: AuthRole = auth.role) => {
    const next: CloudState = {
      ...initialCloudState,
      lastChecked: new Date(),
    };

    try {
      const health = await checkCloudApi();
      next.status = 'connected';
      next.googleOAuthConfigured = Boolean(health.googleOAuthConfigured);

      if (roleOverride === 'admin') {
        next.adminStats = await getAdminStats();
        setCloud(next);
        return;
      }

      const [profilesResponse, adminStats, apiKeysResponse, usageSummary] = await Promise.all([
        getAssistantProfiles(),
        getAdminStats(),
        getApiKeys(),
        getUsageSummary(),
      ]);

      next.profiles = profilesResponse.profiles || [];
      next.adminStats = adminStats;
      next.apiKeys = apiKeysResponse.keys || [];
      next.usageSummary = usageSummary;
    } catch (error) {
      next.status = 'offline';
      next.googleOAuthConfigured = false;
      next.error = error instanceof Error ? error.message : 'Cloud API is offline.';
    }

    setCloud(next);
  };

  const handleLogin = async (email: string, password: string) => {
    setLoginPending(true);
    setLoginError(null);

    try {
      const response = await login(email, password);
      const nextAuth: AuthState = {
        role: response.user.role,
        user: response.user,
        token: response.token,
      };
      window.localStorage.setItem(authStorageKey, JSON.stringify(nextAuth));
      setAuth(nextAuth);

      if (desktopLoginRequest) {
        await completeDesktopDeviceLogin(desktopLoginRequest.deviceCode, response.token);
        setDesktopLoginCompleted(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setActivePage(getPostLoginPage(response.user.role));
      await refreshCloud(response.user.role);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setLoginPending(false);
    }
  };

  const requestGoogleWorkspaceConsent = async () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth client is not configured.');
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google OAuth script is not ready. Refresh the web console and try again.');
    }

    await new Promise<void>((resolve, reject) => {
      const tokenClient = window.google?.accounts.oauth2?.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_WORKSPACE_SCOPE,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error));
            return;
          }

          if (tokenResponse.access_token) {
            void saveGoogleWorkspaceToken({
              accessToken: tokenResponse.access_token,
              scope: tokenResponse.scope,
              expiresIn: tokenResponse.expires_in,
            }).then(() => resolve()).catch(reject);
            return;
          }

          reject(new Error('Google did not return a Workspace access token.'));
        },
      });
      tokenClient?.requestAccessToken({ prompt: 'consent' });
    });
  };

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoginPending(true);
    setLoginError(null);

    try {
      const response = await loginWithGoogleCredential(credential);
      const nextAuth: AuthState = {
        role: response.user.role,
        user: response.user,
        token: response.token,
      };
      window.localStorage.setItem(authStorageKey, JSON.stringify(nextAuth));
      setAuth(nextAuth);

      if (GOOGLE_CLIENT_ID && window.google?.accounts?.oauth2 && response.user.role !== 'admin') {
        await requestGoogleWorkspaceConsent().catch((error) => {
          setLoginError(error instanceof Error ? error.message : 'Google Workspace consent failed.');
        });
      }

      if (desktopLoginRequest) {
        await completeDesktopDeviceLogin(desktopLoginRequest.deviceCode, response.token);
        setDesktopLoginCompleted(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setActivePage(getPostLoginPage(response.user.role));
      await refreshCloud(response.user.role);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoginPending(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(authStorageKey);
    setAuth({ role: 'guest', user: null, token: null });
    setActivePage('dashboard');
  };

  const switchDevAccount = async (role: 'user' | 'admin') => {
    const credentials = role === 'admin'
      ? { email: 'admin@miva.local', password: 'admin1234' }
      : { email: 'dev@miva.local', password: 'miva1234' };

    try {
      const response = await login(credentials.email, credentials.password);
      const nextAuth: AuthState = {
        role: response.user.role,
        user: response.user,
        token: response.token,
      };
      window.localStorage.setItem(authStorageKey, JSON.stringify(nextAuth));
      setAuth(nextAuth);
      setActivePage(getPostLoginPage(response.user.role));
      await refreshCloud(response.user.role);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Could not switch development account.');
    }
  };

  const saveCloudApiKey = async (key: ApiKeyDraft) => {
    setSavingApiKey(true);
    try {
      await saveApiKey(key);
      await refreshCloud();
    } finally {
      setSavingApiKey(false);
    }
  };

  const testCloudApiKey = async (keyId: string) => {
    setTestingApiKeyId(keyId);
    try {
      await testApiKey(keyId);
      await refreshCloud();
    } finally {
      setTestingApiKeyId(null);
    }
  };

  const refreshConnection = async (options?: { completionMessage?: string }) => {
    setAction({ type: 'refreshing', message: 'Checking local MiVA services...' });

    const next: ConnectionState = {
      ...initialConnection,
      catalog: fallbackCatalog,
      lastChecked: new Date(),
    };

    try {
      await fetchJson(`${LOCAL_HELPER_URL}/health`);
      next.helper = 'connected';
    } catch (error) {
      next.helper = 'offline';
      next.error = error instanceof Error ? error.message : 'Local helper is offline.';
    }

    if (next.helper === 'connected') {
      try {
        const modelState = await fetchJson<{ ollama: OllamaStatus; catalog: LocalModel[] }>(`${LOCAL_HELPER_URL}/models`);
        next.ollama = normalizeOllamaStatus(modelState.ollama);
        next.catalog = modelState.catalog?.length ? modelState.catalog : fallbackCatalog;
      } catch (error) {
        next.ollama = {
          installed: false,
          running: false,
          error: error instanceof Error ? error.message : 'Could not read Ollama status.',
        };
      }
    }

    try {
      await fetchJson(`${DESKTOP_BRIDGE_URL}/health`);
      next.desktop = 'connected';

      try {
        next.hardware = await fetchJson<HardwareInfo>(`${DESKTOP_BRIDGE_URL}/hardware`);
      } catch {
        next.hardware = null;
      }

      if (!next.ollama) {
        try {
          next.ollama = normalizeOllamaStatus(
            await fetchJson<OllamaStatus & { installed_models?: string[]; installed_model_count?: number }>(`${DESKTOP_BRIDGE_URL}/ollama/status`),
          );
        } catch {
          next.ollama = null;
        }
      }
    } catch {
      next.desktop = 'offline';
    }

    setConnection(next);
    setAction(options?.completionMessage
      ? { type: 'idle', message: options.completionMessage }
      : { type: 'idle' });
  };

  const startOllama = async () => {
    setAction({ type: 'starting-ollama', message: 'Starting Ollama through the local helper...' });
    try {
      const response = await fetch(`${LOCAL_HELPER_URL}/ollama/start`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setAction({ type: 'starting-ollama', message: 'Ollama start command finished. Refreshing status...' });
      await refreshConnection();
    } catch (error) {
      setAction({
        type: 'idle',
        message: error instanceof Error ? error.message : 'Failed to start Ollama.',
      });
    }
  };

  const migrateAssistantsFromDeletedModel = async (deletedModel: string) => {
    const affectedProfiles = cloud.profiles.filter(
      (profile) => profile.provider === 'ollama' && profile.model === deletedModel,
    );

    if (affectedProfiles.length === 0) {
      return { migrated: 0, route: null as { provider: ProviderId; model: string } | null };
    }

    const route = OPENAI_FALLBACK_ROUTE;
    let migrated = 0;

    for (const profile of affectedProfiles) {
      try {
        await patchAssistantProfile(profile.id, {
          provider: route.provider,
          model: route.model,
          localMode: 'hybrid',
        });
        migrated += 1;
      } catch {
        // Keep deleting the model even if one profile migration fails.
      }
    }

    if (migrated > 0) {
      await refreshCloud(auth.role);
    }

    return { migrated, route };
  };

  const migrateDesktopProfilesFromDeletedModel = async (deletedModel: string) => {
    try {
      const response = await fetch(`${DESKTOP_BRIDGE_URL}/profiles/migrate-deleted-model`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: deletedModel }),
      });

      if (!response.ok) {
        return { migrated: 0, route: null as { provider: ProviderId; model: string } | null };
      }

      const payload = await response.json() as {
        migrated?: number;
        provider?: ProviderId;
        model?: string;
      };

      return {
        migrated: payload.migrated ?? 0,
        route: payload.provider && payload.model
          ? { provider: payload.provider, model: payload.model }
          : OPENAI_FALLBACK_ROUTE,
      };
    } catch {
      return { migrated: 0, route: null as { provider: ProviderId; model: string } | null };
    }
  };

  const cancelModelPull = async (model: string) => {
    setShowPullCancelConfirm(false);
    pullAbortRef.current?.abort();

    try {
      await fetch(`${LOCAL_HELPER_URL}/models/pull/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
      });
    } catch {
      // Client abort already stops the stream.
    }

    pullAbortRef.current = null;
    setDownloadDockMode('modal');
    setAction({
      type: 'idle',
      message: `${model} download cancelled. Partial files were cleared — the next download will start from 0%.`,
    });
    await refreshConnection();
  };

  const pauseModelPull = (model: string) => {
    pullPauseRequestedRef.current = true;
    pullAbortRef.current?.abort();
    pullAbortRef.current = null;
    setAction((current) => (
      current.type === 'pulling-model' && current.model === model
        ? { ...current, paused: true, message: 'Download paused' }
        : current
    ));
  };

  const pullModel = async (model: string) => {
    pullAbortRef.current?.abort();
    pullPauseRequestedRef.current = false;
    const abortController = new AbortController();
    pullAbortRef.current = abortController;
    setShowPullCancelConfirm(false);
    setDownloadDockMode((current) => (current === 'minimal' || current === 'compact' ? current : 'modal'));
    setAction((current) => ({
      type: 'pulling-model',
      model,
      message: `Preparing ${model} download...`,
      progress: current.type === 'pulling-model' && current.model === model ? current.progress ?? 0 : 0,
      paused: false,
      completedBytes: current.type === 'pulling-model' && current.model === model ? current.completedBytes : undefined,
      totalBytes: current.type === 'pulling-model' && current.model === model ? current.totalBytes : undefined,
    }));

    try {
      void recordUsageEvent('model_selected', model).catch(() => undefined);
      const response = await fetch(`${LOCAL_HELPER_URL}/models/pull`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (!response.body) {
        throw new Error('No download stream returned from local helper.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          const progress = event.total && event.completed
            ? Math.min(100, Math.round((event.completed / event.total) * 100))
            : undefined;

          setAction({
            type: 'pulling-model',
            model,
            message: event.status || `Downloading ${model}...`,
            progress,
            paused: false,
            completedBytes: typeof event.completed === 'number' ? event.completed : undefined,
            totalBytes: typeof event.total === 'number' ? event.total : undefined,
          });
        }
      }

      setAction({ type: 'pulling-model', model, message: `${model} download complete. Refreshing catalog...`, progress: 100 });
      await refreshConnection();
      await refreshCloud();
      setDownloadDockMode('modal');
      setAction({ type: 'idle' });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (pullPauseRequestedRef.current) {
          pullPauseRequestedRef.current = false;
          setAction((current) => (
            current.type === 'pulling-model' && current.model === model
              ? { ...current, paused: true, message: 'Download paused' }
              : current
          ));
          return;
        }
        setAction({
          type: 'idle',
          message: `${model} download cancelled.`,
        });
        return;
      }

      setAction({
        type: 'idle',
        message: error instanceof Error ? error.message : `Failed to download ${model}.`,
      });
    } finally {
      if (pullAbortRef.current === abortController) {
        pullAbortRef.current = null;
      }
    }
  };

  const requestDeleteModel = (model: string) => {
    setPendingDeleteModel((current) => (current === model ? null : model));
  };

  const requestModelDelete = async (model: string) => {
    const endpoints = [
      ...(connection.helper === 'connected' ? [`${LOCAL_HELPER_URL}/models/delete`] : []),
      ...(connection.desktop === 'connected' ? [`${DESKTOP_BRIDGE_URL}/models/delete`] : []),
    ];

    let lastError = 'MiVA Desktop or local helper must be running to delete models.';

    // #region agent log
    clientDebugLog('App.tsx:requestModelDelete:start', 'delete endpoints prepared', { model, endpoints, helper: connection.helper, desktop: connection.desktop, ollamaRunning: connection.ollama?.running, installedModels: connection.ollama?.installedModels }, 'B-C');
    // #endregion

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
      });

      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        message?: string;
        alreadyRemoved?: boolean;
        resolvedModel?: string;
      } | null;

      // #region agent log
      clientDebugLog('App.tsx:requestModelDelete:response', 'delete endpoint response', { model, endpoint, status: response.status, ok: response.ok, payload }, 'C-D');
      // #endregion

      if (response.ok && payload?.ok !== false) {
        return;
      }

      lastError = payload?.error || payload?.message || `Failed to remove ${model}.`;
    }

    throw new Error(lastError);
  };

  const deleteModel = async (model: string) => {
    // #region agent log
    clientDebugLog('App.tsx:deleteModel:start', 'deleteModel called', { model, helper: connection.helper, desktop: connection.desktop, ollamaRunning: connection.ollama?.running, installedModels: connection.ollama?.installedModels }, 'A-B');
    // #endregion

    if (!model.trim()) {
      // #region agent log
      clientDebugLog('App.tsx:deleteModel:earlyReturn', 'empty model name', { model }, 'A');
      // #endregion
      return;
    }

    if (connection.helper !== 'connected' && connection.desktop !== 'connected') {
      // #region agent log
      clientDebugLog('App.tsx:deleteModel:earlyReturn', 'services offline', { model }, 'B');
      // #endregion
      setAction({
        type: 'idle',
        message: 'MiVA Desktop or local helper must be running to delete models.',
      });
      return;
    }

    if (action.type === 'pulling-model' && action.model === model) {
      await cancelModelPull(model);
    }

    setPendingDeleteModel(null);
    setAction({ type: 'deleting-model', model, message: `Removing ${model}...` });

    try {
      await requestModelDelete(model);

      setConnection((current) => applyDeletedModelToConnection(current, model));

      const [cloudMigration, desktopMigration] = await Promise.all([
        migrateAssistantsFromDeletedModel(model),
        migrateDesktopProfilesFromDeletedModel(model),
      ]);
      const migratedCount = cloudMigration.migrated + desktopMigration.migrated;
      const completionMessage = migratedCount > 0
        ? `${model} removed. ${migratedCount} assistant(s) switched to OpenAI (${OPENAI_FALLBACK_ROUTE.model}).`
        : `${model} removed.`;

      await refreshConnection({ completionMessage });
      // #region agent log
      clientDebugLog('App.tsx:deleteModel:success', 'delete completed and refreshed', { model, completionMessage }, 'E');
      // #endregion
    } catch (error) {
      // #region agent log
      clientDebugLog('App.tsx:deleteModel:error', 'delete failed', { model, error: error instanceof Error ? error.message : String(error) }, 'C');
      // #endregion
      setAction({
        type: 'idle',
        message: error instanceof Error ? error.message : `Failed to remove ${model}.`,
      });
    }
  };

  const confirmDeleteModel = async (model: string) => {
    // #region agent log
    clientDebugLog('App.tsx:confirmDeleteModel', 'confirm clicked', { model, pendingDeleteModel }, 'A');
    // #endregion
    const target = model.trim() || pendingDeleteModel;
    if (!target) {
      // #region agent log
      clientDebugLog('App.tsx:confirmDeleteModel:earlyReturn', 'no model to delete', { model, pendingDeleteModel }, 'A');
      // #endregion
      return;
    }

    await deleteModel(target);
  };

  useEffect(() => {
    void refreshConnection();
    void refreshCloud();
  }, []);

  useEffect(() => {
    if (!desktopLoginRequest || !auth.token || desktopLoginCompleted) {
      return;
    }

    void completeDesktopDeviceLogin(desktopLoginRequest.deviceCode, auth.token)
      .then(() => {
        setDesktopLoginCompleted(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error) => {
        setLoginError(error instanceof Error ? error.message : 'Could not connect MiVA Desktop.');
      });
  }, [auth.token, desktopLoginCompleted, desktopLoginRequest]);

  useEffect(() => {
    if (!workspaceConsentRequest || !auth.token || auth.role === 'admin' || workspaceConsentCompleted) {
      return;
    }

    if (!googleOAuthReady || !window.google?.accounts?.oauth2) {
      return;
    }

    void requestGoogleWorkspaceConsent()
      .then(async () => {
        setWorkspaceConsentCompleted(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        await refreshCloud(auth.role);
      })
      .catch((error) => {
        setLoginError(error instanceof Error ? error.message : 'Google Workspace consent failed.');
      });
  }, [auth.role, auth.token, googleOAuthReady, workspaceConsentCompleted, workspaceConsentRequest]);

  useEffect(() => {
    if (auth.role === 'admin' && activePage !== 'admin') {
      setActivePage('admin');
      return;
    }

    if (auth.role !== 'admin' && activePage === 'admin') {
      setActivePage('dashboard');
    }
  }, [activePage, auth.role]);

  // Keep the active screen in sync with the address when the user uses the
  // browser back/forward buttons or opens a shared link in the same tab.
  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getInitialPage());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Reconcile the address with the active screen for programmatic navigation
  // (login, logout, dev account switch, admin redirect). Nav clicks already
  // push their own history entry, so this only replaces a stale address.
  useEffect(() => {
    const currentParam = new URLSearchParams(window.location.search).get('page');
    const urlPage = currentParam ? pageParamMap[currentParam] ?? 'dashboard' : 'dashboard';
    if (urlPage !== activePage) {
      window.history.replaceState({}, document.title, buildPageHref(activePage));
    }
  }, [activePage]);

  const actions: WebConsoleActions = {
    refreshConnection,
    startOllama,
    pullModel,
    requestDeleteModel,
    confirmDeleteModel,
  };

  const topStatus = useMemo(() => {
    if (connection.desktop === 'connected' || connection.helper === 'connected' || cloud.status === 'connected') {
      return {
        label: shell.connected,
        dot: 'bg-green-500 status-glow',
        text: 'text-green-700',
        bg: 'bg-green-50',
      };
    }

    if (connection.desktop === 'checking' || connection.helper === 'checking' || cloud.status === 'checking') {
      return {
        label: shell.checking,
        dot: 'bg-amber-400',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
      };
    }

    return {
      label: shell.offline,
      dot: 'bg-red-500',
      text: 'text-red-700',
      bg: 'bg-red-50',
    };
  }, [connection.desktop, connection.helper, cloud.status, shell]);

  const renderPage = () => {
    if (auth.role === 'admin') {
      return <AdminAnalyticsPage cloud={cloud} refreshCloud={refreshCloud} />;
    }

    switch (activePage) {
      case 'dashboard': return <DashboardPage connection={connection} action={action} actions={actions} />;
      case 'devices': return <DevicesPage connection={connection} actions={actions} />;
      case 'models': return (
        <ModelsPage
          action={action}
          actions={actions}
          connection={connection}
          onDismissDelete={() => setPendingDeleteModel(null)}
          pendingDeleteModel={pendingDeleteModel}
        />
      );
      case 'profiles': return (
        <MyAssistantsPage
          cloud={cloud}
          onRefreshCloud={refreshCloud}
        />
      );
      case 'apiKeys': return (
        <ApiKeysPage
          cloud={cloud}
          savingApiKey={savingApiKey}
          testingApiKeyId={testingApiKeyId}
          onSaveKey={saveCloudApiKey}
          onTestKey={testCloudApiKey}
        />
      );
      case 'usage': return <UsagePage cloud={cloud} onRefreshCloud={refreshCloud} />;
      case 'billing': return <BillingPage />;
      case 'integrations': return <IntegrationsPage />;
      case 'voice': return <VoiceCharacterPage />;
      case 'savedAssistants': return (
        <SavedAssistantsPage
          savedPresets={savedPresets}
          onRemove={handleRemoveSavedPreset}
          onGoToHub={() => handleNavigate('personaHub')}
        />
      );
      case 'personaHub': return (
        <PersonaHubPage
          savedPresets={savedPresets}
          onToggleSave={handleToggleSavedPreset}
          currentUserHandle={currentUserHandle}
        />
      );
      case 'personaShare': return <PersonaSharePage profiles={cloud.profiles} onBackToHub={returnToPersonaHub} />;
      case 'admin': return auth.role === 'admin' ? <AdminAnalyticsPage cloud={cloud} refreshCloud={refreshCloud} /> : <DashboardPage connection={connection} action={action} actions={actions} />;
      case 'settings': return <SettingsPage />;
      default: return null;
    }
  };

  if (auth.role === 'guest') {
    if (!showLogin) {
      return (
        <LandingPage onGetStarted={() => setShowLogin(true)} />
      );
    }

    return (
      <>
        <DesktopDownloadNotice
          copy={desktopDownload}
          onDismiss={() => setShowDesktopDownloadNotice(false)}
          visible={showDesktopDownloadNotice}
        />
        <LoginPage
          cloud={cloud}
          desktopLoginRequest={desktopLoginRequest}
          googleLoginPending={googleLoginPending}
          loginError={loginError}
          loginPending={loginPending}
          onBack={desktopLoginRequest ? undefined : () => setShowLogin(false)}
          onDownloadDesktop={handleDesktopAppDownload}
          onGoogleCredential={handleGoogleCredential}
          onLogin={handleLogin}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-bg text-slate-900 dark:text-slate-100">
      <DesktopDownloadNotice
        copy={desktopDownload}
        onDismiss={() => setShowDesktopDownloadNotice(false)}
        visible={showDesktopDownloadNotice}
      />
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-slate-100 bg-surface-elevated shadow-xl shadow-slate-200/20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-container/30">
              <span className="font-display text-xl font-black leading-none">M</span>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">{shell.brandTitle}</h1>
              <p className="text-[10px] font-black uppercase leading-tight tracking-widest text-slate-400">{shell.brandSubtitle}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = activePage === item.id;

              if (item.id === 'profiles') {
                const expanded = activePage === 'profiles' || activePage === 'savedAssistants';
                const subItems: Array<{ id: PageId; label: string; icon: any; count?: number }> = [
                  { id: 'profiles', label: locale === 'ko' ? '내 동기화 비서' : 'My synced assistants', icon: UserCircle },
                  { id: 'savedAssistants', label: locale === 'ko' ? '저장한 공유 비서' : 'Saved shared', icon: Bookmark, count: savedPresets.length },
                ];

                return (
                  <div key={item.id}>
                    <button
                      onClick={() => handleNavigate('profiles')}
                      className={`w-full group py-3 px-4 flex items-center gap-3 font-semibold text-sm rounded-xl transition-all active:scale-[0.98] ${
                        expanded
                          ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 transition-colors ${expanded ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                      <span className="font-display tracking-tight flex-1 text-left">{item.label}</span>
                      {expanded ? <ChevronDown className="h-4 w-4 opacity-80" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
                    </button>
                    {expanded && (
                      <div className="mt-1 ml-5 space-y-1 border-l border-slate-100 pl-3 dark:border-slate-800">
                        {subItems.map((sub) => {
                          const subActive = activePage === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleNavigate(sub.id)}
                              className={`w-full group py-2.5 px-3 flex items-center gap-2.5 font-semibold text-[13px] rounded-lg transition-all active:scale-[0.98] ${
                                subActive
                                  ? 'bg-primary-container/10 text-primary-container dark:bg-primary-container/20'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
                              }`}
                            >
                              <sub.icon className={`h-4 w-4 ${subActive ? 'text-primary-container' : 'text-slate-400'}`} />
                              <span className="flex-1 text-left">{sub.label}</span>
                              {typeof sub.count === 'number' && sub.count > 0 && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${subActive ? 'bg-primary-container text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                  {sub.count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full group py-3 px-4 flex items-center gap-3 font-semibold text-sm rounded-xl transition-all active:scale-[0.98] ${
                    isActive
                      ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />
                  <span className="font-display tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-50 p-6 dark:border-slate-800">
          <div className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" 
                alt=""
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-50 rounded-full"></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{auth.user?.displayName || 'MiVA User'}</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{auth.role} account</p>
            </div>
            <button
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
              onClick={handleLogout}
              type="button"
            >
              {shell.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-[280px] flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-50 bg-white/80 px-10 backdrop-blur-md">
          <div className="flex flex-1 items-center gap-3 max-w-2xl">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                placeholder={shell.searchPlaceholder}
                className="w-full rounded-2xl border-none bg-slate-100 py-3 pl-12 pr-4 text-sm font-medium shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-primary-container dark:text-slate-100"
              />
            </div>
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-primary-container px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-primary-container/20 transition-all hover:brightness-105 active:scale-[0.98]"
              onClick={handleDesktopAppDownload}
              type="button"
            >
              <Download className="h-4 w-4" />
              <span className="whitespace-nowrap">{shell.downloadDesktop}</span>
            </button>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 rounded-full border border-dashed border-amber-300 bg-amber-50 p-1">
              <button
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition active:scale-[0.98] ${
                  auth.role === 'user' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-700 hover:bg-amber-100'
                }`}
                onClick={() => void switchDevAccount('user')}
                type="button"
                title="Temporary development login as user."
              >
                {shell.devUser}
              </button>
              <button
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition active:scale-[0.98] ${
                  auth.role === 'admin' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-700 hover:bg-amber-100'
                }`}
                onClick={() => void switchDevAccount('admin')}
                type="button"
                title="Temporary development login as admin."
              >
                {shell.devAdmin}
              </button>
            </div>
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full ${topStatus.bg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${topStatus.dot}`}></span>
              <span className={`text-xs font-bold tracking-tight ${topStatus.text}`}>{topStatus.label}</span>
            </div>
            <div className="flex items-center gap-4 border-l border-slate-100 pl-8 text-slate-400 dark:border-slate-800">
              <LanguageToggle />
              <button className="hover:text-slate-900 transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="hover:text-slate-900 transition-colors"><HelpCircle className="w-5 h-5" /></button>
            </div>
          </div>
        </header>

        <main className="p-10 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ModelDownloadFloatingCard
        action={action}
        dockMode={downloadDockMode}
        showCancelConfirm={showPullCancelConfirm}
        onCollapse={() => setDownloadDockMode('minimal')}
        onConfirmCancel={() => {
          if (action.model) {
            void cancelModelPull(action.model);
          }
        }}
        onDismissCancelConfirm={() => setShowPullCancelConfirm(false)}
        onExpand={() => setDownloadDockMode('modal')}
        onMinimize={() => setDownloadDockMode('compact')}
        onPause={() => {
          if (action.model) {
            pauseModelPull(action.model);
          }
        }}
        onRequestCancel={() => setShowPullCancelConfirm(true)}
        onResume={() => {
          if (action.model) {
            void pullModel(action.model);
          }
        }}
      />
    </div>
  );
}

const SettingsPage = () => {
  const { locale, setLocale, copy } = useLocale();
  const { theme, setTheme } = useTheme();
  const settings = copy.settingsPage;

  const themeButtonClass = (active: boolean) => (
    active
      ? 'flex items-center gap-3 rounded-2xl border-2 border-primary-container bg-primary-container/5 px-6 py-3 font-bold text-primary-container'
      : 'flex items-center gap-3 rounded-2xl border-2 border-slate-100 px-6 py-3 font-bold text-slate-400 transition hover:border-slate-200 hover:text-slate-600 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:text-slate-200'
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div>
        <h2 className="flex items-end gap-3 font-display text-3xl font-bold tracking-tight">
          {settings.title}
        </h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{settings.subtitle}</p>
      </div>

      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 space-y-8 lg:col-span-8">
          <Card className="p-10">
            <h3 className="mb-8 flex items-center gap-3 font-display text-xl font-bold">
              <Settings className="h-5 w-5 text-primary-container" /> {settings.preferencesTitle}
            </h3>
            <div className="space-y-10">
              <section className="flex items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{settings.languageTitle}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{settings.languageBody}</p>
                </div>
                <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    className={`rounded-xl px-6 py-2 text-sm font-bold ${
                      locale === 'en'
                        ? 'bg-white text-primary-container shadow-sm dark:bg-slate-900'
                        : 'text-slate-400'
                    }`}
                    onClick={() => setLocale('en')}
                    type="button"
                  >
                    English
                  </button>
                  <button
                    className={`rounded-xl px-6 py-2 text-sm font-bold ${
                      locale === 'ko'
                        ? 'bg-white text-primary-container shadow-sm dark:bg-slate-900'
                        : 'text-slate-400'
                    }`}
                    onClick={() => setLocale('ko')}
                    type="button"
                  >
                    Korean
                  </button>
                </div>
              </section>
              <section className="flex items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{settings.themeTitle}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{settings.themeBody}</p>
                </div>
                <div className="flex gap-4">
                  <button
                    className={themeButtonClass(theme === 'dark')}
                    onClick={() => setTheme('dark')}
                    type="button"
                  >
                    <Moon className="h-4 w-4" /> {settings.themeDark}
                  </button>
                  <button
                    className={themeButtonClass(theme === 'light')}
                    onClick={() => setTheme('light')}
                    type="button"
                  >
                    <Sun className="h-4 w-4" /> {settings.themeLight}
                  </button>
                </div>
              </section>
            </div>
          </Card>

          <Card className="border-[3px] border-red-50 bg-red-50/10 p-8 dark:border-red-900/40 dark:bg-red-950/20">
            <h3 className="mb-2 font-display text-xl font-bold text-red-600">{settings.maintenanceTitle}</h3>
            <div className="flex items-center justify-between rounded-[24px] border border-red-100 bg-white p-6 dark:border-red-900/50 dark:bg-slate-900">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">{settings.resetTitle}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{settings.resetBody}</p>
              </div>
              <button className="rounded-2xl bg-red-500 px-8 py-3 font-bold text-white shadow-xl shadow-red-500/20 transition-all active:scale-95" type="button">
                {settings.resetAction}
              </button>
            </div>
          </Card>
        </div>

        <div className="col-span-12 space-y-8 lg:col-span-4">
          <div className="group relative overflow-hidden rounded-[32px] bg-slate-900 p-10 text-white">
            <ShieldCheck className="mb-6 h-12 w-12" />
            <h4 className="mb-4 font-display text-2xl font-bold">{settings.privacyTitle}</h4>
            <p className="mb-10 text-sm leading-relaxed text-slate-400">{settings.privacyBody}</p>
            <button className="flex items-center gap-2 border-b-2 border-white/20 pb-2 text-xs font-black uppercase tracking-widest transition-all hover:border-white" type="button">
              {settings.privacyAction} <ChevronRight className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-primary-container/20 blur-[100px] transition-all group-hover:bg-primary-container/30"></div>
          </div>

          <Card className="space-y-6 border-l-4 border-green-500 p-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{settings.nodeHealth}</span>
            <div className="space-y-4">
              {[
                { l: settings.localBridge, v: settings.active, c: 'text-green-500' },
                { l: settings.syncStatus, v: settings.synchronized, c: 'text-slate-900 dark:text-slate-100' },
                { l: settings.version, v: 'v2.4.1-stable', c: 'text-slate-400 font-mono' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{s.l}</span>
                  <span className={`text-sm font-bold ${s.c}`}>{s.v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
