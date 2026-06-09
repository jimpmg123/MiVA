import { motion } from 'motion/react';
import { BookOpen, Bookmark, Download, Moon, Palette, Sparkles } from 'lucide-react';
import { useLocale } from '../i18n/locale';
import type { SavedPreset } from '../services/personaLocal';

const iconMap = {
  desk: Sparkles,
  tutor: BookOpen,
  focus: Moon,
  character: Palette,
} as const;

const accentMap = {
  desk: 'bg-blue-100 text-primary-container dark:bg-blue-950/70 dark:text-blue-300',
  tutor: 'bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300',
  focus: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  character: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300',
} as const;

export function SavedAssistantsPage({
  savedPresets,
  onRemove,
  onGoToHub,
}: {
  savedPresets: SavedPreset[];
  onRemove: (id: string) => void;
  onGoToHub: () => void;
}) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <span className="text-primary-container font-bold text-xs uppercase tracking-widest block mb-1">
          {t('Persona Hub', 'Persona Hub')}
        </span>
        <h2 className="text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-slate-100">
          {t('저장한 공유 비서', 'Saved shared assistants')}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {t(
            'Persona Hub에서 저장(Save)한 공유 비서 프리셋이 여기에 모입니다. 이후 내 로컬 앱으로 동기화할 수 있게 됩니다.',
            'Shared assistant presets you saved from the Persona Hub collect here. Syncing them to your local app is coming soon.',
          )}
        </p>
      </div>

      {savedPresets.length === 0 ? (
        <div className="miva-card flex min-h-[320px] flex-col items-center justify-center p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-300">
            <Bookmark className="h-7 w-7" />
          </div>
          <h3 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            {t('아직 저장한 비서가 없어요', 'No saved assistants yet')}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {t(
              'Persona Hub에서 마음에 드는 프리셋을 열고 Save를 누르면 여기에 표시됩니다.',
              'Open a preset you like in the Persona Hub and press Save to see it here.',
            )}
          </p>
          <button
            type="button"
            onClick={onGoToHub}
            className="mt-6 rounded-2xl bg-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary-container/20 transition hover:opacity-90"
          >
            {t('Persona Hub 둘러보기', 'Browse the Persona Hub')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {savedPresets.map((preset) => {
            const Icon = iconMap[preset.icon] ?? Sparkles;
            return (
              <div key={preset.id} className="miva-card flex flex-col p-6">
                <div className="flex min-w-0 items-start gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] ${accentMap[preset.icon] ?? accentMap.desk}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-display text-lg font-bold text-slate-900 dark:text-slate-100">{preset.title}</h3>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">@{preset.author}</p>
                    <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-slate-500 dark:text-slate-400">{preset.description}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{t('음성', 'Voice')}</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{preset.voice}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400">{t('캐릭터', 'Character')}</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{preset.character}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    disabled
                    title={t('곧 지원될 기능입니다', 'Coming soon')}
                    className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-400 dark:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    {t('로컬 앱으로 동기화', 'Sync to local app')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(preset.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 active:scale-[0.98] dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    <Bookmark className="h-4 w-4 fill-current" />
                    {t('저장 취소', 'Unsave')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
