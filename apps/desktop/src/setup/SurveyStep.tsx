import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "../i18n";
import type { AnswerStyle, FutureFeature, LanguageUse, LocalMode, MemorySyncMode, Priority, SurveyState, UseCase } from "../types";
import {
  Panel,
  PrimaryButton,
  ProgressBar,
  SecondaryButton,
  SectionHeader,
  SelectionOptionCard,
  SetupFooter,
  SetupStepShell,
} from "../components/ui";

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
  t: Record<string, string>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setSurvey: Dispatch<SetStateAction<SurveyState>>;
  setSurveyQuestionIndex: Dispatch<SetStateAction<number>>;
};

export function SurveyStep({
  activeLocale,
  survey,
  surveyQuestionIndex,
  surveyQuestions,
  t,
  goToNextStep,
  goToPreviousStep,
  setSurvey,
  setSurveyQuestionIndex,
}: SurveyStepProps) {
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
    <SetupStepShell>
      <SectionHeader
        body={t.surveyBody}
        eyebrow={`${t.surveyProgress} ${surveyQuestionIndex + 1} / ${surveyQuestions.length}`}
        title={t.surveyPageTitle}
      />

      <div className="mt-6">
        <div key={surveyQuestionIndex} className="miva-step-enter-short">
          <h3 className="font-heading text-[22px] font-semibold leading-[30px] text-[var(--miva-text)]">{t[question.titleKey]}</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--miva-text-soft)]">{t[question.helperKey]}</p>
          <ProgressBar className="mt-5" value={progress} />
        </div>
      </div>

      <Panel className="mt-8 flex min-h-[500px] flex-col">
        <div key={`${surveyQuestionIndex}-options`} className={`miva-step-enter-short grid ${question.columns} gap-4`}>
          {question.options.map((option, index) => {
            const active = isOptionSelected(question.id, option.id);
            const optionTitle = option.title?.[activeLocale] ?? (option.titleKey ? t[option.titleKey] : "");
            const optionBody = option.body?.[activeLocale] ?? (option.bodyKey ? t[option.bodyKey] : "");

            return (
              <SelectionOptionCard
                active={active}
                description={optionBody}
                icon={<span className="material-symbols-outlined text-[28px]">{option.icon}</span>}
                key={option.id}
                minHeight
                onClick={() => selectOption(question.id, option.id)}
                staggerIndex={index}
                title={optionTitle}
              />
            );
          })}
        </div>

        <SetupFooter
          className="mt-auto border-t border-[var(--miva-border)] pt-8"
          left={(
            <SecondaryButton className="flex items-center gap-2" onClick={moveSurveyBack}>
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              {surveyQuestionIndex === 0 ? t.back : t.previousQuestion}
            </SecondaryButton>
          )}
          right={(
            <PrimaryButton className="miva-setup-primary flex items-center gap-2" disabled={!questionAnswered(question.id)} onClick={moveSurveyNext}>
              {isLastQuestion ? t.nextHardware : t.nextQuestion}
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </PrimaryButton>
          )}
        />
      </Panel>
    </SetupStepShell>
  );
}
