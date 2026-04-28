import React, { useEffect, useMemo, useState } from 'react';
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
  Languages, 
  RefreshCw, 
  ChevronRight,
  BarChart3,
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  checkCloudApi,
  createAssistantProfile,
  fetchJson,
  finalizeAssistantProfile,
  getAdminStats,
  getAssistantProfiles,
  initialCloudState,
  recordUsageEvent,
} from './services/mivaApi';
import type {
  AssistantProfileDraft,
  CloudState,
} from './services/mivaApi';

// --- Types ---
type PageId = 'dashboard' | 'devices' | 'models' | 'profiles' | 'integrations' | 'voice' | 'admin' | 'settings';
type ServiceStatus = 'checking' | 'connected' | 'offline';

const DESKTOP_BRIDGE_URL = 'http://127.0.0.1:43111';
const LOCAL_HELPER_URL = 'http://127.0.0.1:43110';
const DEFAULT_MODEL_ID = 'qwen3:4b';

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
}

interface ActionState {
  type: 'idle' | 'refreshing' | 'starting-ollama' | 'pulling-model';
  message?: string;
  progress?: number;
  model?: string;
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

function statusLabel(status: ServiceStatus) {
  if (status === 'connected') return 'Connected';
  if (status === 'checking') return 'Checking';
  return 'Offline';
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

function getActiveModel(connection: ConnectionState) {
  const installed = connection.ollama?.installedModels || [];
  const catalog = connection.catalog.length > 0 ? connection.catalog : fallbackCatalog;
  return catalog.find((model) => installed.includes(model.ollamaName) && model.ollamaName === DEFAULT_MODEL_ID)
    || catalog.find((model) => installed.includes(model.ollamaName))
    || catalog.find((model) => model.ollamaName === DEFAULT_MODEL_ID)
    || catalog[0];
}

interface NavItem {
  id: PageId;
  label: string;
  labelKr?: string;
  icon: any;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelKr: '대시보드', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', labelKr: '장치', icon: Cpu },
  { id: 'models', label: 'Models', labelKr: '모델', icon: Database },
  { id: 'profiles', label: 'Assistant Profiles', labelKr: '프로필', icon: UserCircle },
  { id: 'integrations', label: 'Integrations', labelKr: '연동', icon: Blocks },
  { id: 'voice', label: 'Voice & Character', labelKr: '음성 및 캐릭터', icon: AudioLines },
  { id: 'admin', label: 'Admin Analytics', labelKr: '관리자 통계', icon: BarChart3 },
  { id: 'settings', label: 'Settings', labelKr: '설정', icon: Settings },
];

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
  <div className={`bg-white rounded-2xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-slate-50 ${className}`}>
    {children}
  </div>
);

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
        <h2 className="text-3xl font-bold font-display tracking-tight">Dashboard / 대시보드</h2>
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
          <h3 className="text-xl font-bold font-display">System Health / 시스템 상태</h3>
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
          <h3 className="text-xl font-bold font-display">Active Assistant / 활성 어시스턴트</h3>
          <button className="text-primary-container font-semibold text-sm hover:underline">Change Profile</button>
        </div>
        <div className="flex items-start gap-6 p-6 bg-primary-container/5 rounded-2xl border border-primary-container/10">
          <div className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center text-white shrink-0 overflow-hidden">
             <img src="https://images.unsplash.com/photo-1675271591211-126ad5cc0625?q=80&w=260&auto=format&fit=crop" className="w-full h-full object-cover" />
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
            { title: connection.ollama?.running ? 'Ollama Running' : 'Ollama Not Running', time: formatRelativeTime(connection.lastChecked), desc: activeModel?.ollamaName || 'No active model', color: connection.ollama?.running ? 'bg-blue-500' : 'bg-slate-300' },
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
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{row.status}</span>
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

const ModelsPage = ({ connection, action, actions }: { connection: ConnectionState; action: ActionState; actions: WebConsoleActions }) => {
  const catalog = connection.catalog.length > 0 ? connection.catalog : fallbackCatalog;
  const installedSet = new Set(connection.ollama?.installedModels || []);
  const activeModel = getActiveModel(connection);
  const installedCount = connection.ollama?.installedModelCount ?? installedSet.size;
  const ramTotal = connection.hardware?.memory?.total_gb;
  const isBusy = action.type === 'starting-ollama' || action.type === 'pulling-model';

  return (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
    <div className="flex justify-between items-end">
      <div>
        <span className="text-primary-container font-bold text-xs uppercase tracking-widest block mb-1">Recommended Choice</span>
        <h2 className="text-4xl font-extrabold font-display tracking-tight">Prime Assistant</h2>
      </div>
      <button
        onClick={actions.refreshConnection}
        className="px-5 py-2.5 bg-slate-100 text-primary-container font-semibold rounded-xl hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${action.type === 'refreshing' ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>

    {action.type !== 'idle' && action.message && (
      <Card className="p-5 border-primary-container/10">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{action.type.replace('-', ' ')}</p>
            <p className="font-bold text-slate-800 mt-1">{action.message}</p>
          </div>
          {typeof action.progress === 'number' && (
            <span className="text-sm font-black text-primary-container">{action.progress}%</span>
          )}
        </div>
        {typeof action.progress === 'number' && (
          <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-container transition-all" style={{ width: `${action.progress}%` }}></div>
          </div>
        )}
      </Card>
    )}

    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 lg:col-span-8 h-[380px] group relative rounded-[32px] overflow-hidden shadow-2xl">
         <img src="https://images.unsplash.com/photo-1614728263952-84ea256f960f?q=80&w=1200&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent p-12 flex flex-col justify-center text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-white/10">Default Model</span>
              <span className={`flex items-center gap-1 text-xs font-bold ${installedSet.has(activeModel?.ollamaName || '') ? 'text-green-400' : 'text-amber-300'}`}>
                <RefreshCw className="w-3 h-3" /> {installedSet.has(activeModel?.ollamaName || '') ? 'Installed' : 'Available'}
              </span>
            </div>
            <h3 className="text-5xl font-black mb-2">{activeModel?.label || 'Qwen3 4B'}</h3>
            <p className="text-slate-300 max-w-sm text-sm mb-8 leading-relaxed">{activeModel?.summary || 'Optimized lightweight local assistant for Korean and general use.'}</p>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => activeModel?.ollamaName && actions.pullModel(activeModel.ollamaName)}
                disabled={isBusy || !connection.ollama?.running || installedSet.has(activeModel?.ollamaName || '')}
                className="bg-white text-slate-900 px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl hover:bg-slate-50 disabled:opacity-60 disabled:active:scale-100"
              >
                <Download className="w-4 h-4" /> {installedSet.has(activeModel?.ollamaName || '') ? 'Ready' : 'Download Model'}
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
             const installed = installedSet.has(model.ollamaName);
             const active = activeModel?.ollamaName === model.ollamaName;

             return (
             <Card key={model.id || model.ollamaName} className="group hover:shadow-xl transition-all p-8 relative">
               <div className="flex justify-between items-start mb-8">
                 <div className="flex gap-4">
                   <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary-container/10 group-hover:text-primary-container transition-colors">
                     <Database className="w-6 h-6" />
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
                 <button className="px-4 py-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-transparent transition-all" title="Remove support will be added later">
                   <Trash2 className="w-5 h-5" />
                 </button>
               </div>
             </Card>
             );
           })}
        </div>
      </div>
    </div>
    <button className="fixed bottom-8 right-8 bg-primary-container text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all z-50 font-bold opacity-70" title="Custom model support will be added later">
      <Plus className="w-6 h-6" /> Add Custom Model
    </button>
  </motion.div>
  );
};

const AssistantProfilesPage = ({
  cloud,
  creatingProfile,
  finalizingProfileId,
  onCreateProfile,
  onFinalizeProfile,
}: {
  cloud: CloudState;
  creatingProfile: boolean;
  finalizingProfileId: string | null;
  onCreateProfile: (profile: AssistantProfileDraft) => Promise<void>;
  onFinalizeProfile: (profileId: string) => Promise<void>;
}) => {
  const profiles = cloud.profiles;
  const activeProfile = profiles.find((profile) => profile.isDefault) || profiles[0];
  const createDefaultProfile = () => onCreateProfile({
    name: `Assistant Profile ${profiles.length + 1}`,
    description: 'A web-created MiVA assistant profile. Replace this with survey results or a custom profile editor later.',
    useCase: 'daily',
    answerStyle: 'moderate',
    priority: 'balanced',
    languageUse: 'korean',
    localMode: 'hybrid',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    futureFeatures: ['voice', 'googleWorkspace'],
    isDefault: profiles.length === 0,
    status: 'draft',
    source: 'web-console',
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="mb-8">
            <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
                Assistant Profiles <span className="text-slate-300 font-medium text-2xl">/ 프로필</span>
            </h2>
            <p className="text-slate-500 mt-1">Manage saved AI assistant profiles from survey choices, model preferences, and future tool permissions.</p>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
            <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-display">Saved Profiles</h3>
                    <button
                      className="text-xs font-bold text-primary-container flex items-center gap-1 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={cloud.status !== 'connected' || creatingProfile}
                      onClick={() => void createDefaultProfile()}
                      type="button"
                    >
                        <Plus className="w-4 h-4" /> {creatingProfile ? 'CREATING...' : 'NEW PROFILE'}
                    </button>
                </div>
                <div className="space-y-4">
                    {profiles.map((profile) => {
                      const Icon = profile.useCase === 'work' ? Blocks : profile.useCase === 'daily' ? LayoutDashboard : UserCircle;
                      const active = profile.id === activeProfile?.id;

                      return (
                        <div key={profile.id} className={`p-4 rounded-[20px] bg-white shadow-sm border-2 transition-all cursor-pointer ${active ? 'border-primary-container' : 'border-slate-50 hover:border-slate-200'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-primary-container/10 text-primary-container' : 'bg-slate-50 text-slate-400'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{profile.name}</h4>
                                    <p className="text-xs text-slate-400">{profile.useCase} / {profile.localMode} / {profile.status || 'draft'}</p>
                                </div>
                                {active && <div className="ml-auto w-2 h-2 rounded-full bg-primary-container"></div>}
                            </div>
                        </div>
                      );
                    })}

                    {profiles.length === 0 && (
                      <div className="p-6 rounded-[20px] bg-white border border-dashed border-slate-200 text-sm text-slate-400">
                        Cloud API is not connected yet. Start `apps/api` to load saved assistant profiles.
                      </div>
                    )}
                </div>
            </div>

            <Card className="col-span-12 lg:col-span-8 p-0 overflow-hidden">
                <div className="p-10 bg-slate-50 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold font-display">{activeProfile?.name || 'No Profile Selected'}</h3>
                                <Badge>{activeProfile?.isDefault ? 'Default' : 'Saved'}</Badge>
                                <Badge variant={activeProfile?.status === 'finalized' ? 'success' : 'warning'}>{activeProfile?.status || 'draft'}</Badge>
                            </div>
                            <p className="text-slate-600 max-w-lg">{activeProfile?.description || 'Create an assistant profile from the desktop setup survey or the web console.'}</p>
                        </div>
                        <div className="flex gap-2">
                              <button className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm">Duplicate</button>
                              <button
                                disabled={!activeProfile || activeProfile.status === 'finalized' || finalizingProfileId === activeProfile.id}
                                onClick={() => activeProfile && void onFinalizeProfile(activeProfile.id)}
                                className="bg-primary-container text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-primary-container/20 disabled:opacity-50 disabled:shadow-none"
                                type="button"
                              >
                                {finalizingProfileId === activeProfile?.id ? 'Finalizing...' : activeProfile?.status === 'finalized' ? 'Finalized' : 'Finalize Assistant'}
                              </button>
                        </div>
                    </div>
                </div>
                <div className="p-10 grid grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Personality Style</label>
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                {[activeProfile?.useCase || 'daily', activeProfile?.answerStyle || 'moderate', activeProfile?.priority || 'balanced'].map((s, i) => (
                                    <button key={i} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${i === 0 ? 'bg-white shadow-sm text-primary-container' : 'text-slate-400'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Model Core</label>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{activeProfile?.model || 'gemini-2.5-flash'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{activeProfile?.provider || 'gemini'} • {activeProfile?.localMode || 'hybrid'}</p>
                                    </div>
                                </div>
                                <button className="text-primary-container text-sm font-bold hover:underline">Change</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] block">System Prompt</label>
                        <div className="bg-slate-900 rounded-3xl p-6 text-xs text-slate-400 font-mono leading-relaxed h-[220px] relative overflow-hidden group">
                           <p className="text-slate-600 mb-4">// Core Instructions</p>
                           <p>
                             <span className="text-white">You are MiVA</span>, a {activeProfile?.localMode || 'hybrid'} AI assistant. 
                             Use case: {activeProfile?.useCase || 'daily'}. Answer style: {activeProfile?.answerStyle || 'moderate'}.
                             Language mode: {activeProfile?.languageUse || 'korean'}. Future tools: {(activeProfile?.futureFeatures || []).join(', ') || 'none'}.
                            </p>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/60 pointer-events-none"></div>
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                    <span>
                      Last modified {activeProfile ? formatRelativeTime(new Date(activeProfile.updatedAt)) : 'Not saved yet'}
                      {activeProfile?.completedAt ? ` / finalized ${formatRelativeTime(new Date(activeProfile.completedAt))}` : ''}
                    </span>
                    <button className="text-red-500 font-bold hover:underline">DELETE PROFILE</button>
                </div>
            </Card>
        </div>
    </motion.div>
  );
};

const TerminalIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
);

// --- Main App Shell ---

const IntegrationsPage = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
                    Integrations <span className="text-slate-300 font-medium text-2xl">/ 연동</span>
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

const VoiceCharacterPage = () => (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
        <div className="flex justify-between items-end">
            <div>
                 <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
                    Voice & Character <span className="text-slate-300 font-medium text-2xl">/ 음성 및 캐릭터</span>
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
                <h3 className="text-2xl font-bold font-display mb-2">UI Persona</h3>
                <p className="text-slate-500 mb-10 text-sm">Active 2D Avatar Character</p>
                
                <div className="w-full aspect-square rounded-[40px] overflow-hidden mb-10 shadow-2xl relative group">
                    <img src="https://images.unsplash.com/photo-1635336064449-d133f6311684?q=80&w=400&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"><Settings className="w-5 h-5" /></button>
                        <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"><Download className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="space-y-6 w-full">
                    <button className="w-full bg-slate-100 py-4 px-6 rounded-2xl font-bold text-slate-700 flex justify-between items-center transition-all hover:bg-slate-200">
                        Character: Nova Crystal
                        <ChevronRight className="w-5 h-5 rotate-90" />
                    </button>
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

const AdminAnalyticsPage = ({ cloud, refreshCloud }: { cloud: CloudState; refreshCloud: () => Promise<void> }) => {
  const stats = cloud.adminStats;
  const metricCards = [
    { label: 'Users', value: stats?.users.total ?? 0, detail: `${stats?.users.active ?? 0} active` },
    { label: 'Devices', value: stats?.devices.total ?? 0, detail: `${stats?.devices.connected ?? 0} connected` },
    { label: 'Assistant Profiles', value: stats?.assistantProfiles.total ?? cloud.profiles.length, detail: `${stats?.assistantProfiles.finalized ?? 0} finalized` },
    { label: 'Cloud API', value: cloud.status === 'connected' ? 'Online' : 'Offline', detail: formatRelativeTime(cloud.lastChecked) },
  ];

  const topSections = [
    { title: 'Top Models', items: stats?.models || [] },
    { title: 'Top Providers', items: stats?.providers || [] },
    { title: 'Assistant Roles', items: stats?.assistantProfiles.useCases || [] },
    { title: 'Local Modes', items: stats?.assistantProfiles.localModes || [] },
    { title: 'Profile Status', items: stats?.assistantProfiles.statuses || [] },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
            Admin Analytics <span className="text-slate-300 font-medium text-2xl">/ 관리자 통계</span>
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
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [connection, setConnection] = useState<ConnectionState>(initialConnection);
  const [cloud, setCloud] = useState<CloudState>(initialCloudState);
  const [action, setAction] = useState<ActionState>({ type: 'idle' });
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [finalizingProfileId, setFinalizingProfileId] = useState<string | null>(null);

  const refreshCloud = async () => {
    const next: CloudState = {
      ...initialCloudState,
      lastChecked: new Date(),
    };

    try {
      await checkCloudApi();
      next.status = 'connected';

      const [profilesResponse, adminStats] = await Promise.all([
        getAssistantProfiles(),
        getAdminStats(),
      ]);

      next.profiles = profilesResponse.profiles || [];
      next.adminStats = adminStats;
    } catch (error) {
      next.status = 'offline';
      next.error = error instanceof Error ? error.message : 'Cloud API is offline.';
    }

    setCloud(next);
  };

  const createCloudProfile = async (profile: AssistantProfileDraft) => {
    setCreatingProfile(true);
    try {
      await createAssistantProfile(profile);
      await refreshCloud();
      setActivePage('profiles');
    } finally {
      setCreatingProfile(false);
    }
  };

  const finalizeCloudProfile = async (profileId: string) => {
    setFinalizingProfileId(profileId);
    try {
      await finalizeAssistantProfile(profileId);
      await refreshCloud();
      setActivePage('profiles');
    } finally {
      setFinalizingProfileId(null);
    }
  };

  const refreshConnection = async () => {
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
        next.ollama = modelState.ollama;
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
          next.ollama = await fetchJson<OllamaStatus>(`${DESKTOP_BRIDGE_URL}/ollama/status`);
        } catch {
          next.ollama = null;
        }
      }
    } catch {
      next.desktop = 'offline';
    }

    setConnection(next);
    setAction({ type: 'idle' });
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

  const pullModel = async (model: string) => {
    setAction({ type: 'pulling-model', model, message: `Preparing ${model} download...`, progress: 0 });
    try {
      void recordUsageEvent('model_selected', model).catch(() => undefined);
      const response = await fetch(`${LOCAL_HELPER_URL}/models/pull`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
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
          });
        }
      }

      setAction({ type: 'pulling-model', model, message: `${model} download complete. Refreshing catalog...`, progress: 100 });
      await refreshConnection();
      await refreshCloud();
    } catch (error) {
      setAction({
        type: 'idle',
        message: error instanceof Error ? error.message : `Failed to download ${model}.`,
      });
    }
  };

  useEffect(() => {
    void refreshConnection();
    void refreshCloud();
  }, []);

  const actions: WebConsoleActions = {
    refreshConnection,
    startOllama,
    pullModel,
  };

  const topStatus = useMemo(() => {
    if (connection.desktop === 'connected' || connection.helper === 'connected' || cloud.status === 'connected') {
      return {
        label: 'Connected / 연결됨',
        dot: 'bg-green-500 status-glow',
        text: 'text-green-700',
        bg: 'bg-green-50',
      };
    }

    if (connection.desktop === 'checking' || connection.helper === 'checking' || cloud.status === 'checking') {
      return {
        label: 'Checking / 확인 중',
        dot: 'bg-amber-400',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
      };
    }

    return {
      label: 'Offline / 연결 안 됨',
      dot: 'bg-red-500',
      text: 'text-red-700',
      bg: 'bg-red-50',
    };
  }, [connection.desktop, connection.helper, cloud.status]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage connection={connection} action={action} actions={actions} />;
      case 'devices': return <DevicesPage connection={connection} actions={actions} />;
      case 'models': return <ModelsPage connection={connection} action={action} actions={actions} />;
      case 'profiles': return (
        <AssistantProfilesPage
          cloud={cloud}
          creatingProfile={creatingProfile}
          finalizingProfileId={finalizingProfileId}
          onCreateProfile={createCloudProfile}
          onFinalizeProfile={finalizeCloudProfile}
        />
      );
      case 'integrations': return <IntegrationsPage />;
      case 'voice': return <VoiceCharacterPage />;
      case 'admin': return <AdminAnalyticsPage cloud={cloud} refreshCloud={refreshCloud} />;
      case 'settings': return <SettingsPage />;
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-surface-bg text-slate-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[280px] border-r border-slate-100 bg-white shadow-xl shadow-slate-200/20 flex flex-col z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-container/30">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-slate-900">MiVA AI</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-tight">Local Management</p>
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full group py-3 px-4 flex items-center gap-3 font-semibold text-sm rounded-xl transition-all active:scale-[0.98] ${
                  activePage === item.id 
                    ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors ${activePage === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                <span className="font-display tracking-tight">{activePage === item.id ? `${item.label} / ${item.labelKr}` : item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-50">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 group cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-50 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Admin User</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Premium Node</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-[280px] flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-50 h-20 flex items-center justify-between px-10">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                placeholder="Search resources or models..." 
                className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary-container focus:bg-white transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full ${topStatus.bg}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${topStatus.dot}`}></span>
              <span className={`text-xs font-bold tracking-tight ${topStatus.text}`}>{topStatus.label}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400 border-l border-slate-100 pl-8">
              <button className="hover:text-slate-900 transition-colors"><Languages className="w-5 h-5" /></button>
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
    </div>
  );
}

const SettingsPage = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
        <div>
            <h2 className="text-3xl font-bold font-display tracking-tight flex items-end gap-3">
                Settings <span className="text-slate-400 text-2xl font-medium">/ 설정</span>
            </h2>
            <p className="text-slate-500 mt-1">Configure your local web console and bridge preferences.</p>
        </div>

        <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-8 space-y-8">
                <Card className="p-10">
                    <h3 className="text-xl font-bold font-display mb-8 flex items-center gap-3">
                         <Settings className="w-5 h-5 text-primary-container" /> Console Preferences
                    </h3>
                    <div className="space-y-10">
                        <section className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-slate-900">Language Selection</h4>
                                <p className="text-sm text-slate-500">Interface language for the management console.</p>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button className="px-6 py-2 rounded-xl bg-white shadow-sm text-primary-container font-bold text-sm">English</button>
                                <button className="px-6 py-2 rounded-xl text-slate-400 font-bold text-sm">Korean</button>
                            </div>
                        </section>
                        <section className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-slate-900">Theme</h4>
                                <p className="text-sm text-slate-500">Visual style of the dashboard.</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 border-primary-container text-primary-container font-bold">
                                    <Lock className="w-4 h-4" /> Dark
                                </button>
                                <button className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 border-slate-100 text-slate-400 font-bold">
                                    <Lock className="w-4 h-4" /> Light
                                </button>
                            </div>
                        </section>
                    </div>
                </Card>
                
                <Card className="p-8 border-red-50 border-[3px] bg-red-50/10">
                    <h3 className="text-xl font-bold font-display mb-2 text-red-600">System Maintenance</h3>
                    <div className="flex justify-between items-center bg-white p-6 rounded-[24px] border border-red-100">
                        <div>
                            <p className="font-bold text-slate-900">Reset web console state</p>
                            <p className="text-sm text-slate-500">Clear all local storage preferences and cache.</p>
                        </div>
                        <button className="bg-red-500 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-red-500/20 active:scale-95 transition-all">Reset Now</button>
                    </div>
                </Card>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-slate-900 text-white p-10 rounded-[32px] relative overflow-hidden group">
                     <ShieldCheck className="w-12 h-12 mb-6" />
                     <h4 className="text-2xl font-bold font-display mb-4">Local-First Privacy</h4>
                     <p className="text-slate-400 text-sm leading-relaxed mb-10">MiVA is built on the Local-First Manifesto. Your data never leaves your machine unless you explicitly configure a bridge.</p>
                     <button className="flex items-center gap-2 font-black text-xs uppercase tracking-widest border-b-2 border-white/20 pb-2 hover:border-white transition-all">Read the Manifesto <ChevronRight className="w-4 h-4" /></button>
                     <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-primary-container/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary-container/30 transition-all"></div>
                </div>
                
                <Card className="border-l-4 border-green-500 p-8 space-y-6">
                    <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">Node Health</span>
                    <div className="space-y-4">
                        {[
                            { l: 'Local Bridge', v: 'Active', c: 'text-green-500' },
                            { l: 'Sync Status', v: 'Synchronized', c: 'text-slate-900' },
                            { l: 'Version', v: 'v2.4.1-stable', c: 'text-slate-400 font-mono' },
                        ].map((s, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">{s.l}</span>
                                <span className={`text-sm font-bold ${s.c}`}>{s.v}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    </motion.div>
);
