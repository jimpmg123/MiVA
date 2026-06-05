export type WebLocale = 'ko' | 'en';

export type WebMessages = {
  languageToggle: string;
  languageKo: string;
  languageEn: string;
  backToLanding: string;
  nav: {
    dashboard: string;
    devices: string;
    models: string;
    profiles: string;
    apiKeys: string;
    usage: string;
    billing: string;
    integrations: string;
    voice: string;
    admin: string;
    settings: string;
  };
  shell: {
    brandTitle: string;
    brandSubtitle: string;
    searchPlaceholder: string;
    downloadDesktop: string;
    logout: string;
    connected: string;
    offline: string;
    checking: string;
    devUser: string;
    devAdmin: string;
  };
  login: {
    eyebrow: string;
    title: string;
    body: string;
    featureLocalTitle: string;
    featureLocalBody: string;
    featureAssistantsTitle: string;
    featureAssistantsBody: string;
    featureStudioTitle: string;
    featureStudioBody: string;
    downloadMiVA: string;
    cloudApi: string;
    desktopLogin: string;
    desktopLoginBody: string;
    signInTitle: string;
    signInBody: string;
    continueGoogle: string;
    signingIn: string;
    googleNotConfigured: string;
    googleBackendNotConfigured: string;
    googleChecking: string;
    email: string;
    password: string;
    signIn: string;
    signInPending: string;
    userLogin: string;
    adminLogin: string;
  };
  landing: {
    navProblems: string;
    navFeatures: string;
    navReviews: string;
    startFree: string;
    heroBadge: string;
    heroTitle1: string;
    heroTitle2Prefix: string;
    heroTitle2Brand: string;
    heroBody1: string;
    heroBody2: string;
    heroPrimaryCta: string;
    heroSecondaryCta: string;
    mockHome: string;
    mockPlaceholder: string;
    problemsTitle: string;
    problem1Title: string;
    problem1Body: string;
    problem2Title: string;
    problem2Body: string;
    problem3Title: string;
    problem3Body: string;
    benefitLabel: string;
    service01Badge: string;
    service01Title: string;
    service01Body1: string;
    service01Body2: string;
    service01Benefit: string;
    service02Badge: string;
    service02Title: string;
    service02Body1: string;
    service02Body2: string;
    service02Benefit: string;
    service03Badge: string;
    service03Title: string;
    service03Body1: string;
    service03Body2: string;
    service03Benefit: string;
    installProgress: string;
    roleLabel: string;
    instructionsLabel: string;
    knowledgeBase: string;
    fileContract: string;
    fileManual: string;
    fileLearning: string;
    reviewsTitle: string;
    reviewsBody: string;
    review1Quote: string;
    review1Name: string;
    review1Role: string;
    review2Quote: string;
    review2Name: string;
    review2Role: string;
    reviewsDisclaimer: string;
    ctaTitle1: string;
    ctaTitle2: string;
    ctaBody: string;
    ctaPrimary: string;
    ctaSecondary: string;
    footerBody: string;
    footerProduct: string;
    footerCommunity: string;
    footerSupport: string;
    footerFeatures: string;
    footerUpdates: string;
    footerRoadmap: string;
    footerDiscord: string;
    footerTwitter: string;
    footerGithub: string;
    footerSupportCenter: string;
    footerPrivacy: string;
    footerTerms: string;
    footerCopyright: string;
  };
  models: {
    deleteConfirmTitle: string;
    deleteConfirmBody: string;
    cancel: string;
    delete: string;
  };
};

export const messages: Record<WebLocale, WebMessages> = {
  ko: {
    languageToggle: '언어 변경',
    languageKo: '한국어',
    languageEn: 'English',
    backToLanding: '홈으로 돌아가기',
    nav: {
      dashboard: '대시보드',
      devices: '디바이스',
      models: '모델',
      profiles: '내 비서',
      apiKeys: 'API 키',
      usage: '사용량',
      billing: '결제',
      integrations: '연동',
      voice: '음성 & 캐릭터',
      admin: '관리자 분석',
      settings: '설정',
    },
    shell: {
      brandTitle: 'MiVA AI',
      brandSubtitle: '로컬 관리',
      searchPlaceholder: '리소스 또는 모델 검색...',
      downloadDesktop: 'MiVA 데스크톱 앱 다운로드',
      logout: '로그아웃',
      connected: '연결됨',
      offline: '오프라인',
      checking: '확인 중',
      devUser: '개발 사용자',
      devAdmin: '개발 관리자',
    },
    login: {
      eyebrow: 'MiVA',
      title: '나만의 AI 비서를 만들어 보세요.',
      body: 'MiVA는 비개발자도 자신의 컴퓨터에서 프라이빗 AI 비서를 설정할 수 있도록 돕습니다. 로컬 모델로 시작하고, 필요할 때 클라우드 제공자를 추가하며, 이후 음성, 캐릭터, 도구, Google Workspace를 연결할 수 있습니다.',
      featureLocalTitle: '로컬 우선 설정',
      featureLocalBody: 'Ollama를 설치하고 가벼운 모델을 선택해 로컬에서 채팅을 테스트합니다.',
      featureAssistantsTitle: '내 비서',
      featureAssistantsBody: '용도, 답변 스타일, 제공자, 모델, 향후 도구 설정을 저장합니다.',
      featureStudioTitle: '스튜디오 준비',
      featureStudioBody: '프롬프트, TTS, 2D 캐릭터, 연동, 스킬을 한 작업공간에서 준비합니다.',
      downloadMiVA: 'MiVA 다운로드',
      cloudApi: '클라우드 API',
      desktopLogin: '데스크톱 로그인',
      desktopLoginBody: '로그인 후 이 브라우저 세션이 MiVA Desktop과 자동으로 연결됩니다.',
      signInTitle: '콘솔 로그인',
      signInBody: 'Google 계정으로 계속하거나, 테스트용 임시 개발 계정을 사용하세요.',
      continueGoogle: 'Google로 계속하기',
      signingIn: '로그인 중',
      googleNotConfigured: 'Google OAuth가 설정되지 않았습니다',
      googleBackendNotConfigured: 'API 서버에 Google 로그인이 설정되지 않았습니다. 아래 개발 계정을 사용하세요.',
      googleChecking: 'Google 로그인 상태 확인 중...',
      email: '이메일',
      password: '비밀번호',
      signIn: '로그인',
      signInPending: '로그인 중...',
      userLogin: '사용자 로그인',
      adminLogin: '관리자 로그인',
    },
    landing: {
      navProblems: '문제점',
      navFeatures: '주요 기능',
      navReviews: '사용 후기',
      startFree: '무료로 시작하기',
      heroBadge: '내 컴퓨터 속 안전한 AI',
      heroTitle1: '내 컴퓨터에서 바로 쓰는',
      heroTitle2Prefix: '맞춤형 AI 비서,',
      heroTitle2Brand: 'miva',
      heroBody1: '로컬 모델 설치, 프롬프트 설정, 문서 연결까지 복잡했던 과정을 miva가 한곳에서 정리합니다.',
      heroBody2: '비개발자도 3단계로 시작하고, 개발자는 로컬 AI 환경을 빠르게 커스터마이징할 수 있습니다.',
      heroPrimaryCta: '무료로 miva 시작하기',
      heroSecondaryCta: '개발자용 커스터마이징 보기',
      mockHome: 'miva Home',
      mockPlaceholder: '무엇이든 물어보세요...',
      problemsTitle: '로컬 AI를 쓰고 싶지만, 시작부터 막힙니다',
      problem1Title: '1. 설치에 2~3시간을 쓰고도 실행이 안 됩니다',
      problem1Body: '모델 다운로드, GPU 설정, Ollama 또는 LM Studio 연결, 포트 설정까지 처음 접하는 사람에게는 단계가 너무 많습니다.',
      problem2Title: '2. 내 목적에 맞게 바꾸려면 설정 파일이 5개 이상 필요합니다',
      problem2Body: '말투, 역할, 문서 연결, 프롬프트, 모델 옵션을 바꾸려면 매번 다른 도구와 파일을 열어야 합니다.',
      problem3Title: '3. ChatGPT에 올리기 어려운 문서가 계속 쌓입니다',
      problem3Body: '계약서, 고객 메모, 업무 매뉴얼, 개인 기록처럼 민감한 자료는 외부 서버에 올리기 부담스럽습니다.',
      benefitLabel: '기대 효과',
      service01Badge: 'Service 01',
      service01Title: '로컬 모델 간편 설치',
      service01Body1: 'miva는 복잡한 로컬 모델 실행 과정을 한 화면에서 정리합니다.',
      service01Body2: '모델 선택, 실행 상태 확인, 기본 설정까지 3단계로 시작할 수 있습니다.',
      service01Benefit: '처음 쓰는 사람도 로컬 AI 환경을 빠르게 만들고, 개발자는 반복 설치 시간을 줄일 수 있습니다.',
      service02Badge: 'Service 02',
      service02Title: 'AI 비서 커스터마이징',
      service02Body1: '업무용, 개인용, 개발용 등 목적에 맞는 AI 비서를 만들 수 있습니다.',
      service02Body2: '말투, 역할, 답변 규칙, 참고 문서, 사용 목적을 한곳에서 관리합니다.',
      service02Benefit: '매번 프롬프트를 다시 쓰지 않아도 되고, 자주 쓰는 AI 설정을 재사용할 수 있습니다.',
      service03Badge: 'Service 03',
      service03Title: '내 문서 기반 로컬 AI',
      service03Body1: '개인 문서, 업무 자료, 매뉴얼을 로컬 환경에 연결해 AI가 참고하도록 만들 수 있습니다.',
      service03Body2: '민감한 자료를 외부 API로 보내지 않고도 문서 기반 답변을 받을 수 있습니다.',
      service03Benefit: 'API 비용을 줄이면서도, 민감한 데이터는 내 컴퓨터에 남긴 채 AI 검색과 답변 기능을 쓸 수 있습니다.',
      installProgress: '설치 중 75%',
      roleLabel: 'Role',
      instructionsLabel: 'Instructions',
      knowledgeBase: '로컬 지식 베이스',
      fileContract: '계약서_2024.pdf',
      fileManual: '업무매뉴얼.docx',
      fileLearning: '학습 중...',
      reviewsTitle: '이미 많은 분들이 miva와 함께하고 있습니다',
      reviewsBody: 'miva를 통해 업무 효율을 높인 고객님들의 실제 사례를 확인해보세요.',
      review1Quote: '로컬 LLM을 써보고 싶었지만 설치 과정에서 항상 막혔습니다. miva로는 모델 실행부터 제 업무용 비서 설정까지 20분 안에 끝냈고, 지금은 회의 메모 정리와 문서 초안 작성에 매일 쓰고 있습니다.',
      review1Name: '김서연',
      review1Role: '프리랜서 기획자',
      review2Quote: '개발할 때마다 Ollama 연결, 프롬프트 관리, 테스트 UI를 다시 만드는 게 번거로웠습니다. miva를 쓰고 나서는 로컬 모델 테스트 환경을 바로 만들 수 있어서 프로토타입 준비 시간이 절반 이하로 줄었습니다.',
      review2Name: '박준호',
      review2Role: '백엔드 개발자',
      reviewsDisclaimer: '* 위 후기는 랜딩페이지 구성을 위한 가상 고객 사례입니다.',
      ctaTitle1: '로컬 AI, 어렵게 설치하지 말고',
      ctaTitle2: "'바로 써보세요'",
      ctaBody: 'miva는 로컬 모델을 처음 쓰는 사람에게는 쉬운 시작점을, 개발자에게는 빠른 커스터마이징 환경을 제공합니다. 내 컴퓨터에서 실행되는 맞춤형 AI 비서를 무료로 체험해보세요.',
      ctaPrimary: '무료 체험 시작하기',
      ctaSecondary: 'miva로 내 AI 비서 만들기',
      footerBody: '누구나 쉽게 시작하는 로컬 AI 환경. miva는 당신의 로컬 컴퓨터 속 비서를 더욱 가깝게 만듭니다.',
      footerProduct: '제품',
      footerCommunity: '커뮤니티',
      footerSupport: '지원',
      footerFeatures: '주요 기능',
      footerUpdates: '업데이트 소식',
      footerRoadmap: '로드맵',
      footerDiscord: 'Discord',
      footerTwitter: 'Twitter (X)',
      footerGithub: 'GitHub',
      footerSupportCenter: '고객센터',
      footerPrivacy: '개인정보 처리방침',
      footerTerms: '이용약관',
      footerCopyright: '© 2024 miva. All rights reserved.',
    },
    models: {
      deleteConfirmTitle: '로컬 모델을 삭제할까요?',
      deleteConfirmBody:
        '파일이 Ollama 저장소에서 제거됩니다. 이 모델을 쓰는 비서가 있으면 OpenAI(gpt-4o-mini)로 자동 전환됩니다.',
      cancel: '취소',
      delete: '삭제',
    },
  },
  en: {
    languageToggle: 'Change language',
    languageKo: '한국어',
    languageEn: 'English',
    backToLanding: 'Back to home',
    nav: {
      dashboard: 'Dashboard',
      devices: 'Devices',
      models: 'Models',
      profiles: 'My Assistants',
      apiKeys: 'API Keys',
      usage: 'Usage',
      billing: 'Billing',
      integrations: 'Integrations',
      voice: 'Voice & Character',
      admin: 'Admin Analytics',
      settings: 'Settings',
    },
    shell: {
      brandTitle: 'MiVA AI',
      brandSubtitle: 'Local Management',
      searchPlaceholder: 'Search resources or models...',
      downloadDesktop: 'Download MiVA desktop app',
      logout: 'Logout',
      connected: 'Connected',
      offline: 'Offline',
      checking: 'Checking',
      devUser: 'Dev User',
      devAdmin: 'Dev Admin',
    },
    login: {
      eyebrow: 'MiVA',
      title: 'Make your own AI Assistant.',
      body: 'MiVA helps non-technical users set up a private AI assistant on their own computer. Start with local models, add cloud providers when needed, and later connect voice, characters, tools, and Google Workspace.',
      featureLocalTitle: 'Local-first setup',
      featureLocalBody: 'Install Ollama, choose a lightweight model, and test chat locally.',
      featureAssistantsTitle: 'My Assistants',
      featureAssistantsBody: 'Save use case, answer style, provider, model, and future tool preferences.',
      featureStudioTitle: 'Studio ready',
      featureStudioBody: 'Prepare prompts, TTS, 2D characters, integrations, and skills in one workspace.',
      downloadMiVA: 'Download MiVA',
      cloudApi: 'Cloud API',
      desktopLogin: 'Desktop Login',
      desktopLoginBody: 'After sign-in, this browser session will connect MiVA Desktop automatically.',
      signInTitle: 'Sign in to Console',
      signInBody: 'Continue with your Google account, or use a temporary development account while testing.',
      continueGoogle: 'Continue with Google',
      signingIn: 'Signing in',
      googleNotConfigured: 'Google OAuth not configured',
      googleBackendNotConfigured: 'Google sign-in is not enabled on the API server. Use the development account below.',
      googleChecking: 'Checking Google sign-in status...',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign in',
      signInPending: 'Signing in...',
      userLogin: 'User login',
      adminLogin: 'Admin login',
    },
    landing: {
      navProblems: 'Problems',
      navFeatures: 'Key Features',
      navReviews: 'Reviews',
      startFree: 'Start for free',
      heroBadge: 'Secure AI on your computer',
      heroTitle1: 'Your customized AI assistant,',
      heroTitle2Prefix: 'running locally with',
      heroTitle2Brand: 'miva',
      heroBody1: 'MiVA brings local model setup, prompt tuning, and document connection into one place.',
      heroBody2: 'Non-developers can start in three steps, and developers can customize local AI environments quickly.',
      heroPrimaryCta: 'Start miva for free',
      heroSecondaryCta: 'View developer customization',
      mockHome: 'miva Home',
      mockPlaceholder: 'Ask anything...',
      problemsTitle: 'You want local AI, but getting started is the hard part',
      problem1Title: '1. Hours of setup still fail to run',
      problem1Body: 'Model downloads, GPU setup, Ollama or LM Studio connection, and port configuration are too many steps for first-time users.',
      problem2Title: '2. Customizing for your use case needs five or more config files',
      problem2Body: 'Changing tone, role, documents, prompts, and model options means opening different tools and files every time.',
      problem3Title: '3. Sensitive documents keep piling up',
      problem3Body: 'Contracts, customer notes, manuals, and personal records are hard to upload to external servers like ChatGPT.',
      benefitLabel: 'Expected benefit',
      service01Badge: 'Service 01',
      service01Title: 'Easy local model setup',
      service01Body1: 'MiVA organizes the complex local model workflow into one screen.',
      service01Body2: 'Choose a model, check runtime status, and finish basic setup in three steps.',
      service01Benefit: 'First-time users can build a local AI environment quickly, and developers can cut repeated setup time.',
      service02Badge: 'Service 02',
      service02Title: 'AI assistant customization',
      service02Body1: 'Create assistants for work, personal use, or development.',
      service02Body2: 'Manage tone, role, response rules, reference documents, and purpose in one place.',
      service02Benefit: 'Reuse your favorite AI settings without rewriting prompts every time.',
      service03Badge: 'Service 03',
      service03Title: 'Document-based local AI',
      service03Body1: 'Connect personal documents, work files, and manuals in a local environment for AI reference.',
      service03Body2: 'Get document-aware answers without sending sensitive data to external APIs.',
      service03Benefit: 'Reduce API costs while keeping sensitive data on your machine.',
      installProgress: 'Installing 75%',
      roleLabel: 'Role',
      instructionsLabel: 'Instructions',
      knowledgeBase: 'Local knowledge base',
      fileContract: 'contract_2024.pdf',
      fileManual: 'work_manual.docx',
      fileLearning: 'Learning...',
      reviewsTitle: 'Many people are already using miva',
      reviewsBody: 'See how customers improved their workflow with miva.',
      review1Quote: 'I always got stuck installing local LLMs. With miva, I finished model setup and my work assistant in 20 minutes, and now I use it daily for meeting notes and drafts.',
      review1Name: 'Sarah Kim',
      review1Role: 'Freelance planner',
      review2Quote: 'Reconnecting Ollama, managing prompts, and rebuilding test UIs was tedious. With miva, I can spin up a local model test environment immediately and cut prototype prep time in half.',
      review2Name: 'James Park',
      review2Role: 'Backend developer',
      reviewsDisclaimer: '* These reviews are fictional examples for the landing page.',
      ctaTitle1: "Don't struggle to install local AI.",
      ctaTitle2: 'Try it right away.',
      ctaBody: 'MiVA gives beginners an easy starting point and developers a fast customization environment. Try your personalized AI assistant on your computer for free.',
      ctaPrimary: 'Start free trial',
      ctaSecondary: 'Create my AI assistant with miva',
      footerBody: 'A local AI environment anyone can start easily. MiVA brings the assistant on your computer closer to you.',
      footerProduct: 'Product',
      footerCommunity: 'Community',
      footerSupport: 'Support',
      footerFeatures: 'Key features',
      footerUpdates: 'Updates',
      footerRoadmap: 'Roadmap',
      footerDiscord: 'Discord',
      footerTwitter: 'Twitter (X)',
      footerGithub: 'GitHub',
      footerSupportCenter: 'Support center',
      footerPrivacy: 'Privacy policy',
      footerTerms: 'Terms of use',
      footerCopyright: '© 2024 miva. All rights reserved.',
    },
    models: {
      deleteConfirmTitle: 'Delete this local model?',
      deleteConfirmBody:
        'The file will be removed from the Ollama store. Assistants using this model will automatically switch to OpenAI (gpt-4o-mini).',
      cancel: 'Cancel',
      delete: 'Delete',
    },
  },
};
