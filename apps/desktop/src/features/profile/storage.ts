import type {
  PersonalizationBaseStyle,
  PersonalizationEmojiUse,
  PersonalizationEnthusiasm,
  PersonalizationSettings,
  PersonalizationStructure,
  PersonalizationWarmth,
  UserProfile,
  UserProfileAnswer,
} from "../../types";

export const USER_PROFILE_STORAGE_KEY = "miva_user_profile";
export const USER_PROFILE_ANSWERS_STORAGE_KEY = "miva_profile_answers";
export const PERSONALIZATION_SETTINGS_STORAGE_KEY = "miva_personalization_settings";

export const emptyUserProfile: UserProfile = {
  ageGroup: "",
  currentStatus: "",
  educationLevel: "",
  majorOrField: "",
  jobSeekingField: "",
  industryOrRole: "",
  teachingAudience: "",
  householdContext: "",
  expertiseLevel: "",
  preferredLanguage: "",
  additionalBackground: "",
  profileSummary: "",
};

export const defaultPersonalizationSettings: PersonalizationSettings = {
  baseStyle: "default",
  warmth: "default",
  enthusiasm: "default",
  headingsAndLists: "default",
  emojiUse: "default",
  customInstructions: "",
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readChoice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? value as T
    : fallback;
}

export function normalizePersonalizationSettings(value: unknown): PersonalizationSettings {
  const source = value && typeof value === "object"
    ? value as Partial<PersonalizationSettings>
    : {};

  return {
    baseStyle: readChoice<PersonalizationBaseStyle>(
      source.baseStyle,
      ["default", "concise", "balanced", "detailed", "professional"],
      defaultPersonalizationSettings.baseStyle,
    ),
    warmth: readChoice<PersonalizationWarmth>(
      source.warmth,
      ["default", "warmer", "neutral", "direct"],
      defaultPersonalizationSettings.warmth,
    ),
    enthusiasm: readChoice<PersonalizationEnthusiasm>(
      source.enthusiasm,
      ["default", "more", "balanced", "less"],
      defaultPersonalizationSettings.enthusiasm,
    ),
    headingsAndLists: readChoice<PersonalizationStructure>(
      source.headingsAndLists,
      ["default", "more", "balanced", "minimal"],
      defaultPersonalizationSettings.headingsAndLists,
    ),
    emojiUse: readChoice<PersonalizationEmojiUse>(
      source.emojiUse,
      ["default", "none", "sparse", "expressive"],
      defaultPersonalizationSettings.emojiUse,
    ),
    customInstructions: readString(source.customInstructions),
  };
}

function normalizeUserProfile(value: unknown): UserProfile {
  if (!value || typeof value !== "object") {
    return emptyUserProfile;
  }

  const profile = value as Partial<UserProfile>;
  const legacyProfile = value as Partial<{
    currentRole: string;
    mainPurpose: string;
    preferredStyle: string;
  }>;

  return {
    ageGroup: readString(profile.ageGroup),
    currentStatus: readString(profile.currentStatus) || readString(legacyProfile.currentRole),
    educationLevel: readString(profile.educationLevel),
    majorOrField: readString(profile.majorOrField),
    jobSeekingField: readString(profile.jobSeekingField),
    industryOrRole: readString(profile.industryOrRole) || readString(legacyProfile.mainPurpose),
    teachingAudience: readString(profile.teachingAudience),
    householdContext: readString(profile.householdContext),
    expertiseLevel: readString(profile.expertiseLevel) || readString(legacyProfile.preferredStyle),
    preferredLanguage: readString(profile.preferredLanguage),
    additionalBackground: readString(profile.additionalBackground),
    profileSummary: readString(profile.profileSummary),
  };
}

function normalizeUserProfileAnswers(value: unknown): UserProfileAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const answer = item as Partial<UserProfileAnswer>;
    const questionId = readString(answer.questionId);
    const questionTitle = readString(answer.questionTitle);
    const answerValue = readString(answer.answerValue);
    const answerLabel = readString(answer.answerLabel);

    if (!questionId || !questionTitle || !answerValue || !answerLabel) {
      return [];
    }

    return [{
      questionId,
      questionTitle,
      answerValue,
      answerLabel,
      customText: readString(answer.customText) || undefined,
    }];
  });
}

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return emptyUserProfile;
  }

  const stored = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (!stored) {
    return emptyUserProfile;
  }

  try {
    return normalizeUserProfile(JSON.parse(stored));
  } catch {
    return emptyUserProfile;
  }
}

export function loadPersonalizationSettings(): PersonalizationSettings {
  if (typeof window === "undefined") {
    return defaultPersonalizationSettings;
  }

  const stored = window.localStorage.getItem(PERSONALIZATION_SETTINGS_STORAGE_KEY);
  if (!stored) {
    return defaultPersonalizationSettings;
  }

  try {
    return normalizePersonalizationSettings(JSON.parse(stored));
  } catch {
    return defaultPersonalizationSettings;
  }
}

export function savePersonalizationSettings(settings: PersonalizationSettings): PersonalizationSettings {
  const normalized = normalizePersonalizationSettings(settings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PERSONALIZATION_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function saveUserProfile(profile: UserProfile): UserProfile {
  const normalized = normalizeUserProfile(profile);
  window.localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadUserProfileAnswers(): UserProfileAnswer[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(USER_PROFILE_ANSWERS_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return normalizeUserProfileAnswers(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function saveUserProfileAnswers(answers: UserProfileAnswer[]) {
  const normalized = normalizeUserProfileAnswers(answers);
  window.localStorage.setItem(USER_PROFILE_ANSWERS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
