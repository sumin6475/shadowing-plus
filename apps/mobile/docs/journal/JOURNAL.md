# Journal — 누적 학습 로그

빌드 여정의 시간순 인덱스. 최신 항목이 위로 온다. 각 항목은 짧게: 무엇을 했고, 무슨 원칙을 배우거나 적용했고, 어떤 스킬/도구를 썼고, 실패·결정·품질 산출물이 있으면 링크.

> 채우는 사람: 학습 동반자 (자동). 규칙은 `CLAUDE.md`의 Auto-Journal 섹션. 진행 상태의 정본은 프로젝트의 status 문서(MEMORY.md / 체크리스트)다.

---

## 항목

### 2026-08-24 · 기능 · iOS 탭바 + My Studio 허브
- **무엇**: 하단바는 blur + SF Symbols. Today / Phrases / Studio, 가운데 mic(Phrases에선 + 추가 리스트). Today는 중앙 히어로·주간 그래프·남은 리뷰만. Studio는 스토리 비중 도넛, Open studio, 토픽 카드. 토픽 안은 스토리 리스트로 복귀. 프로필 Open studio 배너 제거.
- **검증**: `npm --prefix apps/mobile run typecheck`
- **산출물**: [decisions/0020-studio-tab-ios-shell.md](decisions/0020-studio-tab-ios-shell.md)

### 2026-08-24 · 실패 · PostHog 미설정 red screen
- **무엇**: 위저드가 `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN` 없으면 throw. 기존 `.env`는 `EXPO_PUBLIC_POSTHOG_API_KEY`. 둘 다 받고, 없으면 warn만.
- **검증**: 코드 경로 — 게이트가 children을 그대로 렌더.

### 2026-08-24 · 실패 · Expo start SSR window
- **무엇**: `expo start`가 웹 SSR에서 Supabase AsyncStorage `getItem` → `window is not defined`로 프로세스 종료. SSR에서만 세션 storage를 건너뜀.
- **검증**: `npm --prefix apps/mobile run typecheck`. Metro 재시작 후 SSR 로그 확인 필요.
- **산출물**: [postmortems/2026-08-24-expo-start-ssr-window.md](postmortems/2026-08-24-expo-start-ssr-window.md)

### 2026-08-23 · 기능 · Topics Bento folio / Version
- **무엇**: Topics 노드 그래프를 Domain별 Bento 컬렉션으로 교체. Draft는 점선, Active는 톤 카드. New story / New version은 바텀 시트. Story 상세는 Versions · Useful phrases · Sessions 족보. 화면 카피만 Message → Version (`messages` 테이블 유지).
- **검증**: `npm --prefix apps/mobile run typecheck`
- **산출물**: [decisions/0019-topics-bento-folio-and-version.md](decisions/0019-topics-bento-folio-and-version.md)

### 2026-08-23 · 기능 · Phrase History 별 칩
- **무엇**: History 필터에 스와이프 별과 같은 `favorite` Starred 칩(별 아이콘만). 비어 있으면 “Swipe a phrase right to star it.”
- **검증**: `npm --prefix apps/mobile run typecheck`
- **산출물**: [decisions/0017-phrase-history-stage-filters.md](decisions/0017-phrase-history-stage-filters.md)

### 2026-08-23 · 기능 · Home / Phrases / studio dashboard
- **무엇**: Home hero는 Speaking 하나. Recent story는 마지막 talk session. Bring these back는 `todaysPhrases()` 큐를 ReviewFlow로 바로 시작, 끝나면 “You’ve finished for today!”. Phrases 차트는 포커스 때 한 번 grow-in. History 칩은 Recognize / Use with help / Use on my own / Need refresh. Profile “Your speaking world”는 studio 대시보드. 프로필 사진.
- **검증**: `npm --prefix apps/mobile run typecheck` PASS. SQL Editor에 `026_avatars_bucket.sql` 실행 필요. TestFlight는 올리지 않음.
- **산출물**: [decisions/0017-phrase-history-stage-filters.md](decisions/0017-phrase-history-stage-filters.md), [decisions/0018-speaking-world-studio-dashboard.md](decisions/0018-speaking-world-studio-dashboard.md)

### 2026-08-23 · 결정 · Phrase History 단계 필터
- **무엇**: New·Favorites 칩 제거. 단계 언어 3개 + due overlay Need refresh. 랭킹/stage-prompt 규칙은 그대로.
- **산출물**: [decisions/0017-phrase-history-stage-filters.md](decisions/0017-phrase-history-stage-filters.md)

### 2026-08-23 · 결정 · Your speaking world studio 지표
- **무엇**: 히어로는 `talk_sessions` 합산 시간. Active topics/stories는 메시지 또는 세션이 있는 것만. Phrase insights는 단계 + due. 맵은 보조.
- **산출물**: [decisions/0018-speaking-world-studio-dashboard.md](decisions/0018-speaking-world-studio-dashboard.md)

### 2026-08-23 · 결정 · Daily Phrase 1/3/7/30 랭킹
- **무엇**: 하루 N개를 고정하는 복습 큐. 단계·저장 나이·최근 복습·self-talk `used`·명시적 tomorrow pin. 단계는 매번 묻지 않음.
- **산출물**: [decisions/0016-daily-phrase-ranking.md](decisions/0016-daily-phrase-ranking.md)

### 2026-08-23 · 기능 · Self-talk × Phrase Bank 하이브리드 RAG v1
- **무엇**: `phrase_items.embedding` + `match_owned_phrases` + `phrase-embed`. 추천은 벡터 Top-K와 confidence 80. 거절 30일 정책 상수, Story는 1등 근처 tie-break, `used`는 시간 감쇠. 같은 응답에 `used[]`. 로컬 결과 화면에 “You used N saved phrases”.
- **검증**: SQL 18/18 embed. `phrase-embed`·`talk-phrase-suggest` 배포 후 비인증 POST JSON 401. TestFlight 옛 빌드에는 used 줄 없음 — 로컬 앱 확인 남음.
- **산출물**: [.agents/plans/phrase-rag-ranking-backlog.md](../../../../.agents/plans/phrase-rag-ranking-backlog.md)

### 2026-08-23 · 결정 · Phrase RAG 랭킹 v1 / 백로그
- **무엇**: 추천됨≠도움이 됨을 유지. v1은 거절 30일을 정책 상수로, Story 가산은 벡터 1등 근처(0.05)에서만, `used`는 시간 감쇠. 선택형 거절 사유·무추천 로그·탐색 슬롯·대시보드는 미룸.
- **산출물**: [.agents/plans/phrase-rag-ranking-backlog.md](../../../../.agents/plans/phrase-rag-ranking-backlog.md)

### 2026-08-22 · 기능 · PostHog를 모바일 앱에 연결
- **무엇**: `posthog-react-native` + `PostHogProvider`. 로그인 identify, expo-router 화면, 앱 수명주기, JS 에러. Session replay 끔. 대화 원문은 보내지 않음. 위저드 TUI는 이 환경에서 raw stdin이 없어 실패.
- **검증**: `npm run typecheck` PASS. `.env`와 EAS production에 `EXPO_PUBLIC_POSTHOG_API_KEY` 필요.

### 2026-08-21 · 기능 · Self-talk 평점에 이유 텍스트
- **무엇**: Like는 바로 저장. Dislike / Not sure / Doesn’t fit은 iOS `Alert.prompt`로 한 문장 이유를 받음. 코칭은 `talk_suggestion_feedback.verdict_note`, Phrase Bank는 `phrase_events.evidence.reason`.
- **검증**: `npm run typecheck` PASS. SQL Editor에 `025_talk_suggestion_verdict_note.sql` 실행 필요. TestFlight는 올리지 않음.

### 2026-08-21 · 배포 · Phrase Bank 추천 분리 TestFlight 17
- **무엇**: iOS production build 17을 EAS에서 빌드하고 App Store Connect에 업로드. Apple 처리 대기.
- **검증**: release config, typecheck, iOS export, EAS build/submit PASS.
- **품질**: [quality/2026-08-21-talk-phrase-suggest-testflight.md](quality/2026-08-21-talk-phrase-suggest-testflight.md)

### 2026-08-21 · 기능 · Self-talk Phrase Bank 추천 분리
- **무엇**: Focus 코칭(`talk-diagnose`)에서 Phrase Bank 조회를 빼고, 별도 `talk-phrase-suggest`가 저장된 표현 한 개만 고른다. 생성 fallback 없음. 피드백 아래 `From your Phrase Bank` 카드, Try this phrase / Doesn’t fit. 이벤트는 `suggested → accepted/rejected → used`.
- **검증**: typecheck PASS. iOS export 1,919 modules PASS. 두 함수 배포 후 비인증 POST JSON 401. TestFlight `1.0.0 (17)` 업로드 완료, Apple 처리 대기.
- **산출물**: [quality/2026-08-21-talk-phrase-suggest-testflight.md](quality/2026-08-21-talk-phrase-suggest-testflight.md)

### 2026-08-21 · AI · Self-talk 단일 전문 코칭 계약
- **무엇**: `talk-diagnose`를 진짜 문제 1개, 진단 태그 1개, `I would suggest…`, 2–3문장 근거, 개선문 1개로 변경. 자연스러운 도메인 용어·과도한 고급어 교정 금지, Focus별 동일 구간 재사용 허용. Second recommendation 제거. Phrase Bank 문장 불일치와 malformed AI 응답의 false praise 방어.
- **검증**: 모바일 typecheck, 수정 파일 lint, 배포 번들 PASS. production route JSON 401 확인. 로그인 상태 4-focus smoke test 필요.

### 2026-08-21 · 배포 · Phrase capture / Profile / Self-talk build 16
- **무엇**: iOS production build 16을 EAS에서 빌드하고 App Store Connect에 업로드. Apple 처리 대기.
- **검증**: release config, typecheck, iOS export, EAS build/submit PASS. 기존 React refs lint 오류 11개는 별도 부채.
- **품질**: [quality/2026-08-21-phrase-capture-profile-feedback-testflight.md](quality/2026-08-21-phrase-capture-profile-feedback-testflight.md)

### 2026-08-21 · UI · Self-talk AI 피드백 팔레트 통일
- **무엇**: 실제 Self-talk의 You may have meant 카드도 Speaking World 코발트–스카이 그라데이션, 밝은 테두리, 은은한 glow로 통일.
- **검증**: `npm run typecheck` PASS.

### 2026-08-21 · 카피 · Intermediate용 Feedback focus 예시
- **무엇**: Grammar, Structure, Advanced words, Pattern 예시를 비즈니스 스피킹의 시제·논리·정확한 어휘·강조 프레임으로 교체. You said 오류는 코랄 inline highlight, AI 제안은 Indigo–Purple–Blue 테두리와 glow로 구분.
- **검증**: `npm run typecheck` PASS.

### 2026-08-21 · 기능 · Selftalk Save as phrase → 캡처 화면
- **무엇**: 피드백 Save as phrase가 바로 Phrase Bank에 넣지 않고 Add a phrase 화면으로. 제안 문장은 Context, AI가 Phrase to keep을 추출.
- **검증**: `npm run typecheck` PASS.

### 2026-08-21 · 기능 · Profile 하위 화면 분리
- **무엇**: Edit profile은 Name/Goal만. First language, Feedback focus는 각각 화면. 칩 선택은 바로 저장.
- **검증**: `npm run typecheck` PASS.

### 2026-08-21 · 기능 · Phrase 저장 화면 필드 정리
- **무엇**: 사진 OCR은 Detected text, Context는 예문만. Phrase는 Required. How it's used는 AI 용법, Your note는 `learner_note`. Where it belongs와 Note는 More. Context 번역은 타이핑 중 유지.
- **검증**: `cd apps/mobile && npm run typecheck` PASS. SQL Editor에 `024_phrase_learner_note.sql` 실행 필요.
- **산출물**: `apps/mobile/src/screens/capture.tsx`, `src/screens/phrases.tsx`, `src/lib/phrases.ts`, `supabase/migrations/024_phrase_learner_note.sql`

### 2026-08-21 · 수정 · Phrase 검색창 잘림
- **무엇**: Phrase Bank 검색. 전체 스크롤 캡처에서 검색창이 Dynamic Island 밑으로 올라가고 아래가 빈 화면으로 이어지던 것. 검색창을 페이지 스크롤 밖에 고정. placeholder는 Search.
- **검증**: `cd apps/mobile && npm run typecheck` PASS. 실기기: Phrases → 검색 → 키보드, 검색창이 상태바 아래 그대로인지.
- **산출물**: [postmortems/2026-08-21-phrase-search-bar-clip](postmortems/2026-08-21-phrase-search-bar-clip.md)

### 2026-08-20 · 기능 · self-talk 추천마다 Fits/Forced
- **무엇**: 각 생성(want / example) 아래에 Like · Dislike · Not sure. 보여준 추천은 전부 `talk_suggestion_feedback`에 남고, 평가는 같은 행을 갱신. 나중에 프롬프트/랭커에 쓸 로그. 모델 학습은 아직 없음.
- **검증**: `cd apps/mobile && npm run typecheck` PASS. 테이블은 SQL Editor에서 `023_talk_suggestion_feedback.sql` 실행 필요.
- **산출물**: `supabase/migrations/023_talk_suggestion_feedback.sql`, `apps/mobile/src/lib/talk-feedback.ts`, `src/screens/talk.tsx`

### 2026-08-20 · 배포 · Talk focus 근거 + topic 이동 TestFlight 14
- **무엇**: `talk-diagnose` 배포(근거 필드·Advanced words 프롬프트). EAS `1.0.0 (14)` STORE 빌드 후 App Store Connect 업로드. Apple 처리 대기.
- **검증**: 함수 비인증 POST JSON 401 · release config PASS · typecheck PASS · EAS build/submit FINISHED.
- **산출물**: [.agents/deploys/2026-08-20-talk-focus-grounds-testflight](../../../.agents/deploys/2026-08-20-talk-focus-grounds-testflight.md)

### 2026-08-20 · 기능 · self-talk 피드백에 Focus 칩과 추천 근거
- **무엇**: Great job / moment 화면에 이번 세션 Focus(예: Advanced words) 칩. 각 추천 아래 `why`/`exampleWhy` 한 문장. Advanced words는 문법 정리 말고 더 정확한 단어·콜로케이션을 고르도록 프롬프트 강화.
- **검증**: `cd apps/mobile && npm run typecheck` PASS. `talk-diagnose` Edge Function은 배포해야 근거 문장이 나옴.
- **산출물**: `apps/mobile/src/screens/talk.tsx`, `src/types/api.ts`, `supabase/functions/talk-diagnose/index.ts`

### 2026-08-20 · 수정 · topic 칩에 ▼, 옮기기는 하단 시트
- **무엇**: 스토리 칩이 `Ideas ▼`처럼 드롭다운처럼 보이게. 탭하면 새 화면 대신 하단 시트(Move story)에서 topic을 고름. 고른 줄에 체크, Cancel/배경 탭으로 닫힘.
- **검증**: `cd apps/mobile && npm run typecheck` PASS.
- **산출물**: `apps/mobile/src/screens/world.tsx`, `src/screens/nav.ts`, `src/shell.tsx`

### 2026-08-20 · 기능 · 스토리 topic 칩으로 다른 영역으로 옮김
- **무엇**: 칩 탭이 형제 스토리가 아니라 Move story 화면. New story와 같은 `WHICH PART OF YOUR LIFE?` 칩. 고르면 `domain_id`만 바꾸고 돌아옴. 같은 topic을 다시 누르면 저장 없이 pop.
- **검증**: `cd apps/mobile && npm run typecheck` PASS.
- **산출물**: `apps/mobile/src/screens/world.tsx`, `src/lib/speaking-world.ts`, `src/screens/nav.ts`, `src/shell.tsx`

### 2026-08-20 · 수정 · 고아 스토리는 Ideas로, 칩은 형제 스토리로
- **무엇**: 매핑 안 되는 제목(Write my own 등)도 Ideas에 붙임. `domain_id` null을 남기지 않음. topic 칩은 Domain에서 왔으면 pop, Today 등에서 왔으면 Domain push.
- **검증**: `cd apps/mobile && npm run typecheck` PASS.
- **산출물**: `apps/mobile/src/lib/speaking-world.ts`, `src/screens/world.tsx`, `src/shell.tsx`

### 2026-08-20 · 수정 · 온보딩 첫 스토리를 Ideas 등 topic에 붙임
- **무엇**: “Something I learned”는 온보딩에서 만들어져 `domain_id`가 null이었다. Ideas로 붙이고, 화면을 열면 고아 스토리를 기본 topic에 연결. 이후 온보딩도 topic 없이 만들지 않음.
- **검증**: `cd apps/mobile && npm run typecheck` PASS.
- **산출물**: `apps/mobile/src/lib/speaking-world.ts`, `src/lib/onboarding.ts`, `src/screens/world.tsx`

### 2026-08-20 · 기능 · Story 상단에 속한 topic 칩
- **무엇**: 스토리 상세 BackBar 오른쪽에 이 스토리가 속한 topic(domain) 이름을 칩으로 표시. 탭하면 그 topic으로 이동. Today처럼 topic 없이 들어온 경우에도 `fetchStory`가 domain을 조인해서 채움.
- **검증**: `cd apps/mobile && npm run typecheck` PASS.
- **산출물**: `apps/mobile/src/screens/world.tsx`, `src/lib/speaking-world.ts`, `src/shell.tsx`

### 2026-08-20 · 수정 · outline 포인트는 스와이프 삭제
- **무엇**: 30-second version에서 x를 없애고 Phrase처럼 밀어 삭제. 순서 바꾸기 핸들(=)은 유지.
- **산출물**: `apps/mobile/src/screens/world.tsx`

### 2026-08-20 · 수정 · 기본 스토리 설명은 회색 텍스트, 직접 만든 스토리만 흐린 박스
- **무엇**: 시드/온보딩 스토리는 편집 없이 연한 회색 설명. 사용자가 만든 스토리만 description을 넣고, Messages 흰 카드가 아니라 `soft` 배경에 흐린 테두리 박스로 구분.
- **산출물**: `apps/mobile/src/screens/world.tsx`

### 2026-08-20 · 수정 · Profile 미출시 행 Coming soon 배지
- **무엇**: 가짜 오른쪽 값(mirror 01 등)을 숨기고 Library BETA와 같은 칩으로 Coming soon을 붙임. 탭해도 화면 안 열림. Reminders / Feedback focus / First language / Edit profile / Library / Log out은 그대로.
- **검증**: `cd apps/mobile && npm run typecheck` PASS.
- **산출물**: `apps/mobile/src/screens/settings.tsx`

### 2026-08-20 · 수정 · Reminders 테스트 핑·카피 리뷰는 `__DEV__` only
- **무엇**: 배너 카피 프리뷰와 “Send a test in 5 seconds”를 `__DEV__`로 가림. TestFlight/프로덕션에는 안 보이고, 시뮬레이터·dev-client에서는 카피 다듬을 때 그대로 씀. 실수로 출시 화면에 남기지 않으려고 가드만 넣음(코드는 삭제하지 않음).
- **검증**: `cd apps/mobile && npm run typecheck` PASS.
- **산출물**: `apps/mobile/src/screens/reminders.tsx`

### 2026-08-20 · 기능 · Story 설명 카드와 outline 드래그 정렬
- **무엇**: 30-second version에서 ↑↓ 대신 오른쪽 드래그 핸들로 순서를 바꾸고, 사용자 문구에서 beats를 outline/point로 바꿈. 스토리 상세는 제목 아래 스토리별 흰 설명 카드(탭하면 바로 수정, `stories.summary`에 저장)를 두고 Talk CTA를 Sessions 아래로 내림.
- **배운/적용한 원칙**: 학습자가 실제로 말할 프롬프트를 넣고, 큐에서 익숙한 제스처를 쓴다. 카드는 페이지 배경과 한 단계 올린다.
- **검증**: `cd apps/mobile && npm run typecheck` PASS. 실기기 드래그/저장은 아직.
- **산출물**: `apps/mobile/src/screens/world.tsx`, `src/lib/story-prompts.ts`, `speaking-world.ts`, `design/icon.tsx`, `design/ui.tsx`

### 2026-08-20 · 배포 · Self-talk 리마인더 네이티브 빌드 13
- **무엇**: `expo-notifications`가 Push entitlement를 넣어 빌드 11·12가 기존 App Store 프로필과 충돌. 로컬 알림만 쓰도록 entitlement를 제거한 뒤 `1.0.0 (13)` FINISHED.
- **검증**: EAS build/submission FINISHED · Apple 처리 대기.
- **산출물**: [.agents/deploys/2026-08-20-self-talk-reminders-testflight](../../../.agents/deploys/2026-08-20-self-talk-reminders-testflight.md)

### 2026-08-20 · 기능 · Self-talking 로컬 리마인더 v1
- **무엇**: Profile → Reminders 서브페이지. Self-talking만, Daily/Weekly + 요일 + 로컬 시각, AsyncStorage 저장, 켤 때만 iOS 알림 권한 요청, expo-notifications Daily/Weekly 반복 트리거. 끄면 고정 id로 취소.
- **검증**: `npm run typecheck` PASS. 실기기 알림은 네이티브 모듈이 새 바이너리에 들어가야 함.
- **산출물**: `apps/mobile/src/screens/reminders.tsx`, `apps/mobile/src/lib/reminders.ts`

### 2026-08-20 · 수정 · Speak 피드백 포커스와 가독성
- **무엇**: Profile에 Grammar / Structure / Advanced words / Pattern 중 하나 고르는 피드백 포커스를 넣고 AsyncStorage에 저장. Speak 종료 시 `talk-diagnose`에 `focus`를 보내고, 로컬 Edge Function 프롬프트가 Structure(전체 말의 뼈대)와 Grammar(문장)를 섞지 않게, Pattern은 온보딩의 “What I’m trying to do is…” 프레임을 쓰게 고침. 상세 화면 라벨 대비를 올리고, 검은 제안 박스에 `or` + `Second recommendation`을 넣었고, Retry CTA/`Back to the moment` Pill을 가운데 정렬.
- **배운/적용한 원칙**: `text-3`/`ink3`(30% 불투명)은 섹션 제목에 쓰면 안 읽힌다. 비-`full` Pill은 `alignSelf: flex-start`라 부모 `alignItems: center`를 이긴다.
- **검증**: `cd apps/mobile && npm run typecheck` PASS. 시뮬레이터 Speak 실기 + `talk-diagnose` 배포는 아직.
- **산출물**: `apps/mobile/src/lib/talk-focus.ts`, `talk.tsx`, `edit-profile.tsx`, `settings.tsx`, `talk.ts`, `ui.tsx`, `supabase/functions/talk-diagnose/index.ts`

### 2026-08-20 · 수정 · 클립 포커스 문장 전환 버벅임
- **무엇**: 재생 중 prev/next가 seek 착지 전에 이전 문장으로 되돌리던 싸움을 끊고, 시각 틱은 진행 바에만 두고 포커스 문장은 120ms 페이드.
- **배운/적용한 원칙**: 재생 위치 구독과 포커스 문장 state를 같은 트리에 두면 매 틱마다 문장이 다시 그려진다. 수동 선택은 착지할 때까지 핀한다.
- **검증**: `npm run typecheck` PASS. 실기기 prev/next 왕복은 아직.
- **산출물**: `apps/mobile/src/screens/library.tsx`

### 2026-08-20 · 배포 · Library 클립 캡처 TestFlight 빌드
- **무엇**: iOS production `1.0.0 (10)`를 생성하고 App Store Connect에 업로드. Apple 처리 대기.
- **검증**: EAS build/submission FINISHED · archive에 미커밋 Library 독·clip-seed 캡처·로그인 스플래시 스킵 포함.
- **산출물**: [.agents/deploys/2026-08-20-library-clip-capture-testflight](../../../.agents/deploys/2026-08-20-library-clip-capture-testflight.md)

### 2026-08-20 · 수정 · Library 클립 독 고정과 Save phrase 캡처
- **무엇**: 클립 화면의 Save phrase / 전후 버튼을 문장 길이 아래가 아니라 Transcript peek 위에 고정. Save phrase는 OCR과 같은 캡처 화면으로 가서 문장에서 표현을 뽑고, 클립 플레이어는 언마운트하지 않아 Done 후 그 문장에서 이어 재생.
- **배운/적용한 원칙**: 플레이어 컨트롤은 콘텐츠 높이와 분리한다. 재생 위치를 복원하려면 seek보다 인스턴스를 유지하는 편이 맞다.
- **스킬/도구**: Expo Video/Audio 인스턴스 유지, phrase-capture `context_text`, tsc PASS.
- **산출물**: `apps/mobile/src/screens/library.tsx`, `capture.tsx`, `shell.tsx`

### 2026-08-14 · 배포 · 온보딩 시각·가입 완료 TestFlight 빌드
- **무엇**: 커밋 `96e277b`로 iOS production `1.0.0 (9)`를 생성하고 App Store Connect에 업로드. Apple 처리 대기.
- **검증**: EAS build/submission FINISHED · archive 입력 확인 · IPA bundle ID/표시명/버전/암호화 선언/application identifier/코드 서명 PASS.
- **산출물**: [.agents/deploys/2026-08-14-onboarding-visual-auth-completion-testflight](../../../.agents/deploys/2026-08-14-onboarding-visual-auth-completion-testflight.md)

### 2026-08-13 · 수정+검증 · 온보딩 시각 위계·가입 완료 복구
- **무엇**: 세로 레이아웃에서 `full` Pill이 남은 높이를 모두 차지하던 CTA를 56pt 고정 버튼으로 교체. messy notes의 기본 예시를 영어로 바꾸고 첫 화면 speaking-world 시각 요소와 Story 카드 톤을 목업 방향으로 정돈. Keep에는 Supabase에서 실제 활성화된 Google·email 가입만 표시하고, Apple은 provider 활성화 시 자동 노출되게 함. STT/전사 실패 시에도 초안을 잃지 않고 Keep과 가입으로 진행 가능.
- **검증**: release config PASS · TypeScript PASS · ESLint error 0/warning 15(기존) · clean iOS Expo export PASS(1,870 modules) · Supabase provider flags 확인 · diff check PASS.
- **산출물**: [quality/2026-08-13-onboarding-visual-auth-completion](quality/2026-08-13-onboarding-visual-auth-completion.md)

### 2026-08-11 · 첫 베타 수정+검증 · iOS fetch 전송과 앱 아이콘 여백
- **무엇**: 첫 TestFlight에서 Speak 완료 시 `talk_sessions` 저장과 `talk-diagnose`가 함께 `ExpoModulesCore/Promise.swift:56` 네트워크 오류로 실패한 현상을 SDK 57의 기본 `expo/fetch` 전송 계층으로 좁힘. 모든 EAS profile에 공식 RN fetch 폴백을 고정하고 내부 예외 원문 대신 사용자용 오류 문구를 표시. Saylo 아이콘은 내부 흰 모서리를 제거하고 14.5% 확대해 iOS 마스크가 배경을 꽉 채우도록 교체.
- **검증/배포**: Edge Functions `talk-diagnose`/`talk-stuck` ACTIVE 및 비인증 401 응답 확인 · release config PASS · TypeScript PASS · ESLint PASS · iOS export PASS(1,841 modules) · 독립 리뷰 APPROVE · production IPA `1.0.0 (6)`의 bundle ID/서명/암호화 선언/생성 아이콘 PASS · EAS submission `e592493d-9d14-424f-bc35-7e8535d4c15a` FINISHED/App Store Connect 수락. Apple 처리 및 새 TestFlight 실기기 확인 대기.
- **산출물**: [postmortems/2026-08-11-first-beta-expo-fetch-network-loss](postmortems/2026-08-11-first-beta-expo-fetch-network-loss.md) · [quality/2026-08-11-first-beta-network-icon-fix](quality/2026-08-11-first-beta-network-icon-fix.md) · [deploy record](../../../../.agents/deploys/2026-08-11-first-beta-network-icon-fix.md)

### 2026-08-08 · 빌드+검증 · Saylo 첫 App Store distribution IPA
- **무엇**: `feat/mobile-skeleton@ca0ea99`에서 EAS production build를 생성. Apple distribution certificate를 재사용하고 App Store provisioning profile을 생성해 `Saylo` 1.0.0 (5) STORE build를 완료. 추출 IPA에서 bundle ID·표시명·버전·암호화 선언·서명과 실제 blue/ice 더블루프 아이콘을 확인. 사용자 확인 후 같은 build ID를 App Store Connect/TestFlight에 업로드.
- **실패/수정**: monorepo archive 업로드가 `write EPIPE`로 반복 중단해 `.easignore`로 inspect archive를 약 11.8 MB→3.1 MB로 축소. 첫 non-interactive submit은 API 키 미설정으로 시작 전 중단되어, 최소 권한 `APP_MANAGER` 키를 1회 생성·연결한 뒤 성공.
- **검증**: EAS build `ef172c4d-277c-4af8-a92c-00fad1752ec2` FINISHED · IPA `codesign --verify --deep --strict` PASS · identity `com.shadowingplus.mobile`/`Saylo`/`1.0.0 (5)` PASS · submission `568cad46-0250-4459-86a5-b2a5c2c1574a` exit 0/App Store Connect accepted · Apple processing 대기.
- **산출물**: [quality/2026-08-08-testflight-production-preflight](quality/2026-08-08-testflight-production-preflight.md) · [postmortems/2026-08-08-eas-build-upload-epipe](postmortems/2026-08-08-eas-build-upload-epipe.md) · [postmortems/2026-08-08-eas-submit-api-key-bootstrap](postmortems/2026-08-08-eas-submit-api-key-bootstrap.md)

### 2026-08-08 · 검증+준비 · TestFlight production 프리플라이트
- **무엇**: App Store Connect에 생성한 Saylo 레코드를 EAS production submit profile에 연결하고, development에만 있던 API/Supabase 공개 런타임 변수 3개를 production 환경에도 값 노출 없이 등록. 원본 `main`은 건드리지 않고 제출 전용 worktree에서만 진행.
- **검증**: TypeScript PASS · ESLint error 0/warning 15 · iOS export PASS(1,851 modules) · EAS production=store/remote credentials/auto-increment · production 변수 이름 3개 PASS · 코드리뷰 APPROVE. production build와 TestFlight 제출은 명시적 확인 전이라 미실행.
- **실패/수정**: 첫 자동 복사가 미설치 `dotenv`에서 원격 변경 전 중단. 이미 설치된 `@expo/env` 로더로 교체해 성공.
- **산출물**: [quality/2026-08-08-testflight-production-preflight](quality/2026-08-08-testflight-production-preflight.md) · [postmortems/2026-08-08-eas-production-env-loader](postmortems/2026-08-08-eas-production-env-loader.md)

### 2026-08-08 · 결정+브랜딩 · Saylo 이름과 더블루프 앱 아이콘
- **무엇**: App Store v1의 사용자 표시 이름을 `Shadowing+`에서 `Saylo`로 변경하고, 승인된 blue/ice 더블루프 PNG를 iOS 앱 아이콘과 공용 아이콘으로 연결. 로그인·온보딩·사진 처리 안내와 네이티브 권한 문구의 브랜드명도 함께 정렬. bundle identifier·scheme·EAS slug는 기존 기술 식별자로 유지.
- **스토어 등록**: `Saylo` 단독명 중복을 확인한 뒤 경쟁 앱 메타데이터와 Apple 검색 가이드를 바탕으로 App Store 이름 `Saylo: English Speaking`, 부제 `Turn your stories into fluency`를 확정·저장. 생성된 App Store Connect Apple ID를 EAS production submit profile에 연결.
- **검증**: resolved Expo config에서 name/icon/bundle identity PASS · TypeScript PASS · ESLint error 0/warning 15 · iOS export PASS(1,851 modules) · 독립 코드 리뷰 APPROVE · commit `a12a6b3`의 EAS iOS development build `b7b8fafb-42a0-4bec-9f02-28ccdb753d4c` FINISHED · 설치 아이콘/표시명 육안 확인 대기.
- **산출물**: [decisions/0015-saylo-product-name-and-icon](decisions/0015-saylo-product-name-and-icon.md)

### 2026-08-08 · 기준선 · App Store v1 자동 회귀 게이트
- **무엇**: 실제 앱 worktree/branch를 원격에 백업하고, dependency pin을 유지한 채 TypeScript·경고 예산 ESLint·iOS export를 하나의 `npm run validate`로 고정. 전체 앱 여정을 Tier 1–3 안정 ID로 문서화하고 live Supabase schema/Edge Function inventory를 확인. 처음 비어 있던 EAS development 환경은 사용자 등록 후 필요한 변수 이름 3개를 값 노출 없이 재확인. 리뷰 후 두 계정 RLS 하네스와 사진의 Edge Function/OpenAI 원격 처리 사실을 기준선에 추가.
- **검증**: TypeScript PASS · ESLint error 0/warning 15 · iOS export PASS(1,851 modules) · RLS harness Node syntax/ESLint PASS(실계정 14개 검사는 대기) · Expo Doctor 기존 19/20·15 mismatch · commit `9d06776`의 EAS iOS development build `5d4ce725-38d7-41b4-8999-df3eff387982` FINISHED · 설치/실기기 matrix 대기.
- **산출물**: [quality/2026-08-08-mobile-regression-baseline](quality/2026-08-08-mobile-regression-baseline.md) · [release regression matrix](../release/mobile-regression-baseline.md)

### 2026-08-07 · 재디자인+검증 · Phrase 상세 학습 행동 위계 + 편집 메뉴
- **무엇**: Phrase 상세를 승인된 목업의 느낌으로 재구성. Phrase·뜻·TTS·kind·상태를 넉넉한 hero에 모으고, 원문·전체 해석·출처는 옅은 파란 `In context` 패널로 통합. note는 가벼운 section, proficiency는 하나의 흰색 Card로 분리해 반복되던 흰 박스/동일 제목 위계를 줄임. photo/manual의 어색한 `WHERE YOU FOUND IT` Card를 제거하고 실제 clip만 context에서 이동 가능하게 유지. 우측 overflow에서 Phrase·종류·뜻·usage note 편집과 삭제가 가능하며 상세의 전역 `+` FAB는 숨김. 실기기 피드백에 따라 hero는 context보다 약간 큰 높이를 유지하면서 `space-between`으로 콘텐츠를 배치해 칩 아래에만 몰리던 여백을 상하 균형으로 보정.
- **검증**: TypeScript PASS · ESLint PASS · diff check PASS · iOS production export PASS(1,851 modules). 최종 실기기 시각/탭 확인은 사용자 확인 대기.
- **산출물**: [decisions/0014-phrase-detail-information-hierarchy](decisions/0014-phrase-detail-information-hierarchy.md) · [quality/2026-08-07-phrase-detail-hierarchy](quality/2026-08-07-phrase-detail-hierarchy.md)

### 2026-08-07 · 구조 수정 · OCR Context fingerprint + saved chip DB 복원
- **무엇**: `SAVED FROM THIS CONTEXT`를 화면 로컬 state가 아니라 Phrase Bank에서 복원하도록 변경. OCR Context를 NFKD·소문자·영숫자·공백으로 정규화한 버전 fingerprint를 `source_context`에 저장하고, OCR 완료 및 `Save another` 직후 동일 그룹을 다시 조회. 이미지 자체는 계속 저장하지 않음. fingerprint 도입 전 Phrase는 raw Context와 최근 500개 normalized fallback으로 호환하며, 동일 legacy duplicate 저장 시 fingerprint를 backfill.
- **검증**: TypeScript PASS · ESLint PASS · diff check PASS · iOS production export PASS(1,850 modules) · 연결된 iPhone 앱 재실행/process 유지 PASS. 인증 DB hydrate 및 같은 사진 재진입 chip 복원은 사용자 탭 대기.
- **산출물**: [decisions/0013-context-fingerprint-without-image-retention](decisions/0013-context-fingerprint-without-image-retention.md) · [postmortems/2026-08-07-capture-context-chips-volatile-state](postmortems/2026-08-07-capture-context-chips-volatile-state.md) · [quality/2026-08-07-phrase-capture-quick-source-menu](quality/2026-08-07-phrase-capture-quick-source-menu.md)

### 2026-08-07 · 실기기 수정 · 저장 CTA 복구 + 현재 화면에서 사진 교체
- **무엇**: Phrase 저장 완료 bottom sheet에서 `Save another`가 사라지고 `Done`이 왼쪽으로 치우친 레이아웃 회귀를 수정. 세로 sheet의 primary CTA는 공용 `full/flex:1` 대신 명시적 100% 폭으로, secondary CTA는 중앙 정렬. 사진 preview 아래 `Take again`·`Choose another`를 추가해 route를 나가지 않고 새 이미지 선택→OCR 재실행 가능. picker 취소는 기존 draft를 유지하고, 이미 저장한 Phrase가 있을 때만 Bank 보존과 화면 context 초기화를 확인.
- **검증**: TypeScript PASS · ESLint PASS · diff check PASS · iOS production export PASS(1,850 modules) · 연결된 iPhone 앱 재실행/process 유지 PASS. 최종 sheet/사진 교체 시각 확인은 사용자 탭 대기.
- **산출물**: [postmortems/2026-08-07-phrase-save-sheet-full-pill-collapse](postmortems/2026-08-07-phrase-save-sheet-full-pill-collapse.md) · [quality/2026-08-07-phrase-capture-quick-source-menu](quality/2026-08-07-phrase-capture-quick-source-menu.md)

### 2026-08-07 · 빌드+배포 · 하나의 Context에서 Phrase 연속 저장 + 전체 해석
- **무엇**: OCR·붙여넣기 원문 전체의 자연스러운 한국어 번역을 Context 카드 바로 아래에 표시하고, Phrase 저장 데이터의 `source_context`에도 함께 보존. 첫 Phrase 저장 후 `Save another`를 선택하면 사진·원문·번역·source·Story는 유지하고 Phrase 필드만 비워 같은 문장에서 다음 표현을 저장할 수 있게 함. 같은 capture에서 저장한 표현은 `SAVED FROM THIS CONTEXT` chip으로 모아 보여주며, chip을 누르면 실제 저장값을 확인하고 Phrase·종류·뜻·usage note를 수정 가능. 화면은 기존 theme token·Card·Pill·Chip·Newsreader 규칙을 유지하고 저장 완료 sheet의 우발적 backdrop 진행을 차단.
- **검증**: diff check PASS · TypeScript PASS · ESLint PASS · iOS production export PASS(1,850 modules) · `phrase-capture` ACTIVE v5/verify_jwt=true · anon-only 401 PASS · 연결된 iPhone 앱 재실행/process 유지 PASS. 인증 OCR 전체 번역과 2개 연속 저장·chip 수정은 실기기 탭 확인 대기.
- **산출물**: [decisions/0012-multi-phrase-shared-context](decisions/0012-multi-phrase-shared-context.md) · [quality/2026-08-07-phrase-capture-quick-source-menu](quality/2026-08-07-phrase-capture-quick-source-menu.md)

### 2026-08-07 · 빌드+배포 · 수동 Phrase·OCR 수정 후 AI details 채움
- **무엇**: 문맥 없이 Phrase만 직접 입력해도 `Fill details with AI`로 kind·한국어 뜻·영문 usage note를 채우도록 `phrase-capture`에 `phrase_text` 모드를 추가. OCR/문맥 추천 Phrase를 사용자가 수정하면 버튼을 `Update AI details`로 바꿔 이전 세부정보가 stale임을 표시. 서버는 모델 출력의 Phrase를 버리고 사용자 입력 Phrase를 그대로 고정하며 context는 의미 disambiguation에만 사용.
- **검증**: TypeScript PASS · ESLint PASS · diff check PASS · iOS production export PASS(1,850 modules) · `phrase-capture` ACTIVE v4/verify_jwt=true · phrase-details anon-only 401 PASS · 실제 iPhone 앱 재실행 PASS. 인증 사용자 생성 결과는 실기기 탭 확인 대기.
- **산출물**: [decisions/0011-ai-details-anchor-to-user-phrase](decisions/0011-ai-details-anchor-to-user-phrase.md) · [quality/2026-08-07-phrase-capture-quick-source-menu](quality/2026-08-07-phrase-capture-quick-source-menu.md)

### 2026-08-07 · 실기기 수정 · Photos picker modal-dismiss race
- **무엇**: `Choose from Photos`에서 사진 선택 후 Today의 `+` spinner가 끝나지 않던 문제를 수정. source menu `Modal`을 닫는 state update 직후 iOS PHPicker를 동시에 present하던 흐름을, `Modal.onDismiss` 완료 후 picker를 여는 2단계 흐름으로 변경. camera/text 경로와 picker cancel/error cleanup은 유지하고 실제 iPhone 앱을 재시작.
- **검증**: TypeScript PASS · ESLint PASS · diff check PASS · 실제 iPhone bundle 재실행/process 유지 PASS · Photos 재탭 확인 대기.
- **산출물**: [postmortems/2026-08-07-image-picker-modal-dismiss-race](postmortems/2026-08-07-image-picker-modal-dismiss-race.md)

### 2026-08-07 · 빌드+배포 · Phrase 빠른 수집 메뉴 + 공통 AI 보조 편집기
- **무엇**: 전 화면 `+`가 전체 chooser 페이지 대신 작은 attachment-style 메뉴(`Take a Photo` / `Choose from Photos` / `Write or Paste Text`)를 열도록 변경. 카메라·앨범은 선택 즉시 네이티브 picker→OCR→공통 편집기로 연결하고, 붙여넣기와 직접 입력은 하나의 context 입력으로 통합. 텍스트는 사용자가 `Fill from context`를 눌렀을 때만 AI가 표현·종류·뜻·메모 초안을 채우며 최종 내용은 사용자가 수정·저장. 저장 후 이전 화면으로 돌아가 shell toast 표시.
- **배운/적용한 원칙**: `+`는 capture 의도가 이미 생긴 순간이므로 source 선택만 짧게 제공한다. 입력 source와 학습 데이터 편집은 분리하고, 이미지 자동 추출과 텍스트 opt-in 자동 채움은 같은 user-review 저장 경로로 합류한다. 이미지 자체는 저장하지 않는다.
- **검증**: diff check PASS · TypeScript PASS · ESLint PASS · iOS production export PASS(1,850 modules) · `phrase-capture` ACTIVE v3/verify_jwt=true · text anon-only 401 PASS · `expo-clipboard` Pod 포함 물리 iPhone build/install/launch PASS(Xcode 0 errors, process 유지).
- **산출물**: [decisions/0010-phrase-capture-quick-source-menu](decisions/0010-phrase-capture-quick-source-menu.md) · [quality/2026-08-07-phrase-capture-quick-source-menu](quality/2026-08-07-phrase-capture-quick-source-menu.md)

### 2026-08-07 · 수정+실기기 검증 · Phrase capture e2e 다듬기 (OCR·키보드·draft)
- **무엇**: 실기기 e2e에서 나온 문제 묶음. (1) **OCR "Edge Function returned a non-2xx"** 원인은 `phrase-capture` **미배포**(배포된 건 talk-diagnose·media-url·talk-stuck·phrase-tts 4개뿐) → `supabase functions deploy phrase-capture`로 배포(ACTIVE v1). 클라이언트도 `error.context`(Response)에서 실제 본문/404를 읽어 진짜 원인을 표시하도록 개선. (2) **키보드 회피**: `Screen`의 ScrollView에 `automaticallyAdjustKeyboardInsets`+`keyboardDismissMode="interactive"` → 포커스된 입력창이 키보드 위로 자동 스크롤(전 입력 화면 공통). (3) **capture draft 유출**: edit 뒤로가기가 `setStage("choose")`라 컴포넌트가 안 unmount돼 이전 입력이 남던 것을 `resetDraft()`로 방식 재선택/재진입 시 항상 초기화하고, 미저장 입력이 있으면 뒤로갈 때 "Leave without saving?" 확인 다이얼로그.
- **배운/적용한 원칙**: supabase-js는 모든 non-2xx를 동일 메시지로 뭉뚱그린다 → 진단하려면 `error.context`를 열어야 한다. 미배포 함수 = 404 = "non-2xx". 스택 없는 커스텀 nav에서 "뒤로=stage 전환"이면 컴포넌트가 살아있어 상태가 샌다 → 진입점에서 리셋 + 이탈 가드.
- **검증**: tsc=0 · 변경 파일 ESLint error 0 · `phrase-capture` ACTIVE v1(verify_jwt=true) · **실기기 확인(사용자: OCR·뜻 자동채움·키보드·draft 가드 정상)**.
- **남은 것**: ② 수동입력(type/paste) 시 뜻 AI 자동채움(텍스트 모드 함수 필요) · 뜻 언어 학습자 L1 정렬([[mobile-first-language-n1]]).

### 2026-08-07 · 실패+수정 · Phrase 저장 시 해제된 오디오 플레이어 pause 크래시
- **무엇**: e2e 중 Phrase 저장 버튼이 Render Error(`NotFoundException: Unable to find the native shared object` @ `use-phrase-speech.ts:48 player.pause()`)로 화면을 죽임. `usePhraseSpeech`의 cleanup이 `[player]` 의존이라, 저장→`setAudioUrl()`로 `useAudioPlayer`가 이전 네이티브 플레이어를 해제·교체한 뒤 그 옛 플레이어에서 `pause()`를 불러 발생. cleanup을 **unmount 전용(`[]`)** + 최신 플레이어는 `playerRef`(effect 동기화)에서 읽도록 바꾸고, `stop()`/`startCloud()`의 동기 player 호출도 try/catch로 방어. JS-only(네이티브 재빌드 불필요).
- **배운/적용한 원칙**: `useAudioPlayer` 같은 네이티브 shared object는 **소스가 바뀌면 해제**된다 — cleanup은 unmount 전용, 최신 인스턴스는 ref로, 동기 호출은 try/catch. 렌더 중 ref 대입은 금지(`react-hooks/refs`)라 ref 동기화도 effect로.
- **검증**: tsc=0 · ESLint=0 · **실기기 리로드 후 저장 정상 확인(사용자)**.
- **산출물**: [postmortems/2026-08-07-phrase-speech-released-player-pause](postmortems/2026-08-07-phrase-speech-released-player-pause.md)

### 2026-08-07 · 개선+배포 · Phrase TTS 저장 시 prewarm + 자연 회화 속도
- **무엇**: 신규 `phrase_items` 저장 직후 저장 UI를 막지 않는 background TTS prewarm을 시작하고, Phrase 상세 진입 시 signed URL과 MP3를 `expo-audio(downloadFirst)`로 선로딩. 동시에 `gpt-4o-mini-tts` `marin` 지시문을 학습자용 느린 발화에서 정상 회화 속도·연음·축약·강세·리듬으로 교체하고 캐시를 `phrase-pronunciation-v2`로 분리. 첫 탭 lazy 생성과 기기 TTS 폴백은 유지.
- **배운/적용한 원칙**: 저장 성공은 음성 생성 성공과 분리해 표현 포착 흐름을 보호한다. 캐시된 생성물의 프롬프트를 바꿀 때는 키 버전도 함께 올려 오래된 음성이 섞이지 않게 한다. 앱 내부 동시 요청은 phrase id 기준 한 Promise로 합쳐 저장 prewarm과 화면 선로딩의 중복 호출을 줄인다.
- **리뷰 수정**: holdout review에서 Story/Message Talk가 scope id를 잃는 경로와 duplicate Phrase의 Story link 조기 반환을 발견해 수정. capture의 Story 로딩/실패/빈 상태와 안전한 저장 오류 문구, clip 삭제 후 Phrase 보존 안내도 데이터 동작에 맞게 교정. 재리뷰 APPROVE.
- **검증**: diff check PASS · TypeScript PASS · ESLint PASS · iOS production export PASS(1,845 modules) · holdout code review APPROVE · `phrase-tts` ACTIVE v2/verify_jwt=true · anon-only 401 차단 PASS · 연결된 iPhone dev-client 재실행/프로세스 유지 PASS. 인증 사용자 v2 생성과 체감 속도 청음은 실기기 탭 확인 대기.
- **산출물**: [decisions/0009-phrase-tts-prewarm-natural-speed](decisions/0009-phrase-tts-prewarm-natural-speed.md) · [quality/2026-08-07-phrase-tts-prewarm-natural-speed](quality/2026-08-07-phrase-tts-prewarm-natural-speed.md) · [postmortems/2026-08-07-phrase-tts-deploy-working-directory](postmortems/2026-08-07-phrase-tts-deploy-working-directory.md)

### 2026-08-07 · 빌드+배포 · Phrase 클라우드 AI 음성 + R2 lazy cache
- **무엇**: 품질이 낮은 기기 TTS를 폴백으로 내리고, Phrase 목록·상세의 기본 발음을 OpenAI `gpt-4o-mini-tts` `marin`으로 전환. 인증된 `phrase_items.id`만 Edge Function이 RLS 조회하고, 첫 재생 MP3를 모델·음성·프롬프트 버전·문구 해시 기준 사용자별 비공개 R2 경로에 저장해 이후 재사용. 앱은 첫 생성/다운로드 중 spinner를 표시하고 API·네트워크·15초 로딩 실패 시 기존 기기 TTS로 자동 폴백. 공식 정책에 따라 `AI-generated voice`를 표시.
- **배운/적용한 원칙**: 반복 학습 음성은 **매번 생성하지 않고 첫 사용에만 생성**. 모바일은 text나 API key를 전달하지 않고 phrase id만 전송하며, 서버가 소유권과 실제 원문을 다시 확정한다. `marin`과 말투 instructions는 OpenAI 공식 TTS 가이드의 최신 권장값을 사용.
- **검증**: TypeScript PASS · ESLint error 0 · iOS production export PASS(1,845 modules) · `phrase-tts` ACTIVE v1/verify_jwt=true · anon-only 401 차단 PASS · 실제 iPhone dev-client 재실행 PASS. 인증 사용자 첫 생성/cache hit 청음은 사용자 탭 확인 대기.
- **산출물**: [decisions/0008-cloud-phrase-tts-cache](decisions/0008-cloud-phrase-tts-cache.md) · [quality/2026-08-07-phrase-cloud-tts](quality/2026-08-07-phrase-cloud-tts.md)

### 2026-08-07 · 빌드+검증 · Phrase TTS + 현재 학습 단계 상세 UI
- **무엇**: Phrase 목록·상세의 `Hear`를 원본 클립 재생에서 **저장 표현 자체를 읽는 온디바이스 TTS**로 교체. 영어 enhanced voice 우선·0.9× 속도·재생/정지 상태를 제공하고, 스크린샷/직접 입력처럼 영상이 없는 표현도 항상 들을 수 있게 함. 원본 영상이 있는 경우 출처 카드에 `Hear in context`를 별도 제공해 실제 억양·문맥 발음은 보존. 하단 자가평가를 목업의 3단계 세로 진행선(Recognize → Use with help → Use on my own, CURRENT/완료 표시)으로 재디자인.
- **배운/적용한 원칙**: **발음과 문맥 오디오는 역할을 분리** — 상단 스피커는 정확히 저장한 언어 단위, 출처 카드는 실제 장면. 첨부 실기기가 무음 모드였으므로 TTS가 기존 앱 오디오 세션의 `playsInSilentMode`를 사용하게 하고, 원본 재생·Practice/STT 진입 전에는 상호 정지해 공유 세션 경합을 줄임. 네이티브 모듈은 Expo 57 번들 버전 `57.0.1`로 정확 핀.
- **검증**: TypeScript PASS · ESLint error 0 · CocoaPods `ExpoSpeech 57.0.1` 링크 · iOS simulator/물리 iPhone Debug build 0 errors · 양쪽 설치/앱 launch PASS. 실제 TTS 청음은 사용자 탭 확인 대기.
- **산출물**: [quality/2026-08-07-phrase-tts-stage-detail](quality/2026-08-07-phrase-tts-stage-detail.md)

### 2026-08-07 · 수정+검증 · migration 전 홈 데이터 fallback + 오류/빈 상태 정렬
- **무엇**: migration 022 미적용 DB에서 Today가 `phrase_items.is_favorite` 오류로 전체 실패하던 경로를 교정. 해당 optional 컬럼이 없을 때만 컬럼 없이 다시 읽어 기존 표현·SRS 데이터를 표시하고, Today/Phrases에는 DB 원문 대신 저장 데이터가 안전하다는 복구형 안내를 표시. 오류 Retry와 Story의 빈 Messages `New message` CTA를 중앙 정렬.
- **검증**: TypeScript PASS · 변경 파일 ESLint error 0(기존 warning 9) · iOS production export PASS(1,840 modules) · diff check PASS.
- **산출물**: [postmortems/2026-08-07-mobile-schema-rollout-raw-error](postmortems/2026-08-07-mobile-schema-rollout-raw-error.md)
- **남은 것**: migration 022 적용 후 즐겨찾기 쓰기 및 Story memory 활성화. fallback은 migration 전 읽기 호환용으로 유지.

### 2026-08-07 · 빌드+검증 · 개인 Phrase Bank 수집 → Story/self-talk 재사용 루프
- **무엇**: 모바일 Phrases의 데이터 정본을 자막 북마크(`bookmarks`)에서 실제 학습 표현(`phrase_items`)으로 교정. Today/SRS/즐겨찾기·클립 선택 저장을 같은 모델로 통합하고, 전 화면 우하단 `+`에서 직접 입력·붙여넣기·스크린샷 OCR로 표현과 원문 문맥을 저장하도록 구현. 표현↔Story 연결 및 추천/수락/사용/거절 이벤트를 추가하고, self-talk 진단이 현재 Story·사용 이력·최근 거절을 반영해 저장 표현을 우선 제안하도록 변경. 기존 Sessions 하단 탭과 Profile/Library BETA 구조는 유지.
- **배운/적용한 원칙**: **저장 위치와 학습 단위는 분리** — bookmark는 자막 위치, phrase는 재사용할 표현. OCR 이미지는 저장하지 않고 서버에서 텍스트만 추출하며, AI 추천은 저장 표현 ID를 반환해 서버가 실제 원문으로 다시 고정한다. 저장 표현이 부적절할 때만 신규 표현을 생성하는 fallback으로 둔다.
- **검증**: TypeScript PASS · ESLint error 0(warning 13) · iOS production export PASS(1,840 modules) · Edge Function parse PASS · resolved Expo config에서 CAMERA/RECORD_AUDIO 보존 · 이미지 모듈을 SDK 번들 버전에 정확 핀 후 dev client 빌드·설치·물리 iPhone startup PASS · DB lint는 로컬 DB 부재로 대기.
- **산출물**: [decisions/0007-phrase-items-canonical-mobile-bank](decisions/0007-phrase-items-canonical-mobile-bank.md) · [quality/2026-08-07-personal-phrase-capture-retrieval](quality/2026-08-07-personal-phrase-capture-retrieval.md) · [postmortems/2026-08-07-image-picker-permission-blocking](postmortems/2026-08-07-image-picker-permission-blocking.md) · [postmortems/2026-08-07-image-capture-native-module-abi](postmortems/2026-08-07-image-capture-native-module-abi.md)
- **남은 것**: migration 022 적용 · `phrase-capture`/`talk-diagnose` 배포 · 물리 iPhone에서 사진 선택→OCR→표현 저장 및 Story 추천→Retry evidence end-to-end 검증.

### 2026-08-07 · 빌드 · 하단바 Library→Sessions 재편 + 프로필 화면 리디자인
- **무엇**: 정식 첫 런칭(TestFlight 개인용)을 위해 하단 탭 `Library`를 **`Sessions`**(wave2 아이콘)로 교체. Topics 홈에 있던 전역 "Your sessions" 카드를 **탭으로 승격**(`SessionsScreen`을 push 상세→탭 Header+Avatar로 전환). 각 **Story 화면에 그 스토리의 세션만 보이는 "Sessions" 섹션** 추가(`fetchTalkSessions(limit, storyId)` 필터 + 공용 `SessionRow`, `showStory=false`). Library는 제거가 아니라 **프로필의 "Library BETA" 엔트리**로 이동(push view). 프로필(`settings.tsx`)을 목업대로 재작성 — 중앙 정렬 아이덴티티 헤더 + "Your speaking world" 코발트 그라디언트 배너(→Topics) + Library BETA + Preferences/Practice/Notifications/Account 그룹(리딩 아이콘·값·chevron), Log out은 실제 signOut 유지.
- **배운/적용한 원칙**: **탭↔push 재배치는 nav 계약부터** — `TabId`에서 `library`→`sessions`, `ViewName`에서 `sessions` 제거·`library` 추가, `shell` renderTab/renderView 동시 수정으로 컴파일이 누락을 잡게 함. 세션은 `storyId`에 붙으므로 토픽별 섹션은 **데이터 직결인 스토리 단위**로. 프로필은 아이콘 세트에 없던 11종(globe/translate/chat/contrast/clock/bulb/gauge/calendar/export/help/shield)을 **기존 24×24 stroke 규칙 그대로** 추가. 값 행은 아직 표시용 placeholder(원본도 동일) — 배선은 후속.
- **검증**: `tsc --noEmit` PASS(exit 0) · 변경 7파일 ESLint **error 0**(경고 5=기존 `useEffect(load)` 패턴 답습) · `expo export --platform ios` 번들 PASS. **실기기 확인은 대기**.
- **남은 것**: 실기기 비주얼 확인(그라디언트·아이콘·다크모드) · Edit profile 화면 · Preferences/Practice 값 실제 배선(First language→setFirstLanguage 등) · Sessions 탭 이후 talk 복귀는 `from:"sessions"`로 지정함.

### 2026-08-07 · 수정+실기기 검증 · self-talk 녹음 재생 스피커 라우팅
- **무엇**: session 상세에서 로컬 WAV 재생 직전, 인식기가 남긴 iOS 공유 오디오 세션을 `playAndRecord`로 유지하면서 `mode=default` + `defaultToSpeaker`로 전환. 다음 인식 시작은 기존 모듈이 `measurement`를 복원하므로 라이브 STT·완료 시 interim flush·저장·AI 진단·Stuck 경로는 변경하지 않음.
- **근거**: Expo 57의 `shouldRouteThroughEarpiece=false`와 설치된 네이티브 구현을 확인. `measurement` 모드는 출력 레벨을 낮추며, 기존 `playsInSilentMode` 단독 호출은 expo-audio 쪽 기본값으로 카테고리를 재구성해 두 라이브러리가 공유 세션을 서로 건드리는 구조였음. 이번엔 speech-recognition의 `setCategoryIOS` 한 경로로 격리.
- **검증**: TypeScript PASS, 변경 파일 ESLint error 0(기존 world warning 5), iOS production bundle PASS(1,818 modules), 연결된 iPhone dev-client launch PASS. **실기기 스피커 재생 정상 + 기능 종료 승인**(사용자: "응 잘 된다").
- **산출물**: [quality/2026-08-07-self-talk-speaker-routing](quality/2026-08-07-self-talk-speaker-routing.md)

### 2026-08-07 · 빌드+실패+검증 · 음성 녹음 Phase 1 (로컬 저장·재생·삭제)
- **무엇**: self-talk 세션 오디오를 **기기 로컬에 저장→재생**. 인식기 `recordingOptions.persist`가 뱉는 캐시 WAV를 `expo-file-system`(신 `File/Directory/Paths` API)으로 `document/speak/{id}.wav`로 옮기고 `talk_sessions.audio_key`(상대 키)에 기록(업로드 없음). world의 세션 상세에 **재생 카드**(play/pause·진행바·총길이·네이티브확인 Delete). **실기기 확인**(사용자 "녹음은 된거니까").
- **배운/적용한 원칙**: **저장은 인식기 finalize 타이밍에 무의존해야** — on-device 연속 인식은 "isFinal 1개 + 나머지 interim" 패턴이라 `stop()`이 final만 반환하면 첫 몇 단어만 저장됨 → **완료 시 interim flush**([[postmortems/2026-08-07-stt-final-truncated-audio-session-thrash]]). iOS는 **프로세스 전체 단일 `AVAudioSession` 공유** — 재생 화면에서 카테고리/라우팅을 만지면 STT 게인이 깨진다 → 세션 조작 롤백, `playsInSilentMode`만, **스피커 라우팅은 defer**. Expo 네이티브 모듈은 코어와 **정확한 버전 정렬** 필요 — `expo install`이 고른 file-system 57.0.2가 `ExpoModulesCore` 57.0.7에 없는 심볼 참조 → 실행 즉시 dyld 크래시, **57.0.1 정확 핀**으로 해결([[postmortems/2026-08-07-expo-file-system-abi-crash]]).
- **스킬/도구**: expo-file-system(File/Directory/Paths), expo-audio(useAudioPlayer/Status), expo-speech-recognition(persist·16kHz·interim), Supabase update(audio_key), 서브에이전트 리서치(iOS 오디오세션)
- **산출물**: [postmortems/2026-08-07-expo-file-system-abi-crash](postmortems/2026-08-07-expo-file-system-abi-crash.md) · [postmortems/2026-08-07-stt-final-truncated-audio-session-thrash](postmortems/2026-08-07-stt-final-truncated-audio-session-thrash.md)
- **남은 것**: 스피커 라우팅(인식기 `setCategoryIOS` `defaultToSpeaker`로 격리, post-submission) · 삭제된 클립/세션의 R2·로컬 고아 정리 · Settings의 main-language 선택.

### 2026-08-06 · 빌드+검증 · Stuck = 즉석 메모 → AI 영어 변환 (+ N:1 L1)
- **무엇**: self-talk "Stuck" 버튼을 실기능화. **v1(transcript 추론)**을 만들어 실기기 테스트 → "잘 되는지 모르겠다"(grounding 약함) → **v2(즉석 메모)로 피벗**. Stuck 탭 → 자동포커스 입력창(녹음 계속) → **L1(모국어)으로** 한 줄 → 저장/계속. Finish 시 새 Edge Function **`talk-stuck`**(gpt-4o-mini)이 각 메모를 **영어 표현+예문**으로 변환, done의 "Where you got stuck" 섹션에 표시(YOU WANTED TO SAY=메모 / SAY IT LIKE THIS=영어). 기존 3-moment 진단은 그대로, 둘이 병렬. talk-stuck 2회 배포·스모크(401 JSON)로 라이브 확인. **실기기 확인**(사용자 "훨씬 낫네").
- **배운/적용한 원칙**: 막히는 순간 학습자는 **L1으로 튀어나오는데 STT는 en-US 전용**이라 transcript엔 안 잡힘 → **추론보다 명시적 유저 입력이 grounded**([[decisions/0006-stuck-explicit-memo]]). 앱은 **N:1**(L1 N개 : 영어 1개)이라 안내 문구는 **유저 L1로**, 한국어 하드코딩 금지 → `first-language.ts`(Hermes `Intl`로 기기 로케일 추론, `setFirstLanguage` override 훅, ko/es/ru/en; expo-localization 없이 재빌드 회피)([[mobile-first-language-n1]]). 메모 내용은 다국어 그대로 GPT가 영어화. 새 함수는 talk-diagnose 구조 미러(verify_jwt + getUser, OPENAI 시크릿 공유).
- **스킬/도구**: Supabase Edge Functions(Deno, functions deploy), gpt-4o-mini(json_object), Hermes Intl 로케일, functions.invoke
- **산출물**: [decisions/0006-stuck-explicit-memo](decisions/0006-stuck-explicit-memo.md)
- **남은 것**: 음성 녹음 Phase 1(로컬) — 플랜 `docs/audio-recording-plan.md` · Settings의 main-language 선택(→ setFirstLanguage) · talk-stuck usage/cost 트래킹.

### 2026-08-06 · 빌드+검증 · 셀프톡 live 화면 목업 반영 (Mirror)
- **무엇**: self-talk(=Mirror) live 화면을 Claude Design "Free talk" 목업 2장에 맞춰 재작성(`talk.tsx`). 상단 "Free talk" 타이틀(탭→컨텍스트 드롭다운)+토픽 pill+타이머, 🔴 "Listening · keep talking" 다크 pill+실시간 자막, 큐카드를 **세그먼트 토글**(Today's phrase / Story beats·N, active=코발트+sparkle)로, Story beats는 **체크리스트**(✓done/●current+하이라이트/○upcoming, 비트 탭→current 이동), 하단 컨트롤 **Stuck(라이프부이 신규 아이콘)·코발트 녹음 인디케이터·Finish(다크 원)**. **실기기 확인**(사용자 "굉장히 괜찮다").
- **배운/적용한 원칙**: 목업의 "가운데 파란 원"은 **녹음 인디케이터**(별도 Finish가 액션)라, 이전 "가운데 버튼이 안 눌린다"는 지적은 디자인 의도였음을 확인 — 인디케이터/액션 분리를 존중. TTS "Hear it"은 expo-speech(네이티브)라 이번 비주얼 패스에서 **제외**(재빌드 회피), beats는 mock 폴백 + 탭 이동으로 **비주얼 우선**(실데이터 스레딩은 분리된 후속). 새 아이콘은 stroke 세트 규칙대로 `life`(라이프부이) 추가.
- **스킬/도구**: react-native-svg(life 아이콘), expo-camera 미러, 디자인 목업 대조
- **남은 것**: 실제 message beats·targetSeconds("30 sec") talkCtx 스레딩(world.tsx) · Hear it TTS(expo-speech+재빌드) · **Stuck 실동작** + **음성 녹음**(다음 작업) · count/done/moment/retry도 목업 나오면 다듬기.

### 2026-08-06 · 빌드 · Saylo 브랜드 스플래시 (Claude Design 포팅)
- **무엇**: 앱 시작 시 브랜드 스플래시 신설. Claude Design `Saylo Splash`(3씬: Logo draw 2.6s → Reveal 2.2s → Idle loop, palette=COBALT, motion=springy)를 **DesignSync로 직접 읽어** RN으로 포팅(`src/screens/splash.tsx`). 커시브 더블루프 마크를 `strokeDashoffset`로 그리고("Saylo" 워드마크 페이드 → 로고 draw → "Find your flow / in English." 마스크 슬라이드업 → 서브타이틀 → "Get started" 스프링업 + 글로스 스윕 → idle 플로팅). `_layout`에서 폰트/세션 준비 후 라우팅 전에 표시. **정적 통과**(tsc 0, lint 0). 실기기 검증은 대기(사용자가 "일단 이대로 두고" 확정).
- **배운/적용한 원칙**: 웹 디자인의 **씬-경계 프레임매칭**(모든 씬이 같은 Screen을 다른 phase 값으로 렌더)을 RN에선 **단일 RAF 타임라인 + 조각별 phase 파생**으로 재현 — 디자인의 easing(easeOutCubic/InOutCubic/OutQuart/OutBack)을 그대로 이식. SVG draw는 **패스 길이를 실측(≈2493)**해서 `strokeDasharray=[L,L]` + `offset=L*(1-p)`로(react-native-svg는 `pathLength` 불확실 → 실측이 안전). 렌더 안에서 컴포넌트 정의 금지(60fps RAF면 매 프레임 리마운트) → 인라인 함수로. **리틴트 불필요**: 이 디자인은 기본 팔레트가 이미 코발트. 폰트는 Figtree→**Inter 대체**(이미 로드, identity 미확정이라 폰트 추가 보류). 재빌드 불필요(svg/linear-gradient 이미 링크).
- **스킬/도구**: DesignSync(Claude Design 읽기), react-native-svg(strokeDashoffset draw), expo-linear-gradient(글로스), RAF 타임라인, node로 패스 길이 실측
- **남은 것**: 네이티브 스플래시(크림 `#fbf9f4`)→코발트 정렬(prebuild 필요, 로고 확정 후) · 스플래시→온보딩 이중 웰컴 정리 · 첫 실행만 뜨게 게이트(AsyncStorage) · Figtree 정확히 넣을지 · 구체 유저저니(언제 뜨는지)는 사용자가 추후 지정.

### 2026-08-06 · 빌드+검증 · 밀어서 삭제 + 즐겨찾기 (스와이프 통일, `...` 제거, migration 021)
- **무엇**: 삭제 기능이 없던 리스트(Phrases·Library·Sessions·Stories)와 죽은 `...` 버튼(clip player·phrase 상세)을 정리. **`SwipeRow`**(gesture-handler 레거시 `Swipeable` + `GestureHandlerRootView`)로 **오른쪽→왼쪽=삭제 / 왼쪽→오른쪽=즐겨찾기** 좌우 대칭 제스처. 삭제 전엔 **네이티브 확인 다이얼로그**(`Alert`, destructive). `...` UI는 요청대로 완전 제거. 즐겨찾기는 **migration 021**(`videos·bookmarks.is_favorite`)로 실기능화 — 리스트 ★ 인디케이터 + Phrases의 Favorites 필터. **실기기 확인**(사용자): 양방향 스와이프·확인창·별표 정상.
- **배운/적용한 원칙**: 삭제 **의미를 엔티티별로 차등** — 클립·표현·세션은 하드 삭제(의도된 FK 캐스케이드: videos→segments→bookmarks), **스토리는 소프트 아카이브**(`status='archived'`, 앱이 이미 필터) → messages/beats/talk_sessions 캐스케이드 손실 방지 + 되돌리기 가능. 즐겨찾기 컬럼은 **additive**(nullable-default boolean)라 웹 무해 + 기존 owner `FOR ALL` RLS가 UPDATE 커버(새 정책 불필요). 낙관적 업데이트+롤백. **순서 함정**: 021 실행 전 리로드하면 select에 `is_favorite`가 있어 Library·Phrases 로딩이 통째로 깨짐 → 마이그레이션 우선.
- **스킬/도구**: react-native-gesture-handler(Swipeable, GestureHandlerRootView — pod 이미 링크됨, 재빌드 불필요), Alert(네이티브 확인), Supabase update(RLS), 수동 마이그레이션, tsc/eslint(안전망)
- **산출물**: [decisions/0005-destructive-actions-swipe-and-favorites](decisions/0005-destructive-actions-swipe-and-favorites.md)
- **남은 것**: 클립 하드 삭제 시 R2 미디어 오브젝트 고아(모바일→R2 삭제 경로 없음) — 후속 정리. 스와이프 액션 발견성(힌트/어포던스 미제공).

### 2026-08-06 · 빌드+검증 · Speak 전면 카메라 미러 (진짜 거울)
- **무엇**: Speak 녹음 중 가짜 그라데이션 미러 → **실제 전면 카메라 프리뷰**(expo-camera `CameraView facing="front"`). count/live/retry 미러 교체, 권한 없으면 그라데이션 폴백. 프리뷰 전용(녹화·오디오 X). **실기기 확인**: 카메라 미러 + STT 자막 **공존**(오디오세션 충돌 없음 — 걱정했던 그 버그류 안 남).
- **배운/적용한 원칙**: 카메라 프리뷰가 마이크/오디오세션을 안 잡게 **플러그인 `microphonePermission:false`** → speech recognizer와 공존. **빌드 함정**: config-plugin 권한(`NSCameraUsageDescription`)은 **prebuild를 거쳐야 Info.plist에 생김** — xcodebuild-only는 app.json 플러그인을 안 봐서 `missing NSCameraUsageDescription` 크래시. 수동으로 `ios/Shadowing/Info.plist`에 키 추가 + app.json 플러그인 유지(향후 prebuild 대비).
- **스킬/도구**: expo-camera(CameraView, useCameraPermissions), Info.plist, expo run:ios(--device)

### 2026-08-06 · 이전+검증 · 클립 재생을 Supabase Edge Function으로 (media-url)
- **무엇**: `/api/media`(Vercel, 앱에서 Protocol error)를 **Supabase Edge Function `media-url`**(Deno)로 이전 — videos에서 R2 key 조회(RLS owner-scoped) → `aws4fetch`로 R2 presign → `{audioUrl, videoUrl}`. 클라 `fetchClipMedia`를 `functions.invoke("media-url")`로 전환. **실기기 재생 확인.** 오디오 자체는 R2 직접 스트리밍이라 서명 홉만 이동.
- **배운/적용한 원칙**: [[decisions/0004-mobile-api-supabase-edge-functions]] 규칙대로 모바일-필요 라우트를 Vercel→Edge Function로 하나씩. Deno에선 AWS SDK 대신 경량 `aws4fetch`로 R2 SigV4 presign. RLS anon+JWT 클라로 videos 조회 → 소유권 자동 스코프(서비스키 불필요).
- **스킬/도구**: Supabase Edge Functions(Deno), aws4fetch(R2 presign), functions.invoke
- **남은 것**: `/api/jobs`(처리중 목록)도 Vercel — ready 클립은 videos(RLS)라 목록엔 뜨지만 in-flight는 이전 필요.

### 2026-08-06 · 이전+검증 · 모바일 진단 API를 Supabase Edge Function으로 (+ Save as phrase 실동작)
- **무엇**: 실기기에서 **앱→Vercel 모든 fetch가 "Protocol error"** 로 실패(Safari·PWA·Supabase는 정상) → 진단 API를 **Supabase Edge Function**(`talk-diagnose`, Deno, OpenAI 직접 fetch + JWT 인증)으로 이전하고 클라를 `supabase.functions.invoke`로 전환. Supabase CLI(Homebrew) 세팅+배포. **실기기 확인**: 진단 moments 정상 + "Save as phrase"→`phrase_items` 저장("Saved to Phrase Bank") 동시 확인.
- **배운/적용한 원칙**: 대조군(브라우저/앱·Supabase/Vercel·Wi-Fi/셀룰러)으로 실패 층을 갈라 "호스트 특정 앱-fetch 문제"로 좁힘. **에러에 대상 URL을 박아** 진단 가속(회귀 방지책). **Expo+Supabase 앱의 표준(앱→Supabase+Edge Functions, Vercel은 웹)** 으로 정렬. CLI 가드레일: worktree 루트, `functions`·`secrets`만, `db push` 금지(공유 prod DB=웹).
- **스킬/도구**: Supabase Edge Functions(Deno, Deno.serve), supabase CLI(brew), functions.invoke, OpenAI REST, WebSearch/WebFetch(리서치)
- **산출물**: [decisions/0004-mobile-api-supabase-edge-functions](decisions/0004-mobile-api-supabase-edge-functions.md) · [postmortems/2026-08-06-ios-native-fetch-vercel-protocol-error](postmortems/2026-08-06-ios-native-fetch-vercel-protocol-error.md)

### 2026-08-05 · 평가+결정 · 네이티브 @expo/ui vs 브랜드 디자인 (Settings)
- **무엇**: "네이티브 iOS 느낌" 방향 판단용으로 Settings를 `@expo/ui`(진짜 SwiftUI: Host/List/Section/Toggle/Picker)로 재구성한 **증명**을 만들어 브랜드(Cobalt Editorial·serif) 버전과 비교. 결정: **Settings는 브랜드 디자인 유지** → 증명 되돌리고 파일 삭제(shell.tsx 무손상, tsc 0).
- **배운/적용한 원칙**: 이 앱은 이미 RN이라 "웹을 네이티브처럼 위장"이 아니라 `@expo/ui`로 **진짜 SwiftUI를 부분 삽입**하는 Level B 하이브리드가 가능·검증됨(tsc가 실제 패키지 타입으로 API 검증 — `Button`은 문자열 child 거부해서 `<Text>`로 감쌈). 다만 네이티브 컨트롤은 기본 Apple-blue 틴트 + 그룹리스트라 브랜드 차별성(serif·따뜻한 톤)을 덮어씀 → **정체성 강한 화면은 커스텀 RN 유지, 리스트/피커/시트류처럼 "네이티브가 값을 파는" 화면에만 선택 적용**이 하이브리드의 올바른 경계. `@expo/ui`+`expo-glass-effect`는 이미 설치돼 있어 향후 고가치 지점에 바로 쓸 수 있음.
- **스킬/도구**: @expo/ui(swift-ui), Expo 57 문서(WebFetch/WebSearch), tsc(타입 안전망)

### 2026-08-05 · 빌드+검증 · Speak 세션 AI 진단 (moments, 웹 프록시 라우트)
- **무엇**: Speak done/moment/retry의 목업 진단(`TALK_SAMPLES`)을 실제 GPT 진단으로 교체. 모바일 번들 시크릿 금지라 앱이 GPT를 직접 못 부름 → **웹에 프록시 라우트 신설** `POST /api/talk/diagnose`(Bearer 인증, gpt-4o-mini, `{transcript,topic}`→`{moments}`, stateless). 앱은 finish 시 transcript를 그 라우트로 보내 최대 3개 moment(`{label, said(원문 인용), want(자연스러운 표현), example}`)를 받아 done 목록·상세에 렌더. **로컬 웹 E2E 실기기 성공**(2026-08-05 21:36): 실제 발화에서 어색한 명사구→동사구 교정("Evaluation using the AI…"→"Evaluating AI and human interaction is very different"), 말더듬 반복("it could be it could be different"→"it could be different") 포착 확인.
- **배운/적용한 원칙**: 클라이언트에 시크릿 금지 → **서버 프록시 라우트**가 표준(웹 `/api/island/diagnose` 패턴 미러링, OpenAI SDK를 클라 번들에 안 넣음). 순수 파서 `parseMoments`는 서버 GPT 호출과 **분리**해 vitest로 회귀 커버(island-speak.ts/-ai.ts 분리 방식 그대로). 오디오 미업로드라 목업 재생 UI는 정직하게 제거. 커밋: `d358aa5`(mobile), `0f934f8`(web/main).
- **스킬/도구**: OpenAI(gpt-4o-mini, json_object), Next.js route(getSessionUserId Bearer), vitest, Expo(apiJson), on-device STT
- **산출물**: [decisions/0003-speak-session-on-device-stt](decisions/0003-speak-session-on-device-stt.md) (다음 스텝=AI 진단 구현·검증 완료)
- **남은 것**: 웹 라우트 prod 배포(사람이 /deploy — 지금은 로컬만), "Save as phrase" 실제 Phrase Bank 연결(현재 로컬 토글), 로컬 테스트 후 모바일 `.env`를 prod로 원복.

### 2026-08-05 · 검증+수정 · Speak 세션 실기기 성공 + 세션 목록 뷰
- **무엇**: 실기기(iPhone 16 Pro Max, 개인 팀 서명)에 dev build 설치 → **온디바이스 STT 자막 지속 + `talk_sessions` 저장 성공** 확인. 첫 실행에서 터진 두 버그를 진단·수정: ①"Audio session was interrupted"(자막 끊김) ②`talk_sessions` RLS 위반(저장 실패). 이어 요청받은 **전체 세션 뷰**를 추가 — Topics 하단 "Your sessions" → 목록(스토리/Free talk·길이·상대시간·자막 미리보기) → 상세(전체 transcript + Talk again). `fetchTalkSessions`(stories 조인, RLS).
- **배운/적용한 원칙**: 훅이 매 렌더 새로 만드는 **반환 객체를 effect deps에 넣으면** cleanup이 매 렌더 돌아 자원을 죽인다 → 정리는 자원을 소유한 훅 안 빈 deps로. **RLS 쓰기는 실제 로그인 세션에서 검증**해야 진실이 드러난다(프리뷰 우회 플래그는 남은 세션 읽기만 가려줌) → `SKELETON_PREVIEW=false`로 전환, 이메일/비번 로그인.
- **스킬/도구**: xcodebuild(-allowProvisioningUpdates, 개인 팀), devicectl install/launch, expo start(LAN), expo-speech-recognition, Supabase RLS
- **산출물**: [postmortems/2026-08-05-speak-audio-interrupt-and-rls](postmortems/2026-08-05-speak-audio-interrupt-and-rls.md)

### 2026-08-05 · 빌드+실패 · Speak 세션 온디바이스 STT (전사 → talk_sessions)
- **무엇**: Speak 탭의 목업 세션을 실제 녹음/전사로 연결 — `expo-speech-recognition`(iOS `SFSpeechRecognizer`, on-device)로 live 자막을 띄우고, finish 시 정지→`createTalkSession`으로 `talk_sessions`(transcript + duration, story/message 링크)에 저장, done 화면에 실제 transcript를 정직하게 표시. AI 진단(moments/추천/retry)은 다음 스텝으로 미룸.
- **배운/적용한 원칙**: 웹엔 라이브 음성 전사 경로가 없어(island도 textarea 타이핑) 재사용 불가 → 시크릿 없이 실시간인 **on-device STT**가 제약에 맞는 선택([[decisions/0003-speak-session-on-device-stt]]). 최신 모듈이 SDK 56 대상(56.0.1)이라 **SDK 57 호환은 재빌드로 검증** — `Build Succeeded`(공백 없는 워크트리 경로). 정적 게이트(tsc + `expo export`)는 통과.
- **실패(미해결·환경)**: 재빌드 후 **시뮬레이터 dev client 연결이 `simctl openurl code 60`으로 wedge** — 수동 openurl + 탭 불가 SpringBoard 모달 누적이 CoreSimulator를 degraded 시킴. 게다가 **온디바이스 STT는 시뮬레이터에서 실 전사 불가**(마이크 입력 없음 + `speech-recognition` 권한 부여 불가). **런타임 검증은 물리 iPhone으로 이관.**
- **스킬/도구**: expo-speech-recognition(useSpeechRecognitionEvent), expo prebuild/run:ios, simctl, Supabase insert(RLS)
- **산출물**: [decisions/0003-speak-session-on-device-stt](decisions/0003-speak-session-on-device-stt.md) · [postmortems/2026-08-05-sim-devclient-openurl-wedged](postmortems/2026-08-05-sim-devclient-openurl-wedged.md)

### 2026-08-05 · 빌드+검증 · Speaking World 트리 실데이터 (migration 020)
- **무엇**: Topics 탭의 목업을 실제 Speaking World 트리로 교체 — `domains/stories/messages/message_beats/talk_sessions`(마이그레이션 020, owner-scoped RLS)를 신설하고, `fetchDomains`가 빈 상태면 클라이언트가 5개 도메인+스토리를 시드. 사용자가 020을 SQL Editor에서 실행한 뒤 시뮬레이터에서 검증: "Your Speaking World"에 About me(3)·Work/Study(4)·Experiences(3)·Daily life(3)·Ideas(3)가 `SEED`와 정확히 일치하는 스토리 카운트로 렌더. 이는 ①020 테이블 생성 ②authed 세션의 `auth.uid()`로 RLS insert 성공 ③`stories(count)` 중첩 집계 통과를 동시에 증명.
- **배운/적용한 원칙**: 마이그레이션은 per-user 시드를 못 하므로 초기 월드는 **첫 사용 시 클라이언트가 시드**. 공유 Supabase 스키마라 DDL은 사용자가 수동 실행(anon 키로는 불가). 검증용 임시 harness(shell 초기 탭=topics)로 확인 후 즉시 원복(`git diff` 공백 확인).
- **스킬/도구**: Supabase 중첩 집계 select(RLS), 수동 마이그레이션, simctl(launch/openurl/screenshot)
- **산출물**: [decisions/0002-speaking-world-data-model](decisions/0002-speaking-world-data-model.md)

### 2026-08-05 · 빌드 · 폴리시 — 리더 비디오 재생 (expo-video)
- **무엇**: 클립에 재생 가능한 `video_url`이 있으면 리더에 실제 비디오(expo-video `VideoView`, 네이티브 컨트롤 + 풀스크린)를 렌더. 오디오 클립은 기존 expo-audio 경로 유지. 재생 위치→트랜스크립트 라인 자동 하이라이트, 라인 탭→seek을 오디오/비디오 통합 인터페이스로. 시뮬레이터에서 실제 영상 재생 + 라인 동기화 확인.
- **배운/적용한 원칙**: 오디오·비디오 훅을 둘 다 호출하되 클립 타입으로 하나만 활성화하고, 재생 상태(playing/pos/dur/seek)를 단일 인터페이스로 통합. expo-video 위치는 `useEvent(timeUpdate)`로 구독만 하고 player 프로퍼티를 직접 읽어 이벤트 payload shape 의존을 제거. 네이티브 dep → 재빌드(공백 없는 경로라 이번엔 무사).
- **스킬/도구**: expo-video(useVideoPlayer/VideoView/useEvent), expo run:ios, WebFetch(SDK 57 문서)

### 2026-08-04 · 빌드 · 폴리시 — 메모 편집 + 문장별 Hear (오디오)
- **무엇**: PhraseDetail의 노트를 편집→저장(`updateMemo`)으로 바꾸고, Phrases 목록·상세에 "Hear"(문장 오디오 재생) 추가. 재사용 훅 `useSegmentPlayer`가 클립 서명 URL을 로드해 세그먼트 `[start,end]`만 재생하고 끝에서 자동 정지. 시뮬레이터에서 재생(pause 아이콘) 확인.
- **배운/적용한 원칙**: 재생 대상이 동적으로 바뀔 때 expo-audio는 소스 교체 후 `isLoaded`를 기다렸다 seek+play 하는 pending 패턴이 필요. 클립별 URL 캐시로 재요청 절감. 화면 언마운트 시 플레이어가 정리되어 오디오 잔류 없음.
- **스킬/도구**: expo-audio 동적 소스, Supabase update(RLS), /api/media 서명 URL

### 2026-08-04 · 품질 · 정리 — 헬스 게이트 통과 + 프리클론 의존성 복구
- **무엇**: `tsc` / `expo lint` / `expo export --platform ios` 3종 헬스 게이트를 세우고 모두 통과(0 errors). 이 과정에서 선언 안 된 `eslint`/`eslint-config-expo`를 devDep으로 복구, 실험적 react-compiler 규칙 2개는 warning으로 문서화 다운그레이드.
- **배운/적용한 원칙**: "동작하니까 됐다" 금지 — fresh clone 재현성으로 검증. 실험적 린트 규칙은 끄지 말고 warning으로 낮춰 신호는 유지.
- **스킬/도구**: expo lint, expo export, eslint flat config
- **산출물**: [postmortems/2026-08-03-undeclared-deps-fresh-clone](postmortems/2026-08-03-undeclared-deps-fresh-clone.md)

### 2026-08-04 · 빌드 · 복습 SRS 판정 쓰기 (verdict API)
- **무엇**: ReviewFlow에 채점 단계(Again/Good/Easy) 추가 → 웹 공용 라우트 `POST /api/bookmarks/[id]/verdict`로 전송, 서버가 SM-2 적용하고 새 due 반환. "Good" → next review in 5 days 확인.
- **배운/적용한 원칙**: 쓰기 로직은 웹과 한 곳에서 공유(SM-2는 서버에 단일 소스). 모바일은 얇게 호출만.
- **스킬/도구**: apiJson(Bearer), 공용 web API route

### 2026-08-04 · 빌드 · Save-phrase 쓰기 (bookmark insert)
- **무엇**: 리더의 트랜스크립트 라인을 실제 `bookmarks`에 저장. anon+session 클라이언트로 `{ segment_id, memo }`만 insert(웹 플레이어와 동일, user_id는 DB가 채움). 멱등(이미 저장 시 "already").
- **배운/적용한 원칙**: 클라이언트 insert에서 user_id를 넣지 않는다(서비스키 라우트만). RLS + 기본값이 소유자 채움.
- **스킬/도구**: Supabase RN 클라이언트, RLS

### 2026-08-04 · 빌드 · Today 통계 실데이터
- **무엇**: Today의 인사말/날짜, due·ready·collected 타일, "Bring these back", 주간 막대차트를 `bookmarks`에서 계산. 주간 막대는 `created_at` 기반 실제 저장수(플레이스홀더 아님).
- **배운/적용한 원칙**: 없는 데이터(주간 분/스트릭)는 지어내지 않고 있는 신호(저장수)로 대체. StatTile foot는 `numberOfLines={2}`로 폭발 방지.
- **스킬/도구**: Hermes Intl 회피(수동 날짜 포맷)

### 2026-08-04 · 빌드 · Phrases 실데이터 (bookmarks)
- **무엇**: Phrase Bank를 `bookmarks`(segments!inner→videos!inner 조인)로 연결. 목록·검색·필터, 실제 요약 카운트, `created_at` 기반 누적 차트, 상세/복습까지.
- **배운/적용한 원칙**: SRS 상태를 interval/due/verdict에서 파생해 디자인 배지로 매핑. 요약 타일은 2×2 그리드로.
- **스킬/도구**: Supabase 조인 select, react-native-svg 차트
- **산출물**: [postmortems/2026-08-04-stale-fast-refresh-bundle](postmortems/2026-08-04-stale-fast-refresh-bundle.md)

### 2026-08-04 · 빌드+실패 · 오디오 재생 (expo-audio, 네이티브 재빌드)
- **무엇**: 리더에 실제 오디오 재생 연결 — `/api/media/[videoId]`가 서명한 R2 URL을 `expo-audio`로 재생, 진행바·시간·재생 위치 기반 라인 자동 하이라이트·탭 seek. 네이티브 모듈이라 dev-client 재빌드 필요.
- **배운/적용한 원칙**: Expo는 버전마다 API가 바뀐다 — SDK 57 `expo-audio` 문서를 읽고 씀. 네이티브 dep 추가 = 1회 네이티브 재빌드.
- **스킬/도구**: expo-audio(useAudioPlayer/Status), expo run:ios, WebFetch(버전 문서)
- **산출물**: [postmortems/2026-08-04-space-in-path-native-build](postmortems/2026-08-04-space-in-path-native-build.md)

### 2026-08-03 · 빌드 · 리더 트랜스크립트 실데이터 (segments)
- **무엇**: 클립 리더(LibItem)를 실제 `segments`로 연결 — 타임스탬프 + 영어 문장 + 한국어 번역, 총 길이는 마지막 세그먼트에서 계산.
- **배운/적용한 원칙**: 읽기 화면은 mock `SP.*` → `supabase.from(...)`(RLS) 패턴으로 한 화면씩 전환. 아직 mock인 부분은 화면에 정직하게 표시.
- **스킬/도구**: Supabase RLS select

### 2026-08-03 · 빌드 · Library 실데이터 (videos + jobs)
- **무엇**: Library 목록을 실제 클립으로 — ready 클립은 `videos`(RLS), 처리중은 `/api/jobs`. 로딩/에러/빈/당겨서 새로고침.
- **배운/적용한 원칙**: Metro를 **어느 폴더에서** 띄우느냐가 화면을 결정(워크트리=모바일, main=옛 웹 스모크). `Screen`에 `refreshControl` prop 추가.
- **스킬/도구**: Supabase RN 클라이언트, apiJson

### 2026-08-03 · 정리 · git 교통정리 (웹/모바일 분리)
- **무엇**: 모바일 작업을 `feat/mobile-skeleton` 브랜치 + 별도 워크트리로 분리, main(웹)은 무손상, 구 `codex/mobile-app-shell` 삭제, origin 백업. 이후 공백 경로 문제로 워크트리를 공백 없는 경로로 이동.
- **배운/적용한 원칙**: 한 폴더에서 브랜치 왕복 = "파일 사라짐" 혼란의 원인. worktree로 폴더 분리. `.vercelignore /apps`가 웹 prod를 보호.
- **스킬/도구**: git worktree, 브랜치 분리

### 2026-08-02 · 빌드 · 스켈레톤 포팅 (디자인 → React Native)
- **무엇**: Claude Design 프로토타입을 Expo/RN으로 포팅 — oklch→sRGB 변환 디자인 토큰, 아이콘 세트(react-native-svg), 프리미티브, 9개 화면(온보딩·Today·Speak/Talk·Phrases·Topics·Library) + 단일 셸 내비게이션. 시뮬레이터에서 렌더 확인.
- **배운/적용한 원칙**: RN은 oklch/멀티레이어 섀도우/CSS var가 없다 — 런타임 oklch 변환기로 팔레트 정확히 재현, 섀도우는 네이티브+헤어라인으로 근사.
- **스킬/도구**: DesignSync(디자인 읽기), Expo SDK 57, react-native-svg
- **산출물**: [decisions/0001-single-shell-navigation](decisions/0001-single-shell-navigation.md)

### 2026-08-11 · 빌드+검증 · 첫 Story 온보딩 복원
- **무엇**: 현재 Saylo 스플래시 뒤에 Welcome → Story → messy notes → editable beats → phrase → camera/mic Talk → Keep Story → sign-in/Home 흐름을 연결. 로그인 전 초안은 AsyncStorage에 보존하고 로그인 후 Story/Message/Beats/Phrase/Talk로 체크포인트 import.
- **검증**: TypeScript, 변경 파일 ESLint, release config, clean iOS Expo export, diff check 통과. 실제 카메라/STT/인증 import는 물리 iPhone 검증 대기.
- **산출물**: [quality/2026-08-11-first-story-onboarding](quality/2026-08-11-first-story-onboarding.md)

### 2026-08-11 · 배포 · 첫 Story 온보딩 TestFlight 빌드
- **무엇**: 커밋 `cc40d4e`로 iOS production build `1.0.0 (7)` 생성. EAS build `184e5027-f0e7-4888-ab37-05f84f45f89b` 완료.
- **검증**: IPA의 bundle ID, 표시 이름, 버전/빌드, 비면제 암호화 설정과 코드 서명을 확인. EAS Submit으로 App Store Connect 업로드 성공; Apple 처리 대기.
- **산출물**: [.agents/deploys/2026-08-11-first-story-onboarding-build](../../../.agents/deploys/2026-08-11-first-story-onboarding-build.md)

### 2026-08-12 · 수정+검증 · 온보딩 회원가입·재진입 복구
- **무엇**: 로그인 전용 막다른 화면에 계정 생성과 `Start onboarding again`을 추가. 이메일 확인 대기 중에도 첫 Story 초안을 보존하고, 로컬 reset 이벤트가 root gate에 즉시 반영되도록 연결.
- **검증**: release config, TypeScript, 변경 파일 ESLint, 전체 source lint baseline, clean iOS Expo export 통과. 실기기 signup/이메일 확인은 다음 TestFlight smoke 대상.
- **산출물**: [postmortems/2026-08-12-onboarding-auth-dead-end](postmortems/2026-08-12-onboarding-auth-dead-end.md) · [quality/2026-08-12-onboarding-signup-reentry](quality/2026-08-12-onboarding-signup-reentry.md)

### 2026-08-12 · 배포 · 온보딩 signup·재진입 TestFlight 빌드
- **무엇**: 커밋 `bc720cb`로 iOS production build `1.0.0 (8)` 생성 후 App Store Connect 업로드 성공. Apple 처리 대기.
- **검증**: IPA bundle ID, 표시 이름, 버전/빌드, 비면제 암호화 설정, 코드 서명 확인.
- **산출물**: [.agents/deploys/2026-08-12-onboarding-signup-reentry-build](../../../.agents/deploys/2026-08-12-onboarding-signup-reentry-build.md)

### 2026-08-14 · 수정+검증 · Keep Story 바텀시트·Google 마크
- **무엇**: 온보딩 마지막 인증 영역을 화면 하단에 붙는 바텀시트로 전환하고, Google 로그인 버튼을 공식 색상의 다색 G 마크로 교체. Apple provider 비활성 상태에서는 Google·이메일 선택지만 유지.
- **검증**: release config, TypeScript, ESLint(기존 warning 15개·error 0), iOS Expo export, diff check 통과. 웹 smoke는 기존 AsyncStorage/Supabase SSR의 `window is not defined`로 실행 전 차단.
- **산출물**: [quality/2026-08-14-keep-bottom-sheet-google-mark](quality/2026-08-14-keep-bottom-sheet-google-mark.md)

### 2026-08-14 · 장애수정 · Google OAuth 모바일 복귀
- **무엇**: Supabase Auth Redirect URLs에 빠져 있던 `shadowingplus://auth/callback`을 추가. 기존 localhost·Vercel URL은 보존.
- **검증**: URL Configuration에서 허용 URL이 2개에서 3개로 증가하고 정확한 모바일 콜백이 저장된 것을 확인. 앱의 Expo scheme과 OAuth `redirectTo`는 이미 같은 주소를 생성하므로 새 바이너리는 불필요.
- **산출물**: [postmortems/2026-08-14-google-oauth-web-fallback](postmortems/2026-08-14-google-oauth-web-fallback.md) · [quality/2026-08-14-google-oauth-mobile-redirect](quality/2026-08-14-google-oauth-mobile-redirect.md)

### 2026-08-24 · 구현+검증 · 네이티브 iOS 탭바 전환 + Today/Studio 목업 반영
- **무엇**: 커스텀 BlurView 탭바를 expo-router `NativeTabs`(unstable-native-tabs)로 교체 — Today/Phrases/Studio 3탭 + Talk을 `role="search"` 분리형 서클(mic.fill)로. AppShell을 `ShellProvider`(전역 detail stack/talkCtx/toast) + 탭별 `TabHost` 라우트 구조로 재작성, 디테일 푸시·Talk 진입 시 `hidden`으로 탭바 숨김. Talk 화면은 탭 포커스 중에만 마운트(백그라운드 마이크 방지). Phrases 탭에 + FAB(iOS 리스트 메뉴) 노출. Today: 주간 증감 서브라인(극단값은 N×)·중앙 큰 "N / M" 복습 카드. Studio 탭: Speaking folio 타이틀, Speaking insight 배너, Topics>/Recently recorded> 헤더, 가로 스크롤 토픽 카드. Card/Block/Pill/Hero/FAB에 스프링 press-scale, FAB에 코발트 그라디언트.
- **원리**: 네이티브 탭바는 RN 오버레이로 덮을 수 없으므로 "디테일이 열리면 바를 숨긴다"는 기존 UX 규칙을 `NativeTabs hidden`으로 이식. safe-area inset이 네이티브 바 높이를 포함해 FAB/스크롤 여백이 자동 보정됨(Screen bottomPad 120→32).
- **검증**: `tsc --noEmit` 통과, ESLint 기존 베이스라인(사전 존재 17 error) 유지, `expo export --platform ios` 성공. iOS 26.5 시뮬레이터(dev client, 재빌드 불필요)에서 4개 탭 스크린샷으로 리퀴드 글래스 바·분리형 mic 서클·탭바 숨김/복귀·Studio 목업 일치 확인. 실기기 Talk 녹음·디테일 푸시 제스처는 다음 smoke 대상.
- **후속 11(같은 날)**: 온보딩 아트 미세 조정 — pain 칩을 B2+ 표현("in hindsight", "play it by ear")으로, method의 "→ active" 칩에서 화살표 제거 + 앰버(#F6C445/#5C4300) 액센트(iOS 팔레트가 코발트 모노라 노랑 계열은 명시 지정), collect 칩은 실표현 대신 "Phrase saved"로.
- **후속 10(같은 날) · 온보딩 아트 다양화 + sign-in 리틴트**: ①이메일 sign-in 화면이 옛 웜(Cobalt 크림) 팔레트라 현행 iOS 그레이/코발트와 충돌 → useCobalt를 buildTheme 매핑으로 교체, 워드마크 Newsreader, 구 첫-스토리 카피 제거. ②슬라이드 아트를 단일 모티프에서 **6종 고유 구성**으로 재작성(공용 키트 ArtChip/ArtOrb/ArtTile) — pain: 표현 칩 산포("figure out" 등, 일부 페이드), method: passive 책 타일→점 경로→active 마이크 오브, collect: 스냅샷 타일 스택+카메라+포획 칩, speak: 미러 디스크+라이브 웨이브+자막 칩, review: 벨+9:00+알림 카드 스택, save: 스토리 타일+체크+Any device 칩. ③Get started 후 항상 슬라이드 1부터 시작(기존 awaiting_sign_in draft가 로그인 슬라이드로 점프하던 문제) — 이메일 왕복만 모듈 플래그로 마지막 슬라이드 재개. 6종 아트 시뮬레이터 프리뷰 확인.
- **후속 9(같은 날) · 온보딩 전면 개편**: 첫-스토리 녹음 온보딩(story/notes/beats/phrase/talk/keep)을 **6장 슬라이드 온보딩**으로 교체 — ①페인포인트("You know English. / The words are in your head. They hide when you speak.") ②방법(passive→active: "Collect phrases you meet. Say them about your life.") ③카메라 권한(Collect) ④마이크 권한(Speak, 미러) ⑤알림 권한(Review) ⑥로그인(Apple/Google/이메일). 권한은 각 기능 설명과 함께 요청하고 "Not now"로 스킵 가능(거절해도 진행). 슬라이드 공통 레이아웃: 모티프(코발트 디스크+궤도+아이콘 오브+위성) + eyebrow + serif 타이틀 + 문장 단위 바디 + 점 진행 + 풀폭 CTA, 슬라이드마다 FadeIn 캐스케이드. SplashIntro(로고 draw-on 스프린트)에 "Already have an account? Log in" 링크 추가. draft 상태머신은 status만 사용(step 안 바꿔 기존 import 경로 자연 우회, awaiting_sign_in 복귀 시 마지막 슬라이드 재개, 소셜 로그인 도착 시 자동 완료). 시뮬레이터 프리뷰로 슬라이드 1·로그인 슬라이드 확인, tsc·export 통과. 실기기 E2E(권한 다이얼로그·소셜 로그인) 미검증.
- **후속 8(같은 날)**: Story의 Useful phrases 행에 Phrases 탭과 동일한 아이콘 액션(스피커=AI 보이스, 마이크=Quick Rehearsal) 추가 — RowIconButton export 재사용, 리허설은 id/text/translation만 읽으므로 슬림 행 데이터로 충분. Topics 스트립~Recently recorded 사이에 남아 있던 경계선은 그림자 도달거리(28pt)가 클리핑 여유(16pt)보다 커서였음 → shadowCard를 y6/r12/0.09로 타이트하게 조정(도달 ≈18pt)하고 스트립·칩 여유 20pt로 정리(터치 오버랩 최소화). 시뮬레이터로 두 화면 모두 경계선 소멸 확인.
- **후속 7(같은 날) · 사각 그림자 박스 버그 수정 + Phrases 리스트 UX**: 리스트 카드 주변에 "회색 사각 박스" 경계가 보이던 원인 진단 — gesture-handler Swipeable의 컨테이너가 `overflow:hidden`(사각)이라 카드 그림자가 네모로 잘려 코너에 어두운 사각 테두리처럼 남던 것(Swipeable 없는 Story 카드만 정상이라 특정). 수정: SwipeRow에서 그림자를 클립 밖의 둥근 래퍼로 이동 + Swipeable containerStyle에 borderRadius(액션도 둥글게 클리핑). 가로 ScrollView(토픽 스트립·필터 칩)도 마진/패딩 트릭으로 그림자 클리핑 해소. 추가: Phrases 검색을 인라인 확장(칩을 밀어내는 FadeIn 전환, X로 리마운트 없이 복귀)으로 교체, 리스트 행 간격 15pt, 10개 우선 렌더 + 스크롤 하단 근접 시 10개씩 추가(Screen에 onScroll 지원 추가). Story 빈 상태는 Versions와 같은 점선 박스로 통일.
- **후속 6(같은 날) · Story 화면 정리 + 카피 스윕**: StoryScreen에서 설명 입력 박스의 테두리/그림자 제거(soft 배경만), Useful phrases·Sessions를 회색 통합 컨테이너에서 꺼내 Versions처럼 "Sect 제목 + 박스" 구조로 분리(빈 상태는 흰 카드). 앱 전반의 "— 뒤에 설명" 카피 패턴 일괄 제거/문장 분리 — Versions·Sessions 플레이스홀더, Today, Talk 피드백, Library, 온보딩, story-prompts, first-language 플레이스홀더(4개 언어), 스테이지 알림(: 로 변경) 등 20여 곳. 빈 값 "—" 표시·에러 상세 조인은 유지.
- **후속 5(같은 날) · PhraseDetail 다듬기**: In context를 재구성 — 클립 출처면 틴트 박스 대신 **Library 행 컴포넌트가 그 자리를 대체**(LibraryClipRow, library.tsx에 export해 베타 기능과 함께 한 번에 제거 가능), Hear in context 버튼 삭제하고 행 탭 → 클립으로 이동해 바로 듣기. 인용문 있는 경우만 틴트 박스 유지. HOW IT'S USED/YOUR NOTE 카드를 In context와 같은 accS 틴트로 통일. Make it usable 스텝퍼의 세로선이 번호 원을 침범하던 문제 수정(선을 원 아래·위 4pt 갭으로 분리 + 원에 불투명 배경). Practice 허브 Quick Practice 버튼을 회색→코발트 틴트로.
- **후속 4(같은 날) · Phrase 연습 플로우 개편**: ①복습(ReviewFlow)을 5단계 SRS 화면에서 **플래시카드 pageSheet 바텀시트**로 교체 — 앞면(표현+Hint 칩) → 힌트(usage note) → 탭하면 정답(코발트 카드+뜻+AI 보이스 스피커) → Practice/Next(마지막은 Done). X는 항상 "지금까지 한 건 저장됨" 확인 후 종료. 카드당 SRS verdict는 자동(힌트 사용 시 again, 아니면 good), shouldPromptStage 승격 프롬프트 유지. ②PhraseDetail: HOW IT'S USED+YOUR NOTE를 한 장의 틴트 카드로 통합, Practice 버튼 → **Practice 허브**(새 practice.tsx: 표현 카드+Quick Practice+Related stories(phrase_story_links)+Add story 바텀시트(Recents/All 검색)). ③**Quick Rehearsal**: 타깃 표현 카드+미러 서클+코치 문구 로테이션, useSpeechSession으로 녹음→표현이 실제로 나왔는지 감지(recordPhraseEvent used/retrieved). 리뷰 시트 안에서는 embedded(onDone)로 동작. lib에 fetchPhraseStories 추가. 시뮬레이터로 리뷰 시트·허브 렌더 확인, tsc·export 통과, ESLint 에러 17→11(구 ReviewFlow ref 경고 제거).
- **후속 3(같은 날)**: 히어로를 좌측 정렬 26pt + 전폭 버튼으로 확정(중앙 정렬은 한 단어 줄바꿈이 어색해 회귀). 홈 CTA 스토리를 "최근 말한 스토리들 중 일 단위 로테이션"으로 변경. Today 헤더에서 회색 라벨 제거하고 날짜로 대체. Phrases 라인 차트를 스쿼시 → 좌→우 경로 드로우(정확한 폴리라인 길이 기반 dash-offset)로 교체, 면은 페이드 유지. Phrase 리스트를 한 줄 행(영어 표현 + 아이콘 액션 2개)으로 간소화 — 뜻/출처/상태칩은 상세로 이동.
- **후속 2(같은 날)**: 히어로 타이틀 26→33pt 확대, 문구를 일 단위 결정적 로테이션 3종(`Your “{t}” story is waiting` / `Make “{t}” smoother today` / `One more take of “{t}”?`)으로 교체. `Stagger`(Children 자동 인덱싱, 딜레이 8캡) 추가 후 Today·Phrases(포커스 리플레이)·Topics 목록·Domain·Story·Sessions·Session 상세·Recs·Profile에 캐스케이드 적용. Talk/Review/캡처 폼은 의도적으로 제외. 히어로 스토리 선택 규칙 확인: 랜덤 아님 — 최근 40개 talk 세션 중 스토리 연결된 최신 세션의 스토리(fetchRecentTalkedStory).
- **후속(같은 날)**: ①Today 히어로 버튼 중앙정렬 + 문구를 `Tell “{title}” again`으로 교체. ②StoryScreen Useful phrases/Sessions 컨테이너 깨짐 수정(gap 부재로 타이틀·카드 밀착, 마지막 카드 클리핑 → gap:10 + padding 정리; 임시 자동-푸시로 시뮬레이터 재현·확인 후 제거). ③FolioDonut을 reanimated `useAnimatedProps`(per-slice strokeDasharray)로 12시부터 시계방향 채움 애니메이션화, 탭 포커스마다 리플레이. ④`EnterStagger`(FadeInDown spring cascade)를 My Studio 탭과 Your speaking world에 상→하 순차 적용. ⑤딥링크로 탭 전환 시 전역 디테일 스택이 새 탭 위에 남는 엣지 케이스 발견 → 탭 포커스 변경 시 스택 초기화 가드(`onTabFocused`) 추가.

### 2026-08-24 · 기능 · 프로필 Coming soon 4종 실기능화
- **무엇**: ①English level — CEFR 4단계(A2~C1) 로컬 설정(lib/english-level.ts) + 라디오 화면, `talk-diagnose` 호출에 `level` 전달하고 엣지 함수 프롬프트에 levelGuide(레벨별 제안 난이도) 추가(구버전 앱은 level 생략 → b1 폴백). ②Theme — System/Light/Dark(lib/theme-pref.ts). `Appearance.setColorScheme`(RN 0.86, "unspecified"로 해제)이 윈도우 전체를 덮어 ThemeProvider·네이티브 탭바·상태바가 훅 배선 없이 함께 전환. ③Export my phrases — fetchPhrases → iOS 공유시트(텍스트, 표현+뜻). ④Help & feedback — mailto 링크. 두 설정 모두 루트 prefs 로드에 등록. 부수: Talk 힌트 시트의 Story beats 하단 "Today's phrases" 버튼 제거(상단 탭과 중복).
- **원리**: 다크 강제는 RN 레벨 오버라이드 하나로 끝난다 — `useColorScheme`을 쓰는 모든 소비자(ThemeProvider, sign-in 팔레트, StatusBar)가 자동 추종하므로 별도 컨텍스트/구독을 만들지 않음.
- **검증**: `tsc --noEmit` 통과(첫 시도에서 `setColorScheme` 타입이 null 아닌 "unspecified"임을 d.ts로 확인), ESLint 베이스라인 유지(11 error/25 warn). 시뮬레이터에서 임시 auto-push로 Profile 행(B1 · Intermediate/System), English level 화면, Theme 화면 + 다크 전면 전환 스크린샷 확인 후 TEMP 코드·다크 pref 원복(grep TEMP 0건). 엣지 함수는 배포 필요(`talk-diagnose`) — 배포 전에도 앱은 정상 동작.

### 2026-08-24 · 기능+품질게이트 · Privacy 화면 + 제출 전 전체 감사
- **무엇**: ①프로필 Privacy 행 실기능화 — 실제 데이터 관행(녹음 기기 보관·전사만 AI 전송·PostHog 사용·삭제 경로) 반영한 인앱 개인정보 화면(src/screens/privacy.tsx), 문의 mailto 포함. ②4개 병렬 에이전트로 제출 전 감사(보안/에러 처리/App Store 규정/구현 갭).
- **결과**: BLOCKER 1(인앱 계정 삭제 부재, 5.1.1(v)) · HIGH 4(Apple provider 프로덕션 확인, Talk 권한 거부 복구 불가, 권한 문구-아바타 업로드 불일치, 정책 URL 부재) · MEDIUM 7 · LOW 6. 보안은 클린(비밀키 없음, edge functions 전부 JWT 검증, RLS FORCE, 딥링크 안전).
- **검증**: `tsc --noEmit` 통과, lint 베이스라인 유지, Privacy 화면 시뮬레이터 렌더 확인, TEMP 검증 코드 전량 제거(grep 0건). 테스트 중 theme pref가 dark로 남는 사고 → Privacy 화면 임시 훅으로 system 복원 확인.
- **산출물**: [quality/2026-08-24-appstore-preflight-audit.md](quality/2026-08-24-appstore-preflight-audit.md)

### 2026-08-24 · 기능 · 인앱 계정 삭제 (제출 블로커 해소)
- **무엇**: ①Edge Function `delete-account` — JWT 검증 → avatars 버킷·R2 phrase-tts 캐시(전 프롬프트 버전 프리픽스 탐색) best-effort 정리 → service role `auth.admin.deleteUser()`. 전 유저 테이블이 ON DELETE CASCADE라 단일 삭제로 DB 전체 정리, blob 정리 실패는 로그만 남기고 삭제는 진행. ②클라이언트 `lib/account.ts` — 함수 호출 성공 후 로컬 정리(speak/ 녹음 폴더, 예약 알림 해제, 온보딩 draft 리셋, `signOut({scope:"local"})`; 서버 세션은 이미 무효). ③Settings Account 그룹에 Delete account(danger) 행 + destructive 확인 Alert + PostHog capture/reset. ④Privacy 화면의 "이메일로 삭제 요청" 문구를 "Profile → Delete account"로 교체(Apple이 이메일 방식 불인정).
- **검증**: `tsc --noEmit` 통과, lint 베이스라인 유지, edge function TS 문법 체크 통과(Deno 미설치라 deno check는 생략). **E2E는 함수 배포 후 버리는 계정으로 필요**: `supabase functions deploy delete-account` (+ 앞서 level 반영된 `talk-diagnose`도 재배포 대상).

### 2026-08-24 · 포스트모템 · 계정 삭제 "Check your connection" — delete-account 함수 미배포
- **증상**: 기기에서 계정 삭제 시 "We couldn't delete your account. Check your connection and try again." 네트워크는 정상.
- **원인**: `delete-account` Edge Function이 작업 트리에만 존재, 미배포(404 NOT_FOUND). 클라이언트 폴백이 Supabase 404 body(`code`/`message` 스키마)를 파싱 못 해 "connection" 문구로 위장. `talk-diagnose` level 프롬프트도 로컬에만 있었음(같이 재배포).
- **수정**: 두 함수 배포 → 무인증 프로브 404→401 확인. 08-25 기기 E2E 통과(삭제·사인아웃 정상). 08-21 커밋 이후 전체 작업 트리와 함께 커밋 완료(08-25).
- **산출물**: [postmortems/2026-08-24-delete-account-404.md](postmortems/2026-08-24-delete-account-404.md)

### 2026-08-25 · 백필 · 비밀번호 재설정 플로우 (auth.tsx + reset-password)
- **무엇**: 이메일 비밀번호 재설정 — `resetPassword()`가 재설정 링크 발송(딥링크 콜백), `auth/callback?type=recovery` URL을 `Linking.getInitialURL`(콜드 스타트) + `url` 이벤트(웜 포그라운드) 양쪽에서 처리해 세션 생성 후 `passwordRecovery` 모드 진입, `updatePassword()`/`cancelPasswordRecovery()`로 마무리. 부수: `maybeCompleteAuthSession()`에 SSR 가드(web+window undefined 스킵 — 08-24 SSR 포스트모템과 같은 뿌리).
- **원리**: OAuth는 `openAuthSessionAsync`가 콜백 URL을 스스로 소비하지만 **이메일 링크는 리스너로 들어오므로** 두 경로를 분리해야 함. 만료/재사용 링크는 조용히 무시(로그인 화면 유지).
- **검증**: `tsc --noEmit` 통과, 0b7c936으로 커밋. 기기 링크 E2E는 별도 기록 없음 — 제출 전 데모 계정과 함께 한 번 확인 권장.

### 2026-08-25 · 수정 · 제출 전 감사 후속 3건 (마이크 거부 복구 · 권한 문구 · 샘플 문구)
- **무엇**: ①Talk 마이크/음성인식 권한 거부 시 — 라이브 상태 필을 "Mic is off · nothing is being recorded · tap to fix" 행동형 필로 교체, Finish는 가짜 "session complete"(빈 전사 세션 저장) 대신 복구 Alert(Not now / Try again / Open Settings)로 차단. ②app.json 카메라·사진 권한 문구에 프로필 사진 업로드(avatars 버킷, 026) 반영 — 기존 "learning photos are not stored"가 아바타 업로드와 모순. ③SAMPLE_PHRASE의 한국어 뜻 제거(N:1 위반) — 렌더 전부 null 가드라 `translation: null`로; 도달 불가능한 타입 채움 폴백이라 L1 맵 대신 정직한 null.
- **원리**: 권한 거부는 조용한 실패가 아니라 **상태**다 — iOS는 거부 후 재프롬프트하지 않으므로 복구 경로(Settings 링크 + 재시도)를 UI가 제공해야 한다. 권한 문구는 실제 데이터 흐름과 문장 단위로 일치해야 심사를 통과한다.
- **검증**: `tsc --noEmit` 통과. 마이크 거부 경로는 실기기 확인 필요(iOS 설정에서 Saylo 마이크 차단 → Talk 진입) — 시뮬레이터는 권한이 항상 허용이라 재현 불가. 감사 문서의 HIGH 3번·4번, MEDIUM(샘플 문구) 종결.

<!-- 새 항목은 이 위에 추가 (최신이 위로). -->
