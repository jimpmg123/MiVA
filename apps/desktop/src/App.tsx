import { useEffect, useMemo, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import type { Locale } from "./i18n";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

type StepId =
  | "welcome"
  | "survey"
  | "hardware"
  | "recommendation"
  | "ollama"
  | "download"
  | "chat"
  | "settings";

type UseCase = "daily" | "study" | "work" | "fast" | "character";
type Priority = "balanced" | "speed" | "quality";
type AnswerStyle = "short" | "moderate" | "detailed";
type LanguageUse = "korean" | "english" | "both";
type LocalMode = "localOnly" | "cloudOnly" | "hybrid";
type FutureFeature = "voice" | "character" | "googleWorkspace" | "files" | "tools" | "unsure";
type AppMode = "setup" | "runtime";
type ProviderId = "ollama" | "openai" | "gemini";
type CloudProviderId = Exclude<ProviderId, "ollama">;
type ProviderMode = "local" | "cloud";

type OllamaStatus = {
  installed: boolean;
  running: boolean;
  command?: string | null;
  version?: string | null;
  installedModelCount: number;
  installedModels: string[];
  baseUrl: string;
  error?: string | null;
};

type HardwareInfo = {
  cpuBrand?: string | null;
  logicalCoreCount: number;
  physicalCoreCount?: number | null;
  totalMemoryGb: number;
  availableMemoryGb: number;
  primaryDiskTotalGb: number;
  primaryDiskAvailableGb: number;
  gpuName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  arch: string;
};

type ModelInfo = {
  id: string;
  name: string;
  label: string;
  category: string;
  summary: Record<Locale, string>;
  bestFor: Record<Locale, string>;
  recommendedRamGb: number;
};

type CloudModelInfo = {
  id: string;
  provider: CloudProviderId;
  label: string;
  category: string;
  summary: Record<Locale, string>;
  bestFor: Record<Locale, string>;
  status: Record<Locale, string>;
};

type SurveyState = {
  useCase: UseCase | null;
  answerStyle: AnswerStyle | null;
  priority: Priority | null;
  languageUse: LanguageUse | null;
  localMode: LocalMode | null;
  futureFeatures: FutureFeature[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProviderKeyState = {
  openai: string;
  gemini: string;
};

const PROVIDER_KEYS_STORAGE_KEY = "miva.providerKeys.v1";
const emptyProviderKeys: ProviderKeyState = {
  openai: "",
  gemini: "",
};

const providerMeta: Record<ProviderId, { label: string; mode: ProviderMode; icon: string }> = {
  ollama: { label: "Ollama", mode: "local", icon: "dns" },
  openai: { label: "OpenAI", mode: "cloud", icon: "cloud" },
  gemini: { label: "Gemini", mode: "cloud", icon: "auto_awesome" },
};

const providerUiCopy = {
  ko: {
    localModeLocalOnlyTitle: "로컬로만 사용",
    localModeLocalOnlyBody: "인터넷 없이 이 컴퓨터 안에서만 AI 비서를 실행합니다.",
    localModeCloudOnlyTitle: "온라인 클라우드로 사용",
    localModeCloudOnlyBody: "Ollama 설치 없이 OpenAI/Gemini 같은 외부 API로 시작합니다.",
    localModeHybridTitle: "로컬 + 클라우드 복합",
    localModeHybridBody: "기본은 로컬로 두고, 필요하면 외부 API와 Google Workspace를 연결합니다.",
    recommended: "가장 추천",
    localModels: "로컬 모델",
    cloudModels: "클라우드 모델",
    bestMatch: "추천 조합",
    selected: "선택됨",
    selectModel: "이 모델 선택",
    comingSoon: "추후 지원",
    customOllama: "사용자 Ollama 모델",
    customOllamaBody: "모델 이름 직접 입력은 다음 단계에서 추가합니다.",
    provider: "Provider",
    providerStatus: "Provider 상태",
    localHeader: "LOCAL",
    cloudHeader: "CLOUD",
    localDataNotice: "데이터는 이 PC 안에서 처리됩니다.",
    cloudDataNotice: "메시지는 선택한 외부 Provider로 전송됩니다.",
    apiKeysNext: "클라우드 모델은 Ollama 설치를 건너뛰고 API 키 설정으로 이동합니다.",
    continueToProviderSettings: "API 키 설정으로 이동",
    continueToOllama: "Ollama 설정으로 이동",
    cloudBackendPending: "클라우드 채팅 연결은 다음 단계에서 구현합니다.",
    localRuntimeReady: "로컬 런타임",
    cloudRuntimeReady: "클라우드 Provider",
    hasOverride: "override 있음",
    needsKey: "키 설정 필요",
    defaultKey: "기본 .env",
  },
  en: {
    localModeLocalOnlyTitle: "Local only",
    localModeLocalOnlyBody: "Run the assistant only on this computer without internet use.",
    localModeCloudOnlyTitle: "Cloud only",
    localModeCloudOnlyBody: "Start with OpenAI/Gemini APIs and skip the Ollama install path.",
    localModeHybridTitle: "Local + cloud hybrid",
    localModeHybridBody: "Use local models by default, then add APIs and Google Workspace later.",
    recommended: "Recommended",
    localModels: "Local models",
    cloudModels: "Cloud models",
    bestMatch: "Best match",
    selected: "Selected",
    selectModel: "Select model",
    comingSoon: "Coming soon",
    customOllama: "Custom Ollama model",
    customOllamaBody: "Manual model-name entry will be added in a later step.",
    provider: "Provider",
    providerStatus: "Provider status",
    localHeader: "LOCAL",
    cloudHeader: "CLOUD",
    localDataNotice: "Data stays on this PC.",
    cloudDataNotice: "Messages are sent to the selected external provider.",
    apiKeysNext: "Cloud models skip Ollama setup and continue to API key settings.",
    continueToProviderSettings: "Continue to API keys",
    continueToOllama: "Continue to Ollama",
    cloudBackendPending: "Cloud chat routing will be implemented in the next backend step.",
    localRuntimeReady: "Local runtime",
    cloudRuntimeReady: "Cloud provider",
    hasOverride: "Override set",
    needsKey: "Key needed",
    defaultKey: "Default .env",
  },
} satisfies Record<Locale, Record<string, string>>;

type ModelDownloadProgress = {
  model: string;
  status: string;
  completed?: number | null;
  total?: number | null;
  percent?: number | null;
  done: boolean;
  error?: string | null;
};

const modelCatalog: ModelInfo[] = [
  {
    id: "qwen3-4b",
    name: "qwen3:4b",
    label: "Qwen3 4B",
    category: "Default",
    summary: {
      ko: "한국어 응답과 일반 비서 작업에 가장 무난한 1차 추천 모델입니다.",
      en: "The safest Phase 1 default for Korean and general assistant work.",
    },
    bestFor: {
      ko: "일정 정리, 글쓰기, 일반 질문",
      en: "Planning, writing, general questions",
    },
    recommendedRamGb: 12,
  },
  {
    id: "llama3.2-3b",
    name: "llama3.2:3b",
    label: "Llama 3.2 3B",
    category: "Low-spec",
    summary: {
      ko: "RAM 여유가 적거나 빠른 테스트가 필요할 때 쓰기 좋은 작은 모델입니다.",
      en: "A compact model for lower-spec PCs or quick setup tests.",
    },
    bestFor: {
      ko: "빠른 대화, 낮은 사양 PC",
      en: "Fast casual chat, lower-spec PCs",
    },
    recommendedRamGb: 8,
  },
  {
    id: "gemma3-4b",
    name: "gemma3:4b",
    label: "Gemma 3 4B",
    category: "Balanced",
    summary: {
      ko: "가벼운 범용 비서 후보입니다. 영어 중심 사용자는 대안으로 테스트할 만합니다.",
      en: "A lightweight general assistant candidate, especially worth testing for English-first use.",
    },
    bestFor: {
      ko: "범용 대화, 간단한 업무 보조",
      en: "General chat, light productivity support",
    },
    recommendedRamGb: 12,
  },
  {
    id: "phi3-mini",
    name: "phi3:mini",
    label: "Phi-3 Mini",
    category: "Ultralight",
    summary: {
      ko: "최소 사양 테스트용 초경량 모델입니다. 품질보다 실행 가능성을 우선합니다.",
      en: "An ultralight fallback that prioritizes running locally over answer quality.",
    },
    bestFor: {
      ko: "최소 사양 확인, 설치 검증",
      en: "Minimum-spec checks, install verification",
    },
    recommendedRamGb: 8,
  },
];

const cloudModelCatalog: CloudModelInfo[] = [
  {
    id: "gemini-2.0-flash",
    provider: "gemini",
    label: "Gemini 2.0 Flash",
    category: "Fast cloud",
    summary: {
      ko: "빠른 응답과 무료 등급 테스트에 적합한 클라우드 모델 후보입니다.",
      en: "A fast cloud option that is useful for quick free-tier testing.",
    },
    bestFor: {
      ko: "빠른 대화, 검색/도구 연동 준비",
      en: "Fast chat, future search and tool integrations",
    },
    status: {
      ko: "API 키 필요",
      en: "API key required",
    },
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o mini",
    category: "Balanced cloud",
    summary: {
      ko: "가벼운 비용/속도 기준으로 일반 비서 작업에 쓰기 좋은 클라우드 모델 후보입니다.",
      en: "A balanced cloud candidate for general assistant tasks with lightweight cost and latency.",
    },
    bestFor: {
      ko: "일반 비서, 글쓰기, 업무 보조",
      en: "General assistant, writing, work support",
    },
    status: {
      ko: "API 키 필요",
      en: "API key required",
    },
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    label: "GPT-4.1 mini",
    category: "Reasoning cloud",
    summary: {
      ko: "문서/업무 보조처럼 품질을 조금 더 우선할 때의 클라우드 후보입니다.",
      en: "A cloud candidate for document and work support when quality matters more.",
    },
    bestFor: {
      ko: "문서, 이메일, 가벼운 분석",
      en: "Documents, email, light analysis",
    },
    status: {
      ko: "후속 연결",
      en: "Later integration",
    },
  },
  {
    id: "gemini-1.5-flash",
    provider: "gemini",
    label: "Gemini 1.5 Flash",
    category: "Long context",
    summary: {
      ko: "긴 문서와 Google 생태계 연동을 염두에 둔 클라우드 후보입니다.",
      en: "A cloud candidate for long documents and future Google ecosystem integration.",
    },
    bestFor: {
      ko: "긴 문서, Google Workspace 연동",
      en: "Long documents, Google Workspace integration",
    },
    status: {
      ko: "API 키 필요",
      en: "API key required",
    },
  },
  {
    id: "custom-cloud",
    provider: "openai",
    label: "Custom API Model",
    category: "Placeholder",
    summary: {
      ko: "사용자가 직접 모델 이름과 Provider를 넣는 옵션은 추후 추가합니다.",
      en: "Manual provider and model-name entry will be added later.",
    },
    bestFor: {
      ko: "사용자 지정 클라우드 Provider",
      en: "Custom cloud provider setup",
    },
    status: {
      ko: "추후 지원",
      en: "Coming soon",
    },
  },
];

const steps: Array<{ id: StepId; label: string; detail: string }> = [
  { id: "welcome", label: "Welcome", detail: "Start" },
  { id: "survey", label: "Survey", detail: "Needs" },
  { id: "hardware", label: "Hardware", detail: "PC check" },
  { id: "recommendation", label: "Recommendation", detail: "Best model" },
  { id: "ollama", label: "Ollama", detail: "Runtime" },
  { id: "download", label: "Download", detail: "Local model" },
  { id: "chat", label: "Chat", detail: "Test" },
];

const copy = {
  ko: {
    appSubtitle: "내 컴퓨터에서 AI 비서를 설치하고 테스트하는 로컬 설정 앱",
    setupMode: "설정",
    runtimeMode: "실행",
    enterMiVA: "MiVA 시작하기",
    assistantWorkspace: "비서 워크스페이스",
    newChat: "새 대화",
    recentConversations: "최근 대화",
    savedSnippets: "저장한 내용",
    systemLogs: "시스템 로그",
    backToSetup: "설정으로 돌아가기",
    setupFlow: "설정 흐름",
    setupFlowSubtitle: "AI 초기 설정",
    settings: "설정",
    localOnly: "로컬 전용",
    language: "언어",
    welcomeTitle: "MiVA에 오신 것을 환영합니다",
    welcomeBody:
      "내 컴퓨터 안에서만 작동하는 개인 AI 비서입니다. 데이터가 외부로 나가지 않는 로컬 환경에서 빠르고 안전한 AI 사용 경험을 시작하세요.",
    startSetup: "설정 시작",
    estimatedTime: "예상 소요 시간: 5분",
    continue: "계속",
    back: "뒤로",
    privacyTitle: "100% 비공개",
    privacyBody: "모든 처리는 사용자의 컴퓨터에서 로컬로 실행됩니다.",
    hardwarePrivacyBody: "1차 버전은 로그인 없이 동작하며, 설문 답변과 PC 정보는 이 앱 안에서만 추천에 사용합니다.",
    localModelTitle: "매우 빠름",
    localModelBody: "클라우드 서버를 거치지 않아 더 빠른 응답을 기대할 수 있습니다.",
    guidedTitle: "인터넷 불필요",
    guidedBody: "모델 설치 후에는 연결 없이도 로컬에서 사용할 수 있습니다.",
    surveyTitle: "어떤 AI 비서가 필요하세요?",
    surveyBody: "가장 가까운 사용 목적을 고르면 MiVA가 가벼운 모델 중에서 우선 추천을 계산합니다.",
    surveyPageTitle: "나만의 MiVA 설정하기",
    surveyProgress: "질문",
    selectOne: "하나를 선택하세요",
    selectMany: "복수 선택 가능",
    previousQuestion: "이전",
    nextQuestion: "다음",
    nextHardware: "다음: 하드웨어 확인",
    proTipTitle: "Pro Tip",
    proTipBody: "이 설정은 설치가 끝난 뒤에도 언제든지 바꿀 수 있습니다.",
    advancedOptionsTitle: "추가 설정 옵션",
    advancedOptionsBody: "AI 기능의 세부 설정을 조정하는 화면입니다. 1차 버전에서는 언어와 로컬 설정부터 제공하고, 이후 Google Workspace와 도구 연결 설정으로 확장합니다.",
    advancedOptionsButton: "추가 설정 열기",
    priorityTitle: "무엇을 더 우선할까요?",
    answerStyleTitle: "답변은 어떤 스타일이 좋나요?",
    languageUseTitle: "주로 어떤 언어로 사용할 예정인가요?",
    localModeTitle: "MiVA를 어떤 방식으로 쓰고 싶나요?",
    futureFeatureTitle: "나중에 관심 있는 기능은 무엇인가요?",
    balanced: "균형",
    balancedBody: "속도와 답변 품질을 적당히 맞춥니다.",
    speed: "속도",
    speedBody: "가벼운 모델과 짧은 답변을 우선합니다.",
    quality: "답변 품질",
    qualityBody: "조금 느려도 더 좋은 답변을 우선합니다.",
    shortAnswer: "짧고 바로 답변",
    shortAnswerBody: "핵심만 빠르게 정리합니다.",
    moderateAnswer: "적당히 설명",
    moderateAnswerBody: "짧은 설명과 필요한 맥락을 함께 제공합니다.",
    detailedAnswer: "자세히 설명",
    detailedAnswerBody: "배경과 단계까지 자세히 풀어서 설명합니다.",
    koreanMain: "한국어 중심",
    koreanMainBody: "한국어 질문과 답변을 주로 사용합니다.",
    englishMain: "영어 중심",
    englishMainBody: "영어 자료와 답변을 주로 사용합니다.",
    bilingualMain: "한국어와 영어 둘 다",
    bilingualMainBody: "상황에 따라 두 언어를 함께 사용합니다.",
    localOnlyMode: "인터넷 없이 로컬에서만",
    localOnlyModeBody: "모든 사용을 이 컴퓨터 안에서 끝내고 싶습니다.",
    localAfterSetupMode: "설치 후 로컬 작동이면 충분",
    localAfterSetupModeBody: "다운로드/설치 후에는 로컬에서 작동하면 됩니다.",
    futureIntegrationsMode: "나중에 외부 연동도 괜찮음",
    futureIntegrationsModeBody: "Google Workspace, API, 도구 연결도 이후에 고려할 수 있습니다.",
    voiceFeature: "음성 대화",
    voiceFeatureBody: "마이크와 음성 응답을 사용하는 비서",
    characterFeature: "AI 캐릭터 화면",
    characterFeatureBody: "화면에 캐릭터를 띄우는 비서",
    googleFeature: "Google Calendar / Gmail 연동",
    googleFeatureBody: "Google Workspace CLI 기반 후속 기능 후보",
    filesFeature: "문서/파일 읽기",
    filesFeatureBody: "로컬 파일을 읽고 정리하는 비서",
    toolsFeature: "외부 도구 연결",
    toolsFeatureBody: "MCP, agent skills, 외부 API 연결",
    unsureFeature: "잘 모르겠음",
    unsureFeatureBody: "지금은 기본 로컬 비서부터 시작합니다.",
    daily: "일상 관리",
    dailyBody: "일정, 할 일, 메모 정리를 도와주는 비서",
    study: "공부/글쓰기",
    studyBody: "요약, 초안 작성, 설명을 도와주는 비서",
    work: "업무 보조",
    workBody: "메일 초안, 문서 정리, 간단한 분석 보조",
    fast: "빠른 대화",
    fastBody: "부담 없이 빠르게 질문하고 답하는 비서",
    character: "캐릭터 비서",
    characterBody: "나중에 버추얼 캐릭터와 음성으로 확장할 비서",
    hardwareTitle: "하드웨어 확인",
    hardwareBody: "이 컴퓨터가 어느 정도의 로컬 AI 모델을 실행할 수 있는지 확인합니다. 시스템 정보를 분석해 더 부드러운 경험을 위한 모델을 추천합니다.",
    scanPc: "재스캔",
    checking: "확인 중",
    detected: "감지됨",
    unknown: "알 수 없음",
    processor: "프로세서",
    memory: "메모리",
    graphics: "그래픽(GPU)",
    disk: "디스크 공간",
    verdict: "판정",
    highEnd: "고성능",
    great: "충분함",
    good: "양호",
    basic: "기본",
    limited: "제한적",
    optimal: "최적",
    driveDetected: "드라이브 감지",
    healthy: "정상",
    used: "사용됨",
    cores: "코어",
    vramUsage: "VRAM 사용량",
    vramPlaceholder: "측정 대기",
    modelCapacity: "모델 용량",
    modelCapacityBody: "현재 여유 공간으로 약 {count}개의 가벼운 로컬 비서 모델을 보관할 수 있습니다. 큰 모델 기준은 추후 세부 기준을 확정합니다.",
    cpuVerdictHigh: "멀티태스킹과 로컬 AI 추론에 매우 적합합니다.",
    cpuVerdictGood: "가벼운 로컬 AI 모델 실행에 충분한 프로세서입니다.",
    cpuVerdictBasic: "작은 모델 테스트에는 적합하지만 동시 작업은 제한될 수 있습니다.",
    memoryVerdictGreat: "복잡한 로컬 모델까지 실행할 수 있는 여유 메모리입니다.",
    memoryVerdictGood: "가벼운 로컬 비서 모델 실행에 충분한 메모리입니다.",
    memoryVerdictLimited: "초경량 모델부터 테스트하는 편이 좋습니다.",
    gpuVerdictDetected: "GPU는 감지되었지만 VRAM 수치는 아직 placeholder입니다. 추후 VRAM 감지를 추가하면 더 정확한 추천이 가능합니다.",
    gpuVerdictMissing: "전용 GPU 정보를 확인하지 못했습니다. 1차 추천은 CPU와 RAM 기준으로 계산합니다.",
    systemVerificationComplete: "시스템 확인 완료",
    hardwareMinimumMet: "MiVA 1차 로컬 비서 실행을 위한 기본 확인이 끝났습니다.",
    continueRecommendations: "추천 결과로 이동",
    totalRam: "전체 RAM",
    available: "사용 가능",
    recommendationTitle: "추천 모델",
    recommendationBody: "설문 답변과 현재 PC 정보를 기준으로 1차 모델을 추천했습니다.",
    selectThis: "이 모델 사용",
    alternatives: "대안 모델",
    reasonNeed: "선택한 사용 목적에 맞습니다.",
    reasonRam: "현재 메모리 범위에서 실행 가능성이 높습니다.",
    reasonSpeed: "빠른 응답을 우선하는 선택에 맞습니다.",
    ollamaTitle: "Ollama 실행 환경",
    ollamaBody: "MiVA는 Ollama를 로컬 모델 실행 엔진으로 사용합니다. 모델 자체가 아니라 모델을 실행하는 프로그램입니다.",
    installOllama: "Ollama 설치",
    startOllama: "Ollama 시작",
    refresh: "새로고침",
    running: "실행 중",
    stopped: "설치됨, 실행 안 됨",
    missing: "설치 필요",
    activity: "활동",
    noLogs: "아직 활동이 없습니다.",
    downloadTitle: "모델 다운로드",
    downloadBody: "선택한 모델을 Ollama 기본 저장 위치에 다운로드합니다. 1차 버전에서는 저장 위치를 바꾸지 않습니다.",
    downloadModel: "모델 다운로드",
    downloading: "다운로드 중...",
    downloadProgressTitle: "모델 다운로드 진행 중",
    preparingDownload: "다운로드 준비 중",
    downloadComplete: "다운로드 완료",
    downloadFailed: "다운로드 실패",
    close: "닫기",
    downloaded: "다운로드됨",
    downloadSize: "다운로드 크기",
    installed: "설치됨",
    notInstalled: "미설치",
    modelStorage: "저장 위치",
    defaultStorage: "Ollama 기본 모델 저장 위치 사용",
    chatTitle: "로컬 채팅 테스트",
    chatBody: "모델 설치가 끝나면 MiVA가 실제로 로컬에서 응답하는지 확인합니다.",
    chatSandboxTitle: "로컬 채팅 샌드박스",
    chatSandboxBody: "로컬 인스턴스가 준비되었습니다. 데이터는 이 컴퓨터 밖으로 나가지 않습니다. 아래에서 {model}의 추론 속도와 답변 품질을 테스트하세요.",
    chatGreeting: "안녕하세요! 저는 MiVA에서 실행 중인 로컬 AI 비서입니다. {model} 모델을 로컬 환경에 불러왔습니다. 오늘은 무엇을 도와드릴까요?",
    assistantStageTitle: "비서 실행 화면",
    assistantStageBody: "채팅, 음성, 캐릭터 표현이 합쳐질 실제 MiVA 실행 공간입니다.",
    characterPreview: "캐릭터 프리뷰",
    characterPreviewBody: "1차에서는 상태 표현만 표시합니다. Live2D/음성 반응은 후속 단계에서 연결합니다.",
    characterIdle: "대기 중",
    characterListening: "입력 대기",
    localRuntime: "로컬 런타임",
    generatingResponse: "답변 생성 중...",
    justNow: "방금 전",
    suggestedAction: "추천 질문",
    suggestedPrompt: "도움이 되는 로봇에 대한 짧은 이야기를 들려줘.",
    latencyMetric: "지연 시간: 45ms",
    tokensMetric: "토큰: 12.4 t/s",
    vramMetric: "VRAM: 측정 대기",
    messagePlaceholder: "MiVA에게 물어보기...",
    send: "전송",
    noMessages: "아직 메시지가 없습니다.",
    runtimeRequired: "Tauri 앱 창에서 실행해야 로컬 명령을 사용할 수 있습니다.",
    settingsTitle: "앱 설정",
    settingsBody: "언어, 로컬 모델, 외부 AI Provider 키를 관리합니다. 배포 전에는 보안 저장소로 이전할 예정입니다.",
    currentModel: "현재 모델",
    serviceStatus: "서비스 상태",
    installedModels: "설치된 모델",
    providerKeysTitle: "AI Provider 키",
    providerKeysBody: "비워두면 local-helper .env에 있는 개발용 기본 키를 사용합니다. 입력하면 이 앱의 로컬 override 키로 저장합니다.",
    openaiApiKey: "OpenAI API 키",
    geminiApiKey: "Gemini API 키",
    userOverrideKey: "사용자 override 키",
    defaultEnvKey: "기본 .env 키 사용",
    saveKeys: "키 저장",
    clearKeys: "키 지우기",
    keysSaved: "로컬에 저장됨",
    keyStorageNotice: "현재는 개발 테스트용 localStorage 저장입니다. 배포 전에는 OS 보안 저장소로 교체해야 합니다.",
    none: "없음",
  },
  en: {
    appSubtitle: "A local setup app for installing and testing an AI assistant on this computer",
    setupMode: "Setup",
    runtimeMode: "Runtime",
    enterMiVA: "Enter MiVA",
    assistantWorkspace: "Assistant Workspace",
    newChat: "New Chat",
    recentConversations: "Recent Conversations",
    savedSnippets: "Saved Snippets",
    systemLogs: "System Logs",
    backToSetup: "Back to Setup",
    setupFlow: "Setup Flow",
    setupFlowSubtitle: "AI Assistant Initialization",
    settings: "Settings",
    localOnly: "Local only",
    language: "Language",
    welcomeTitle: "Welcome to MiVA",
    welcomeBody:
      "Your private, local-first AI assistant. Experience high-performance intelligence that lives entirely on your machine, ensuring your data never leaves your sight.",
    startSetup: "Start Setup",
    estimatedTime: "Estimated time: 5 Minutes",
    continue: "Continue",
    back: "Back",
    privacyTitle: "100% Private",
    privacyBody: "All processing happens locally on your hardware.",
    hardwarePrivacyBody: "Phase 1 runs without login. Survey answers and PC information are only used inside this app for recommendations.",
    localModelTitle: "Ultra Fast",
    localModelBody: "Zero latency from cloud servers. Instant responses.",
    guidedTitle: "No Internet",
    guidedBody: "Works perfectly without any connection needed.",
    surveyTitle: "What kind of AI assistant do you need?",
    surveyBody: "Pick the closest use case and MiVA will calculate a first recommendation from lightweight models.",
    surveyPageTitle: "Personalize your MiVA",
    surveyProgress: "Question",
    selectOne: "Choose one",
    selectMany: "Choose any that apply",
    previousQuestion: "Previous",
    nextQuestion: "Next",
    nextHardware: "Next: Hardware Check",
    proTipTitle: "Pro Tip",
    proTipBody: "You can change these preferences at any time after setup.",
    advancedOptionsTitle: "Advanced options",
    advancedOptionsBody: "This area will handle detailed AI feature settings. Phase 1 starts with language and local setup policy, then expands into Google Workspace and tool connections.",
    advancedOptionsButton: "Open advanced settings",
    priorityTitle: "What matters most?",
    answerStyleTitle: "What answer style do you prefer?",
    languageUseTitle: "Which language will you use most?",
    localModeTitle: "How do you want to use MiVA?",
    futureFeatureTitle: "Which future features interest you?",
    balanced: "Balanced",
    balancedBody: "Balance speed and answer quality.",
    speed: "Speed",
    speedBody: "Prioritize lighter models and short answers.",
    quality: "Answer quality",
    qualityBody: "Prioritize stronger answers even if they are slower.",
    shortAnswer: "Short and direct",
    shortAnswerBody: "Get the point quickly.",
    moderateAnswer: "Moderate explanation",
    moderateAnswerBody: "Include short context when useful.",
    detailedAnswer: "Detailed explanation",
    detailedAnswerBody: "Explain background and steps more fully.",
    koreanMain: "Korean-first",
    koreanMainBody: "Mostly Korean questions and answers.",
    englishMain: "English-first",
    englishMainBody: "Mostly English sources and answers.",
    bilingualMain: "Korean and English",
    bilingualMainBody: "Use both languages depending on context.",
    localOnlyMode: "Local only, no internet",
    localOnlyModeBody: "Keep usage entirely on this computer.",
    localAfterSetupMode: "Local after setup",
    localAfterSetupModeBody: "Download/install first, then run locally.",
    futureIntegrationsMode: "Future integrations are okay",
    futureIntegrationsModeBody: "Google Workspace, APIs, and tools can be added later.",
    voiceFeature: "Voice chat",
    voiceFeatureBody: "Use microphone input and spoken responses.",
    characterFeature: "AI character screen",
    characterFeatureBody: "Show a virtual character on screen.",
    googleFeature: "Google Calendar / Gmail",
    googleFeatureBody: "Future Google Workspace CLI integration.",
    filesFeature: "Read documents/files",
    filesFeatureBody: "Use local files as assistant context.",
    toolsFeature: "External tools",
    toolsFeatureBody: "MCP, agent skills, and external APIs.",
    unsureFeature: "Not sure yet",
    unsureFeatureBody: "Start with the default local assistant.",
    daily: "Daily planning",
    dailyBody: "A helper for schedules, tasks, and notes",
    study: "Study/Writing",
    studyBody: "A helper for summaries, drafts, and explanations",
    work: "Work support",
    workBody: "A helper for emails, documents, and light analysis",
    fast: "Fast casual chat",
    fastBody: "A quick assistant for low-friction questions",
    character: "Character assistant",
    characterBody: "A future-ready assistant for avatar and voice expansion",
    hardwareTitle: "Hardware Check",
    hardwareBody: "Let's see what your machine is capable of. We analyze your system to suggest the best AI models for a smooth experience.",
    scanPc: "Rescan",
    checking: "Checking",
    detected: "Detected",
    unknown: "Unknown",
    processor: "Processor",
    memory: "Memory",
    graphics: "Graphics (GPU)",
    disk: "Disk Space",
    verdict: "Verdict",
    highEnd: "High-End",
    great: "Great",
    good: "Good",
    basic: "Basic",
    limited: "Limited",
    optimal: "Optimal",
    driveDetected: "Drive Detected",
    healthy: "Healthy",
    used: "Used",
    cores: "Cores",
    vramUsage: "VRAM Usage",
    vramPlaceholder: "Pending",
    modelCapacity: "Model Capacity",
    modelCapacityBody: "You have enough space for approx. {count} lightweight local assistant models. Large-model capacity rules are placeholders for now.",
    cpuVerdictHigh: "Excellent for multi-tasking and large-scale local AI inferencing.",
    cpuVerdictGood: "Strong enough for lightweight local assistant models.",
    cpuVerdictBasic: "Suitable for small-model tests, but multitasking may be limited.",
    memoryVerdictGreat: "Plenty of room for running even more complex local models.",
    memoryVerdictGood: "Enough memory for lightweight local assistant models.",
    memoryVerdictLimited: "Start with ultralight models first.",
    gpuVerdictDetected: "GPU detected, but VRAM is still a placeholder. A future VRAM check will make recommendations more precise.",
    gpuVerdictMissing: "Dedicated GPU details were not detected. Phase 1 recommendations use CPU and RAM first.",
    systemVerificationComplete: "System Verification Complete",
    hardwareMinimumMet: "Basic checks for the MiVA Phase 1 local assistant are complete.",
    continueRecommendations: "Continue to Recommendations",
    totalRam: "Total RAM",
    available: "Available",
    recommendationTitle: "Recommended model",
    recommendationBody: "This first model choice is based on the survey and current PC information.",
    selectThis: "Use this model",
    alternatives: "Alternative models",
    reasonNeed: "Matches the selected assistant need.",
    reasonRam: "Fits the current memory range.",
    reasonSpeed: "Matches the speed-first preference.",
    ollamaTitle: "Ollama runtime",
    ollamaBody: "MiVA uses Ollama as the local model runner. Ollama is not the model; it is the program that runs models.",
    installOllama: "Install Ollama",
    startOllama: "Start Ollama",
    refresh: "Refresh",
    running: "Running",
    stopped: "Installed, not running",
    missing: "Needs install",
    activity: "Activity",
    noLogs: "No activity yet.",
    downloadTitle: "Download model",
    downloadBody: "Download the selected model into Ollama's default model storage. Phase 1 does not customize storage paths.",
    downloadModel: "Download model",
    downloading: "Downloading...",
    downloadProgressTitle: "Downloading model",
    preparingDownload: "Preparing download",
    downloadComplete: "Download complete",
    downloadFailed: "Download failed",
    close: "Close",
    downloaded: "Downloaded",
    downloadSize: "Download size",
    installed: "Installed",
    notInstalled: "Not installed",
    modelStorage: "Storage",
    defaultStorage: "Use Ollama's default model storage",
    chatTitle: "Local chat test",
    chatBody: "After the model is installed, confirm MiVA responds locally.",
    chatSandboxTitle: "Local Chat Sandbox",
    chatSandboxBody: "Your local instance is fully initialized. No data leaves this machine. Test the inference speed and quality of {model} below.",
    chatGreeting: "Hello! I'm your local AI assistant running on MiVA. I've successfully loaded the {model} model into your local memory. How can I help you today?",
    assistantStageTitle: "Assistant Runtime",
    assistantStageBody: "The future MiVA runtime space for chat, voice, and character expression.",
    characterPreview: "Character Preview",
    characterPreviewBody: "Phase 1 shows status expression only. Live2D and voice reactions will be connected later.",
    characterIdle: "Idle",
    characterListening: "Waiting for input",
    localRuntime: "Local Runtime",
    generatingResponse: "Generating response...",
    justNow: "Just now",
    suggestedAction: "Suggested Action",
    suggestedPrompt: "Tell me a short story about a helpful robot.",
    latencyMetric: "Latency: 45ms",
    tokensMetric: "Tokens: 12.4 t/s",
    vramMetric: "VRAM: Pending",
    messagePlaceholder: "Ask MiVA something...",
    send: "Send",
    noMessages: "No messages yet.",
    runtimeRequired: "Local commands only work inside the Tauri desktop window.",
    settingsTitle: "App settings",
    settingsBody: "Manage language, local model policy, and external AI provider keys. Secure storage comes before distribution.",
    currentModel: "Current model",
    serviceStatus: "Service status",
    installedModels: "Installed models",
    providerKeysTitle: "AI Provider Keys",
    providerKeysBody: "Leave fields empty to use the default development keys from local-helper .env. Enter a key to save a local override for this app.",
    openaiApiKey: "OpenAI API Key",
    geminiApiKey: "Gemini API Key",
    userOverrideKey: "User override key",
    defaultEnvKey: "Use default .env key",
    saveKeys: "Save keys",
    clearKeys: "Clear keys",
    keysSaved: "Saved locally",
    keyStorageNotice: "This currently uses localStorage for development testing. Replace it with OS secure storage before distribution.",
    none: "None",
  },
} satisfies Record<Locale, Record<string, string>>;

type CopyKey = keyof (typeof copy)["ko"];

type SurveyOption = {
  id: string;
  titleKey?: CopyKey;
  bodyKey?: CopyKey;
  title?: Record<Locale, string>;
  body?: Record<Locale, string>;
  icon: string;
};

type SurveyQuestionId = "useCase" | "answerStyle" | "priority" | "languageUse" | "localMode" | "futureFeatures";

type SurveyQuestion = {
  id: SurveyQuestionId;
  titleKey: CopyKey;
  helperKey: CopyKey;
  multi: boolean;
  columns: string;
  options: SurveyOption[];
};

const useCaseCards: SurveyOption[] = [
  { id: "daily", titleKey: "daily", bodyKey: "dailyBody", icon: "event_note" },
  { id: "study", titleKey: "study", bodyKey: "studyBody", icon: "edit_note" },
  { id: "work", titleKey: "work", bodyKey: "workBody", icon: "work_outline" },
  { id: "fast", titleKey: "fast", bodyKey: "fastBody", icon: "forum" },
  { id: "character", titleKey: "character", bodyKey: "characterBody", icon: "smart_toy" },
];

const answerStyleOptions: SurveyOption[] = [
  { id: "short", titleKey: "shortAnswer", bodyKey: "shortAnswerBody", icon: "bolt" },
  { id: "moderate", titleKey: "moderateAnswer", bodyKey: "moderateAnswerBody", icon: "subject" },
  { id: "detailed", titleKey: "detailedAnswer", bodyKey: "detailedAnswerBody", icon: "article" },
];

const priorityOptions: SurveyOption[] = [
  { id: "balanced", titleKey: "balanced", bodyKey: "balancedBody", icon: "tune" },
  { id: "speed", titleKey: "speed", bodyKey: "speedBody", icon: "speed" },
  { id: "quality", titleKey: "quality", bodyKey: "qualityBody", icon: "auto_awesome" },
];

const languageUseOptions: SurveyOption[] = [
  { id: "korean", titleKey: "koreanMain", bodyKey: "koreanMainBody", icon: "translate" },
  { id: "english", titleKey: "englishMain", bodyKey: "englishMainBody", icon: "language" },
  { id: "both", titleKey: "bilingualMain", bodyKey: "bilingualMainBody", icon: "forum" },
];

const localModeOptions: SurveyOption[] = [
  {
    id: "localOnly",
    title: {
      ko: providerUiCopy.ko.localModeLocalOnlyTitle,
      en: providerUiCopy.en.localModeLocalOnlyTitle,
    },
    body: {
      ko: providerUiCopy.ko.localModeLocalOnlyBody,
      en: providerUiCopy.en.localModeLocalOnlyBody,
    },
    icon: "lock",
  },
  {
    id: "cloudOnly",
    title: {
      ko: providerUiCopy.ko.localModeCloudOnlyTitle,
      en: providerUiCopy.en.localModeCloudOnlyTitle,
    },
    body: {
      ko: providerUiCopy.ko.localModeCloudOnlyBody,
      en: providerUiCopy.en.localModeCloudOnlyBody,
    },
    icon: "cloud",
  },
  {
    id: "hybrid",
    title: {
      ko: providerUiCopy.ko.localModeHybridTitle,
      en: providerUiCopy.en.localModeHybridTitle,
    },
    body: {
      ko: providerUiCopy.ko.localModeHybridBody,
      en: providerUiCopy.en.localModeHybridBody,
    },
    icon: "hub",
  },
];

const futureFeatureOptions: SurveyOption[] = [
  { id: "voice", titleKey: "voiceFeature", bodyKey: "voiceFeatureBody", icon: "mic" },
  { id: "character", titleKey: "characterFeature", bodyKey: "characterFeatureBody", icon: "smart_toy" },
  { id: "googleWorkspace", titleKey: "googleFeature", bodyKey: "googleFeatureBody", icon: "calendar_month" },
  { id: "files", titleKey: "filesFeature", bodyKey: "filesFeatureBody", icon: "folder_open" },
  { id: "tools", titleKey: "toolsFeature", bodyKey: "toolsFeatureBody", icon: "extension" },
  { id: "unsure", titleKey: "unsureFeature", bodyKey: "unsureFeatureBody", icon: "help" },
];

const surveyQuestions: SurveyQuestion[] = [
  { id: "useCase", titleKey: "surveyTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-2 xl:grid-cols-3", options: useCaseCards },
  { id: "answerStyle", titleKey: "answerStyleTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: answerStyleOptions },
  { id: "priority", titleKey: "priorityTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: priorityOptions },
  { id: "languageUse", titleKey: "languageUseTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: languageUseOptions },
  { id: "localMode", titleKey: "localModeTitle", helperKey: "selectOne", multi: false, columns: "grid-cols-3", options: localModeOptions },
  { id: "futureFeatures", titleKey: "futureFeatureTitle", helperKey: "selectMany", multi: true, columns: "grid-cols-2 xl:grid-cols-3", options: futureFeatureOptions },
];

function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

async function invokeCommand<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error("MiVA Desktop must be opened through Tauri. Run `npm run tauri:dev`, not `npm run dev`.");
  }

  return invoke<T>(command, args);
}

function getModelByName(name: string) {
  return modelCatalog.find((model) => model.name === name) ?? modelCatalog[0];
}

function getCloudModelById(id: string) {
  return cloudModelCatalog.find((model) => model.id === id) ?? cloudModelCatalog[0];
}

function formatGb(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} GB`;
}

function formatBytes(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  return `${nextValue.toFixed(unitIndex >= 2 ? 1 : 0)} ${units[unitIndex]}`;
}

function recommendModel(survey: SurveyState, hardware: HardwareInfo | null) {
  const ram = hardware?.totalMemoryGb ?? 0;

  if (ram > 0 && ram < 8) {
    return "phi3:mini";
  }

  if (survey.priority === "speed" || survey.answerStyle === "short" || survey.useCase === "fast") {
    return ram >= 12 ? "llama3.2:3b" : "phi3:mini";
  }

  if (survey.priority === "quality" || survey.useCase === "study" || survey.useCase === "work") {
    return ram >= 12 ? "qwen3:4b" : "llama3.2:3b";
  }

  if (survey.languageUse === "english") {
    return ram >= 12 ? "gemma3:4b" : "llama3.2:3b";
  }

  if (survey.useCase === "character" || survey.useCase === "daily") {
    return ram >= 12 ? "qwen3:4b" : "llama3.2:3b";
  }

  return ram >= 12 ? "gemma3:4b" : "llama3.2:3b";
}

function recommendCloudModel(survey: SurveyState) {
  if (survey.priority === "speed" || survey.useCase === "fast") {
    return "gemini-2.0-flash";
  }

  if (survey.useCase === "work" || survey.useCase === "study" || survey.priority === "quality") {
    return "gpt-4o-mini";
  }

  if (survey.futureFeatures.includes("googleWorkspace")) {
    return "gemini-1.5-flash";
  }

  return "gemini-2.0-flash";
}

function PrimaryButton({ children, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg bg-[#35607f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-[#c2c7ce] bg-white px-5 py-3 text-sm font-semibold text-[#35607f] transition hover:bg-[#f3f4f5] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_12px_30px_rgba(53,96,127,0.08)] ${className}`}>
      {children}
    </section>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "action" }) {
  const classes = {
    neutral: "bg-[#e1e3e4] text-[#42474d]",
    success: "bg-[#c9e8cb] text-[#334d38]",
    action: "bg-[#cae6ff] text-[#1c4b69]",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes[tone]}`}>{children}</span>;
}

function loadProviderKeys(): ProviderKeyState {
  if (typeof window === "undefined") {
    return emptyProviderKeys;
  }

  try {
    const saved = window.localStorage.getItem(PROVIDER_KEYS_STORAGE_KEY);
    if (!saved) {
      return emptyProviderKeys;
    }

    const parsed = JSON.parse(saved) as Partial<ProviderKeyState>;
    return {
      openai: typeof parsed.openai === "string" ? parsed.openai : "",
      gemini: typeof parsed.gemini === "string" ? parsed.gemini : "",
    };
  } catch {
    return emptyProviderKeys;
  }
}

function App() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [appMode, setAppMode] = useState<AppMode>("setup");
  const [activeStep, setActiveStep] = useState<StepId>("welcome");
  const [survey, setSurvey] = useState<SurveyState>({
    useCase: null,
    answerStyle: null,
    priority: null,
    languageUse: null,
    localMode: null,
    futureFeatures: [],
  });
  const [surveyQuestionIndex, setSurveyQuestionIndex] = useState(0);
  const [surveyTipExpanded, setSurveyTipExpanded] = useState(false);
  const [surveyTipContentVisible, setSurveyTipContentVisible] = useState(false);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState("qwen3:4b");
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("ollama");
  const [selectedCloudModel, setSelectedCloudModel] = useState("gemini-2.0-flash");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dismissedChatIntroKeys, setDismissedChatIntroKeys] = useState<string[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKeyState>(() => loadProviderKeys());
  const [providerKeysSaved, setProviderKeysSaved] = useState(false);
  const [tauriRuntime] = useState(isTauriRuntime);

  const t = useMemo(() => copy[locale], [locale]);
  const providerText = providerUiCopy[locale];
  const recommendedModel = useMemo(() => recommendModel(survey, hardware), [survey, hardware]);
  const recommendedCloudModel = useMemo(() => recommendCloudModel(survey), [survey]);
  const recommendedModelInfo = getModelByName(recommendedModel);
  const recommendedCloudModelInfo = getCloudModelById(recommendedCloudModel);
  const selectedModelInfo = getModelByName(selectedModel);
  const selectedCloudModelInfo = getCloudModelById(selectedCloudModel);
  const activeProviderMeta = providerMeta[selectedProvider];
  const activeProviderMode = activeProviderMeta.mode;
  const activeModelLabel = selectedProvider === "ollama" ? selectedModelInfo.label : selectedCloudModelInfo.label;
  const activeProviderLabel = activeProviderMeta.label;
  const cloudRecommended =
    survey.localMode === "cloudOnly" ||
    (survey.localMode === "hybrid" && (survey.priority === "quality" || survey.useCase === "work"));
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const installedModels = status?.installedModels ?? [];
  const selectedModelInstalled = installedModels.includes(selectedModel);
  const recommendedModelInstalled = installedModels.includes(recommendedModel);
  const serviceLabel = !status ? t.checking : status.running ? t.running : status.installed ? t.stopped : t.missing;
  const promptProfileId = "default";
  const chatIntroKey = `${selectedProvider}:${selectedProvider === "ollama" ? selectedModel : selectedCloudModel}:${promptProfileId}`;
  const showChatIntroCard = (selectedProvider !== "ollama" || selectedModelInstalled) && !dismissedChatIntroKeys.includes(chatIntroKey);

  function log(message: string) {
    setLogs((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current].slice(0, 40));
  }

  function saveProviderKeys() {
    window.localStorage.setItem(PROVIDER_KEYS_STORAGE_KEY, JSON.stringify(providerKeys));
    setProviderKeysSaved(true);
    window.setTimeout(() => setProviderKeysSaved(false), 2000);
  }

  function clearProviderKeys() {
    setProviderKeys(emptyProviderKeys);
    window.localStorage.removeItem(PROVIDER_KEYS_STORAGE_KEY);
    setProviderKeysSaved(false);
  }

  function goToNextStep() {
    if (activeStep === "recommendation" && selectedProvider !== "ollama") {
      setActiveStep("settings");
      return;
    }

    const next = steps[Math.min(activeIndex + 1, steps.length - 1)];
    setActiveStep(next.id);
  }

  function goToPreviousStep() {
    const previous = steps[Math.max(activeIndex - 1, 0)];
    setActiveStep(previous.id);
  }

  async function refreshStatus() {
    setBusyAction("refreshStatus");
    try {
      const nextStatus = await invokeCommand<OllamaStatus>("get_ollama_status");
      setStatus(nextStatus);
      log("Status refreshed.");
    } catch (error) {
      log(`Status failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshHardware() {
    setBusyAction("hardware");
    setHardwareError(null);
    try {
      const nextHardware = await invokeCommand<HardwareInfo>("get_hardware_info");
      setHardware(nextHardware);
      log("Hardware profile refreshed.");
    } catch (error) {
      setHardwareError(String(error));
      log(`Hardware check failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function installOllama() {
    setBusyAction("install");
    try {
      log("Starting Ollama install through winget.");
      const output = await invokeCommand<string>("install_ollama");
      log(output);
      await refreshStatus();
    } catch (error) {
      log(`Install failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function startOllama() {
    setBusyAction("start");
    try {
      const output = await invokeCommand<string>("start_ollama");
      log(output);
      await refreshStatus();
    } catch (error) {
      log(`Start failed: ${String(error)}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function downloadModel(model: string) {
    setBusyAction(`download:${model}`);
    setDownloadProgress({
      model,
      status: t.preparingDownload,
      completed: null,
      total: null,
      percent: 0,
      done: false,
      error: null,
    });
    try {
      log(`Downloading ${model}.`);
      const output = await invokeCommand<string>("pull_model", { model });
      log(output);
      setDismissedChatIntroKeys((current) => current.filter((key) => key !== `ollama:${model}:${promptProfileId}`));
      await refreshStatus();
    } catch (error) {
      const message = String(error);
      setDownloadProgress((current) => ({
        model,
        status: t.downloadFailed,
        completed: current?.completed ?? null,
        total: current?.total ?? null,
        percent: current?.percent ?? null,
        done: true,
        error: message,
      }));
      log(`Download failed: ${message}`);
    } finally {
      setBusyAction(null);
    }
  }

  async function sendMessage() {
    const prompt = chatInput.trim();
    const providerModel = selectedProvider === "ollama" ? selectedModel : selectedCloudModel;
    const apiKey = selectedProvider === "openai"
      ? providerKeys.openai.trim()
      : selectedProvider === "gemini"
        ? providerKeys.gemini.trim()
        : "";
    const localUnavailable = selectedProvider === "ollama" && (!selectedModelInstalled || !status?.running);

    if (!prompt || localUnavailable || busyAction === "chat") {
      return;
    }

    setChatInput("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setBusyAction("chat");

    try {
      const answer = await invokeCommand<string>("chat_once", {
        provider: selectedProvider,
        model: providerModel,
        prompt,
        locale,
        apiKey: apiKey || null,
      });
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
      log("Chat response received.");
    } catch (error) {
      const message = `Chat failed: ${String(error)}`;
      setMessages((current) => [...current, { role: "assistant", content: message }]);
      log(message);
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (tauriRuntime) {
      void (async () => {
        await refreshStatus();
        await refreshHardware();
      })();
    }
  }, [tauriRuntime]);

  useEffect(() => {
    if (!tauriRuntime) {
      return;
    }

    let unlisten: (() => void) | undefined;
    void listen<ModelDownloadProgress>("model-download-progress", (event) => {
      setDownloadProgress(event.payload);
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      unlisten?.();
    };
  }, [tauriRuntime]);

  useEffect(() => {
    setSelectedModel(recommendedModel);
  }, [recommendedModel]);

  useEffect(() => {
    if (cloudRecommended) {
      const cloudModel = getCloudModelById(recommendedCloudModel);
      setSelectedCloudModel(cloudModel.id);
      setSelectedProvider(cloudModel.provider);
      return;
    }

    setSelectedProvider("ollama");
  }, [cloudRecommended, recommendedCloudModel]);

  useEffect(() => {
    if (!surveyTipExpanded) {
      setSurveyTipContentVisible(false);
      return;
    }

    setSurveyTipContentVisible(false);
    const timer = window.setTimeout(() => {
      setSurveyTipContentVisible(true);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [surveyTipExpanded]);

  const renderNavigation = () => (
    <aside className="flex h-screen w-[300px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#35607f] text-white shadow-sm">
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
        </div>
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.setupFlowSubtitle}</p>
        </div>
      </div>

      <nav className="flex-1">
        {steps.map((step, index) => {
          const active = step.id === activeStep;
          const completed = index < activeIndex;

          return (
            <button
              className={`flex w-full items-center gap-3 border-r-4 px-6 py-4 text-left text-sm font-semibold transition ${
                active
                  ? "border-[#35607f] bg-[#cae6ff]/45 text-[#35607f]"
                  : completed
                    ? "border-transparent text-[#4a654e] hover:bg-[#e7e8e9]"
                    : "border-transparent text-[#72787e] hover:bg-[#e7e8e9]"
              }`}
              key={step.id}
              onClick={() => {
                setAppMode("setup");
                setActiveStep(step.id);
              }}
              type="button"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-[#35607f] text-white"
                    : completed
                      ? "bg-[#c9e8cb] text-[#334d38]"
                      : "bg-[#e1e3e4] text-[#72787e]"
                }`}
              >
                {completed ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block">{step.label}</span>
                <span className="block text-xs font-medium opacity-70">{step.detail}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#c2c7ce]/60 p-4">
        <button
          className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
            activeStep === "settings" ? "bg-white text-[#35607f] shadow-sm" : "text-[#72787e] hover:bg-[#e7e8e9]"
          }`}
          onClick={() => {
            setAppMode("setup");
            setActiveStep("settings");
          }}
          type="button"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e1e3e4] text-xs">S</span>
          {t.settings}
        </button>
      </div>
    </aside>
  );

  const renderRuntimeNavigation = () => (
    <aside className="flex h-screen w-[300px] shrink-0 flex-col border-r border-[#c2c7ce]/40 bg-white/70 backdrop-blur">
      <div className="flex h-[60px] items-center gap-3 border-b border-[#c2c7ce]/40 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#35607f] text-white shadow-sm">
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
        </div>
        <div>
          <h1 className="font-heading text-sm font-extrabold text-[#191c1d]">MiVA</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.assistantWorkspace}</p>
        </div>
      </div>

      <div className="border-b border-[#c2c7ce]/30 p-4">
        <button
          className="flex w-full items-center justify-between rounded-2xl border border-[#c2c7ce]/50 bg-white px-4 py-3 text-sm font-bold text-[#191c1d] shadow-sm transition hover:border-[#35607f]/60"
          type="button"
          onClick={() => {
            setMessages([]);
            setChatInput("");
          }}
        >
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[#35607f]">add_comment</span>
            {t.newChat}
          </span>
          <span className="material-symbols-outlined text-[16px] text-[#72787e]">arrow_forward</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <section>
          <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">{t.recentConversations}</h2>
          <div className="mt-3 grid gap-1">
            {[t.chatTitle, activeModelLabel, t.suggestedAction].map((label, index) => (
              <button
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  index === 0 ? "bg-[#cae6ff]/35 font-bold text-[#191c1d]" : "text-[#42474d] hover:bg-[#f3f4f5]"
                }`}
                key={`${label}-${index}`}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-[#72787e]">history</span>
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#72787e]">Collection</h2>
          <div className="mt-3 grid gap-1">
            <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#42474d] transition hover:bg-[#f3f4f5]" type="button">
              <span className="material-symbols-outlined text-[16px] text-[#72787e]">bookmark</span>
              {t.savedSnippets}
            </button>
            <button className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#42474d] transition hover:bg-[#f3f4f5]" type="button">
              <span className="material-symbols-outlined text-[16px] text-[#72787e]">monitoring</span>
              {t.systemLogs}
            </button>
          </div>
        </section>
      </div>

      <div className="border-t border-[#c2c7ce]/40 p-4">
        <button
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[#42474d] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
          type="button"
          onClick={() => {
            setAppMode("setup");
            setActiveStep("settings");
          }}
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          {t.settings}
        </button>
      </div>
    </aside>
  );

  const renderTopBar = () => (
    <header className="grid h-[60px] min-w-[1000px] grid-cols-[minmax(250px,1fr)_minmax(260px,auto)_minmax(96px,1fr)] items-center gap-4 border-b border-[#c2c7ce]/60 bg-[#f8f9fa]/85 px-6 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-heading text-lg font-bold tracking-tight text-[#35607f]">MiVA</span>
        <div className="flex rounded-full border border-[#c2c7ce]/60 bg-[#e7e8e9]/60 p-0.5">
          <button
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              appMode === "setup" ? "bg-white text-[#35607f] shadow-sm" : "text-[#72787e] hover:text-[#191c1d]"
            }`}
            onClick={() => setAppMode("setup")}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            {t.setupMode}
          </button>
          <button
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              appMode === "runtime" ? "bg-white text-[#35607f] shadow-sm" : "text-[#72787e] hover:text-[#191c1d]"
            }`}
            onClick={() => setAppMode("runtime")}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
            {t.runtimeMode}
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[360px] min-w-0 items-center gap-2 rounded-full border border-[#c2c7ce]/60 bg-white/80 px-2.5 py-1.5 shadow-sm">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tracking-[0.14em] ${
            activeProviderMode === "local" ? "bg-[#c9e8cb] text-[#334d38]" : "bg-[#cae6ff] text-[#1c4b69]"
          }`}
        >
          {activeProviderMode === "local" ? providerText.localHeader : providerText.cloudHeader}
        </span>
        <span className="material-symbols-outlined shrink-0 text-sm text-[#4a654e]">{activeProviderMeta.icon}</span>
        <span className="truncate text-[13px] font-semibold text-[#42474d]">
          {activeProviderLabel} · {activeModelLabel}
        </span>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          aria-label="Help"
          className="rounded-full p-2 text-[#72787e] transition-all duration-200 ease-in-out hover:bg-[#f3f4f5]"
          type="button"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <button
          aria-label={t.settings}
          className="rounded-full p-2 text-[#72787e] transition-all duration-200 ease-in-out hover:bg-[#f3f4f5]"
          onClick={() => {
            setAppMode("setup");
            setActiveStep("settings");
          }}
          type="button"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );

  const renderFooter = (primaryLabel = t.continue, primaryAction = goToNextStep, primaryDisabled = false) => (
    <div className="mt-8 flex items-center justify-between">
      <SecondaryButton disabled={activeStep === "welcome"} onClick={goToPreviousStep}>
        {t.back}
      </SecondaryButton>
      <PrimaryButton disabled={primaryDisabled} onClick={primaryAction}>
        {primaryLabel}
      </PrimaryButton>
    </div>
  );

  const renderWelcome = () => (
    <div className="mx-auto flex min-h-[calc(100vh-144px)] w-full max-w-4xl flex-col items-center justify-center text-center">
      <div className="mb-10 space-y-4">
        <h2 className="font-heading text-[42px] font-black leading-tight tracking-tight text-[#191c1d]">{t.welcomeTitle}</h2>
        <p className="mx-auto max-w-xl font-sans text-base leading-6 text-[#42474d] opacity-80">{t.welcomeBody}</p>
      </div>

      <div className="mb-12 grid w-full grid-cols-3 gap-6">
        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#35607f]/10 text-[#35607f]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.privacyTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.privacyBody}</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#4a654e]/10 text-[#4a654e]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.localModelTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.localModelBody}</p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-[#c2c7ce]/20 bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#555d63]/10 text-[#555d63]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud_off
            </span>
          </div>
          <h3 className="font-heading mb-1 text-base font-bold text-[#191c1d]">{t.guidedTitle}</h3>
          <p className="text-sm leading-5 text-[#42474d]">{t.guidedBody}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          className="group flex items-center gap-2 rounded-full bg-[#35607f] px-12 py-4 font-heading text-base font-semibold text-white transition-all duration-300 hover:bg-[#4f7999] hover:shadow-lg active:scale-95"
          onClick={goToNextStep}
          type="button"
        >
          {t.startSetup}
          <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#72787e] opacity-60">{t.estimatedTime}</p>
      </div>
    </div>
  );

  const renderSurvey = () => {
    const question = surveyQuestions[surveyQuestionIndex] ?? surveyQuestions[0];
    const isLastQuestion = surveyQuestionIndex === surveyQuestions.length - 1;
    const progress = ((surveyQuestionIndex + 1) / surveyQuestions.length) * 100;

    function isOptionSelected(questionId: SurveyQuestionId, optionId: string) {
      if (questionId === "useCase") return survey.useCase === optionId;
      if (questionId === "answerStyle") return survey.answerStyle === optionId;
      if (questionId === "priority") return survey.priority === optionId;
      if (questionId === "languageUse") return survey.languageUse === optionId;
      if (questionId === "localMode") return survey.localMode === optionId;
      return survey.futureFeatures.includes(optionId as FutureFeature);
    }

    function questionAnswered(questionId: SurveyQuestionId) {
      if (questionId === "useCase") return survey.useCase !== null;
      if (questionId === "answerStyle") return survey.answerStyle !== null;
      if (questionId === "priority") return survey.priority !== null;
      if (questionId === "languageUse") return survey.languageUse !== null;
      if (questionId === "localMode") return survey.localMode !== null;
      return survey.futureFeatures.length > 0;
    }

    function selectOption(questionId: SurveyQuestionId, optionId: string) {
      setSurvey((current) => {
        if (questionId === "useCase") return { ...current, useCase: optionId as UseCase };
        if (questionId === "answerStyle") return { ...current, answerStyle: optionId as AnswerStyle };
        if (questionId === "priority") return { ...current, priority: optionId as Priority };
        if (questionId === "languageUse") return { ...current, languageUse: optionId as LanguageUse };
        if (questionId === "localMode") return { ...current, localMode: optionId as LocalMode };

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
                const optionTitle = option.title?.[locale] ?? (option.titleKey ? t[option.titleKey] : "");
                const optionBody = option.body?.[locale] ?? (option.bodyKey ? t[option.bodyKey] : "");

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
                          onClick={() => setActiveStep("settings")}
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
  };

  const renderHardware = () => {
    const cpuCores = hardware?.logicalCoreCount ?? 0;
    const ramGb = hardware?.totalMemoryGb ?? 0;
    const diskTotalGb = hardware?.primaryDiskTotalGb ?? 0;
    const diskAvailableGb = hardware?.primaryDiskAvailableGb ?? 0;
    const diskUsedGb = Math.max(diskTotalGb - diskAvailableGb, 0);
    const diskUsedPercent = diskTotalGb > 0 ? Math.min(100, Math.max(0, (diskUsedGb / diskTotalGb) * 100)) : 0;
    const modelCapacityCount = Math.max(1, Math.floor(diskAvailableGb / 4));
    const gpuDetected = Boolean(hardware?.gpuName && !/basic|microsoft/i.test(hardware.gpuName));
    const cpuBadge = !hardware ? t.checking : cpuCores >= 12 ? t.highEnd : cpuCores >= 8 ? t.great : cpuCores >= 4 ? t.basic : t.limited;
    const memoryBadge = !hardware ? t.checking : ramGb >= 32 ? t.great : ramGb >= 16 ? t.good : ramGb >= 8 ? t.basic : t.limited;
    const gpuBadge = !hardware ? t.checking : gpuDetected ? t.optimal : t.vramPlaceholder;
    const cpuVerdict = cpuCores >= 12 ? t.cpuVerdictHigh : cpuCores >= 4 ? t.cpuVerdictGood : t.cpuVerdictBasic;
    const memoryVerdict = ramGb >= 32 ? t.memoryVerdictGreat : ramGb >= 8 ? t.memoryVerdictGood : t.memoryVerdictLimited;
    const gpuVerdict = gpuDetected ? t.gpuVerdictDetected : t.gpuVerdictMissing;

    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h2 className="font-heading mb-2 text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.hardwareTitle}</h2>
            <p className="max-w-3xl text-base leading-6 text-[#72787e]">{t.hardwareBody}</p>
            <div className="mt-6 flex w-fit items-center gap-3 rounded-xl border border-[#c9e8cb]/70 bg-[#c9e8cb]/30 px-5 py-3">
              <span className="material-symbols-outlined text-[#4e6952]">lock</span>
              <p className="text-sm font-medium text-[#4e6952]">{t.hardwarePrivacyBody}</p>
            </div>
          </div>
          <button
            aria-label={t.scanPc}
            className="group relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#c2c7ce] bg-white text-[#35607f] shadow-sm transition hover:border-[#35607f] hover:bg-[#cae6ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!tauriRuntime || busyAction === "hardware"}
            onClick={refreshHardware}
            type="button"
          >
            <span className={`material-symbols-outlined ${busyAction === "hardware" ? "animate-spin" : ""}`}>sync</span>
            <span className="pointer-events-none absolute -bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#2e3132] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
              {t.scanPc}
            </span>
          </button>
        </header>

        {!tauriRuntime && (
          <Panel className="mb-6 border-[#ffdad6] bg-[#fff6f4]">
            <p className="text-sm font-semibold text-[#93000a]">{t.runtimeRequired}</p>
          </Panel>
        )}

        {hardwareError && (
          <Panel className="mb-6 border-[#ffdad6] bg-[#fff6f4]">
            <p className="text-sm font-semibold text-[#93000a]">{hardwareError}</p>
          </Panel>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">memory</span>
              </div>
              <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{cpuBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.processor}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">
              {hardware?.cpuBrand || t.unknown} {cpuCores > 0 ? `- ${cpuCores} ${t.cores}` : ""}
            </p>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? cpuVerdict : t.checking}</p>
            </div>
          </div>

          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">database</span>
              </div>
              <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{memoryBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.memory}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">{formatGb(hardware?.totalMemoryGb)} RAM</p>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? memoryVerdict : t.checking}</p>
            </div>
          </div>

          <div className="group row-span-2 flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">videogame_asset</span>
              </div>
              <span className="rounded-full bg-[#cae6ff] px-3 py-1 text-xs font-semibold text-[#1c4b69]">{gpuBadge}</span>
            </div>
            <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.graphics}</h3>
            <p className="mb-6 text-sm leading-5 text-[#72787e]">{hardware?.gpuName || t.unknown}</p>
            <div className="mb-8">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#72787e]">{t.vramUsage}</span>
                <span className="text-xs font-bold text-[#35607f]">{t.vramPlaceholder}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[12%] rounded-full bg-[#35607f]" />
              </div>
            </div>
            <div className="mt-auto">
              <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.verdict}</p>
              <p className="text-sm leading-5 text-[#72787e]">{hardware ? gpuVerdict : t.checking}</p>
            </div>
            <div className="mt-8 overflow-hidden rounded-lg border border-slate-100 bg-[#f3f4f5]">
              <div className="grid h-32 place-items-center bg-[radial-gradient(circle_at_center,#e7e8e9,#c2c7ce)] text-[#35607f]">
                <span className="material-symbols-outlined text-5xl">memory</span>
              </div>
            </div>
          </div>

          <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md md:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4f7999]/10 text-[#35607f] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined">hard_drive</span>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-[#c9e8cb] px-3 py-1 text-xs font-semibold text-[#4e6952]">{t.driveDetected}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#72787e]">{t.healthy}</span>
              </div>
            </div>
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1">
                <h3 className="font-heading mb-1 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{t.disk}</h3>
                <p className="mb-6 text-sm leading-5 text-[#72787e]">{formatGb(hardware?.primaryDiskTotalGb)} Capacity</p>
                <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#4a654e]" style={{ width: `${diskUsedPercent}%` }} />
                </div>
                <div className="flex justify-between text-xs font-semibold text-[#72787e]">
                  <span>{formatGb(diskUsedGb)} {t.used}</span>
                  <span>{formatGb(diskAvailableGb)} {t.available}</span>
                </div>
              </div>
              <div className="flex-1 rounded-lg border border-slate-200/50 bg-[#f3f4f5] p-4">
                <p className="mb-2 text-sm font-semibold text-[#191c1d]">{t.modelCapacity}</p>
                <p className="text-sm leading-relaxed text-[#72787e]">
                  {t.modelCapacityBody.replace("{count}", String(modelCapacityCount))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#cceace] text-[#07200f]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div>
              <h4 className="text-base font-bold text-[#191c1d]">{t.systemVerificationComplete}</h4>
              <p className="text-sm text-[#72787e]">{t.hardwareMinimumMet}</p>
            </div>
          </div>
          <PrimaryButton disabled={!hardware && tauriRuntime} onClick={goToNextStep}>
            {t.continueRecommendations}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderRecommendation = () => {
    const localCards = [
      ...modelCatalog.map((model) => ({
        id: model.name,
        label: model.label,
        category: model.category,
        summary: model.summary[locale],
        bestFor: model.bestFor[locale],
        selectable: true,
        model,
      })),
      {
        id: "custom-ollama",
        label: providerText.customOllama,
        category: "Placeholder",
        summary: providerText.customOllamaBody,
        bestFor: providerText.comingSoon,
        selectable: false,
        model: null,
      },
    ];
    const topIsCloud = cloudRecommended;
    const topProvider = topIsCloud ? providerMeta[recommendedCloudModelInfo.provider] : providerMeta.ollama;
    const topLabel = topIsCloud ? recommendedCloudModelInfo.label : recommendedModelInfo.label;
    const topSummary = topIsCloud ? recommendedCloudModelInfo.summary[locale] : recommendedModelInfo.summary[locale];
    const topBestFor = topIsCloud ? recommendedCloudModelInfo.bestFor[locale] : recommendedModelInfo.bestFor[locale];
    const reasons = [t.reasonNeed, t.reasonRam];
    if (survey.priority === "speed" || survey.useCase === "fast") {
      reasons.push(t.reasonSpeed);
    }
    if (topIsCloud) {
      reasons.push(providerText.apiKeysNext);
    }

    function selectRecommendedModel() {
      if (topIsCloud) {
        setSelectedProvider(recommendedCloudModelInfo.provider);
        setSelectedCloudModel(recommendedCloudModelInfo.id);
        return;
      }

      setSelectedProvider("ollama");
      setSelectedModel(recommendedModel);
    }

    function continueFromRecommendation() {
      if (selectedProvider !== "ollama") {
        setActiveStep("settings");
        return;
      }

      setActiveStep("ollama");
    }

    return (
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-8">
          <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.recommendationTitle}</h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">{t.recommendationBody}</p>
        </header>

        <Panel className="overflow-hidden border-[#35607f] bg-[#fafdff]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="action">{providerText.recommended}</Badge>
                <Badge tone={topProvider.mode === "local" ? "success" : "action"}>
                  {topProvider.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
                </Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#42474d] shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">{topProvider.icon}</span>
                  {topProvider.label}
                </span>
              </div>
              <h3 className="mt-4 font-heading text-3xl font-bold text-[#191c1d]">{topLabel}</h3>
              <p className="mt-3 max-w-[640px] text-sm leading-6 text-[#42474d]">{topSummary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>{topBestFor}</Badge>
                <Badge>{t.totalRam}: {formatGb(hardware?.totalMemoryGb)}</Badge>
                <Badge>
                  {topIsCloud ? recommendedCloudModelInfo.status[locale] : recommendedModelInstalled ? t.installed : t.notInstalled}
                </Badge>
              </div>
            </div>
            <PrimaryButton
              onClick={selectRecommendedModel}
            >
              {t.selectThis}
            </PrimaryButton>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {reasons.map((reason) => (
              <div className="rounded-xl bg-[#cae6ff]/45 p-4 text-sm font-semibold leading-6 text-[#1c4b69]" key={reason}>
                {reason}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">{providerText.localModels}</h3>
              <p className="mt-1 text-sm text-[#72787e]">{providerText.localDataNotice}</p>
            </div>
            <Badge tone="success">Ollama</Badge>
          </div>

          <div className="mt-4 overflow-x-auto pb-3">
            <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
              {localCards.map((card) => {
                const active = selectedProvider === "ollama" && card.model?.name === selectedModel;

                return (
                  <button
                    className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                      active
                        ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                        : card.selectable
                          ? "border-[#c2c7ce]/70 hover:border-[#35607f] hover:shadow-md"
                          : "cursor-not-allowed border-[#e1e3e4] opacity-70"
                    }`}
                    disabled={!card.selectable}
                    key={card.id}
                    onClick={() => {
                      if (!card.model) return;
                      setSelectedProvider("ollama");
                      setSelectedModel(card.model.name);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                        <span className="material-symbols-outlined text-[20px]">memory</span>
                      </span>
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {!card.selectable && <Badge>{providerText.comingSoon}</Badge>}
                    </div>
                    <p className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{card.label}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">{card.category}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#42474d]">{card.bestFor}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#e1e3e4]">
            <div className="h-full w-1/3 rounded-full bg-[#35607f]/70" />
          </div>
        </Panel>

        <Panel className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#191c1d]">{providerText.cloudModels}</h3>
              <p className="mt-1 text-sm text-[#72787e]">{providerText.cloudDataNotice}</p>
            </div>
            <Badge tone="action">OpenAI / Gemini</Badge>
          </div>

          <div className="mt-4 overflow-x-auto pb-3">
            <div className="grid min-w-max auto-cols-[260px] grid-flow-col gap-4 pr-1">
              {cloudModelCatalog.map((model) => {
                const active = selectedProvider === model.provider && selectedCloudModel === model.id;
                const selectable = model.id !== "custom-cloud";

                return (
                  <button
                    className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                      active
                        ? "border-[#35607f] ring-4 ring-[#cae6ff]"
                        : selectable
                          ? "border-[#c2c7ce]/70 hover:border-[#35607f] hover:shadow-md"
                          : "cursor-not-allowed border-[#e1e3e4] opacity-70"
                    }`}
                    disabled={!selectable}
                    key={model.id}
                    onClick={() => {
                      setSelectedProvider(model.provider);
                      setSelectedCloudModel(model.id);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                        <span className="material-symbols-outlined text-[20px]">{providerMeta[model.provider].icon}</span>
                      </span>
                      {active && <Badge tone="action">{providerText.selected}</Badge>}
                      {!selectable && <Badge>{providerText.comingSoon}</Badge>}
                    </div>
                    <p className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{model.label}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#72787e]">
                      {providerMeta[model.provider].label} · {model.category}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#42474d]">{model.bestFor[locale]}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#e1e3e4]">
            <div className="h-full w-1/3 rounded-full bg-[#35607f]/70" />
          </div>
        </Panel>

        <div className="mt-8 flex items-center justify-between">
          <SecondaryButton onClick={goToPreviousStep}>{t.back}</SecondaryButton>
          <PrimaryButton onClick={continueFromRecommendation}>
            {selectedProvider === "ollama"
              ? providerText.continueToOllama
              : providerText.continueToProviderSettings}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  const renderOllamaSetup = () => (
    <div className="mx-auto max-w-[880px]">
      <header className="mb-8">
        <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.ollamaTitle}</h2>
        <p className="mt-2 text-base leading-7 text-[#42474d]">{t.ollamaBody}</p>
      </header>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.serviceStatus}</span>
              <h3 className="mt-3 font-heading text-2xl font-bold text-[#191c1d]">{serviceLabel}</h3>
              <p className="mt-2 text-sm text-[#42474d]">{status?.version ?? status?.baseUrl ?? "http://localhost:11434"}</p>
            </div>
            <Badge tone={status?.running ? "success" : "action"}>{status?.running ? t.running : t.missing}</Badge>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {!status?.installed && (
              <PrimaryButton disabled={!tauriRuntime || busyAction !== null} onClick={installOllama}>
                {busyAction === "install" ? "Installing..." : t.installOllama}
              </PrimaryButton>
            )}
            {status?.installed && !status.running && (
              <PrimaryButton disabled={!tauriRuntime || busyAction !== null} onClick={startOllama}>
                {busyAction === "start" ? "Starting..." : t.startOllama}
              </PrimaryButton>
            )}
            <SecondaryButton disabled={!tauriRuntime || busyAction !== null} onClick={refreshStatus}>
              {t.refresh}
            </SecondaryButton>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">{t.activity}</h3>
            <Badge>{logs.length}</Badge>
          </div>
          <div className="mt-4 h-56 overflow-auto rounded-xl bg-[#2e3132] p-4 text-xs leading-5 text-[#f0f1f2]">
            {logs.length === 0 ? <p>{t.noLogs}</p> : logs.map((item) => <p key={item}>{item}</p>)}
          </div>
        </Panel>
      </div>

      {renderFooter(t.continue, goToNextStep, !status?.running)}
    </div>
  );

  const renderDownload = () => {
    const downloadBusy = busyAction === `download:${selectedModel}`;
    const activeProgress = downloadProgress?.model === selectedModel ? downloadProgress : null;
    const progress = selectedModelInstalled ? 100 : activeProgress?.percent ?? 0;

    return (
      <div className="mx-auto max-w-[880px]">
        <header className="mb-8">
          <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.downloadTitle}</h2>
          <p className="mt-2 text-base leading-7 text-[#42474d]">{t.downloadBody}</p>
        </header>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
          <Panel>
            <div className="flex items-start justify-between gap-6">
              <div>
                <Badge tone={selectedModelInstalled ? "success" : "action"}>
                  {selectedModelInstalled ? t.installed : t.notInstalled}
                </Badge>
                <h3 className="mt-4 font-heading text-3xl font-bold text-[#191c1d]">{selectedModelInfo.label}</h3>
                <p className="mt-3 text-sm leading-6 text-[#42474d]">{selectedModelInfo.summary[locale]}</p>
              </div>
              <select
                className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-2 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
              >
                {modelCatalog.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8">
              <div className="h-2 overflow-hidden rounded-full bg-[#e1e3e4]">
                <div className="h-full rounded-full bg-[#35607f] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#42474d]">
                <span>{t.modelStorage}: {t.defaultStorage}</span>
                <span>{progress}%</span>
              </div>
            </div>

            <div className="mt-8">
              <PrimaryButton
                disabled={!tauriRuntime || !status?.running || selectedModelInstalled || busyAction !== null}
                onClick={() => downloadModel(selectedModel)}
              >
                {downloadBusy ? t.downloading : t.downloadModel}
              </PrimaryButton>
            </div>
          </Panel>

          <Panel>
            <h3 className="font-heading text-lg font-bold text-[#191c1d]">{t.installedModels}</h3>
            <div className="mt-4 grid gap-3">
              {installedModels.length === 0 ? (
                <p className="rounded-xl bg-[#f3f4f5] p-4 text-sm text-[#42474d]">{t.none}</p>
              ) : (
                installedModels.map((model) => (
                  <div className="flex items-center justify-between rounded-xl bg-[#f3f4f5] p-4 text-sm" key={model}>
                    <span className="font-semibold text-[#191c1d]">{model}</span>
                    <Badge tone="success">{t.installed}</Badge>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        {renderFooter(t.continue, goToNextStep, !selectedModelInstalled)}
      </div>
    );
  };

  const renderChat = () => {
    const greeting =
      selectedProvider === "ollama"
        ? t.chatGreeting.replace("{model}", activeModelLabel)
        : locale === "ko"
          ? `안녕하세요. MiVA에서 ${activeProviderLabel} · ${activeModelLabel} 연결을 준비했습니다. API 키가 설정되어 있으면 바로 응답을 테스트할 수 있습니다.`
          : `Hello. MiVA has prepared ${activeProviderLabel} · ${activeModelLabel}. If an API key is configured, you can test responses now.`;
    const sandboxBody =
      selectedProvider === "ollama"
        ? t.chatSandboxBody.replace("{model}", activeModelLabel)
        : providerText.cloudDataNotice;
    const chatDisabled = selectedProvider === "ollama"
      ? !selectedModelInstalled || !status?.running || busyAction === "chat"
      : busyAction === "chat";

    return (
      <div className="relative mx-auto grid min-h-[calc(100vh-132px)] max-w-[1180px] grid-cols-[minmax(0,1fr)_300px] gap-6 overflow-hidden">
        <section className="flex min-h-0 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-8 overflow-y-auto pb-28 pr-1 pt-2">
          {appMode === "setup" && (
            <section className="relative overflow-hidden rounded-3xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_18px_48px_rgba(53,96,127,0.10)]">
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#cae6ff]/60 blur-3xl" />
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#c9e8cb] text-[#334d38] shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">verified</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#72787e]">Setup Complete</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-[#191c1d]">MiVA is ready</h2>
                    <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#42474d]">
                      {t.chatBody} {t.assistantStageBody}
                    </p>
                  </div>
                </div>
                <PrimaryButton className="shrink-0 rounded-2xl px-6 py-4" onClick={() => setAppMode("runtime")}>
                  <span className="inline-flex items-center gap-2">
                    {t.enterMiVA}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </span>
                </PrimaryButton>
              </div>
            </section>
          )}

          {showChatIntroCard && (
            <section className="relative rounded-2xl border border-[#c2c7ce] bg-white p-6 shadow-sm">
              <button
                aria-label={t.close}
                className="absolute right-4 top-4 rounded-full p-1 text-[#72787e] transition hover:bg-[#f3f4f5] hover:text-[#191c1d]"
                onClick={() => setDismissedChatIntroKeys((current) => [...current, chatIntroKey])}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>

              <div className="flex items-start gap-4 pr-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#4f7999] text-white">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div>
                  <h2 className="font-heading mb-2 text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">
                    {t.chatSandboxTitle}
                  </h2>
                  <p className="text-sm leading-6 text-[#42474d]">
                    {selectedProvider === "ollama" ? (
                      <>
                        {sandboxBody.split(activeModelLabel)[0]}
                        <span className="font-semibold text-[#35607f]">{activeModelLabel}</span>
                        {sandboxBody.split(activeModelLabel)[1] ?? ""}
                      </>
                    ) : (
                      sandboxBody
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="flex max-w-[85%] items-end gap-4 self-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
              <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
            </div>
            <div className="rounded-2xl rounded-bl-none border border-[#c2c7ce] bg-white p-4 shadow-[0_8px_24px_rgba(53,96,127,0.08)]">
              <p className="text-sm leading-6 text-[#191c1d]">{greeting}</p>
              <span className="mt-2 block text-right text-[10px] text-[#72787e]">{t.justNow}</span>
            </div>
          </div>

          {messages.map((message, index) => (
            <div
              className={`flex max-w-[85%] items-end gap-4 ${message.role === "user" ? "self-end" : "self-start"}`}
              key={`${message.role}-${index}`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
                  <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
                </div>
              )}
              <div
                className={`rounded-2xl border p-4 text-sm leading-6 shadow-[0_8px_24px_rgba(53,96,127,0.08)] ${
                  message.role === "user"
                    ? "rounded-br-none border-[#35607f] bg-[#35607f] text-white"
                    : "rounded-bl-none border-[#c2c7ce] bg-white text-[#191c1d]"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {busyAction === "chat" && (
            <div className="flex max-w-[85%] items-end gap-4 self-start" aria-live="polite">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a1cbef]">
                <span className="material-symbols-outlined text-[18px] text-[#1c4b69]">bolt</span>
              </div>
              <div className="rounded-2xl rounded-bl-none border border-[#c2c7ce] bg-white p-4 shadow-[0_8px_24px_rgba(53,96,127,0.08)]">
                <div className="flex items-center gap-3 text-sm font-semibold text-[#35607f]">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>{t.generatingResponse}</span>
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="typing-dot" />
                    <span className="typing-dot animation-delay-150" />
                    <span className="typing-dot animation-delay-300" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 && (
            <div className="mt-3 flex flex-col items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#72787e]">{t.suggestedAction}</p>
              <button
                className="group flex items-center gap-3 rounded-full border border-[#35607f]/20 bg-[#f3f4f5] px-6 py-3 text-[#35607f] transition-all duration-200 hover:border-[#35607f] hover:bg-[#35607f]/5"
                onClick={() => setChatInput(t.suggestedPrompt)}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="text-sm font-medium italic">{t.suggestedPrompt}</span>
                <span className="material-symbols-outlined translate-x-1 text-sm opacity-0 transition-opacity group-hover:opacity-100">
                  arrow_forward
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 bg-[#f8f9fa]/90 pb-2 pt-4 backdrop-blur">
          <form
            className="flex items-center gap-2 rounded-2xl border border-[#c2c7ce] bg-white p-2 shadow-[0_12px_40px_rgba(53,96,127,0.10)]"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <button className="p-3 text-[#72787e] transition hover:text-[#35607f]" type="button">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <textarea
              className="min-h-11 flex-1 resize-none border-none bg-transparent py-3 text-sm text-[#191c1d] outline-none placeholder:text-[#72787e]"
              disabled={chatDisabled}
              placeholder={busyAction === "chat" ? t.generatingResponse : t.messagePlaceholder}
              rows={1}
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <button className="p-2 text-[#72787e] transition hover:text-[#4a654e]" type="button">
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#35607f] text-white shadow-md transition hover:bg-[#4f7999] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={chatDisabled}
              type="submit"
            >
              <span className={`material-symbols-outlined ${busyAction === "chat" ? "animate-spin" : ""}`}>
                {busyAction === "chat" ? "progress_activity" : "send"}
              </span>
            </button>
          </form>

          <div className="mt-3 flex justify-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4a654e]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{t.latencyMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#35607f]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{t.tokensMetric}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#555d63]" />
              <span className="text-[11px] font-semibold uppercase tracking-tight text-[#42474d]">{t.vramMetric}</span>
            </div>
          </div>
        </div>
        </section>

        <aside className="sticky top-2 flex h-[calc(100vh-156px)] flex-col overflow-hidden rounded-3xl border border-[#c2c7ce] bg-white shadow-[0_18px_48px_rgba(53,96,127,0.10)]">
          <div className="border-b border-[#e1e3e4] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">{t.assistantStageTitle}</p>
            <h2 className="mt-2 font-heading text-[22px] font-bold leading-7 text-[#191c1d]">{activeModelLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-[#42474d]">{t.assistantStageBody}</p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#cae6ff_0%,#f8f9fa_48%,#ffffff_100%)] p-6 text-center">
            <div className="relative grid h-40 w-40 place-items-center rounded-full bg-[#35607f] text-white shadow-[0_24px_60px_rgba(53,96,127,0.28)]">
              <span className="absolute inset-3 rounded-full border border-white/25" />
              <span className="material-symbols-outlined text-[64px]">smart_toy</span>
              <span
                className={`absolute -right-1 top-8 h-5 w-5 rounded-full border-4 border-white ${
                  busyAction === "chat" ? "bg-[#35607f] animate-pulse" : "bg-[#4a654e]"
                }`}
              />
            </div>

            <h3 className="mt-8 font-heading text-xl font-bold text-[#191c1d]">{t.characterPreview}</h3>
            <p className="mt-3 text-sm leading-6 text-[#42474d]">{t.characterPreviewBody}</p>

            <div className="mt-6 grid w-full gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-[#72787e]">
                  {selectedProvider === "ollama" ? providerText.localRuntimeReady : providerText.cloudRuntimeReady}
                </span>
                <Badge tone={selectedProvider === "ollama" ? (status?.running ? "success" : "neutral") : "action"}>
                  {selectedProvider === "ollama" ? (status?.running ? t.running : t.stopped) : activeProviderLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-sm">
                <span className="font-semibold text-[#72787e]">{t.characterIdle}</span>
                <Badge tone={busyAction === "chat" ? "action" : "neutral"}>
                  {busyAction === "chat" ? t.generatingResponse : t.characterListening}
                </Badge>
              </div>
            </div>
          </div>
        </aside>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="mx-auto max-w-[860px]">
      <header className="mb-8">
        <h2 className="font-heading text-[28px] font-bold leading-9 tracking-[-0.02em] text-[#191c1d]">{t.settingsTitle}</h2>
        <p className="mt-2 text-base leading-7 text-[#42474d]">{t.settingsBody}</p>
      </header>

      <Panel className="mb-6">
        <div className="grid gap-6">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.language}</span>
            <select
              className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none focus:border-[#35607f]"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </label>

          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.modelStorage}</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">{t.defaultStorage}</p>
          </div>

          <div className="rounded-xl bg-[#f3f4f5] p-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.currentModel}</span>
            <p className="mt-2 text-sm font-semibold text-[#191c1d]">
              {activeProviderLabel} · {activeModelLabel}
            </p>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#191c1d]">{t.providerKeysTitle}</h3>
            <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#42474d]">{t.providerKeysBody}</p>
          </div>
          {providerKeysSaved && <Badge tone="success">{t.keysSaved}</Badge>}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {(["ollama", "openai", "gemini"] as ProviderId[]).map((providerId) => {
            const meta = providerMeta[providerId];
            const isActive = selectedProvider === providerId;
            const statusLabel =
              providerId === "ollama"
                ? status?.running
                  ? t.running
                  : status?.installed
                    ? t.stopped
                    : t.missing
                : providerKeys[providerId]
                  ? providerText.hasOverride
                  : providerText.defaultKey;

            return (
              <button
                className={`rounded-2xl border bg-white p-4 text-left transition ${
                  isActive ? "border-[#35607f] ring-4 ring-[#cae6ff]" : "border-[#c2c7ce]/70 hover:border-[#35607f]"
                }`}
                key={providerId}
                onClick={() => {
                  setSelectedProvider(providerId);
                  if (providerId !== "ollama") {
                    setSelectedCloudModel(cloudModelCatalog.find((model) => model.provider === providerId)?.id ?? selectedCloudModel);
                  }
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#cae6ff]/55 text-[#35607f]">
                    <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                  </span>
                  <Badge tone={meta.mode === "local" ? "success" : "action"}>
                    {meta.mode === "local" ? providerText.localHeader : providerText.cloudHeader}
                  </Badge>
                </div>
                <h4 className="mt-4 font-heading text-lg font-bold text-[#191c1d]">{meta.label}</h4>
                <p className="mt-1 text-sm font-semibold text-[#72787e]">{statusLabel}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.openaiApiKey}</span>
              <Badge tone={providerKeys.openai ? "action" : "neutral"}>{providerKeys.openai ? t.userOverrideKey : t.defaultEnvKey}</Badge>
            </div>
            <input
              autoComplete="off"
              className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
              placeholder="sk-..."
              type="password"
              value={providerKeys.openai}
              onChange={(event) => setProviderKeys((current) => ({ ...current, openai: event.target.value }))}
            />
          </label>

          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.geminiApiKey}</span>
              <Badge tone={providerKeys.gemini ? "action" : "neutral"}>{providerKeys.gemini ? t.userOverrideKey : t.defaultEnvKey}</Badge>
            </div>
            <input
              autoComplete="off"
              className="rounded-lg border border-[#c2c7ce] bg-white px-3 py-3 text-sm text-[#191c1d] outline-none transition focus:border-[#35607f]"
              placeholder="AIza..."
              type="password"
              value={providerKeys.gemini}
              onChange={(event) => setProviderKeys((current) => ({ ...current, gemini: event.target.value }))}
            />
          </label>

          <div className="rounded-xl bg-[#fff8e1] p-4 text-sm leading-6 text-[#5c4300]">
            {t.keyStorageNotice}
          </div>

          <div className="flex items-center justify-end gap-3">
            <SecondaryButton onClick={clearProviderKeys}>{t.clearKeys}</SecondaryButton>
            <PrimaryButton onClick={saveProviderKeys}>{t.saveKeys}</PrimaryButton>
          </div>
        </div>
      </Panel>

      <div className="mt-6 flex justify-end">
        <PrimaryButton
          onClick={() => {
            saveProviderKeys();
            setActiveStep("chat");
          }}
        >
          {t.continue}
        </PrimaryButton>
      </div>
    </div>
  );

  const renderDownloadProgressModal = () => {
    if (!downloadProgress) {
      return null;
    }

    const model = getModelByName(downloadProgress.model);
    const percent = downloadProgress.error ? downloadProgress.percent ?? 0 : downloadProgress.done ? 100 : downloadProgress.percent ?? 0;
    const visiblePercent = Math.min(100, Math.max(downloadProgress.done ? 100 : 0, percent));
    const title = downloadProgress.error
      ? t.downloadFailed
      : downloadProgress.done
        ? t.downloadComplete
        : t.downloadProgressTitle;

    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-[#191c1d]/35 px-6 backdrop-blur-sm">
        <section className="w-full max-w-[520px] rounded-2xl border border-[#c2c7ce]/70 bg-white p-6 shadow-[0_24px_80px_rgba(25,28,29,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#72787e]">{model.label}</p>
              <h2 className="mt-2 font-heading text-[22px] font-semibold leading-[30px] tracking-[-0.01em] text-[#191c1d]">{title}</h2>
            </div>
            <div
              className={`relative grid h-11 w-11 place-items-center rounded-full ${
                downloadProgress.error ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#cae6ff] text-[#35607f]"
              }`}
            >
              {!downloadProgress.done && !downloadProgress.error && (
                <span className="absolute inset-1 rounded-full border-2 border-[#35607f]/20 border-t-[#35607f] animate-spin" />
              )}
              <span className="material-symbols-outlined relative z-10">
                {downloadProgress.error ? "error" : downloadProgress.done ? "check_circle" : "arrow_downward"}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-[#42474d]">{downloadProgress.status || t.preparingDownload}</span>
              <span className="text-sm font-bold text-[#35607f]">{Math.round(visiblePercent)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#e1e3e4]">
              <div className="h-full rounded-full bg-[#35607f] transition-all duration-300" style={{ width: `${visiblePercent}%` }} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f3f4f5] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.downloaded}</p>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">{formatBytes(downloadProgress.completed)}</p>
            </div>
            <div className="rounded-xl bg-[#f3f4f5] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#72787e]">{t.downloadSize}</p>
              <p className="mt-2 text-sm font-semibold text-[#191c1d]">{formatBytes(downloadProgress.total)}</p>
            </div>
          </div>

          {downloadProgress.error && (
            <p className="mt-5 rounded-xl bg-[#ffdad6] p-4 text-sm leading-6 text-[#93000a]">{downloadProgress.error}</p>
          )}

          {(downloadProgress.done || downloadProgress.error) && (
            <div className="mt-6 flex justify-end">
              <PrimaryButton onClick={() => setDownloadProgress(null)}>{t.close}</PrimaryButton>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (activeStep === "welcome") return renderWelcome();
    if (activeStep === "survey") return renderSurvey();
    if (activeStep === "hardware") return renderHardware();
    if (activeStep === "recommendation") return renderRecommendation();
    if (activeStep === "ollama") return renderOllamaSetup();
    if (activeStep === "download") return renderDownload();
    if (activeStep === "chat") return renderChat();
    return renderSettings();
  };

  return (
    <main className="flex h-screen min-w-[1000px] overflow-hidden bg-[#f8f9fa] text-[#191c1d]">
      {appMode === "setup" ? renderNavigation() : renderRuntimeNavigation()}
      <div className="flex min-w-0 flex-1 flex-col">
        {renderTopBar()}
        <div className="flex-1 overflow-y-auto px-10 py-9">{appMode === "setup" ? renderCurrentStep() : renderChat()}</div>
      </div>
      {renderDownloadProgressModal()}
    </main>
  );
}

export default App;
