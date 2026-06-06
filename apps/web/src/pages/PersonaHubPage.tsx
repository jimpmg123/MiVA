import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AudioLines,
  Bookmark,
  BookOpen,
  Download,
  Grid3x3,
  Heart,
  List,
  MessageSquare,
  Moon,
  Palette,
  Play,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Upload,
  Users,
} from 'lucide-react';
import { useLocale } from '../i18n/locale';
import type { WebMessages } from '../i18n/messages';

type PersonaHubFilter = 'trending' | 'new' | 'voice' | 'character';
type PersonaHubView = 'grid' | 'table';
type PresetIcon = WebMessages['personaHub']['presets'][number]['icon'];

const presetIconMap = {
  desk: Sparkles,
  tutor: BookOpen,
  focus: Moon,
  character: Palette,
} satisfies Record<PresetIcon, typeof Sparkles>;

const presetAccentMap = {
  desk: 'bg-blue-100 text-primary-container dark:bg-blue-950/70 dark:text-blue-300',
  tutor: 'bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300',
  focus: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  character: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300',
} satisfies Record<PresetIcon, string>;

function formatRelativeTime(date: Date, locale: 'ko' | 'en') {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return locale === 'ko' ? '방금' : 'just now';
  if (minutes < 60) return locale === 'ko' ? `${minutes}분 전` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === 'ko' ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === 'ko' ? `${days}일 전` : `${days}d ago`;
  return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
}

function HubBadge({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'active' }) {
  const styles = {
    info: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    active: 'bg-primary-container text-white',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[variant]}`}>
      {children}
    </span>
  );
}

function HubCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-50 bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] dark:border-[#243044] dark:bg-[#111827] dark:shadow-[0px_4px_20px_rgba(0,0,0,0.35)] ${className}`}>
      {children}
    </div>
  );
}

function PresetAvatar({ icon, size = 'md' }: { icon: PresetIcon; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = presetIconMap[icon];
  const sizeClass = size === 'sm' ? 'h-10 w-10 rounded-2xl' : size === 'lg' ? 'h-20 w-20 rounded-[28px]' : 'h-16 w-16 rounded-[24px]';
  const iconSize = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-9 w-9' : 'h-7 w-7';
  return (
    <div className={`flex shrink-0 items-center justify-center ${sizeClass} ${presetAccentMap[icon]}`}>
      <Icon className={iconSize} />
    </div>
  );
}

export function PersonaHubPage() {
  const { copy, locale } = useLocale();
  const hub = copy.personaHub;
  const [personaFilter, setPersonaFilter] = useState<PersonaHubFilter>('trending');
  const [personaView, setPersonaView] = useState<PersonaHubView>('table');
  const [selectedPresetId, setSelectedPresetId] = useState(hub.presets[0]?.id ?? '');
  const [draftComment, setDraftComment] = useState('');
  const [likedPresetIds, setLikedPresetIds] = useState<string[]>([]);
  const [bookmarkedPresetIds, setBookmarkedPresetIds] = useState<string[]>(['preset-nova']);

  const filteredPresets = useMemo(() => {
    const sorted = [...hub.presets];
    if (personaFilter === 'new') {
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    if (personaFilter === 'voice') {
      return sorted.filter((preset) => preset.voiceFocused);
    }
    if (personaFilter === 'character') {
      return sorted.filter((preset) => preset.characterFocused || preset.useCase === 'character');
    }
    return sorted.sort((a, b) => b.downloads - a.downloads);
  }, [hub.presets, personaFilter]);

  const selectedPreset = filteredPresets.find((preset) => preset.id === selectedPresetId) ?? filteredPresets[0] ?? null;

  const formatSharedBy = (author: string, updatedAt: string) => (
    hub.sharedBy
      .replace('{author}', author)
      .replace('{time}', formatRelativeTime(new Date(updatedAt), locale))
  );

  const togglePresetLike = (presetId: string) => {
    setLikedPresetIds((current) => (
      current.includes(presetId) ? current.filter((id) => id !== presetId) : [...current, presetId]
    ));
  };

  const togglePresetBookmark = (presetId: string) => {
    setBookmarkedPresetIds((current) => (
      current.includes(presetId) ? current.filter((id) => id !== presetId) : [...current, presetId]
    ));
  };

  const personaHubFilters: Array<{ id: PersonaHubFilter; label: string }> = [
    { id: 'trending', label: hub.filters.trending },
    { id: 'new', label: hub.filters.new },
    { id: 'voice', label: hub.filters.voice },
    { id: 'character', label: hub.filters.character },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="rounded-[28px] border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-blue-50 p-6 md:p-8 dark:border-[#243044] dark:from-[#141C2E] dark:via-[#111827] dark:to-[#1A2740]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <HubBadge variant="warning">{hub.previewBadge}</HubBadge>
              <HubBadge>{hub.notConnectedBadge}</HubBadge>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{hub.title}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">{hub.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 dark:bg-[#1E293B] dark:text-slate-200 dark:ring-[#243044] dark:hover:bg-[#243044]">
              <Share2 className="h-4 w-4" />
              {hub.sharePreset}
            </button>
            <button type="button" className="flex items-center gap-2 rounded-2xl bg-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-container/20 transition-all hover:opacity-90">
              <Upload className="h-4 w-4" />
              {hub.uploadBundle}
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-12 gap-8">
        <HubCard className="col-span-12 min-w-0 xl:col-span-7 p-0 overflow-hidden">
          <div className="border-b border-slate-100 p-6 dark:border-[#243044] md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">{hub.browseTitle}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hub.browseBody}</p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-[#172033]">
                <button
                  type="button"
                  onClick={() => setPersonaView('table')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${personaView === 'table' ? 'bg-white text-primary-container shadow-sm dark:bg-[#1E293B] dark:text-blue-300' : 'text-slate-400'}`}
                >
                  <List className="h-3.5 w-3.5" />
                  {hub.tableView}
                </button>
                <button
                  type="button"
                  onClick={() => setPersonaView('grid')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${personaView === 'grid' ? 'bg-white text-primary-container shadow-sm dark:bg-[#1E293B] dark:text-blue-300' : 'text-slate-400'}`}
                >
                  <Grid3x3 className="h-3.5 w-3.5" />
                  {hub.cardsView}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {personaHubFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setPersonaFilter(filter.id)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${personaFilter === filter.id ? 'bg-primary-container text-white shadow-md shadow-primary-container/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-[#1E293B] dark:text-slate-400 dark:hover:bg-[#243044]'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {personaView === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50 dark:border-[#243044] dark:bg-[#172033]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{hub.table.preset}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{hub.table.author}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{hub.table.voice}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{hub.table.character}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{hub.table.downloads}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{hub.table.comments}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-[#243044]">
                  {filteredPresets.map((preset) => {
                    const isSelected = selectedPreset?.id === preset.id;
                    return (
                      <tr
                        key={preset.id}
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary-container/5 dark:bg-primary-container/15' : 'hover:bg-slate-50/80 dark:hover:bg-[#172033]/80'}`}
                      >
                        <td className="max-w-[220px] px-6 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <PresetAvatar icon={preset.icon} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 break-words text-sm font-bold text-slate-800 dark:text-slate-100">{preset.title}</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {preset.featured && <HubBadge variant="warning">{hub.featured}</HubBadge>}
                                <HubBadge>{hub.useCases[preset.useCase]}</HubBadge>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[120px] truncate px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">@{preset.author}</td>
                        <td className="max-w-[140px] px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="line-clamp-2 break-words">{preset.voice}</span>
                        </td>
                        <td className="max-w-[140px] px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="line-clamp-2 break-words">{preset.character}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">{preset.downloads.toLocaleString(locale)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">{preset.commentCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 p-6 md:grid-cols-2">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`min-w-0 w-full overflow-hidden rounded-[28px] border p-5 text-left transition-all ${isSelected ? 'border-primary-container bg-primary-container/5 shadow-lg shadow-primary-container/10 dark:bg-primary-container/15' : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white dark:border-[#243044] dark:bg-[#172033] dark:hover:border-slate-700 dark:hover:bg-[#1E293B]'}`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <PresetAvatar icon={preset.icon} />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="line-clamp-2 break-words text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">{preset.title}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">@{preset.author}</p>
                        <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
                          {preset.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="max-w-full break-words rounded-full bg-white px-2 py-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-[#1E293B] dark:text-slate-400 dark:ring-[#243044]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid min-w-0 grid-cols-3 gap-2 text-center">
                      <div className="min-w-0 overflow-hidden rounded-2xl bg-white px-2 py-2 dark:bg-[#1E293B]">
                        <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-400">{hub.table.downloads}</p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{preset.downloads.toLocaleString(locale)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden rounded-2xl bg-white px-2 py-2 dark:bg-[#1E293B]">
                        <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-400">{hub.table.likes}</p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{preset.likes}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden rounded-2xl bg-white px-2 py-2 dark:bg-[#1E293B]">
                        <p className="truncate text-[9px] font-black uppercase tracking-wide text-slate-400">{hub.table.comments}</p>
                        <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{preset.commentCount}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </HubCard>

        <HubCard className="col-span-12 xl:col-span-5 p-0 overflow-hidden">
          {selectedPreset ? (
            <>
              <div className="border-b border-slate-100 p-6 dark:border-[#243044] md:p-8">
                <div className="flex items-start gap-4">
                  <PresetAvatar icon={selectedPreset.icon} size="lg" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPreset.featured && <HubBadge variant="warning">{hub.featured}</HubBadge>}
                      <HubBadge variant="active">{hub.useCases[selectedPreset.useCase]}</HubBadge>
                    </div>
                    <h4 className="mt-2 break-words font-display text-xl font-bold text-slate-900 dark:text-slate-100">{selectedPreset.title}</h4>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {formatSharedBy(selectedPreset.author, selectedPreset.updatedAt)}
                    </p>
                    <p className="mt-4 break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">{selectedPreset.description}</p>
                  </div>
                </div>

                <div className="mt-6 grid min-w-0 grid-cols-2 gap-3">
                  <div className="min-w-0 overflow-hidden rounded-2xl bg-slate-50 px-4 py-3 dark:bg-[#172033]">
                    <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{hub.voiceLabel}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-100">{selectedPreset.voice}</p>
                  </div>
                  <div className="min-w-0 overflow-hidden rounded-2xl bg-slate-50 px-4 py-3 dark:bg-[#172033]">
                    <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{hub.characterLabel}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-100">{selectedPreset.character}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" className="flex items-center gap-2 rounded-2xl bg-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-container/20">
                    <Download className="h-4 w-4" />
                    {hub.importDesktop}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePresetLike(selectedPreset.id)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${likedPresetIds.includes(selectedPreset.id) ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1E293B] dark:text-slate-300 dark:hover:bg-[#243044]'}`}
                  >
                    <Heart className={`h-4 w-4 ${likedPresetIds.includes(selectedPreset.id) ? 'fill-current' : ''}`} />
                    {selectedPreset.likes + (likedPresetIds.includes(selectedPreset.id) ? 1 : 0)}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePresetBookmark(selectedPreset.id)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${bookmarkedPresetIds.includes(selectedPreset.id) ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1E293B] dark:text-slate-300 dark:hover:bg-[#243044]'}`}
                  >
                    <Bookmark className={`h-4 w-4 ${bookmarkedPresetIds.includes(selectedPreset.id) ? 'fill-current' : ''}`} />
                    {hub.save}
                  </button>
                  <button type="button" className="flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-[#1E293B] dark:text-slate-300 dark:hover:bg-[#243044]">
                    <Play className="h-4 w-4" />
                    {hub.previewVoice}
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-100 px-6 py-4 dark:border-[#243044] md:px-8">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h5 className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <MessageSquare className="h-4 w-4 shrink-0 text-primary-container" />
                    <span className="truncate">{hub.commentsTitle} ({selectedPreset.comments.length})</span>
                  </h5>
                  <span className="shrink-0 text-right text-[10px] font-semibold leading-tight text-slate-400 md:text-xs">{hub.asyncThread}</span>
                </div>
              </div>

              <div className="max-h-[360px] space-y-4 overflow-y-auto p-6 md:p-8">
                {selectedPreset.comments.map((comment) => (
                  <div key={comment.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 dark:border-[#243044] dark:bg-[#172033]">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">@{comment.author}</p>
                      <p className="shrink-0 text-xs font-semibold text-slate-400">{formatRelativeTime(new Date(comment.createdAt), locale)}</p>
                    </div>
                    <p className="mt-2 break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">{comment.body}</p>
                    <button type="button" className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary-container">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {comment.likes} {hub.helpful}
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 p-6 dark:border-[#243044] dark:bg-[#172033] md:p-8">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{hub.leaveComment}</label>
                <div className="mt-3 flex gap-3">
                  <input
                    value={draftComment}
                    onChange={(event) => setDraftComment(event.target.value)}
                    placeholder={hub.commentPlaceholder}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-primary-container/20 transition-all focus:ring-4 dark:border-[#243044] dark:bg-[#1E293B] dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setDraftComment('')}
                    className="flex items-center gap-2 rounded-2xl bg-primary-container px-5 py-3 text-sm font-bold text-white"
                  >
                    <Send className="h-4 w-4" />
                    {hub.post}
                  </button>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-400">{hub.mockCommentNote}</p>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center p-10 text-center text-slate-400 dark:text-slate-500">
              {hub.selectPreset}
            </div>
          )}
        </HubCard>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {hub.steps.map((step, index) => {
          const StepIcon = index === 0 ? Upload : index === 1 ? Users : AudioLines;
          return (
            <HubCard key={step.title} className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container/10 text-primary-container dark:bg-primary-container/20">
                  <StepIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{step.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{step.body}</p>
                </div>
              </div>
            </HubCard>
          );
        })}
      </div>
    </motion.div>
  );
}
