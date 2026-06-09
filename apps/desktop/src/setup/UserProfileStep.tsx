import { useMemo, useState } from "react";
import { Input, PrimaryButton, SecondaryButton, StatusAlert } from "../components/ui";
import { emptyUserProfile, loadUserProfile, loadUserProfileAnswers, saveUserProfile, saveUserProfileAnswers } from "../features/profile/storage";
import type { UserProfile, UserProfileAnswer } from "../types";

const CUSTOM_OPTION_ID = "custom";
const SKIP_OPTION_ID = "skip";

type ProfileQuestionId = "ageGroup" | "currentStatus" | "context" | "expertiseLevel" | "preferredLanguage";

type ProfileOption = {
  id: string;
  label: string;
  value: string;
  requiresText?: boolean;
};

type ProfileQuestion = {
  id: ProfileQuestionId;
  eyebrow: string;
  title: string;
  description: string;
  options: ProfileOption[];
  placeholder?: string;
};

type UserProfileStepProps = {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
};

const ageGroupQuestion: ProfileQuestion = {
  id: "ageGroup",
  eyebrow: "QUESTION 01",
  title: "What age group should MIVA use for context?",
  description: "MIVA uses this only to adjust examples and explanation depth.",
  options: [
    { id: "under-13", label: "Under 13", value: "Under 13" },
    { id: "teenager", label: "Teenager", value: "Teenager" },
    { id: "20s", label: "20s", value: "20s" },
    { id: "30s", label: "30s", value: "30s" },
    { id: "40s", label: "40s", value: "40s" },
    { id: "50s-plus", label: "50s+", value: "50s+" },
    { id: "prefer-not", label: "Prefer not to say", value: "Prefer not to say" },
    { id: CUSTOM_OPTION_ID, label: "Something else...", value: "", requiresText: true },
  ],
  placeholder: "Enter your age group",
};

const languageQuestion: ProfileQuestion = {
  id: "preferredLanguage",
  eyebrow: "QUESTION 05",
  title: "Which language should MIVA use by default?",
  description: "Studio can still override this for each assistant later.",
  options: [
    { id: "korean", label: "Korean", value: "Korean" },
    { id: "english", label: "English", value: "English" },
    { id: "korean-tech", label: "Korean with English technical terms", value: "Korean with English technical terms" },
    { id: "english-korean", label: "English with Korean explanations", value: "English with Korean explanations" },
    { id: CUSTOM_OPTION_ID, label: "Something else...", value: "", requiresText: true },
  ],
  placeholder: "Enter your preferred language style",
};

function option(label: string) {
  return {
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    label,
    value: label,
  };
}

function customOption() {
  return { id: CUSTOM_OPTION_ID, label: "Something else...", value: "", requiresText: true };
}

function skipOption(label = "Prefer not to say") {
  return { id: SKIP_OPTION_ID, label, value: label };
}

function getAnswer(answers: UserProfileAnswer[], questionId: ProfileQuestionId) {
  return answers.find((answer) => answer.questionId === questionId) ?? null;
}

function getCurrentStatusQuestion(ageGroup: string): ProfileQuestion {
  const teenagerOptions = [
    option("Elementary school student"),
    option("Middle school student"),
    option("High school student"),
    option("Preparing for college"),
    option("Not a student"),
    skipOption(),
    customOption(),
  ];

  const twentiesOptions = [
    option("College student"),
    option("Graduate student"),
    option("Job seeker"),
    option("Employed"),
    option("Founder"),
    option("Freelancer"),
    customOption(),
  ];

  const adultOptions = [
    option("Employed"),
    option("Founder"),
    option("Freelancer"),
    option("Parent / homemaker"),
    option("Teacher"),
    option("Student"),
    customOption(),
  ];

  let options = adultOptions;
  if (ageGroup === "Teenager" || ageGroup === "Under 13") {
    options = teenagerOptions;
  } else if (ageGroup === "20s") {
    options = twentiesOptions;
  }

  return {
    id: "currentStatus",
    eyebrow: "QUESTION 02",
    title: "What best describes your current situation?",
    description: "This gives Studio a basic context before it asks assistant-specific questions.",
    options,
    placeholder: "Describe your current situation",
  };
}

function getContextQuestion(currentStatus: string): ProfileQuestion {
  const normalized = currentStatus.toLowerCase();

  if (normalized.includes("college") || normalized.includes("graduate") || normalized === "student") {
    return {
      id: "context",
      eyebrow: "QUESTION 03",
      title: "What is your major or field of study?",
      description: "MIVA stores this as background context, not as an assistant setting.",
      options: [
        option("Computer Science"),
        option("Engineering"),
        option("Math / Statistics"),
        option("Business"),
        option("Design"),
        option("Humanities"),
        option("Social Science"),
        customOption(),
      ],
      placeholder: "Enter your major or field",
    };
  }

  if (normalized.includes("job seeker")) {
    return {
      id: "context",
      eyebrow: "QUESTION 03",
      title: "What field are you preparing for?",
      description: "Studio can later use this to personalize job-related assistants.",
      options: [
        option("Software engineering"),
        option("Data / AI"),
        option("Design"),
        option("Marketing"),
        option("Business / finance"),
        option("Education"),
        customOption(),
      ],
      placeholder: "Enter the field you are preparing for",
    };
  }

  if (normalized.includes("teacher")) {
    return {
      id: "context",
      eyebrow: "QUESTION 03",
      title: "Who do you mainly teach?",
      description: "This helps MIVA adjust examples and explanation level.",
      options: [
        option("Elementary students"),
        option("Middle school students"),
        option("High school students"),
        option("College students"),
        option("Adults"),
        customOption(),
      ],
      placeholder: "Describe who you teach",
    };
  }

  if (normalized.includes("parent") || normalized.includes("homemaker")) {
    return {
      id: "context",
      eyebrow: "QUESTION 03",
      title: "Which best describes your current context?",
      description: "You can keep this general.",
      options: [
        option("Parent"),
        option("Homemaker"),
        option("Caregiver"),
        option("Managing household tasks"),
        option("Learning or personal projects"),
        skipOption(),
        customOption(),
      ],
      placeholder: "Describe your context",
    };
  }

  if (normalized.includes("founder")) {
    return {
      id: "context",
      eyebrow: "QUESTION 03",
      title: "What kind of product, business, or project are you building?",
      description: "A short general category is enough.",
      options: [
        option("Software product"),
        option("Consumer service"),
        option("Education project"),
        option("Creative business"),
        option("Research project"),
        skipOption("Skip"),
        customOption(),
      ],
      placeholder: "Describe the product or project",
    };
  }

  if (normalized.includes("freelancer")) {
    return {
      id: "context",
      eyebrow: "QUESTION 03",
      title: "What kind of freelance work do you do?",
      description: "MIVA uses this only as broad background context.",
      options: [
        option("Software / engineering"),
        option("Design"),
        option("Writing / content"),
        option("Marketing / sales"),
        option("Business support"),
        skipOption("Skip"),
        customOption(),
      ],
      placeholder: "Describe your freelance field",
    };
  }

  return {
    id: "context",
    eyebrow: "QUESTION 03",
    title: "What kind of work or field are you in?",
    description: "Keep it broad. Studio will ask detailed assistant questions later.",
    options: [
      option("Software / engineering"),
      option("Education"),
      option("Business / operations"),
      option("Marketing / sales"),
      option("Healthcare"),
      option("Creative work"),
      customOption(),
    ],
    placeholder: "Enter your work or field",
  };
}

function getExpertiseQuestion(ageGroup: string): ProfileQuestion {
  const younger = ageGroup === "Under 13" || ageGroup === "Teenager";

  return {
    id: "expertiseLevel",
    eyebrow: "QUESTION 04",
    title: younger ? "How should MIVA understand your level?" : "What is your approximate expertise level?",
    description: "This helps MIVA avoid answers that are too easy or too advanced.",
    options: younger
      ? [
          option("Just starting"),
          option("I know the basics"),
          option("I can handle harder topics"),
          option("Not sure"),
          customOption(),
        ]
      : [
          option("Beginner"),
          option("Intermediate"),
          option("Advanced"),
          option("Not sure"),
          customOption(),
        ],
    placeholder: "Describe your level",
  };
}

function buildQuestion(answers: UserProfileAnswer[]): ProfileQuestion | null {
  const ageGroup = getAnswer(answers, "ageGroup")?.answerValue ?? "";
  const currentStatus = getAnswer(answers, "currentStatus")?.answerValue ?? "";

  if (!ageGroup) return ageGroupQuestion;
  if (!currentStatus) return getCurrentStatusQuestion(ageGroup);
  if (!getAnswer(answers, "context")) return getContextQuestion(currentStatus);
  if (!getAnswer(answers, "expertiseLevel")) return getExpertiseQuestion(ageGroup);
  if (!getAnswer(answers, "preferredLanguage")) return languageQuestion;
  return null;
}

function getQuestionOrderLabel(questionId: string) {
  const index = ["ageGroup", "currentStatus", "context", "expertiseLevel", "preferredLanguage"].indexOf(questionId);
  return index >= 0 ? `QUESTION ${String(index + 1).padStart(2, "0")}` : "QUESTION";
}

function buildProfileSummary(profile: UserProfile) {
  const context = [
    profile.majorOrField,
    profile.jobSeekingField,
    profile.industryOrRole,
    profile.teachingAudience,
    profile.householdContext,
  ].find(Boolean);

  return [
    profile.ageGroup && `Age group: ${profile.ageGroup}`,
    profile.currentStatus && `Status: ${profile.currentStatus}`,
    context && `Context: ${context}`,
    profile.expertiseLevel && `Level: ${profile.expertiseLevel}`,
    profile.preferredLanguage && `Language: ${profile.preferredLanguage}`,
  ].filter(Boolean).join(" · ");
}

function resolveProfile(answers: UserProfileAnswer[]): UserProfile {
  const next = { ...emptyUserProfile };
  const ageGroup = getAnswer(answers, "ageGroup")?.answerValue ?? "";
  const currentStatus = getAnswer(answers, "currentStatus")?.answerValue ?? "";
  const context = getAnswer(answers, "context")?.answerValue ?? "";
  const expertiseLevel = getAnswer(answers, "expertiseLevel")?.answerValue ?? "";
  const preferredLanguage = getAnswer(answers, "preferredLanguage")?.answerValue ?? "";
  const normalizedStatus = currentStatus.toLowerCase();

  next.ageGroup = ageGroup;
  next.currentStatus = currentStatus;
  next.expertiseLevel = expertiseLevel;
  next.preferredLanguage = preferredLanguage;

  if (normalizedStatus.includes("college") || normalizedStatus.includes("graduate") || normalizedStatus === "student") {
    next.educationLevel = normalizedStatus.includes("graduate") ? "Graduate student" : "Student";
    next.majorOrField = context;
  } else if (normalizedStatus.includes("job seeker")) {
    next.jobSeekingField = context;
  } else if (normalizedStatus.includes("teacher")) {
    next.industryOrRole = "Teacher";
    next.teachingAudience = context;
  } else if (normalizedStatus.includes("parent") || normalizedStatus.includes("homemaker")) {
    next.householdContext = context;
  } else {
    next.industryOrRole = context;
  }

  next.profileSummary = buildProfileSummary(next);
  return next;
}

function getInitialAnswers(): UserProfileAnswer[] {
  const storedAnswers = loadUserProfileAnswers();
  if (storedAnswers.length > 0) {
    return storedAnswers.slice(0, 5);
  }

  const profile = loadUserProfile();
  const answers: UserProfileAnswer[] = [];

  if (profile.ageGroup) {
    answers.push({
      questionId: "ageGroup",
      questionTitle: ageGroupQuestion.title,
      answerValue: profile.ageGroup,
      answerLabel: profile.ageGroup,
    });
  }

  if (profile.currentStatus) {
    answers.push({
      questionId: "currentStatus",
      questionTitle: getCurrentStatusQuestion(profile.ageGroup).title,
      answerValue: profile.currentStatus,
      answerLabel: profile.currentStatus,
    });
  }

  const context = profile.majorOrField || profile.jobSeekingField || profile.teachingAudience || profile.householdContext || profile.industryOrRole;
  if (context) {
    answers.push({
      questionId: "context",
      questionTitle: getContextQuestion(profile.currentStatus).title,
      answerValue: context,
      answerLabel: context,
    });
  }

  if (profile.expertiseLevel) {
    answers.push({
      questionId: "expertiseLevel",
      questionTitle: getExpertiseQuestion(profile.ageGroup).title,
      answerValue: profile.expertiseLevel,
      answerLabel: profile.expertiseLevel,
    });
  }

  if (profile.preferredLanguage) {
    answers.push({
      questionId: "preferredLanguage",
      questionTitle: languageQuestion.title,
      answerValue: profile.preferredLanguage,
      answerLabel: profile.preferredLanguage,
    });
  }

  return answers;
}

function isSelectedOption(option: ProfileOption, selectedOptionId: string | null, currentAnswer: UserProfileAnswer | null) {
  if (selectedOptionId) {
    return selectedOptionId === option.id;
  }

  if (!currentAnswer) {
    return false;
  }

  if (option.requiresText) {
    return Boolean(currentAnswer.customText);
  }

  return currentAnswer.answerValue === option.value;
}

function AnsweredQuestionBlock({
  answer,
  index,
  onEdit,
}: {
  answer: UserProfileAnswer;
  index: number;
  onEdit: () => void;
}) {
  return (
    <article className="miva-step-enter-short rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--miva-text-muted)]">
            {getQuestionOrderLabel(answer.questionId)}
          </p>
          <h3 className="mt-1 text-[14px] font-semibold leading-5 text-[var(--miva-text)]">{answer.questionTitle}</h3>
          <span className="mt-2 inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border border-[color:rgba(63,111,168,0.28)] bg-[var(--miva-primary-surface)] px-3 text-xs font-semibold text-[var(--miva-primary)]">
            <span className="material-symbols-outlined text-[15px]">check</span>
            <span className="truncate">{answer.answerLabel}</span>
          </span>
        </div>
        <button
          aria-label={`Edit question ${index + 1}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--miva-text-soft)] transition hover:bg-[var(--miva-bg-soft)] hover:text-[var(--miva-primary)]"
          onClick={onEdit}
          title={`Edit question ${index + 1}`}
          type="button"
        >
          <span className="material-symbols-outlined text-[19px]">edit</span>
        </button>
      </div>
    </article>
  );
}

function ProfileOptionButton({
  active,
  option,
  onClick,
}: {
  active: boolean;
  option: ProfileOption;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-lg border px-4 py-2 text-left text-sm font-semibold transition active:scale-[0.99] ${
        active
          ? "border-[var(--miva-primary)] bg-[var(--miva-primary-surface)] text-[var(--miva-primary)] ring-2 ring-[color:rgba(63,111,168,0.18)]"
          : "border-[var(--miva-border)] bg-[var(--miva-bg-soft)] text-[var(--miva-text)] hover:border-[var(--miva-border-strong)] hover:bg-[var(--miva-surface)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="min-w-0 truncate">{option.label}</span>
      {active && (
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-[var(--miva-primary-soft)] px-2 py-1 text-[10px] font-bold uppercase tracking-normal text-[var(--miva-primary)]">
            Selected
          </span>
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--miva-primary)] text-[var(--miva-on-primary)]">
            <span className="material-symbols-outlined text-[14px]">check</span>
          </span>
        </span>
      )}
    </button>
  );
}

function ProfileSummary({
  profile,
  onBack,
  onSave,
}: {
  profile: UserProfile;
  onBack: () => void;
  onSave: () => void;
}) {
  const rows = [
    ["Age group", profile.ageGroup],
    ["Current status", profile.currentStatus],
    ["Context", profile.majorOrField || profile.jobSeekingField || profile.teachingAudience || profile.householdContext || profile.industryOrRole],
    ["Level", profile.expertiseLevel],
    ["Language", profile.preferredLanguage],
  ];

  return (
    <section className="miva-step-enter-short rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-6 shadow-[var(--miva-shadow-lg)]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--miva-primary)]">Profile Summary</p>
      <h3 className="mt-2 font-heading text-[22px] font-bold leading-7 text-[var(--miva-text)]">Save your background context</h3>
      <p className="mt-2 text-sm leading-5 text-[var(--miva-text-muted)]">
        Studio will use this context later when it creates assistant-specific setup questions.
      </p>

      <div className="mt-5 grid gap-2">
        {rows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--miva-bg-soft)] px-4 py-3" key={label}>
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--miva-text-soft)]">{label}</span>
            <span className="min-w-0 truncate text-sm font-semibold text-[var(--miva-text)]">{value || "-"}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--miva-border)] pt-5">
        <SecondaryButton className="h-11 px-4" onClick={onBack}>
          <span className="material-symbols-outlined text-[19px]">arrow_back</span>
          Back
        </SecondaryButton>
        <PrimaryButton className="miva-setup-primary h-11 px-5" onClick={onSave}>
          Save Profile
          <span className="material-symbols-outlined text-[19px]">save</span>
        </PrimaryButton>
      </div>
    </section>
  );
}

export function UserProfileStep({ goToNextStep, goToPreviousStep }: UserProfileStepProps) {
  const initialAnswers = useMemo(() => getInitialAnswers(), []);
  const [answers, setAnswers] = useState<UserProfileAnswer[]>(initialAnswers);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const currentQuestion = buildQuestion(answers);
  const resolvedProfile = useMemo(() => resolveProfile(answers), [answers]);
  const questionNumber = Math.min(answers.length + 1, 5);
  const progress = currentQuestion ? ((questionNumber - 1) / 5) * 100 : 100;
  const currentAnswer = currentQuestion ? getAnswer(answers, currentQuestion.id) : null;
  const selectedOption = currentQuestion?.options.find((item) => item.id === selectedOptionId) ?? null;
  const canContinue = Boolean(
    currentQuestion && selectedOption && (!selectedOption.requiresText || customText.trim().length > 0),
  );

  function resetTransientState() {
    setSelectedOptionId(null);
    setCustomText("");
    setSaveMessage(null);
    setSaveError(null);
  }

  function editAnswer(index: number) {
    setAnswers((current) => current.slice(0, index));
    resetTransientState();
  }

  function selectOption(option: ProfileOption) {
    setSelectedOptionId(option.id);
    if (!option.requiresText) {
      setCustomText("");
    }
    setSaveMessage(null);
    setSaveError(null);
  }

  function commitAnswer(optionOverride?: ProfileOption) {
    const question = currentQuestion;
    const optionToSave = optionOverride ?? selectedOption;

    if (!question || !optionToSave) {
      return;
    }

    const isCustom = optionToSave.requiresText;
    const normalizedCustomText = customText.trim();
    if (isCustom && !normalizedCustomText) {
      return;
    }

    const answerValue = isCustom ? normalizedCustomText : optionToSave.value;
    const answerLabel = isCustom ? normalizedCustomText : optionToSave.label;
    const answer: UserProfileAnswer = {
      questionId: question.id,
      questionTitle: question.title,
      answerValue,
      answerLabel,
      customText: isCustom ? normalizedCustomText : undefined,
    };

    setLoadingNext(true);
    window.setTimeout(() => {
      setAnswers((current) => {
        const existingIndex = current.findIndex((item) => item.questionId === question.id);
        const base = existingIndex >= 0 ? current.slice(0, existingIndex) : current;
        return [...base, answer];
      });
      setLoadingNext(false);
      resetTransientState();
    }, 220);
  }

  function skipQuestion() {
    const question = currentQuestion;
    if (!question) {
      return;
    }

    commitAnswer({
      id: SKIP_OPTION_ID,
      label: "Skipped",
      value: "Skipped",
    });
  }

  function handleSaveProfile() {
    try {
      const savedProfile = saveUserProfile(resolvedProfile);
      saveUserProfileAnswers(answers);
      setSaveError(null);
      setSaveMessage("Profile saved. Studio can now use this background context.");
      window.setTimeout(() => {
        goToNextStep();
      }, 320);
      return savedProfile;
    } catch (error) {
      setSaveMessage(null);
      setSaveError(error instanceof Error ? error.message : "Profile could not be saved.");
      return null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[820px] pb-5">
      <header className="flex items-start justify-between gap-4 pt-0">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--miva-primary)]">Profile</p>
          <h2 className="mt-2 font-heading text-[28px] font-bold leading-9 tracking-normal text-[var(--miva-text)]">
            Help MIVA understand your background
          </h2>
          <p className="mt-2 max-w-[620px] text-[15px] leading-6 text-[var(--miva-text-muted)]">
            Answer a few quick questions so Studio can personalize assistant setup later.
          </p>
        </div>
        <button
          aria-label="Back"
          className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--miva-border)] bg-[var(--miva-surface)] text-[var(--miva-primary)] shadow-sm transition hover:border-[var(--miva-border-strong)] hover:bg-[var(--miva-bg-soft)]"
          onClick={goToPreviousStep}
          title="Back"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
      </header>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm font-semibold">
          <span className="text-[var(--miva-text-muted)]">
            {currentQuestion ? `Question ${questionNumber} of about 5` : "Profile complete"}
          </span>
          <span className="text-[var(--miva-primary)]">{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-[3px] overflow-hidden rounded-full bg-[var(--miva-surface-muted)]">
          <div className="h-full rounded-full bg-[var(--miva-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {answers.map((answer, index) => (
          <AnsweredQuestionBlock answer={answer} index={index} key={`${answer.questionId}-${index}`} onEdit={() => editAnswer(index)} />
        ))}

        {currentQuestion ? (
          <section className="miva-step-enter-short rounded-lg border border-[var(--miva-border)] bg-[var(--miva-surface)] p-6 shadow-[var(--miva-shadow-lg)]">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--miva-text-muted)]">{currentQuestion.eyebrow}</p>
                <h3 className="mt-2 font-heading text-[22px] font-bold leading-7 text-[var(--miva-text)]">{currentQuestion.title}</h3>
                <p className="mt-2 text-sm leading-5 text-[var(--miva-text-muted)]">{currentQuestion.description}</p>
              </div>
              <span className="flex h-8 shrink-0 items-center gap-1 text-[var(--miva-primary)]" aria-hidden="true">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current opacity-70" />
                <span className="h-1 w-1 rounded-full bg-[var(--miva-text-muted)]" />
              </span>
            </div>

            <div className="mt-5 grid gap-2">
              {currentQuestion.options.map((item) => {
                const active = isSelectedOption(item, selectedOptionId, currentAnswer);

                return (
                  <div key={item.id}>
                    <ProfileOptionButton active={active} onClick={() => selectOption(item)} option={item} />
                    {active && item.requiresText && (
                      <div className="miva-step-enter-short mt-3">
                        <label className="sr-only" htmlFor={`${currentQuestion.id}-custom`}>
                          {currentQuestion.placeholder}
                        </label>
                        <Input
                          autoFocus
                          className="min-h-10"
                          id={`${currentQuestion.id}-custom`}
                          onChange={(event) => setCustomText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && customText.trim()) {
                              commitAnswer(item);
                            }
                          }}
                          placeholder={currentQuestion.placeholder}
                          value={customText}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--miva-border)] pt-5">
              <button
                className="text-sm font-semibold text-[var(--miva-text-muted)] transition hover:text-[var(--miva-primary)]"
                onClick={skipQuestion}
                type="button"
              >
                Skip this question
              </button>
              <PrimaryButton className="miva-setup-primary h-10 min-w-[104px] px-5" disabled={!canContinue || loadingNext} onClick={() => commitAnswer()}>
                {loadingNext ? "Saving..." : "Next"}
                <span className="material-symbols-outlined text-[19px]">arrow_forward</span>
              </PrimaryButton>
            </div>
          </section>
        ) : (
          <ProfileSummary profile={resolvedProfile} onBack={() => editAnswer(Math.max(answers.length - 1, 0))} onSave={handleSaveProfile} />
        )}

        {loadingNext && (
          <p className="miva-step-enter-short text-center text-sm italic text-[var(--miva-text-soft)]">
            · · · Preparing the next question...
          </p>
        )}

        {saveMessage && (
          <StatusAlert tone="success">
            {saveMessage}
          </StatusAlert>
        )}
        {saveError && (
          <StatusAlert tone="danger">
            {saveError}
          </StatusAlert>
        )}
      </div>
    </div>
  );
}
