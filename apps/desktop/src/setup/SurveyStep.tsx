import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../i18n";
import type { AnswerStyle, FutureFeature, LanguageUse, LocalMode, MemorySyncMode, Priority, SurveyState, UseCase } from "../types";
import { Panel, PrimaryButton, SecondaryButton } from "../components/ui";

type SurveyQuestionId = "useCase" | "answerStyle" | "priority" | "languageUse" | "localMode" | "futureFeatures" | "memorySyncMode";

type SurveyOption = {
  id: string;
  titleKey?: string;
  bodyKey?: string;
  title?: Record<Locale, string>;
  body?: Record<Locale, string>;
  icon: string;
};

type SurveyQuestion = {
  id: SurveyQuestionId;
  titleKey: string;
  helperKey: string;
  multi: boolean;
  columns: string;
  options: SurveyOption[];
};

type SurveyStepProps = {
  activeLocale: Locale;
  survey: SurveyState;
  surveyQuestionIndex: number;
  surveyQuestions: SurveyQuestion[];
  surveyTipContentVisible: boolean;
  surveyTipExpanded: boolean;
  t: Record<string, string>;
  enterSettings: (section: "general") => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setSurvey: Dispatch<SetStateAction<SurveyState>>;
  setSurveyQuestionIndex: Dispatch<SetStateAction<number>>;
  setSurveyTipExpanded: Dispatch<SetStateAction<boolean>>;
};

export function SurveyStep({
  activeLocale,
  survey,
  surveyQuestionIndex,
  surveyQuestions,
  surveyTipContentVisible,
  surveyTipExpanded,
  t,
  enterSettings,
  goToNextStep,
  goToPreviousStep,
  setSurvey,
  setSurveyQuestionIndex,
  setSurveyTipExpanded,
}: SurveyStepProps) {
  const ACTIVE_LOCALE = activeLocale;
const question = surveyQuestions[surveyQuestionIndex] ?? surveyQuestions[0];
    const isLastQuestion = surveyQuestionIndex === surveyQuestions.length - 1;
    const progress = ((surveyQuestionIndex + 1) / surveyQuestions.length) * 100;

    function isOptionSelected(questionId: SurveyQuestionId, optionId: string) {
      if (questionId === "useCase") return survey.useCase === optionId;
      if (questionId === "answerStyle") return survey.answerStyle === optionId;
      if (questionId === "priority") return survey.priority === optionId;
      if (questionId === "languageUse") return survey.languageUse === optionId;
      if (questionId === "localMode") return survey.localMode === optionId;
      if (questionId === "memorySyncMode") return survey.memorySyncMode === optionId;
      return survey.futureFeatures.includes(optionId as FutureFeature);
    }

    function questionAnswered(questionId: SurveyQuestionId) {
      if (questionId === "useCase") return survey.useCase !== null;
      if (questionId === "answerStyle") return survey.answerStyle !== null;
      if (questionId === "priority") return survey.priority !== null;
      if (questionId === "languageUse") return survey.languageUse !== null;
      if (questionId === "localMode") return survey.localMode !== null;
      if (questionId === "memorySyncMode") return survey.memorySyncMode !== null;
      return survey.futureFeatures.length > 0;
    }

    function selectOption(questionId: SurveyQuestionId, optionId: string) {
      setSurvey((current) => {
        if (questionId === "useCase") return { ...current, useCase: optionId as UseCase };
        if (questionId === "answerStyle") return { ...current, answerStyle: optionId as AnswerStyle };
        if (questionId === "priority") return { ...current, priority: optionId as Priority };
        if (questionId === "languageUse") return { ...current, languageUse: optionId as LanguageUse };
        if (questionId === "localMode") return { ...current, localMode: optionId as LocalMode };
        if (questionId === "memorySyncMode") return { ...current, memorySyncMode: optionId as MemorySyncMode };

        const feature = optionId as FutureFeature;
        if (feature === "unsure") {
          return { ...current, futureFeatures: ["unsure"] };
        }

        const withoutUnsure = current.futureFeatures.filter((item) => item !== "unsure");
        const exists = withoutUnsure.includes(feature);
        return {
          ...current,
          futureFeatures: exists ? withoutUnsure.filter((item) => item !== feature) : [...withoutUnsure, feature],
        };
      });
    }

    function moveSurveyBack() {
      if (surveyQuestionIndex === 0) {
        goToPreviousStep();
        return;
      }

      setSurveyQuestionIndex((current) => Math.max(current - 1, 0));
    }

    function moveSurveyNext() {
      if (isLastQuestion) {
        goToNextStep();
        return;
      }

      setSurveyQuestionIndex((current) => Math.min(current + 1, surveyQuestions.length - 1));
    }

    return (
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">
            {t.surveyProgress} {surveyQuestionIndex + 1} / {surveyQuestions.length}
          </p>
          <h2 className="mt-3 font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.surveyPageTitle}</h2>
          <p className="mt-2 max-w-[720px] text-base leading-7 text-[#42474d]">{t.surveyBody}</p>
          <h3 className="mt-8 font-heading text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t[question.titleKey]}</h3>
          <p className="mt-1 text-sm leading-5 text-[#72787e]">{t[question.helperKey]}</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e1e3e4]">
            <div className="h-full rounded-full bg-[#35607f] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-6">
          <Panel className="flex min-h-[500px] flex-col">
            <div className={`grid ${question.columns} gap-4`}>
              {question.options.map((option) => {
                const active = isOptionSelected(question.id, option.id);
                const optionTitle = option.title?.[ACTIVE_LOCALE] ?? (option.titleKey ? t[option.titleKey] : "");
                const optionBody = option.body?.[ACTIVE_LOCALE] ?? (option.bodyKey ? t[option.bodyKey] : "");

                return (
                  <button
                    className={`group relative flex min-h-[150px] flex-col items-start rounded-xl border bg-white p-6 text-left shadow-sm transition-all duration-200 active:scale-[0.98] ${
                      active
                        ? "border-[#35607f] bg-[#cae6ff]/20 shadow-md ring-4 ring-[#cae6ff]"
                        : "border-[#c2c7ce] hover:border-[#35607f] hover:shadow-md"
                    }`}
                    key={option.id}
                    onClick={() => selectOption(question.id, option.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined mb-4 text-3xl text-[#35607f]">{option.icon}</span>
                    <span className="font-heading mb-1 text-[18px] font-semibold text-[#191c1d]">{optionTitle}</span>
                    <span className="text-sm leading-5 text-[#72787e]">{optionBody}</span>
                    <span
                      className={`absolute right-4 top-4 transition-opacity ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[#35607f]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <footer className="mt-auto flex items-center justify-between border-t border-[#c2c7ce]/30 pt-8">
              <SecondaryButton className="flex items-center gap-2" onClick={moveSurveyBack}>
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                {surveyQuestionIndex === 0 ? t.back : t.previousQuestion}
              </SecondaryButton>
              <PrimaryButton className="flex items-center gap-2" disabled={!questionAnswered(question.id)} onClick={moveSurveyNext}>
                {isLastQuestion ? t.nextHardware : t.nextQuestion}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </PrimaryButton>
            </footer>
          </Panel>

          <aside
            className={`relative transition-[width] duration-300 ease-in-out ${
              surveyTipExpanded ? "w-[260px]" : "w-[82px]"
            }`}
          >
            <div className="group relative h-full min-h-[500px] w-full rounded-2xl border border-[#c2c7ce]/60 bg-[#f3f4f5] p-4 text-[#35607f] shadow-sm transition hover:border-[#35607f]">
              <span className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 rounded-lg bg-[#2e3132] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                {t.proTipTitle}
              </span>

              {!surveyTipExpanded && (
                <button
                  className="flex h-full w-full flex-col items-center justify-center gap-8"
                  onClick={() => setSurveyTipExpanded(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    tips_and_updates
                  </span>
                  <img alt="" className="h-11 w-11 object-contain opacity-70" src="/gear.png" />
                </button>
              )}

              {surveyTipExpanded && (
                <>
                  {!surveyTipContentVisible && <div className="h-full rounded-2xl bg-[#f3f4f5]" />}

                  {surveyTipContentVisible && (
                    <div className="flex h-full flex-col gap-5 animate-[fadeIn_180ms_ease-out]">
                      <button
                        className="rounded-2xl bg-[#4f7999] p-5 text-left text-white"
                        onClick={() => setSurveyTipExpanded(false)}
                        type="button"
                      >
                        <span className="material-symbols-outlined mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>
                          tips_and_updates
                        </span>
                        <h3 className="font-heading mb-2 text-[18px] font-bold leading-tight">{t.proTipTitle}</h3>
                        <p className="text-sm leading-6 text-white/80">{t.proTipBody}</p>
                      </button>

                      <div className="flex flex-1 flex-col rounded-2xl bg-white p-5 text-[#191c1d] shadow-sm">
                        <img alt="" className="mb-3 h-12 w-12 object-contain opacity-70" src="/gear.png" />
                        <h4 className="font-heading text-base font-bold">{t.advancedOptionsTitle}</h4>
                        <p className="mt-3 text-sm leading-6 text-[#42474d]">{t.advancedOptionsBody}</p>
                        <button
                          className="mt-auto inline-flex items-center gap-2 rounded-lg bg-[#35607f] px-4 py-3 text-sm font-semibold text-white"
                          onClick={() => enterSettings("general")}
                          type="button"
                        >
                          {t.advancedOptionsButton}
                          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    );
}
