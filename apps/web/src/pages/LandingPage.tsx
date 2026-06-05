import type { ReactNode } from 'react';
import type { WebMessages } from '../i18n/messages';
import { LanguageToggle, useLocale } from '../i18n/locale';
import {
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Settings2,
  ShieldAlert,
  Sparkles,
  Star,
} from 'lucide-react';

type LandingPageProps = {
  onGetStarted: () => void;
};

function MivaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? '' : ''}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container text-white shadow-md shadow-primary-container/25">
        <span className="font-display text-lg font-black leading-none">M</span>
      </div>
      <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">miva</span>
    </div>
  );
}

function LandingNav({
  landing,
  onGetStarted,
}: {
  landing: WebMessages['landing'];
  onGetStarted: () => void;
}) {
  const links = [
    { href: '#problems', label: landing.navProblems },
    { href: '#features', label: landing.navFeatures },
    { href: '#reviews', label: landing.navReviews },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-6 lg:px-8">
        <a href="#" className="shrink-0">
          <MivaLogo />
        </a>

        <nav className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <button
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
            onClick={onGetStarted}
            type="button"
          >
            {landing.startFree}
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroSection({
  landing,
  onGetStarted,
}: {
  landing: WebMessages['landing'];
  onGetStarted: () => void;
}) {
  return (
    <section className="relative overflow-hidden px-6 pb-10 pt-16 lg:px-8 lg:pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] miva-hero-glow" />

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-container bg-secondary-container px-4 py-1.5 text-sm font-semibold text-on-secondary-container">
          <Sparkles className="h-4 w-4" />
          {landing.heroBadge}
        </div>

        <h1 className="mt-8 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.35rem]">
          {landing.heroTitle1}
          <br />
          {landing.heroTitle2Prefix} <span className="text-primary-container">{landing.heroTitle2Brand}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
          {landing.heroBody1}
          <br className="hidden sm:block" />
          {landing.heroBody2}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            className="rounded-full bg-primary-container px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary-container/25 transition hover:bg-primary-hover active:scale-[0.98]"
            onClick={onGetStarted}
            type="button"
          >
            {landing.heroPrimaryCta}
          </button>
          <a
            className="rounded-full border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href="#features"
          >
            {landing.heroSecondaryCta}
          </a>
        </div>
      </div>

      <div className="relative mx-auto mt-14 max-w-5xl">
        <AppMockup landing={landing} />
      </div>
    </section>
  );
}

function AppMockup({ landing }: { landing: WebMessages['landing'] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-surface-bg p-3 shadow-[0_24px_60px_rgba(37,99,235,0.08)] sm:p-4">
      <div className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-[#f8fafc] shadow-sm">
        <div className="flex min-h-[360px] sm:min-h-[420px]">
          <aside className="hidden w-[220px] shrink-0 border-r border-slate-200/70 bg-white p-5 sm:block">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-container text-xs font-black text-white">M</div>
              <span className="text-sm font-bold text-slate-800">{landing.mockHome}</span>
            </div>
            <div className="mt-8 space-y-3">
              {[88, 72, 96, 64].map((width) => (
                <div key={width} className="h-2.5 rounded-full bg-slate-100" style={{ width: `${width}%` }} />
              ))}
            </div>
            <div className="mt-10 space-y-2">
              <div className="h-9 rounded-xl bg-secondary-container" />
              <div className="h-9 rounded-xl bg-slate-100" />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-[#fbfcfe] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="h-3 w-28 rounded-full bg-slate-200" />
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-100" />
                <div className="h-8 w-8 rounded-full bg-slate-100" />
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-9 w-9 shrink-0 rounded-full bg-slate-200" />
                <div className="rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3">
                  <div className="h-2.5 w-44 rounded-full bg-slate-200" />
                  <div className="mt-2 h-2.5 w-32 rounded-full bg-slate-200/80" />
                </div>
              </div>
              <div className="flex items-start justify-end gap-3">
                <div className="rounded-2xl rounded-tr-md bg-accent-container px-4 py-3">
                  <div className="h-2.5 w-36 rounded-full bg-primary-container/30" />
                </div>
                <div className="mt-1 h-9 w-9 shrink-0 rounded-full bg-primary-container" />
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <span className="flex-1 text-left text-sm text-slate-400">{landing.mockPlaceholder}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-white">
                  <Send className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProblemsSection({ landing }: { landing: WebMessages['landing'] }) {
  const problems = [
    {
      icon: Clock3,
      tone: 'bg-orange-50 text-orange-500',
      title: landing.problem1Title,
      body: landing.problem1Body,
    },
    {
      icon: Settings2,
      tone: 'bg-violet-50 text-violet-500',
      title: landing.problem2Title,
      body: landing.problem2Body,
    },
    {
      icon: ShieldAlert,
      tone: 'bg-rose-50 text-rose-500',
      title: landing.problem3Title,
      body: landing.problem3Body,
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-8" id="problems">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {landing.problemsTitle}
        </h2>
        <div className="mx-auto mt-5 h-1 w-16 rounded-full bg-primary-container" />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {problems.map((problem) => (
            <article
              key={problem.title}
              className="rounded-[24px] border border-slate-100 bg-white p-8 text-left shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${problem.tone}`}>
                <problem.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-lg font-bold leading-8 text-slate-900">{problem.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-500">{problem.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

type ServiceSectionProps = {
  badge: string;
  title: string;
  description: string[];
  benefit: string;
  benefitLabel: string;
  reverse?: boolean;
  illustration: ReactNode;
};

function ServiceSection({ badge, title, description, benefit, benefitLabel, reverse = false, illustration }: ServiceSectionProps) {
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reverse ? '' : ''}`}>
      <div className={reverse ? 'lg:order-2' : ''}>
        <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-primary-container">{badge}</span>
        <h3 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900">{title}</h3>
        <div className="mt-5 space-y-3 text-sm leading-7 text-slate-500 sm:text-base">
          {description.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="mt-8 rounded-[20px] bg-secondary-container/70 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">{benefitLabel}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{benefit}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-[28px] bg-feature-panel p-6 sm:p-8 ${reverse ? 'lg:order-1' : ''}`}>{illustration}</div>
    </div>
  );
}

function InstallIllustration({ progressLabel }: { progressLabel: string }) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
      <div className="mb-5 flex gap-2">
        <span className="h-3 w-3 rounded-full bg-rose-300" />
        <span className="h-3 w-3 rounded-full bg-amber-300" />
        <span className="h-3 w-3 rounded-full bg-emerald-300" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-4 rounded-2xl bg-slate-50 px-4 py-3">
            <div className={`h-10 w-10 rounded-xl ${row === 1 ? 'bg-primary-container' : 'bg-slate-200'}`} />
            <div className="flex-1">
              <div className="h-2.5 rounded-full bg-slate-200" style={{ width: `${70 - row * 8}%` }} />
            </div>
            {row === 1 && <span className="text-xs font-bold text-primary-container">{progressLabel}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomizeIllustration({
  roleLabel,
  instructionsLabel,
}: {
  roleLabel: string;
  instructionsLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary-container" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded-full bg-slate-900" />
          <div className="h-2.5 w-32 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="mt-8 space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{roleLabel}</p>
          <div className="mt-2 h-10 rounded-xl bg-slate-100" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{instructionsLabel}</p>
          <div className="mt-2 space-y-2">
            <div className="h-2.5 w-full rounded-full bg-slate-100" />
            <div className="h-2.5 w-[88%] rounded-full bg-slate-100" />
            <div className="h-2.5 w-[72%] rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsIllustration({
  title,
  files,
}: {
  title: string;
  files: Array<{ name: string; tone: string; loading?: boolean }>;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white p-6 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900">{title}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-primary-container">+</div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {files.map((file) => (
          <div
            key={file.name}
            className={`rounded-2xl border p-4 text-center ${file.loading ? 'border-primary-container bg-secondary-container/40' : 'border-slate-100 bg-slate-50'}`}
          >
            {file.loading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-container" />
            ) : (
              <FileText className={`mx-auto h-8 w-8 ${file.tone}`} />
            )}
            <p className="mt-3 text-xs font-semibold text-slate-700">{file.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesSection({ landing }: { landing: WebMessages['landing'] }) {
  return (
    <section className="bg-white px-6 py-20 lg:px-8" id="features">
      <div className="mx-auto max-w-6xl space-y-24">
        <ServiceSection
          badge={landing.service01Badge}
          title={landing.service01Title}
          description={[landing.service01Body1, landing.service01Body2]}
          benefit={landing.service01Benefit}
          benefitLabel={landing.benefitLabel}
          illustration={<InstallIllustration progressLabel={landing.installProgress} />}
        />

        <ServiceSection
          badge={landing.service02Badge}
          title={landing.service02Title}
          description={[landing.service02Body1, landing.service02Body2]}
          benefit={landing.service02Benefit}
          benefitLabel={landing.benefitLabel}
          reverse
          illustration={<CustomizeIllustration roleLabel={landing.roleLabel} instructionsLabel={landing.instructionsLabel} />}
        />

        <ServiceSection
          badge={landing.service03Badge}
          title={landing.service03Title}
          description={[landing.service03Body1, landing.service03Body2]}
          benefit={landing.service03Benefit}
          benefitLabel={landing.benefitLabel}
          illustration={
            <DocumentsIllustration
              title={landing.knowledgeBase}
              files={[
                { name: landing.fileContract, tone: 'text-rose-500' },
                { name: landing.fileManual, tone: 'text-primary-container' },
                { name: landing.fileLearning, tone: 'text-primary-container', loading: true },
              ]}
            />
          }
        />
      </div>
    </section>
  );
}

function TestimonialsSection({ landing }: { landing: WebMessages['landing'] }) {
  const reviews = [
    {
      quote: landing.review1Quote,
      name: landing.review1Name,
      role: landing.review1Role,
      initial: landing.review1Name.charAt(0),
      avatarTone: 'bg-primary-container',
    },
    {
      quote: landing.review2Quote,
      name: landing.review2Name,
      role: landing.review2Role,
      initial: landing.review2Name.charAt(0),
      avatarTone: 'bg-slate-700',
    },
  ];

  return (
    <section className="px-6 py-20 lg:px-8" id="reviews">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] miva-reviews-gradient px-6 py-16 sm:px-10 sm:py-20">
        <div className="text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {landing.reviewsTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100/80 sm:text-base">
            {landing.reviewsBody}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="rounded-[24px] border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
            >
              <div className="flex gap-1 text-primary-light">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-6 text-base leading-8 text-white/95">&ldquo;{review.quote}&rdquo;</p>
              <div className="mt-8 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${review.avatarTone}`}>
                  {review.initial}
                </div>
                <div>
                  <p className="font-bold text-white">{review.name}</p>
                  <p className="text-sm text-blue-100/70">{review.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-blue-100/50">
          {landing.reviewsDisclaimer}
        </p>
      </div>
    </section>
  );
}

function FinalCtaSection({
  landing,
  onGetStarted,
}: {
  landing: WebMessages['landing'];
  onGetStarted: () => void;
}) {
  return (
    <section className="px-6 pb-10 pt-4 lg:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] miva-cta-gradient px-6 py-16 text-center sm:px-10 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />

        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {landing.ctaTitle1}
            <br />
            {landing.ctaTitle2}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            {landing.ctaBody}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-primary-container transition hover:bg-secondary-container active:scale-[0.98]"
              onClick={onGetStarted}
              type="button"
            >
              {landing.ctaPrimary}
            </button>
            <button
              className="rounded-full border border-white/70 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
              onClick={onGetStarted}
              type="button"
            >
              {landing.ctaSecondary}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFooter({
  landing,
  languageKo,
  languageEn,
  locale,
  onSelectLocale,
}: {
  landing: WebMessages['landing'];
  languageKo: string;
  languageEn: string;
  locale: 'ko' | 'en';
  onSelectLocale: (locale: 'ko' | 'en') => void;
}) {
  const columns = [
    {
      title: landing.footerProduct,
      links: [landing.footerFeatures, landing.footerUpdates, landing.footerRoadmap],
    },
    {
      title: landing.footerCommunity,
      links: [landing.footerDiscord, landing.footerTwitter, landing.footerGithub],
    },
    {
      title: landing.footerSupport,
      links: [landing.footerSupportCenter, landing.footerPrivacy, landing.footerTerms],
    },
  ];

  return (
    <footer className="border-t border-slate-100 bg-surface-bg px-6 py-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <MivaLogo compact />
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
              {landing.footerBody}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-sm font-bold text-slate-900">{column.title}</p>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a className="text-sm text-slate-500 transition hover:text-slate-800" href="#">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center">
          <p>{landing.footerCopyright}</p>
          <div className="flex gap-4">
            <button
              className={locale === 'ko' ? 'font-semibold text-slate-700' : 'transition hover:text-slate-700'}
              onClick={() => onSelectLocale('ko')}
              type="button"
            >
              {languageKo}
            </button>
            <button
              className={locale === 'en' ? 'font-semibold text-slate-700' : 'transition hover:text-slate-700'}
              onClick={() => onSelectLocale('en')}
              type="button"
            >
              {languageEn}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const { copy, locale, setLocale } = useLocale();
  const landing = copy.landing;

  return (
    <div className="min-h-screen bg-surface-elevated text-slate-900">
      <LandingNav landing={landing} onGetStarted={onGetStarted} />
      <main>
        <HeroSection landing={landing} onGetStarted={onGetStarted} />
        <ProblemsSection landing={landing} />
        <FeaturesSection landing={landing} />
        <TestimonialsSection landing={landing} />
        <FinalCtaSection landing={landing} onGetStarted={onGetStarted} />
      </main>
      <LandingFooter
        landing={landing}
        languageKo={copy.languageKo}
        languageEn={copy.languageEn}
        locale={locale}
        onSelectLocale={setLocale}
      />
    </div>
  );
}
