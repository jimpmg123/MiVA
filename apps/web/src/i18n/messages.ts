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
    personaHub: string;
    admin: string;
    settings: string;
  };
  personaHub: {
    previewBadge: string;
    notConnectedBadge: string;
    title: string;
    subtitlePrimary: string;
    subtitleSecondary: string;
    sharePreset: string;
    uploadBundle: string;
    browseTitle: string;
    browseBody: string;
    tableView: string;
    cardsView: string;
    filters: {
      trending: string;
      new: string;
      voice: string;
      character: string;
    };
    table: {
      preset: string;
      author: string;
      voice: string;
      character: string;
      downloads: string;
      comments: string;
      likes: string;
    };
    featured: string;
    useCases: {
      daily: string;
      study: string;
      work: string;
      character: string;
    };
    voiceLabel: string;
    characterLabel: string;
    importDesktop: string;
    save: string;
    previewVoice: string;
    commentsTitle: string;
    asyncThread: string;
    helpful: string;
    leaveComment: string;
    commentPlaceholder: string;
    post: string;
    mockCommentNote: string;
    selectPreset: string;
    sharedBy: string;
    steps: Array<{ title: string; body: string }>;
    presets: Array<{
      id: string;
      icon: 'desk' | 'tutor' | 'focus' | 'character';
      title: string;
      author: string;
      voice: string;
      character: string;
      useCase: 'daily' | 'study' | 'work' | 'character';
      tags: string[];
      description: string;
      updatedAt: string;
      featured?: boolean;
      voiceFocused?: boolean;
      characterFocused?: boolean;
      comments: Array<{
        id: string;
        author: string;
        body: string;
        createdAt: string;
        likes: number;
      }>;
      downloads: number;
      likes: number;
      commentCount: number;
    }>;
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
  desktopDownload: {
    noticeTitle: string;
    noticeBody: string;
    dismiss: string;
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
  settingsPage: {
    title: string;
    subtitle: string;
    preferencesTitle: string;
    languageTitle: string;
    languageBody: string;
    themeTitle: string;
    themeBody: string;
    themeDark: string;
    themeLight: string;
    maintenanceTitle: string;
    resetTitle: string;
    resetBody: string;
    resetAction: string;
    privacyTitle: string;
    privacyBody: string;
    privacyAction: string;
    nodeHealth: string;
    localBridge: string;
    syncStatus: string;
    version: string;
    active: string;
    synchronized: string;
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
      personaHub: '프리셋 허브',
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
    desktopDownload: {
      noticeTitle: 'Node.js 설치가 필요합니다',
      noticeBody: 'MiVA Desktop 설치 후 Local Helper를 실행하려면 이 PC에 Node.js 22+가 있어야 합니다. CS 수업 환경이라면 대부분 이미 설치되어 있을 것입니다.',
      dismiss: '닫기',
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
    settingsPage: {
      title: '설정',
      subtitle: '로컬 웹 콘솔과 브리지 환경을 구성합니다.',
      preferencesTitle: '콘솔 환경설정',
      languageTitle: '언어 선택',
      languageBody: '관리 콘솔의 인터페이스 언어입니다.',
      themeTitle: '테마',
      themeBody: '대시보드의 시각 스타일입니다.',
      themeDark: '다크',
      themeLight: '라이트',
      maintenanceTitle: '시스템 유지보수',
      resetTitle: '웹 콘솔 상태 초기화',
      resetBody: '로컬 저장소의 환경설정과 캐시를 모두 지웁니다.',
      resetAction: '지금 초기화',
      privacyTitle: '로컬 우선 프라이버시',
      privacyBody: 'MiVA는 로컬 우선 원칙 위에 만들어졌습니다. 브리지를 명시적으로 설정하지 않는 한 데이터는 기기 밖으로 나가지 않습니다.',
      privacyAction: '선언문 읽기',
      nodeHealth: '노드 상태',
      localBridge: '로컬 브리지',
      syncStatus: '동기화 상태',
      version: '버전',
      active: '활성',
      synchronized: '동기화됨',
    },
    personaHub: {
      previewBadge: '미리보기 목업',
      notConnectedBadge: 'API 미연결',
      title: '프리셋 허브',
      subtitlePrimary:
        'AI 비서의 음성·캐릭터·프롬프트 설정을 업로드하고, 다른 사람 프리셋을 둘러본 뒤 댓글로 피드백하는 커뮤니티 보드입니다.',
      subtitleSecondary:
        '실시간 대화방이 아니라 게시글 + 댓글 + 가져오기 흐름을 가정한 UI 목업입니다.',
      sharePreset: '내 프리셋 공유',
      uploadBundle: '번들 업로드',
      browseTitle: '프리셋 둘러보기',
      browseBody: '다운로드, 최신순, 커뮤니티 피드백 기준으로 정렬된 공유 비서 설정입니다.',
      tableView: '테이블',
      cardsView: '카드',
      filters: {
        trending: '인기',
        new: '최신',
        voice: '음성',
        character: '캐릭터',
      },
      table: {
        preset: '프리셋',
        author: '작성자',
        voice: '음성',
        character: '캐릭터',
        downloads: '다운로드',
        comments: '댓글',
        likes: '좋아요',
      },
      featured: '추천',
      useCases: {
        daily: '일상',
        study: '학습',
        work: '업무',
        character: '캐릭터',
      },
      voiceLabel: '음성',
      characterLabel: '캐릭터',
      importDesktop: '데스크톱으로 가져오기',
      save: '저장',
      previewVoice: '음성 미리듣기',
      commentsTitle: '댓글',
      asyncThread: '비동기 스레드 · 실시간 채팅 아님',
      helpful: '도움됨',
      leaveComment: '댓글 남기기',
      commentPlaceholder: '이 프리셋이 제 노트북에서 잘 동작했어요...',
      post: '등록',
      mockCommentNote: '목업 전용 — 댓글은 아직 저장되지 않습니다.',
      selectPreset: '프리셋을 선택하면 상세 스레드가 열립니다.',
      sharedBy: '@{author} · {time}',
      steps: [
        { title: '1. 번들 업로드', body: '데스크톱에서 음성, 캐릭터, 프롬프트 설정을 보냅니다.' },
        { title: '2. 커뮤니티 피드백', body: '다른 사람이 댓글, 좋아요, 포크로 비동기 피드백을 남깁니다.' },
        { title: '3. 로컬 가져오기', body: '채팅 로그 없이 MiVA Desktop으로 원클릭 가져오기.' },
      ],
      presets: [
        {
          id: 'preset-nova',
          icon: 'desk',
          title: 'Nova Crystal — 차분한 데스크 비서',
          author: 'mina.k',
          voice: 'Solomon (깊은 톤)',
          character: 'Nova Crystal',
          useCase: 'daily',
          tags: ['2D 아바타', '한국어', '저사양'],
          description: '부드러운 TTS와 반응형 2D 아바타가 있는 조용한 사무용 비서입니다. 메모, 일정 알림, 짧은 Q&A에 적합합니다.',
          updatedAt: '2026-06-04T09:12:00.000Z',
          featured: true,
          voiceFocused: true,
          characterFocused: true,
          downloads: 1284,
          likes: 312,
          commentCount: 24,
          comments: [
            { id: 'c1', author: 'jay.p', body: '8GB 노트북에서 가져왔는데 음성 지연이 좋아요. 나이트 모드 변형도 있으면 좋겠어요.', createdAt: '2026-06-04T11:20:00.000Z', likes: 14 },
            { id: 'c2', author: 'studio.team', body: '음성 프로필을 포크해서 인사 멘트를 더 밝게 바꿨어요. 다음 주에 다시 공유할게요.', createdAt: '2026-06-03T18:02:00.000Z', likes: 8 },
          ],
        },
        {
          id: 'preset-lyra',
          icon: 'tutor',
          title: 'Lyra Spark — 친근한 튜터',
          author: 'edu.lab',
          voice: 'Lyra (밝은 톤)',
          character: 'Pixel Mentor',
          useCase: 'study',
          tags: ['TTS', '설명 모드', '한영'],
          description: '말 속도를 늦추고 단계별 답변 스타일을 쓰는 밝은 튜터 프리셋입니다. 캐릭터 idle 애니메이션 포함.',
          updatedAt: '2026-06-03T14:40:00.000Z',
          voiceFocused: true,
          downloads: 892,
          likes: 201,
          commentCount: 17,
          comments: [
            { id: 'c3', author: 'hana.lee', body: '숙제 도우미로 딱이에요. explain-mode 프롬프트가 제일 좋습니다.', createdAt: '2026-06-03T16:10:00.000Z', likes: 11 },
          ],
        },
        {
          id: 'preset-sol',
          icon: 'focus',
          title: 'Solomon Night — 집중 모드',
          author: 'dev.local',
          voice: 'Solomon (깊은 톤)',
          character: 'Minimal Orb',
          useCase: 'work',
          tags: ['아바타 없음', 'Whisper Small', '집중'],
          description: '음성만 쓰는 집중 프리셋입니다. 산만함을 줄이고 짧은 답변으로 코딩·야간 작업에 맞춰져 있습니다.',
          updatedAt: '2026-06-02T22:15:00.000Z',
          voiceFocused: true,
          downloads: 654,
          likes: 148,
          commentCount: 9,
          comments: [
            { id: 'c4', author: 'codex.user', body: '캐릭터 오버레이가 없어서 CPU 사용량이 낮아요. 데스크톱에서 원클릭 가져오기 됐습니다.', createdAt: '2026-06-02T23:01:00.000Z', likes: 6 },
          ],
        },
        {
          id: 'preset-hana',
          icon: 'character',
          title: 'Hana Bloom — 캐릭터 중심',
          author: 'art.miva',
          voice: 'Custom (따뜻한 톤)',
          character: 'Hana Bloom',
          useCase: 'character',
          tags: ['Live2D 준비', '반응형', '감정 표현'],
          description: '표현력 있는 리액션과 긴 인사 스크립트가 있는 캐릭터 중심 프리셋입니다. 오버레이 위치 기본값이 포함됩니다.',
          updatedAt: '2026-06-01T08:30:00.000Z',
          characterFocused: true,
          downloads: 421,
          likes: 97,
          commentCount: 31,
          comments: [
            { id: 'c5', author: 'overlay.fan', body: 'hover-close 동작이 이 캐릭터 팩이랑 잘 맞아요.', createdAt: '2026-06-01T12:44:00.000Z', likes: 19 },
            { id: 'c6', author: 'miva.team', body: 'Phase 2 커뮤니티 가져오기용으로 고정 예정. 지금은 웹 콘솔 미리보기만.', createdAt: '2026-05-30T09:00:00.000Z', likes: 22 },
          ],
        },
      ],
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
      personaHub: 'Persona Hub',
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
    desktopDownload: {
      noticeTitle: 'Node.js is required',
      noticeBody: 'After installing MiVA Desktop, Node.js 22+ must be available on this PC to run Local Helper. In a CS lab, you likely already have it.',
      dismiss: 'Dismiss',
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
    settingsPage: {
      title: 'Settings',
      subtitle: 'Configure your local web console and bridge preferences.',
      preferencesTitle: 'Console Preferences',
      languageTitle: 'Language Selection',
      languageBody: 'Interface language for the management console.',
      themeTitle: 'Theme',
      themeBody: 'Visual style of the dashboard.',
      themeDark: 'Dark',
      themeLight: 'Light',
      maintenanceTitle: 'System Maintenance',
      resetTitle: 'Reset web console state',
      resetBody: 'Clear all local storage preferences and cache.',
      resetAction: 'Reset Now',
      privacyTitle: 'Local-First Privacy',
      privacyBody: 'MiVA is built on the Local-First Manifesto. Your data never leaves your machine unless you explicitly configure a bridge.',
      privacyAction: 'Read the Manifesto',
      nodeHealth: 'Node Health',
      localBridge: 'Local Bridge',
      syncStatus: 'Sync Status',
      version: 'Version',
      active: 'Active',
      synchronized: 'Synchronized',
    },
    personaHub: {
      previewBadge: 'Preview Mockup',
      notConnectedBadge: 'Not connected to API',
      title: 'Persona Hub',
      subtitlePrimary:
        'Upload voice, character, and prompt settings for your AI assistant, browse presets from others, and leave async feedback on this community board.',
      subtitleSecondary:
        'This is a UI mockup for a posts, comments, and import flow — not a live chat room.',
      sharePreset: 'Share my preset',
      uploadBundle: 'Upload bundle',
      browseTitle: 'Browse presets',
      browseBody: 'Shared assistant bundles ranked by downloads, freshness, and community feedback.',
      tableView: 'Table',
      cardsView: 'Cards',
      filters: {
        trending: 'Trending',
        new: 'New',
        voice: 'Voice',
        character: 'Character',
      },
      table: {
        preset: 'Preset',
        author: 'Author',
        voice: 'Voice',
        character: 'Character',
        downloads: 'Downloads',
        comments: 'Comments',
        likes: 'Likes',
      },
      featured: 'Featured',
      useCases: {
        daily: 'Daily',
        study: 'Study',
        work: 'Work',
        character: 'Character',
      },
      voiceLabel: 'Voice',
      characterLabel: 'Character',
      importDesktop: 'Import to Desktop',
      save: 'Save',
      previewVoice: 'Preview voice',
      commentsTitle: 'Comments',
      asyncThread: 'Async thread · not live chat',
      helpful: 'helpful',
      leaveComment: 'Leave a comment',
      commentPlaceholder: 'This preset worked well on my laptop...',
      post: 'Post',
      mockCommentNote: 'Mock only — comments are not saved yet.',
      selectPreset: 'Select a preset to open its detail thread.',
      sharedBy: '@{author} · {time}',
      steps: [
        { title: '1. Upload bundle', body: 'Export voice, character, and prompt settings from Desktop.' },
        { title: '2. Community feedback', body: 'Others comment, like, and fork your preset asynchronously.' },
        { title: '3. Import locally', body: 'One-click import into MiVA Desktop without sharing chat logs.' },
      ],
      presets: [
        {
          id: 'preset-nova',
          icon: 'desk',
          title: 'Nova Crystal — Calm Desk Companion',
          author: 'mina.k',
          voice: 'Solomon (Deep)',
          character: 'Nova Crystal',
          useCase: 'daily',
          tags: ['2D Avatar', 'Korean', 'Low VRAM'],
          description: 'A quiet office assistant with soft TTS and a reactive 2D avatar. Best for note-taking, calendar reminders, and short Q&A.',
          updatedAt: '2026-06-04T09:12:00.000Z',
          featured: true,
          voiceFocused: true,
          characterFocused: true,
          downloads: 1284,
          likes: 312,
          commentCount: 24,
          comments: [
            { id: 'c1', author: 'jay.p', body: 'Imported this on an 8GB laptop — voice latency is great. Would love a night-mode variant.', createdAt: '2026-06-04T11:20:00.000Z', likes: 14 },
            { id: 'c2', author: 'studio.team', body: 'We forked the voice profile and added a brighter greeting line. Sharing back next week.', createdAt: '2026-06-03T18:02:00.000Z', likes: 8 },
          ],
        },
        {
          id: 'preset-lyra',
          icon: 'tutor',
          title: 'Lyra Spark — Friendly Tutor',
          author: 'edu.lab',
          voice: 'Lyra (Bright)',
          character: 'Pixel Mentor',
          useCase: 'study',
          tags: ['TTS', 'Explain Mode', 'EN/KR'],
          description: 'Cheerful tutor preset with slower speech rate and step-by-step answer style. Includes character idle animations.',
          updatedAt: '2026-06-03T14:40:00.000Z',
          voiceFocused: true,
          downloads: 892,
          likes: 201,
          commentCount: 17,
          comments: [
            { id: 'c3', author: 'hana.lee', body: 'Perfect for homework help. The explain-mode prompt is the best part.', createdAt: '2026-06-03T16:10:00.000Z', likes: 11 },
          ],
        },
        {
          id: 'preset-sol',
          icon: 'focus',
          title: 'Solomon Night — Focus Mode',
          author: 'dev.local',
          voice: 'Solomon (Deep)',
          character: 'Minimal Orb',
          useCase: 'work',
          tags: ['No Avatar', 'Whisper Small', 'Focus'],
          description: 'Voice-only focus preset. Low distraction, short answers, optimized for coding sessions and late-night work.',
          updatedAt: '2026-06-02T22:15:00.000Z',
          voiceFocused: true,
          downloads: 654,
          likes: 148,
          commentCount: 9,
          comments: [
            { id: 'c4', author: 'codex.user', body: 'No character overlay keeps CPU usage low. Imported in one click from Desktop.', createdAt: '2026-06-02T23:01:00.000Z', likes: 6 },
          ],
        },
        {
          id: 'preset-hana',
          icon: 'character',
          title: 'Hana Bloom — Character-first',
          author: 'art.miva',
          voice: 'Custom (Warm)',
          character: 'Hana Bloom',
          useCase: 'character',
          tags: ['Live2D-ready', 'Reactive', 'Emotive'],
          description: 'Character-heavy preset with expressive reactions and longer greeting scripts. Upload includes overlay position defaults.',
          updatedAt: '2026-06-01T08:30:00.000Z',
          characterFocused: true,
          downloads: 421,
          likes: 97,
          commentCount: 31,
          comments: [
            { id: 'c5', author: 'overlay.fan', body: 'The hover-close behavior pairs nicely with this character pack.', createdAt: '2026-06-01T12:44:00.000Z', likes: 19 },
            { id: 'c6', author: 'miva.team', body: 'Pinned for Phase 2 community import. Preview only in web console for now.', createdAt: '2026-05-30T09:00:00.000Z', likes: 22 },
          ],
        },
      ],
    },
  },
};
