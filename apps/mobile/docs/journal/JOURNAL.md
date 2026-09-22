# Journal — 누적 학습 로그

빌드 여정의 시간순 인덱스. 최신 항목이 위로 온다. 각 항목은 짧게: 무엇을 했고, 무슨 원칙을 배우거나 적용했고, 어떤 스킬/도구를 썼고, 실패·결정·품질 산출물이 있으면 링크.

> 채우는 사람: 학습 동반자 (자동). 규칙은 `CLAUDE.md`의 Auto-Journal 섹션. 진행 상태의 정본은 프로젝트의 status 문서(MEMORY.md / 체크리스트)다.

---

## 항목

### 2026-09-14 · 리팩터 · Studio 정본 언어와 단일 IA
- **무엇**: 활성 제품 언어를 Topic → Situation → Speaking Note → Attempt로 통일. 구형 World/Island 화면과 7개 라우트를 제거하고, DB 물리명은 `studio-persistence.ts`에 격리. 발견 가능한 과거 문서에는 Current/Historical/Outdated 상태를 추가.
- **검증**: mobile typecheck PASS, lint baseline PASS(기존 경고 1), iOS export PASS(2,121 modules), 구형 화면/라우트/import 검색 0건, 문서 링크 14개 파일 PASS.
- **산출물**: [quality/2026-09-14-canonical-studio-language-cleanup.md](quality/2026-09-14-canonical-studio-language-cleanup.md)

### 2026-09-14 · 문서 · IA·기능·데이터·시스템 기준선
- **무엇**: 실제 모바일 라우트, 데이터 접근 계층, 전체 Supabase 마이그레이션, 웹·확장·워커 경계를 읽고 현재 상태 문서 6개를 작성. UI의 Topic/Situation/Speaking Note와 DB의 domain/story/message 명칭을 정식 매핑.
- **원칙**: 현재 구현과 계획을 분리하고, 기능마다 단일 주 화면·소유 데이터·복귀 경로를 명시한다.
- **검증**: 문서 6개 존재/비어 있지 않음, 내부 문서 링크 5개 대상 존재, 문서 외 추적 파일 변경 없음.
- **산출물**: [문서 인덱스](../../../../docs/DOCUMENTATION.md), [품질 스냅샷](quality/2026-09-14-architecture-documentation-baseline.md)

### 2026-08-25 · 검증 · TestFlight submit build 19
- **무엇**: EAS build `5aea4b81` (1.0.0 / 19)를 App Store Connect에 업로드. 큐 ~42분 후 Apple에 전달됨.
- **검증**: `npx eas-cli submit --platform ios --profile production --id 5aea4b81-9140-445b-a947-942996bb6f12 --non-interactive --wait` exit 0.
- **산출물**: [EAS submission 8cc02bf0](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/submissions/8cc02bf0-c3e8-4e45-8994-7cf3aba5cac8) · [TestFlight iOS](https://appstoreconnect.apple.com/apps/6799375053/testflight/ios)

### 2026-08-25 · 검증 · iOS production EAS build 19
- **무엇**: App Store 제출 전 픽스(마이크 거부 복구, permission 카피, sample phrase)를 production 프로파일로 빌드. `buildNumber` 18 → 19. 원격 iOS credentials 사용.
- **원칙**: 제출 전 바이너리는 EAS가 끝난 뒤에만 “준비됨”으로 취급.
- **검증**: `npx eas-cli build --platform ios --profile production --non-interactive --wait` exit 0 (~12 min).
- **산출물**: [EAS build 5aea4b81](https://expo.dev/accounts/suminkiim/projects/shadowing-plus-mobile/builds/5aea4b81-9140-445b-a947-942996bb6f12)

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

### 2026-08-25 · 수정 · 모바일 9개 회귀 방지 수선 완료 (mobile-nine-regression-repairs 전 이행)
- **무엇**: #4 Review 카드 양방향 전환 · #9 FAB 고체 disc · #1/#3 공유 오디오 코디네이터(`lib/audio-session.ts`)+`keepAudioSessionActive`+명시적 `iosCategory` · #2 공유 `MirrorPreview`+Quick take 재생 · #5 `speakingDataRevision`+request token Studio 갱신 · #7 섹션 간격 균일화+`TalkFeedbackDetail`+`feedback`/`phrase` 라우트+`fetchPhraseById` · #7c 마이그레이션 027(구조화 feedback 필드)+Edge `talk_session_id`+정확한 세션 ID 대기 · #8 계정 범위 `Daily speaking goal`+`Last 7 days` 링. 순서대로 원자 수정 후 정적 게이트 반복.
- **원리**: AVAudioSession은 프로세스 전역 → 코디네이터가 핸드오프를 소유(플레이어 정지→명시적 카테고리→setActive). 데이터는 실패가 아니라 상태로 판별(에러 코드+전사 0건, request token, 성공 후에만 revision emit). 추천은 `feedbackId`/`phraseItemId` 분별 union으로 라우팅(텍스트 매핑 금지). 목표는 Auth metadata(계정 간 누출 없는 `daily_speaking_goal_minutes`).
- **검증**: `tsc --noEmit` PASS · `verify:release-config` PASS · `expo export --platform ios` PASS · `git diff --check` OK · lint 베이스라인 유지(11 error/25 warn, 신규 0). Simulator는 이 환경에서 미실행(pending), 오디오/카메라/마이그레이션은 device/NEEDS-HUMAN 대기.
- **산출물**: [quality/2026-08-25-mobile-nine-regressions.md](quality/2026-08-25-mobile-nine-regressions.md) · [postmortems/2026-08-25-mobile-audio-session-handoff.md](postmortems/2026-08-25-mobile-audio-session-handoff.md) · `supabase/migrations/027_talk_feedback_detail_contract.sql`

### 2026-08-25 · 수정 · 9개 회귀 방지 수선 #1·#2·#9 + 오디오 세션 통합 (mobile-nine-regression-repairs)
- **무엇**: ①Review 카드 양방향 전환(answer↔front, 답 숨김 시 speech.stop, hint sticky 유지) ②CaptureFab 고체 disc(t.colors.acc)로 — gradient/반투명 border/overflow clip 제거해 halo·좌우 클립 해소 ③공유 오디오 코디네이터 `lib/audio-session.ts` 신설 — `prepareRecognitionSession`(앱 내 플레이어 정지 + doNotMix + 명시적 nonmixing `iosCategory` + setActive), `prepareSpeakerPlayback`(playAndRecord·defaultToSpeaker·allowBluetooth·measurement→default), `registerPlaybackStopper`/`stopRegisteredPlayback`. ④phrase/segment/Library/Session 플레이어 전부 `keepAudioSessionActive:true` + 재생 직전 await로 이전. ⑤STT 에러 코드 보존 + zero-transcript startup interruption만 tap-to-retry 노출. `talk-audio-session.ts` 삭제(참조 0).
- **원리**: AVAudioSession은 프로세스 전역 — 플레이어의 지연된 pause/finish deactivation이 방금 시작된 STT를 중단시키는 레이스를, `keepAudioSessionActive` + 명시적 핸드오프로 코디네이터가 소유한다. 실패는 타이밍 슬립이 아니라 상태(에러 코드 + 전사 0건)로 판별.
- **검증**: `tsc --noEmit` 통과, `lint:baseline` 기존 11 error/25 warn 유지(신규 0), `expo export --platform ios` 성공. 실기기 오디오(외부 음악→Talk, speaker/receiver, Bluetooth, Siri/call 복구)는 deferred batch 대기.

### 2026-08-28 · 구조 · 모바일 디자인 토큰 통합 (mobile-tokens.ts)
- **무엇**: 실제 렌더링 토큰을 단일 `src/design/mobile-tokens.ts`(iOS 팔레트 + motif geometry + TypeScale + shadow + SERIF)로 통합. `theme.tsx`는 이 모듈에서 Theme 조립(buildTheme public API 유지), `constants/cobalt.ts`는 `Motif`/`TypeScale` re-export shim + 미사용 웹 Cobalt Editorial 포트를 legacy로 명시, `ui.tsx`의 하드코딩(9999/34/50/44/34)을 토큰으로 치환(1:1). `Cobalt`/`useCobalt`/`warm` palette는 런타임 미사용으로 legacy 표시(삭제 안 함). CLAUDE.md·ios-motif-spec의 "모바일도 tokens.json 단일 소스" 오개념을 현재 구조(모바일 = iOS 팔레트)로 수정.
- **원리**: 웹(tokens.json, warm editorial)과 모바일(iOS system palette)은 별도 기준 — 값을 강제하지 않고 각 소스를 문서화. 토큰은 한 곳에만 정의(재사용은 re-export).
- **검증**: `tsc --noEmit` PASS · `lint:baseline` 11 error/25 warning 그대로(신규 0) · `expo export --platform ios` PASS · `git diff --check` OK. 추가로 git HEAD 대비 **ALL color slots(ios+warm × light+dark) 바이트 동일**, Motif·TypeScale·geometry·shadow 동일값임을 평가 비교로 증명 — 시각 회귀 없음.

### 2026-09-01 · 수정+검증+배포 · 외부 TestFlight 후보 build 21
- **무엇**: build 19 이후 최신 worktree 변경의 React Compiler 린트 오류 11개를 수선하고 경고를 허용 기준 15개로 복구. EAS CLI 23.2.0으로 iOS production `1.0.0 (21)`을 빌드하고 App Store Connect에 제출.
- **검증**: release config, TypeScript, ESLint(error 0/warning 15), iOS Expo export, EAS Build/Submit 통과. Apple 처리 결과 `VALID`; TestFlight 외부 상태 `READY_FOR_BETA_SUBMISSION`.
- **후속**: `expo install --check` 기준 SDK 57 권장 패치 업데이트 24개는 네이티브 변경·추가 EAS 빌드가 필요해 이번 후보와 분리.
- **산출물**: [quality/2026-09-01-external-testflight-candidate](quality/2026-09-01-external-testflight-candidate.md)

### 2026-09-01 · 수정 · Studio 탐색과 최근 목록 정리
- **무엇**: 기존 `Card`/`Pill`/`Serif`/`Icon`과 테마 토큰만 사용해 Speaking folio 전체를 insight 진입점으로 통합하고 기존 별도 insight 배너를 제거. Topics 아래 Recent Stories 목록과 Stories/Sessions 빈 상태를 추가. Topic 상세의 Draft 칩을 제거하고 목록 아래에 기존 full accent Pill 스타일의 `Add new`를 배치.
- **검증**: `tsc --noEmit` PASS · ESLint error 0/warning 15(기존 기준 유지) · iOS Expo export PASS(2,107 modules, Hermes 5.9 MB) · Simulator 개발 번들 실행. Simulator가 로그아웃 상태라 인증 후 Studio 화면의 수동 시각 확인은 남음.
- **산출물**: [quality/2026-09-01-studio-navigation-lists.md](quality/2026-09-01-studio-navigation-lists.md)

### 2026-09-07 · 구현+검증 · Studio 정보 구조 개편
- **무엇**: Studio를 Topic → Situation → Speaking Note → Practice Attempt 구조로 재편하고 Quick Note, 노트 정리, Phrase 연결, 연습 후 Phrase 사용 확인을 추가. 물리 테이블은 호환성을 위해 유지하고 migration 028에서 새 계약·RLS·백필을 정의.
- **보존**: 기존 Expo Router `NativeTabs` 파일 변경 0건. Studio 홈의 Liquid Glass 하단 바와 상세 화면의 숨김/복귀 동작을 그대로 유지.
- **검증**: TypeScript PASS · ESLint error 0/warning 15(기존 기준) · release config PASS · iOS export PASS(2,111 modules) · iOS 26.5 Simulator 렌더 PASS · scoped diff check PASS. 원격 migration ledger가 local 001–028과 불일치(remote 020만 기록)하여 DB 적용은 안전상 보류.
- **산출물**: [quality/2026-09-07-studio-information-architecture.md](quality/2026-09-07-studio-information-architecture.md)

### 2026-09-07 · 디자인+검증 · Studio 홈 목업 레이아웃 적용
- **무엇**: 승인된 이미지 목업의 간격, 목록 리듬, 아이콘 배치, 카드 내 CTA 크기를 Studio 탭 홈에 적용. 홈 전용 컴포넌트로 범위를 제한하고 기존 데이터·동작을 유지.
- **보존**: 모바일 폰트·색상·26pt 카드 radius·캡슐 버튼과 Expo Router 네이티브 하단바 파일은 변경하지 않음.
- **검증**: TypeScript PASS · ESLint error 0/warning 15(기존 기준) · release config PASS · iOS export PASS(2,111 modules) · diff check PASS.
- **산출물**: [quality/2026-09-07-studio-home-mockup-layout.md](quality/2026-09-07-studio-home-mockup-layout.md)

### 2026-09-07 · 수정+검증 · Studio 고정 Quick note FAB와 Quick Capture 시트
- **무엇**: Studio의 Quick note를 스크롤 콘텐츠에서 분리해 Today FAB와 같은 고정 위치/offset으로 이동. Quick Capture를 전체 화면 오버레이 기반 바텀시트로 재구성하고 승인된 블루 목업의 입력·Situation·Linked Phrases·CTA 구조를 적용.
- **보존**: NativeTabs 하단바와 Quick Note 저장 계약은 유지. 숨겨진 goal 값은 입력한 발화 내용의 첫 문장으로 생성.
- **검증**: TypeScript PASS · ESLint error 0/warning 15(기존 기준) · release config PASS · iOS export PASS(2,111 modules) · diff check PASS.
- **산출물**: [quality/2026-09-07-studio-quick-capture-sheet.md](quality/2026-09-07-studio-quick-capture-sheet.md)

### 2026-09-08 · 수정+검증 · Studio 끊긴 라우트 복구
- **무엇**: Studio 홈 하단에 `Browse` 블록(Topics / All attempts / Speaking stats)을 추가하고, `Your situations` 헤더에 상시 `All` 액션을 붙임. `TopicsListScreen`의 목적지를 legacy `domain`에서 새 `studioTopic`으로 변경.
- **원인**: 탭 라우팅이 `StudioHomeScreen`으로 바뀌며 `SpeakingWorldScreen`이 shell에서 import조차 되지 않는 고아가 됐고, 그 화면이 유일한 진입점이던 `studio` / `sessionsList` / `studioTopic`이 진입점 0이 됨. 코드 삭제가 아니라 경로 소실.
- **검증**: TypeScript PASS · ESLint error 0/warning 15(기존 기준) · iOS export PASS · iOS 26.5 Simulator smoke PASS(Browse 3개 행 모두 진입·복귀, Topics가 새 `StudioTopicScreen`으로 연결됨을 확인).
- **후속**: `SpeakingWorldScreen` 208줄 죽은 코드 삭제는 연쇄 정리(경고 15→20)가 커서 별도 작업으로 분리. smoke 중 발견: 옛 용어(stories/sessions) 잔존, 대시보드 `Last 7 days`가 0 min으로 표시되는 선행 버그.
- **산출물**: [quality/2026-09-08-studio-route-restoration.md](quality/2026-09-08-studio-route-restoration.md) · 스펙 [.agents/plans/2026-09-08-studio-ia-redesign-spec.md](../../../../.agents/plans/2026-09-08-studio-ia-redesign-spec.md)

### 2026-09-08 · 구현+검증 · Studio 홈 3-존 재구성
- **무엇**: 스펙 2절. 홈을 연습/기록/정리 세 구역으로 정리. `Continue practicing`을 순수 함수 `pickCurrentNote`로 교체(최근 7일 attempt → phrase 있는 노트 → 최신 순), Recent notes 행에서 장식 아이콘을 빼고 상황·phrase·attempt 수를 실었으며(78→64pt), Situation 3분할 타일을 제목이 안 잘리는 세로 행으로 바꿈. 1절 smoke에서 발견한 옛 용어(stories/sessions)도 PRD 어휘로 교체.
- **왜**: `updated_at`만 보던 선택 규칙 탓에 한 번도 말해보지 않은 노트가 계속 최상단을 차지했고, 홈의 리스트들이 자리만 쓰고 판단 근거를 주지 않았다.
- **검증**: TypeScript PASS · ESLint error 0/warning 15(기존 기준) · iOS export PASS · Simulator smoke PASS(선택 규칙이 phrase 1·attempt 2 노트를 올리는 것까지 확인).
- **남은 것**: Situations `See all` 토글은 dev-client 메뉴 간섭으로 탭 확인 실패. `pickCurrentNote` 단위 테스트는 apps/mobile에 러너가 없어 보류.
- **산출물**: [quality/2026-09-08-studio-home-zones.md](quality/2026-09-08-studio-home-zones.md)

### 2026-09-09 · 구현+검증 · Situation 상세 위계 재정렬
- **무엇**: 스펙 3절. `Hero`를 없애고 연습 진입을 노트 목록 첫 행의 마이크 버튼으로 흡수. 헤더에 `날짜 · 노트 수 · 시도 수` 메타 추가, `+ New`를 섹션 헤더 액션으로 이동. Useful phrases를 `PHRASE`/`STATUS` 2열 테이블(5개 + `All N`)로, Recent attempts를 카드 없는 저강도 3줄로 축소.
- **왜**: PRD는 Notes ≫ Phrases ≫ Attempts 위계를 요구하는데 구현은 셋 다 같은 `Sect` + `Card`로 동급이었다. 게다가 Hero가 같은 노트를 두 번 보여주며 목록을 첫 화면 밖으로 밀어냈다.
- **검증**: TypeScript PASS · ESLint error 0/warning 15(기존 기준) · iOS export PASS · Simulator smoke PASS(`Ideas / Something I learned`에서 세 섹션의 시각 무게 차이 확인).
- **수정**: 첫 렌더가 iOS 모티프 스펙과 안 맞는다는 피드백(마진·패딩·타입 중간값·컨테이너 idiom 혼용)을 받고 `design-system/ios-motif-spec.md` 기준으로 재작업. 52pt 행, hairline, 17/15/13 스케일, 캡슐 컨트롤, 그룹 간격 분리.
- **남은 것**: 노트 행 마이크 버튼 탭 미확인. phrase `All N` 토글은 표본이 1개뿐이라 미노출. 홈 화면 행에도 같은 중간값(16.5/12.5)이 남아 있어 별도 정리 필요.
- **분리**: Speaking Note 상세(4절)는 연습 후 복귀(6절 `returnTo`)와 짝이라 다음 PR로 함께 미룸.
- **산출물**: [quality/2026-09-09-studio-situation-detail.md](quality/2026-09-09-studio-situation-detail.md)

### 2026-09-09 · 구현+검증 · Situation 상세 Claude Design 포팅
- **무엇**: 컨펌된 `Situation Detail.html`을 그대로 구현. Full(light/dark)·empty·notes-only·loading·error 상태와 pushed 목록 2종(`situationPhrases`, `situationAttempts`) 신설. Hero 행은 디자인이 "현재"로 표기한 변형 A 채택. `Phrase 상세 — 리스트 행 탭`은 컨펌 제외라 미구현이고 phrase 행은 탭 불가로 남김.
- **토큰**: 디자인의 well/hairline/dark-accent가 전역 테마와 미세하게 달라 `useSituationTokens()`로 이 화면 계열에서만 파생. 전역 토큰은 그대로 뒀다.
- **덤으로 살린 것**: `+ Date` 칩 때문에 `setSituationEventDate()`를 추가 — `event_date`는 028에 있었지만 쓰는 코드가 없어 항상 null이었다. `repairSuggestion`도 내려오기만 하고 안 쓰던 걸 `Last time:` 노트로 노출.
- **검증**: TypeScript PASS · ESLint error 0/warning 15(포팅 직후 19 → 4건 해소) · iOS export PASS · Simulator smoke PASS(상세 + Attempts 전체 목록).
- **후속 확인(같은 날)**: 다크 모드 · phrases pushed 목록 · 상태 필터 칩 · 빈 상태 · notes-only 전부 실기기 PASS. 별도 테스트 데이터 없이 기존 상황들로 커버.
- **드러난 것**: `+ Date` 저장이 `Could not find the 'event_date' column of 'stories'`로 실패. 원인은 코드가 아니라 **migration 028이 원격에 미적용**(local 001–028 vs remote 020). 읽기는 legacy fallback이 컬럼을 빼고 조회해 조용히 null이었고, 쓰기에서만 드러났다. 원격 DB는 건드리지 않았다.
- **부수 수정**: `+ Date` 시트가 키보드에 가려 저장 버튼을 못 누르던 것 → `ScrollView`로 감쌈. `N more phrases` 행을 5개 이하일 때도 항상 노출(라벨 `All N phrases`).
- **산출물**: [quality/2026-09-09-situation-detail-design-port.md](quality/2026-09-09-situation-detail-design-port.md)

### 2026-09-09 · 진단+적용+검증 · 마이그레이션 이력 정리 (027·028)
- **계기**: Situation 상세의 `+ Date` 저장이 `Could not find the 'event_date' column of 'stories'`로 실패.
- **진단**: CLI ledger(`supabase_migrations.schema_migrations`)에 `020` 한 줄뿐인데 001–019는 명백히 적용된 상태 → **ledger는 적용 목록이 아니라 흔적**이고, 이전의 "원격은 020까지"는 여기서 나온 오해였다. 실제 스키마를 조회해 021–026 적용 / **027·028 미적용** 확정.
- **드러난 라이브 버그**: 027 미적용 탓에 `saveTalkFeedback`이 `diagnosis_tag`/`action`/`explanation`/`schema_version`을 무조건 insert하고 `throw`해서 **AI 피드백이 하나도 저장되지 않고 있었다.** 읽기는 fallback이 있어 조용했다. attempt에 `repairSuggestion`이 전무했던 이유.
- **적용**: 027 → 028 순서로 SQL Editor 실행, 둘 다 성공. 028 사전 점검 `messages_without_a_topic = 0`으로 `SET NOT NULL` 안전 확인 후 진행.
- **검증**: 앱에서 `+ Date` 저장 성공, 칩이 날짜로 전환.
- **저장 직후 발견한 버그**: `2026-09-18`을 넣었는데 칩이 `Sep 17`. `event_date`가 `DATE`라 `"2026-09-18"`로 오는데 `new Date()`가 UTC 자정으로 파싱해 UTC 뒤 타임존에서 하루 밀린다. `parseCalendarDate`로 로컬 자정 고정해 수정, `Sep 18` 확인.
- **재발 방지**: `supabase/APPLIED.md` 신설. 적용 시 같은 커밋에서 갱신하는 규칙과 "ledger를 믿지 말 것"을 명시.
- **산출물**: [.agents/plans/2026-09-09-migration-history-reconciliation.md](../../../../.agents/plans/2026-09-09-migration-history-reconciliation.md) · `supabase/APPLIED.md`

### 2026-09-09 · 수정 · Talk 저장 실패를 관측 가능하게
- **무엇**: `talk.tsx`의 fire-and-forget 저장 실패 6곳(`log_suggestions`, `diagnose`, `phrase_suggestion`, `save_session`, `rate_suggestion`, `confirm_phrase_use`)을 `reportTalkFailure` 헬퍼로 묶고 PostHog `talk_persist_failed` 이벤트를 남기도록 함. dev console.warn은 유지.
- **왜**: 전부 `if (__DEV__) console.warn(...)` 하나로 끝나서 릴리스 빌드에선 완전 무음이었다. 화면은 메모리의 피드백을 그대로 렌더하므로 사용자 증상이 0이다. **migration 027 미적용으로 모든 AI 피드백 insert가 throw하던 것이 몇 주간 안 드러난 직접적 이유.**
- **검증**: TypeScript PASS · ESLint error 0/warning 15 · iOS export PASS.
- **미확인**: 이벤트가 실제로 발화하는지는 실패를 재현해야 확인 가능. 027 적용 후라 지금은 정상 경로다.
- **막힌 것**: 027 복구의 end-to-end 확인(talk 세션 → 피드백 저장)은 **시뮬레이터에서 불가능**. `Failed to initialize recognizer` — iOS Simulator의 SFSpeechRecognizer 제약이라 실기기가 필요하다.

<!-- 새 항목은 이 위에 추가 (최신이 위로). -->

## 2026-09-09 — Speaking Note detail + the practice return loop (spec §4 + §6)

**Built.** Rebuilt `SpeakingNoteScreen` on the confirmed Situation Detail design
language, and closed the say → fix → say-again loop.

- **Autosave.** 800ms debounce plus a flush on unmount; the manual `Save` chip
  is gone and the BackBar right slot now only reports `Saving…` / `Saved ✓` /
  `Not saved · Retry`. A blank title is treated as "still typing", never
  written — a nameless note is unfindable.
- **No form labels.** The `SPEAKING GOAL` caps label is gone; goal and body are
  separated by position, weight and a hairline, per the PRD's "closer to Apple
  Notes" framing.
- **Chips 4 → 2.** `How can I say this?` opened the same `PhrasePicker` as
  `Link phrase`, and `Record idea` is the same call as the new sticky CTA. What
  is left is one action per thing you can add.
- **Sticky `Start practice`**, hidden while the keyboard is up.
- **`nav.restore(target)`** (new on the Nav contract): switch tabs *and* rebuild
  a detail stack there. `TalkCtx.returnTo` carries it, so ending an attempt
  started from a note lands back on that note instead of `nav.go` clearing the
  stack onto the Studio root. A `seededTab` ref stops the tab-focus effect from
  wiping the stack it was just handed.

**Principle applied.** A loop is only a loop if the return leg exists. The
attempt UI, the repair text and the note were all already built — the thing that
made practice feel like a dead end was one `nav.go` that threw the stack away.

**Verified on the simulator (iPhone 17 Pro, light + dark).** Typing the goal
showed `Saved ✓` and survived a pop/re-enter round trip through Supabase;
`Start practice` → back landed on the note, and back from there landed on the
Studio root with the tab bar restored; a free talk with no `returnTo` still
falls back to `nav.go("today")`.

**Not verified.** The expanded-attempt row and the `justPracticed` auto-expand
need an attempt that carries a `repairSuggestion`. Every existing attempt reads
`No fix suggested` because migration 027 was missing until today, and the
simulator can't record (`Failed to initialize recognizer` — `SFSpeechRecognizer`
is device-only). Both need a real-device pass.

Gates: typecheck PASS · lint 0 errors / 15 warnings (baseline) · `export:ios` PASS.

- 디자인 기획서: [Speaking Note 상세 (세부)](../product/speaking-note-design-brief.md) — 현재 화면의 시각적 실패 9가지, 실측 데이터, 상태 10종, 제약. PR #5로 들어간 구조는 유지하고 비주얼만 다시 잡기 위한 문서.

## 2026-09-09 — Speaking Note detail, redesigned from `Speaking Note.html`

Imported the returned design from Claude Design and rebuilt the surface. The IA
from PR #5 is unchanged; every change below is visual or interaction.

Nine visual failures named in the brief, and what the design did about each:

| 문제 | 반영 |
|---|---|
| 본문 아래 빈 구멍 | 최소 높이 제거 — 내용에 맞춰 줄어든다 |
| 본문이 편집 가능해 보이지 않음 | 카드로 감싸고 우측 상단 `Edit` |
| 층이 2개로 읽힘 | 목표를 Newsreader 세리프로 — 시스템 본문과 서체로 갈림 |
| 아래 절반이 균질 | 비어 있는 블록은 카드 대신 고스트 한 줄 |
| Previous Attempts 정보 0 | `No fix suggested` 삭제, `—`만. 고스트가 설명 |
| CTA가 제일 무거움 | 바+헤어라인 → 떠 있는 캡슐 + 그라디언트 frost |
| 액센트를 부차적인 것에 다 씀 | 보조 액션 칩 2개 제거 |
| placeholder가 콘텐츠처럼 보임 | faint로 낮추고 문구 교체 |
| 저장 상태가 떠 있음 | BackBar 우측 고정 슬롯, `Saved`는 2초 후 사라짐 |

New: a post-practice fix sheet (`justPracticed` + `repairSuggestion`), an
`InputAccessoryView` bar saying "Autosaves as you type", and Previous Attempts
promoted above Linked Phrases for the visit you arrive on from an attempt.

**Fixed on the way through.** A live iOS appearance switch repainted `Text` but
not `TextInput`, leaving the whole note dark-on-dark. The header block is now
keyed on the scheme so it remounts. Pre-existing, not introduced here.

**Reverted.** Registering `Newsreader36pt-Italic.ttf` for the design's italic
goal line turned *every* serif in the app italic — iOS resolves a second file
onto the same family regardless of the key it was registered under. The goal
stays upright; serif-vs-system already separates it from the body.

Gates: typecheck PASS · lint 0 errors / 15 warnings (baseline) · `export:ios` PASS.
Verified on the simulator: light, dark (cold launch), and a live appearance
switch. Not verified: the fix sheet and the accessory bar — no attempt carries a
`repairSuggestion` yet, and the simulator won't raise a software keyboard.

- 디자인 기획서 업데이트: [Speaking Note 상세 (세부)](../product/speaking-note-design-brief.md) §12 — 결정 8건과 디자인에서 벗어난 3건.

- 폰트 통일: Studio 플로우의 섹션 헤더를 Newsreader → 시스템 볼드 22/800으로. Studio 홈(`Recent notes`)과 같은 관용구가 되고, 세리프는 각 화면의 히어로 제목에만 남는다. `SituationSection` 하나만 바꾸면 Situation 상세·Speaking Note·푸시된 목록 화면이 함께 따라온다.

- 노트 본문: 카드는 4줄 고정 프리뷰(미리보기 전용)로, 편집은 전체 화면 모달로 분리.
  `Edit`는 첫 줄과 같은 라인에 절대배치하고, 그 아래로 가로 그라디언트를 깔아 칩
  쪽으로 길어진 글자가 사라지게 했다(RN에 float가 없어 배제는 광학적으로 처리).
  넘치면 하단이 세로로 페이드되고 아래에 옅은 회색 `… more`. 카드 아무 곳이나
  누르면 읽기 모드 모달, `Edit`을 누르면 바로 편집 모드로 열린다. 모달은 오른쪽 위
  토글(펜 ↔ 체크)로 읽기/쓰기를 바꾸고 하단 `Done`으로 닫는다.
  **함정:** Yoga는 텍스트를 "주어진 공간" 기준으로 측정하므로 클립 박스(100pt) 안에서
  재면 어떤 길이의 노트든 `layout.height === 100`으로 나와 잘림을 감지할 수 없다.
  측정용 래퍼를 `height: 4000`으로 두고 그 안에서 재도록 바꿔서 해결.

---

## 2026-09-10 — 앱스토어 제출 준비: 감사 · 첫 실행 코치마크 · 스크린샷 기획

**만든 것 1 — 제출 감사.** 코드/보안/권한을 실제로 읽고 2026년 9월 기준 가이드라인에
대조했다: [app-store-submission-audit.md](../release/app-store-submission-audit.md).
이미 통과한 것(5.1.1(v) 계정 삭제, 5.1.2(i) OpenAI 동의, 2.5.14 녹음 표시, 4.8 Apple
로그인 게이팅, 온디바이스 STT, 번들 내 시크릿 0건)과 **막는 것 6건**(앱 타깃
privacy manifest 부재, "Coming soon" 플레이스홀더 5곳, 웹 개인정보처리방침이 모바일
현실을 안 담음, 리뷰용 데모 계정, 연령등급 설문, Library 탭 결정)을 분리했다.

**만든 것 2 — 첫 로그인 코치마크.** Today 탭에서 딤 + 스포트라이트 4스텝.
`src/lib/product-tour.ts`(영속화 + L1별 문구), `src/components/product-tour.tsx`
(측정·마스크·카드). 타깃은 `<TourTarget>`으로 감싸 `measureInWindow`로 재고,
구멍은 `react-native-svg`의 `Mask` 하나로 뚫는다. 설정에 "Show tips again" 추가.

**배운 원칙 — 플랫폼과 싸우지 말고 이용한다.** 네이티브 탭바가 modal 위에 그려진다는
걸 발견하고, 탭바 스텝은 구멍을 뚫는 대신 **화면 전체만 딤 처리**하도록 뒤집었다.
딤이 안 걸리는 탭바가 그대로 스포트라이트가 된다. 함께 배운 것: 가시성 판정은
**타깃 크기에 상대적**이어야 하고, 등록된 스텝은 조용히 사라지는 대신
**degrade**해야 한다.
→ [postmortem](postmortems/2026-09-10-nativetabs-bar-draws-above-modal.md)

**만든 것 3 — 스크린샷 기획.** 6프레임 서사(EN/KO 카피 포함) + 캡처·합성 파이프라인:
[app-store-screenshots-plan.md](../release/app-store-screenshots-plan.md).
필요한 건 6.9" 1320×2868 한 세트뿐(iPad 미지원). **폰 화면은 이미지 모델로 만들지
않는다** — 실제 빌드와 다른 UI는 2.3.3 리젝 사유다.

**게이트**: `npm run validate` PASS (release-config · typecheck 0 errors ·
lint 0 errors/15 warnings · `export:ios`). 시뮬레이터(iPhone 17 Pro, iOS 26)에서
4스텝 전부와 완료 후 재실행 안 뜨는 것까지 확인.

**아직 안 한 것**: 감사 문서의 블로커 6건은 전부 미착수 — 문서화만 했다.

---

## 2026-09-10 (2) — 제출 블로커 6건 처리

**B1 privacy manifest.** `app.json`에 `expo.ios.privacyManifests` 추가 →
`expo prebuild`가 `ios/Saylo/PrivacyInfo.xcprivacy`를 실제로 생성하는 것까지 확인.
식별자는 기억이 아니라 **Apple 문서 JSON에서 뽑았다** (`NSPrivacyCollectedDataTypePhotosorVideos`
— "or"가 소문자다. 이런 건 틀리면 리젝이다). Audio Data는 **일부러 뺐고**, 누가
나중에 추가하면 `verify:release-config`가 실패하도록 막아 뒀다.

**B2 + B6 플레이스홀더/Library.** `src/lib/release-flags.ts` 하나로 통일.
`EXPO_PUBLIC_PREVIEW_FEATURES`는 eas.json의 `development`/`preview`에만 있고
`production`엔 없다. 뒤에 아무것도 없는 4개 행은 그냥 삭제, Recommendations와
Library는 플래그 뒤로. **원칙: "곧 나와요"는 App Review에게 "안 만들어졌어요"로 읽힌다.**

**B3 개인정보처리방침.** 웹 `/privacy`에 모바일 현실을 넣었다 — 녹음은 기기에만,
카메라/사진, OpenAI 동의와 철회 경로, PostHog, 인앱 계정 삭제. 빌드로 프리렌더
확인(`○ /privacy`).
**한 번 틀렸다가 바로잡은 것:** `feat/studio-note-loop` 워크트리에 옛 Shadowing+
방침이 보이길래 "머지하면 라이브 방침이 되돌아간다"고 적었는데, **틀렸다.**
`git merge-tree`로 확인: 그 브랜치는 `0a494a7`(2026-07-31)에서 갈라진 뒤 77커밋
동안 **`web/`을 한 번도 건드리지 않았다.** git은 스냅샷이 아니라 3-way diff로
머지하므로 main의 web 커밋 18개는 그대로 살아남는다. 그냥 뒤처져 있을 뿐.
**교훈: "파일이 옛날 내용이다"와 "브랜치가 그 파일을 되돌린다"는 다른 얘기다.**
수정 자체는 main 기반인 studio 워크트리에 넣었다(그쪽이 배포 경로).

**B4 + B5는 코드로 못 닫는다.** 계정 생성(비밀번호 입력)과 App Store Connect 폼이라
`docs/release/app-review-submission-kit.md`로 넘겼다 — 리뷰 계정 시딩 체크리스트,
붙여넣을 리뷰 노트 전문, 연령등급 답안, 그리고 manifest와 **정확히 일치하는**
App Privacy 라벨 표.

**결정 1건 — 투어 언어.** 기기 로케일이 아니라 **영어 기본**, 학습자가 설정에서
모국어를 고르면 그때 L1. 로케일은 추측이지 선택이 아니다(이 시뮬레이터 로케일이
`en_KR`인데 한국어 투어가 떴던 게 증거).
→ [ADR 0021](decisions/0021-first-run-tour-language-english-default.md)

**게이트**: 모바일 `npm run validate` PASS · 웹 `npm run build` PASS(`/privacy` 정적) ·
시뮬레이터에서 투어 언어 양쪽 경로 확인.

**주의**: prebuild가 `ios/`를 새로 만들면서 타깃 폴더가 `ios/Shadowing` → `ios/Saylo`로
바뀌고 Pods가 지워졌다. EAS는 매번 prebuild하니 영향 없지만, **로컬 네이티브 빌드 전엔
`npx pod-install`** 필요.

---

## 2026-09-10 (3) — Phrases 강조 · 다국어(N:1) 실사용 점검

**Phrases 탭 강조.** 탭바 스텝이 "이 줄 전체"를 가리키던 걸 **Phrases 하나**를
가리키도록 바꿨다. 네이티브 탭바는 모달 위에 그려져서 구멍을 뚫을 수 없으니,
바로 **위에 캐럿**을 띄우는 방식.

**두 번 틀리고 세 번째에 맞춘 좌표.** 캐럿이 처음엔 60pt 위, 다음엔 탭 아이콘
위를 덮었다. 화면에 값을 직접 찍어서 끝냈다:
`win=402x874 cont=874 insB=83 insT=62`.
→ **모달은 화면 전체 높이가 맞고**, 탭 네비게이터 안에서는
`react-native-safe-area-context`가 **탭바 높이를 이미 bottom inset에 포함**한다
(83 = 49 바 + 34 홈 인디케이터). 그래서 `height - insets.bottom`이 곧 탭바 상단.
여기에 바 높이를 또 빼서 두 번 틀렸다.
**교훈: 레이아웃을 추론하지 말고 한 번 찍어보면 5분에 끝난다.**

**N:1 점검 — 고르면 아무 일도 안 일어나고 있었다.** Settings에 es/ru가 있었지만
**언어를 골라도 앱에서 바뀌는 게 없었다.** L1을 쓰라고 만든 `stuckNoteCopy()`는
**호출부가 하나도 없는 죽은 코드**였고, 사진 캡처는 **모두에게 한국어 뜻**을 줬다.
→ 전수 점검 결과: [first-language-readiness.md](../release/first-language-readiness.md)

**고친 것 2개.**
1. `phrase-capture` Edge Function의 하드코딩 한국어 **6곳**을 `${lang}`으로. 클라가
   `first_language`를 실어 보낸다(서버는 알 방법이 없다 — L1은 컬럼이 아니니까).
   구버전 빌드는 필드가 없어서 `ko`로 폴백(주석에 제거 조건 명시).
2. L1이 **계정에도 저장**된다. 전엔 AsyncStorage뿐이라 재설치하면 사라지고 서버도
   못 봤다. 이제 기기 우선, 없으면 계정.

**남은 건 버그가 아니라 결정** — AI 코칭 영어 고정, 앱 크롬 영어 고정,
`meaning_ko` 컬럼명, Newsreader에 키릴/한글 없음(스페인어는 완전 커버).

**검증**: `npm run validate` PASS. 시뮬레이터에서 `first_language=es`로
투어가 스페인어로("Empieza aquí") **세리프 그대로** 렌더되는 것까지 확인.
(한국어/러시아어는 시스템 폰트로 폴백된다 — 문서 §3.4.)

**주의**: `phrase-capture`는 앱 빌드가 아니라
`supabase functions deploy phrase-capture`로 따로 배포해야 반영된다.

---

## 2026-09-10 — 번체 중국어 + 일본어 L1 추가 (타깃: 대만 우선)

러시아어 대신 중국어·일본어가 급하다는 판단. 언어별 구현 난이도를 **측정해서**
비교했고, 그 결과가 결정을 바꿨다.

**측정한 것 (추정 아님).**
- 번들 TTF cmap을 직접 파싱: Inter는 라틴+키릴+베트남/터키/폴란드, **CJK 없음**.
  Newsreader(제목 세리프, 564자)는 **라틴만**. 한국어가 이미 두 서체 다 시스템
  폰트로 폴백 중 → CJK는 새로운 종류의 리스크가 아니다.
- 언어당 코드 비용은 어떤 언어든 동일: **번역 문자열 14개 + 등록 라인 5줄**.
  갈리는 건 (a) 로케일 파서가 버티는지 (b) 폰트 (c) 스토어 규정, 이 3개뿐.

**그래서 바뀐 판단 2개.**
1. **중국어만 로케일 파서를 깬다.** `deviceLang()`이 `split("-")[0]`이라
   `zh-Hant-TW`와 `zh-Hans-CN`이 둘 다 `zh`로 뭉개졌다. 후보 중 유일하게 `L1`
   타입 자체를 건드리게 만드는 언어. → `localeToL1()`로 교체(스크립트 서브태그
   우선, 없으면 지역에서 유도).
2. **싱가포르는 번체가 아니라 간체다.** "대만+홍콩+싱가포르"는 한 스크립트가
   아니라 두 스크립트다. 번체만 넣고 간체는 보류 — 대신 간체 device는 **잘못된
   스크립트 대신 영어로** 폴백하게 했다(`zh-Hans`는 파서가 뱉지만 SUPPORTED엔
   없음). 나중에 추가할 때 순수 additive.

**ICP는 무관해졌다.** 본토 스토어 등재만 ICP 등록번호(중국 법인 필요)를 요구하고,
대만·홍콩·싱가포르는 일반 스토어프론트다. 타깃을 대만으로 잡은 순간 블로커가
연기된 게 아니라 사라졌다.

**두 번째 언어로 일본어를 고른 이유**: 포르투갈어와 한계 비용이 동률(14문자열)이고
오히려 pt는 세리프가 살아남는다. 그런데 중국어가 어차피 CJK 타이포그래피 결정을
강제하므로, 일본어는 그걸 **재사용**하고 pt는 전선을 하나 더 연다.

**검증**
- `localeToL1` 순수 함수 18케이스 전부 통과 (zh-Hant-TW/zh-TW/zh-HK/zh-Hant-HK →
  zh-Hant; zh-Hans-CN/zh-CN/zh-Hans-SG/zh-SG/zh → zh-Hans; ja/ko/en/es/ru/th 정상).
- 시뮬레이터에서 `zh-Hant` 투어 4스텝 전부 렌더 확인 — 글리프가 번체
  (檔案/隱私/個/裡/連/當), Phrases 캐럿·탭바 스텝 정상.
- `ja`도 렌더 확인 — 한자가 **일본 자형**(音声認識/処理/内容/残ります)으로 떴다.
  한자 통합(Han unification) 오폴백 없음.
- `npm run validate` PASS (0 errors, 15 warnings = 기존 베이스라인).

**아직 검증 안 된 것**: `app.json`에 넣은 `CFBundleLocalizations`는 Info.plist
변경이라 **네이티브 재빌드 전엔 효과가 없다.** 위 시뮬레이터 확인은 그것 없이
통과한 것이고(문자열에 가나·번체 고유자가 섞여 있어서 iOS가 맞게 골랐을 가능성이
높다), 한자만으로 된 문자열에서는 여전히 필요할 수 있다.

→ 결정 기록: [ADR 0022](decisions/0022-traditional-chinese-and-japanese-l1.md)

**주의**: `phrase-capture` / `talk-stuck` Edge Function도 고쳤다 — 앱 빌드가 아니라
`supabase functions deploy <name>`으로 따로 배포해야 반영된다.

**같은 날 — 스크린샷 플랜에 zh-Hant 추가하면서 발견한 오류.** 기존 §5.2가
"ko 세트는 기기 언어를 한국어로 설정하면 투어·인사·Stuck 메모가 전부 바뀐다"고
적혀 있었는데 **틀렸다.** 시뮬레이터에서 zh-Hant/ja로 확인한 결과 앱 크롬(인사, 날짜,
This week, Today, 탭 라벨)은 **어떤 L1에서도 영어**다(ADR 0021 의도대로). L1을 따라가는
표면은 셋뿐 — 투어(그것도 Settings에서 **명시적으로 고른 뒤에만**, 기기 로케일로는 안 됨),
Stuck 메모, phrase 글로스. 그래서 로케일당 raw 캡처 6장을 다시 찍을 필요가 없다:
6장 한 번 + 글로스가 보이는 **프레임 4만 로케일별로** 재촬영 = 8장.

캡션 템플릿 주의도 추가: Newsreader에 CJK가 없으니 zh-Hant/ko 헤드라인은 시스템 CJK
서체로 — zh-Hant는 **PingFang TC**(SC를 쓰면 같은 코드포인트를 간체 자형으로 그린다).

**같은 날 (2) — 일본어 캡션 추가 + §3 재구성.** 로케일이 4개(en/ko/zh-Hant/ja)가 되면서
캡션을 한 테이블에 다 넣으면 7열이라 못 읽는다. 프레임 표는 EN만 남기고, §3.1에
**로케일별 표 3개**(Headline / Subhead)로 분리 — 네이티브 리뷰어가 한 세트를 위에서
아래로 읽을 수 있게. 캡처는 6장 + 프레임4 로케일별 3장 = 9장, 렌더는 24프레임.

폰트 규칙에 항목 하나 추가: **CJK 한 서체로 두 로케일을 처리하면 안 된다.** zh-Hant와
ja는 같은 코드포인트의 인쇄 자형이 다르니(한자 통합) PingFang으로 일본어를 그리면
"중국어처럼 보이는 한자"가 된다 — 일본어 독자가 가장 먼저 알아채는 티. zh-Hant는
PingFang TC, ja는 Hiragino Sans, ko는 Apple SD Gothic Neo.

**같은 날 (3) — Edge Function 2개 배포, 그리고 배포 직전에 잡은 버그.**
`supabase functions deploy` 직전 diff를 읽다가 발견: `learnerLanguage()`가 코드를
`toLowerCase()` 하는데 맵 키는 `"zh-Hant"`라 **매칭이 안 됐다.** 번체 학습자가 전부
`DEFAULT_L1="ko"`로 떨어져서 **한국어 뜻**을 받을 뻔했다. 에러도 안 난다 — `??` 폴백이
삼켜버리니까. L1에 처음으로 2글자가 아닌 코드가 들어오면서 생긴 문제.

키를 소문자로 맞추고 이유를 주석에 박았다. 배포 전 8케이스 확인
(zh-Hant/ja/ko/es/ru/en → 정상, ""/null/"xx" → ko 폴백 의도대로).

배포 완료 (project `hetcnrmzrksbjoeczeze`):
- `phrase-capture` → version 8, ACTIVE, 2026-09-10 12:01:23
- `talk-stuck` → version 4, ACTIVE, 2026-09-10 12:01:37

→ 포스트모템: [2026-09-10-l1-code-lowercased-before-lookup.md](postmortems/2026-09-10-l1-code-lowercased-before-lookup.md)

**아직 안 한 것**: 실기기에서 `first_language=zh-Hant`로 사진 캡처를 돌려 번체 뜻이
실제로 오는지는 미검증(앱 빌드가 필요하다). 배포 자체는 version/updated_at으로 확인.

---

## 2026-09-10 — 네이비 리컬러 + Studio CRUD + Situation 즐겨찾기

세 파트를 14 에이전트 워크플로로 빌드하고, 구현을 못 본 홀드아웃 리뷰어로 적대적
검증했다. **기능보다 측정이 결정을 바꿨다.**

**측정이 뒤집은 것 2개.**
1. `#162555`를 accent 전체에 쓰면 **본문 잉크 `#111114` 대비 1.28:1** — "See all",
   링크, 활성 탭이 그냥 검은 글씨로 읽힌다. 역할별로 갈랐다: 큰 채움 `acc`=#162555,
   작은 인터랙티브 텍스트 `accD`=#344E91.
2. **다크 모드는 세 색 다 못 쓴다** (검정 대비 1.23 / 1.43 / 2.64, UI 최소 3.0 미달).
   같은 hue 266 계열을 L=0.65로 연장해 `#6E8DD5`(6.43:1)를 만들었다.

**`onAcc` 슬롯을 새로 만든 게 핵심.** 다크 `acc`가 *밝은* 네이비라, 앱 전반의
`"#fff"` 관행이 맞는 값에서 3.02:1로 뒤집힌다. 1차 리뷰가 미이관 10곳을 찾았고
그중 하나가 **첫 실행 투어를 넘길 수 있는 유일한 버튼**이었다.

`SP_H`는 262 유지 — 새 브랜드와 4° 차이라 눈에 안 보이는데 파생 12슬롯이 흔들린다.

**히어로 카드**(요청대로 따로 처리): 3스톱 램프, 흰 블룸 0.16→0.11(어두운 바탕에서
훨씬 세게 읽힘), **네이비 로브 삭제**(#142878이 새 두 다크 사이에 묻힘), 다크에서만
헤어라인 링.

**Studio**: topic/situation 생성·이름변경·아카이브(**하드 삭제 아님** — 캐스케이드가
연습 녹음·전사를 지운다), situation 레벨 phrase 추가/삭제(이미 살아 있던
`phrase_story_links`를 Studio가 **읽지 않고 있었다**), phrase별 출처 노트 표시,
별+토스트+Favorites 섹션+See all 페이지.

**검증**: `npm run validate` exit 0 (0 errors / 15 warnings = 기존 베이스라인),
시뮬레이터 라이트·다크 양쪽 확인. 렌더된 프레임 색상 센서스에서 **옛 코발트
`#3B6EE1` 0픽셀** — `useSituationTokens`가 테마를 가리던 100KB 화면군까지 포함해
리컬러가 완전히 도달했다.

**놓칠 뻔한 것**: `is_favorite`를 select에 넣기 전에 `looksLikeMissingStudioSchema`
정규식을 먼저 넓혔다. 안 그랬으면 029 미적용 상태에서 `Promise.all`이 통째로 reject돼
**Studio 홈 전체가 빈 화면**이 됐다.

→ [ADR 0023](decisions/0023-navy-brand-palette-and-slot-mapping.md)
→ [포스트모템](postmortems/2026-09-10-pill-white-tone-fix-blanked-a-label.md) — 대비 수정이
   버튼 라벨을 지워버린 회귀

**미적용**: 마이그레이션 029(`stories.is_favorite`)는 CLI가 없어 SQL Editor에 직접
붙여야 한다. 그때까지 Favorites 섹션은 안 뜨고 별은 실패한다(빈 화면은 아니다).

**같은 날 — 029 적용 후 실기기(시뮬레이터) E2E 확인.** 원장이 손으로 쓰는 거라 그 자체는
증거가 아니어서, 앱에서 루프를 돌려 확인했다:
1. situation 상세 헤더의 빈 별 → 탭 → **채워짐** (029 미적용이면 "Favorites are temporarily
   unavailable."이 떴을 것이므로, 이게 컬럼 존재의 실질 증거다)
2. 홈에 **Favorites 섹션이 나타나고**, 해당 situation이 "Your situations"에서는 **빠졌다**
   (같은 행 중복 방지 동작 확인)
3. Favorites의 "See all" → 새 Situations 페이지가 **Favorites 칩이 선택된 채로** 열림
   (`shell.tsx`가 `initialFilter`를 안 넘겨주던 것을 고친 결과 — 리뷰 2차가 잡았다)
4. 칩 구성: `All 19 / Favorites 1 / About me 5 / Ideas 4 / Daily life 3 / Experiences 3 /
   Work·Study 4` — topic별 카운트 칩 + Favorites, 설계대로.
5. Useful Phrases에 **"From 30-second version"** 출처 표기와 개별 제거(×) 버튼 렌더 확인.

---

## 2026-09-10 — 릴리스 정리: warn 토큰, lint 래칫, 그리고 리컬러가 남긴 구멍들

**lint 15 → 3.** cap을 정확히 3으로 래칫했다(올리지 않는다 — 경고를 추가하려면 하나를
먼저 고쳐야 한다). `warn` 슬롯을 토큰으로 승격(#D70015 / #FF6961, 측정 5.38:1 / 6.03:1),
죽은 `stuckNoteCopy` 제거, `expo-speech-recognition`을 정확히 56.0.1로 고정.
Android 권한은 **안 건드렸다** — 에이전트가 미사용을 증명하지 못했고, 증명 없이 지웠다면
안드로이드 오디오가 조용히 깨졌을 것이다.

**네이티브 스플래시가 빈 화면이었다.** `splash-icon.png`가 흰색 Expo 기본 로고인데 배경이
`#fbf9f4`라 아무것도 안 보였다. 배경을 `#162555`로 맞춰 JS 스플래시와 이음매를 없앴고,
Expo 로고는 제거했다 — 네이비 위에선 오히려 *보이게* 되어 Expo 로고를 Saylo 마크로
출시하는 꼴이 된다.

**리컬러가 만든 구멍 3개** (전부 홀드아웃 리뷰가 찾음):
1. **아무도 로그인 화면을 안 열었다.** `auth-palette.ts`가 테마와 별도 레이어라 모든
   패스가 비껴갔다. 다크 모드 "Sign in" 라벨이 3.26:1 — 리컬러 전엔 4.66:1로 통과였으니
   **내가 깬 것**이고, 신규 사용자와 App Review가 처음 보는 화면이다.
2. `mirror-preview.tsx`의 "Open Settings"가 카메라 placeholder 위 **1.08:1**. `talk.tsx`가
   이미 `CAMERA_ACC`로 푼 문제인데 이 파일만 빠졌다.
3. **수정이 같은 버튼의 다른 상태를 깼다** — `onAccent`를 무조건 적용했는데 채움은
   `canSubmit ? accent : accentSoft`다. `canSubmit`은 busy일 때 false가 되므로 인증
   왕복 내내 스피너가 1.15:1로 안 보인다. 앱의 기존 `soft` 톤 관례(`{bg: accS, fg: accD}`)를
   따라 전경이 채움을 따라가게 고쳤다(5.76 / 6.59).

**마지막 text-on-red**: 스와이프 패널 라벨만 `#E5484D` 위 흰색 3.91:1로 남아 있었다.
패널 채움을 `#D70015`로 바꿔 5.38:1. 파괴적 동작을 구분하는 유일한 단어였다.

**검증**: `npm run validate` exit 0, 0 errors / 3 warnings (cap 3).

→ [포스트모템](postmortems/2026-09-10-only-entry-point-was-never-checked.md) — "유일한
   진입점"이라는 **확인 안 된 주장**이 App Store 빌드에 Guideline 2.1 구멍을 남겼다.
   감사 문서 §B6은 틀린 원문을 지우지 않고 그대로 둔 채 정정했다 — 오류 자체가 교훈이라서.

---

## 2026-09-10 — 언어 정책 확정, 새 아이콘, prebuild

**언어 정책(ADR 0024).** AI 피드백은 영어, 표현 뜻풀이는 학습자 L1, 노트·자유 메모는
어떤 언어든. `talk-diagnose`의 6개 필드 중 3개(`said`, `improvedSentence`,
`diagnosisTag`)는 어차피 영어여야 해서, 나머지만 L1로 바꾸면 카드 하나에 두 언어가
섞인다.

**"노트는 어떤 언어든"은 기본값이 아니라 지켜야 하는 약속이었다.** `quickTitleFromBody`가
라틴 구두점+공백으로만 문장을 나눠서, 중국어·일본어 노트(마침표 `。！？` 뒤에 공백이
없다)는 **문단 전체가 제목**이 됐다. 그리고 `slice(0, 61)`이 UTF-16 단위로 잘라서 이모지를
반쪽으로 끊었다(`�`). 격리 테스트: zh-Hant 53자→12자, ja 31자→12자, 이모지 경계 lone
surrogate 해소, en/ko/소수점 문장은 변화 없음.

**새 아이콘.** 받은 PNG는 흰 여백 14px + 둥근 모서리가 구워진 1254px라, iOS의 슈퍼타원
마스크와 겹쳐 흰 테두리가 생겼을 것이다. 마크만 알파로 추출해 브랜드 그라데이션 위에
풀블리드로 다시 뽑았다 — 1024² RGB(App Store는 알파 금지), 마크 74%.

**prebuild.** 성공했지만 `pod install`이 `Unicode Normalization not appropriate for
ASCII-8BIT (Encoding::CompatibilityError)`로 죽었다. 경로는 전부 ASCII — 원인은
`LANG`/`LC_ALL`이 비어 있던 것. `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`로 통과.
`CFBundleLocalizations`(en ko zh-Hant ja es ru)가 이제 실제 Info.plist에 들어갔다.

→ [ADR 0024](decisions/0024-language-policy-per-surface.md)

---

## 2026-09-10 — `meaning_ko` → `meaning` (expand), 그리고 리뷰어 없이 한 리뷰

**단순 RENAME을 안 한 이유.** 이 컬럼을 읽는 라이브 클라이언트가 둘 있다 — push하면
자동 배포되는 웹(구 번들이 잠깐 서빙된다)과 테스터 폰에 **이미 설치된 TestFlight 빌드**
(마이그레이션과 발맞춰 업데이트할 방법이 없다). RENAME은 둘 다에서 PostgREST 42703 →
표현 목록이 빈 화면. 그래서 030은 `meaning`을 *추가*·백필하고 양방향 동기화 트리거를
걸고, `meaning_ko` 삭제는 031로 미룬다. 코드 37곳 이관: 웹 5, 모바일 2, 엣지 함수 2.

**게이트가 목록 밖의 독자를 찾았다.** 크롬 확장 `extension/content.js`가 `item.meaning_ko`를
렌더하고 있었다 — 처음 뽑은 10개 파일 목록에 없었다. `item.meaning || item.meaning_ko`로.

**리뷰 에이전트가 세션 한도로 죽어서 트리거 검토를 직접 했다.** 케이스를 전부 밟았다:
구/신 클라이언트 INSERT, 의도적 NULL 지우기(양방향), 둘 다 다른 값(`meaning` 우선),
둘 다 안 건드림(`UPDATE OF`라 발화 안 함), 재귀(BEFORE 트리거라 없음) — 전부 맞다.
**구멍은 로직이 아니라 트랜잭션이었다.** `ADD COLUMN → 백필 → 트리거 생성`이 묶여 있지
않아서 (1) 백필과 트리거 사이에 구 클라이언트가 쓰면 그 행은 영구히 어긋나고, (2) 부분
실행 상태에서 엣지 함수가 배포되면 `phrase-embed`가 뜻풀이 없이 임베딩해 벡터가 **조용히**
망가진다. 둘 다 에러가 안 난다는 게 핵심. `BEGIN; … COMMIT;`로 묶어 전부-아니면-전무로.
원장의 붙여넣기 블록도 파일과 바이트 단위로 맞췄다.

**내 아이콘 교체가 게이트를 깼다.** `verify-release-config.mjs`가 `saylo-icon-v2.png`를
고정 검사하고 있었다. v3로 올렸다(1024² RGB 알파 없음 검사도 통과).
`quickTitleFromBody`의 CJK·이모지 수정도 반영.

**검증**: 모바일 `npm run validate` exit 0 (0 errors / 3 warnings, cap 3). 웹은 placeholder
환경 변수로 `npm run build` 통과(실제 환경 변수 파일은 건드리지 않음).

**미적용**: 030. **순서가 전부다** — 030 적용 → 검증 쿼리(0, 1) → 그다음 main push·엣지
함수 배포. 웹과 엣지 함수는 `meaning`을 fallback 없이 조회한다(fallback은 모바일에만).

---

## 2026-09-10 — 030 적용, 엣지 함수 배포, 폰트 B

**030 적용 확인.** 네가 받은 결과는 `trg = 1` 하나였다 — SQL Editor는 여러 문장을 실행하면
**마지막 결과만** 보여준다. 첫 쿼리(백필 누락 = 0)는 따로 확인하지 않았지만, 마이그레이션을
`BEGIN/COMMIT`으로 묶었기 때문에 트리거가 있으면 같은 트랜잭션의 백필도 커밋된 것이다.
직전에 넣은 트랜잭션이 여기서 "두 번째 쿼리 하나로 전체를 증명"하는 값을 냈다.

**엣지 함수 배포.** 배포 전 diff 재확인 — 두 파일 다 `meaning_ko` → `meaning` 순수 이름
변경이고, 임베딩 입력 문자열이 같아서(트리거가 두 컬럼을 같게 유지) 기존 벡터와 새 벡터가
어긋나지 않는다. `phrase-embed` v4, `talk-phrase-suggest` v4, ACTIVE.

**폰트 B — 글자 종류로 세리프를 고른다.** `ui.tsx`에 `serifFace()`를 두고 `Serif` 컴포넌트와
노트 편집기의 제목·목표 입력창이 쓰게 했다. 가나(또는 L1이 `ja`일 때의 한자) → Hiragino
Mincho, 키릴 → New York(`ui-serif`), 나머지 → Newsreader. 둘 다 iOS 내장이라 **용량 0**.
한자만 있는 문자열을 L1로 가르는 이유: Mincho로 중국어를 그리면 대만 학습자에게 일본
자형을 보여준다. 크기 보정 1.1배는 Newsreader의 작은 x-height 전용이라 다른 폰트엔
안 걸고, CJK는 자간 0.

**검증** (시뮬레이터, 같은 투어 카드):
- `ja` 「ここから始めましょう」 — 산세리프 → **Hiragino Mincho** (획 끝 세리프 확인)
- `ru` 「Начните отсюда」 — 산세리프 → **New York**
- 영어 제목은 Newsreader 그대로, 본문은 산세리프 그대로
- `npm run validate` exit 0 (0 errors / 3 warnings)

한국어·번체는 지금처럼 시스템 산세리프로 폴백한다. 대만 학습자가 노트 제목을 중국어로
쓰는 게 보이면 Noto Serif TC 번들(+16MB)이 다음 단계.

---

## 2026-09-11 — `testflight` 빌드 프로필

Library를 계속 쓰고 싶다는 결정. 그런데 TestFlight로 가는 건 `production` 프로필뿐이고,
거기엔 미리보기 플래그가 없어서 빌드 23부터 Library가 사라질 참이었다(빌드 22는 게이트
이전 커밋 `15e1426`이라 보였다).

**추가:** `build.testflight` = `extends: production` + `EXPO_PUBLIC_PREVIEW_FEATURES=1`,
`submit.testflight` = `extends: production`. production은 그대로 — 심사용이 깨끗하게 남는다.

**진짜 위험은 설정이 아니라 App Store Connect였다.** 두 프로필이 같은 ASC 앱에 올라가고
빌드 번호 카운터도 하나라, 목록에 "1.0.0 (23)", "(24)"가 **어느 프로필인지 표시 없이**
섞인다. 심사 제출 때 testflight 빌드를 고르면 미완성 Library가 심사에 간다(B6와 같은 2.1
노출). 막는 법: 제출 전 `eas build:list`로 번호의 프로필 확인(submission kit §6), 폰에선
Settings에 Library 카드가 있으면 testflight 빌드.

**릴리스 검사 확장:** testflight가 production을 상속하는지, 스토어 빌드로 남는지(누가
`internal`로 바꾸면 TestFlight에 못 올라감), 두 플래그가 있는지. `npm run validate` exit 0.

## 2026-09-12 — Self-talk 힌트 패널 재설계 + AI 피드백이 조용히 꺼져 있던 이유

**AI 피드백.** 결과 화면의 두 빨간 카드는 서로 다른 두 장애가 아니라 **하나의 공통
선행 조건**이었다. `diagnoseTalk`와 `suggestTalkPhrase` 둘 다 네트워크 이전에
`requireAiProcessingConsent()`를 지나고, 동의 알림창의 "Privacy Policy" 버튼이
`save(false)`를 호출하고 있었다 — 정책을 읽으려는 행동이 영구 거부로 기록된다. 화면은
실제 에러를 고정 문구로 덮어써서 절대 성공할 수 없는 "Try again"만 보여줬고, 헤더는
`diagState === "error"` 분기가 없어 **"Focus coaching is ready."** 라는 거짓 문장을
출력했다. 셋 다 고침 → `postmortems/2026-09-12-privacy-policy-button-denied-ai-consent.md`.
기기에서 토글 확인은 남아 있다.

**원칙(적용).** *실패는 사용자가 행동할 수 있는 문장으로 말해야 한다.* 재시도로 고칠 수
없는 실패에 재시도 버튼을 주면 사용자는 무한히 같은 벽을 친다. 그리고 상태 문구는 성공
경로만 나열하면 안 된다 — 실패 분기를 빼먹으면 UI가 거짓말을 한다.

**힌트 패널.** Story beats 탭을 걷어내고 한 개의 리스트로 바꿨다. 화면 상단 제목과
중복이던 `TODAY'S TOPIC` 블록과 `REVIEW TODAY` 라벨을 지워 그만큼을 phrase에 줬다
(리스트 높이 168 → 250). 각 행은 왼쪽 원형 체크박스(직접 표시, 햅틱 + squash-and-settle
애니메이션)와, 그 외 영역을 누르면 Y축으로 뒤집혀 ① 표현 ② 뜻 ③ How it's used를 보여주는
카드가 됐다. 뒤집기는 180° 한 번이 아니라 0→84° / -84°→0 두 구간으로 나눴다 — 뒷면이
거울상으로 그려지지 않고, 앞뒤 높이가 달라도 된다.

**설정.** 헤더 오른쪽 기어 → 딤 + 중앙 모달에서 보는 대상을 고른다(Today's phrases /
This note · This situation). 선택은 AsyncStorage에 남는다(`src/lib/talk-hint-source.ts`,
talk-focus와 같은 모양). Free talk은 연결된 대상이 없어 두 번째 선택지가 비활성이다.

**색.** 이 패널은 항상 흰색인데 강조색만 색상 스킴을 따라가고 있었다 — 다크 모드 accent
`#8FACEF`는 흰 바탕에서 2.25:1이라 체크된 상자가 체크로 안 읽힌다. camera 표면과 같은
고정-표면 규칙을 반대로 적용해 브랜드 네이비로 고정했다(`#162555` on white = 14.7:1).

`npm run validate` exit 0 (0 errors, 3 warnings, cap 3). expo-haptics 추가 →
네이티브 모듈이라 다음 EAS 빌드부터 적용된다.

**기기 확인 후 2차 수정.** 동의 원인 확정됨(토글 켜니 동작). 세 가지를 더 고쳤다.

- 첫 탭에 UI 스레드가 스택 오버플로로 죽었다 — 애니메이션 완료 콜백 안에서 shared value에
  대입하면 그 애니메이션이 취소되고 같은 콜백이 다시 불린다. `withSequence` 하나로 합침 →
  `postmortems/2026-09-12-shared-value-write-inside-its-own-callback.md`.
- 탭처럼 생긴 헤더를 없앴다. 리스트가 하나뿐인데 세그먼트 크롬이 **있지도 않은 두 번째 탭을
  약속하고** 있었다. 제목은 가운데 평문, 기어는 배경 없이 그 두 번째 탭 자리에.
- **동의는 말하기 전에 묻는다.** 5분을 말하고 나서야 코칭이 꺼져 있었다는 걸 아는 건 최악의
  타이밍이다. 라이브 진입 시 마이크 권한 시트 다음에 물어본다. `Alert.alert`는 평문만 받아서
  결정에 필요한 네 가지 사실(뭐가 되고, 뭐가 안 되고, 뭐가 나가고, 뭐가 안 나가는지)을
  강조할 수 없으므로 실제 모달로 만들었다. Free talk에서 설정이 왜 잠기는지도 모달 안에 적었다.

## 2026-09-12 — 카드가 아니라 패널이 돈다 + 체크가 곧 복습

**뒤집는 단위를 잘못 잡았다.** 행 하나가 도는 게 아니라 **패널 전체**가 돈다. phrase를
누르면 패널이 넘어가 그 표현 하나의 사전 항목이 되고(좌측 정렬, 패널 안에서 상하 중앙),
다시 누르면 목록으로 돌아온다. 흰 카드 스타일을 talk.tsx에서 컴포넌트 안으로 옮겨야
했다 — 회전하는 주체가 카드 자신이어야 하니까.

**runOnJS로 객체를 넘기면 조용히 아무 일도 안 일어난다.** 면 교체를 워클릿 콜백에서
`runOnJS(setDetail)(phrase)`로 했더니 크래시도 에러도 없이 패널이 그냥 안 돌았다. 객체를
워클릿 클로저에 가두지 않고 JS 쪽 타이머로 교체하니 바로 동작. 86도에서는 패널이 거의
옆면이라 한 프레임 어긋나도 안 보인다.

**Newsreader에는 볼드가 없다.** `fontWeight: "700"`을 줘도 iOS는 조용히 Regular를 그린다 —
번들된 건 `Newsreader36pt-Regular.ttf` 하나뿐이라 매칭될 굵은 페이스가 없고, 경고도 없다.
`Serif`에 `strong`을 추가해 그 경우에만 시스템 세리프(New York)로 보낸다: 모든 굵기가 있고,
번들 비용 0이며, 이미 키릴 세리프로 쓰고 있어 이 디자인 시스템 안의 얼굴이다.

**체크는 진짜 복습이다.** 말로 직접 썼다는 건 카드에서 알아본 것보다 강한 증거라, Today와
같은 1/3/7/30 사다리에 올린다(`submitVerdict(..., "good")` + `phrase_events`의 `used`).
연결된 phrase 소스에는 스케줄 필드가 없어서 `fetchPhraseById`로 현재 행을 먼저 읽는다 —
안 그러면 30일 간격짜리를 신규로 보고 내일로 끌어내린다. 체크 해제는 화면 표시만 되돌리고
스케줄은 안 건드린다(실제로 말한 건 사실이니까).

**그래서 드러난 진짜 버그:** Today는 마운트 때만 `load()`를 돌았다. 네이티브 탭이 화면을
계속 살려두므로, 톡에서 체크하고 돌아와도 `5 / 5`가 그대로라 **체크가 아무것도 안 한 것처럼
보였다.** 포커스마다 다시 읽게 고침. 시뮬레이터에서 `5 / 5` → `4 / 5` 확인.

**설정 아이콘이 해였다.** `icon.tsx`의 `gear`는 `sun`과 같은 그림(원 + 광선 8개, 반지름만
다름)이다. 쓰는 곳이 한 군데도 없어서 여태 안 걸렸다. 실제 `sliders` 글리프를 추가.

`npm run validate` exit 0 (0 errors, 3 warnings, cap 3).

## 2026-09-12 — 뒤집기가 "카드가 도는" 게 아니라 "가운데가 갈라지는" 것처럼 보였던 이유

면을 교체하는 방식이었기 때문이다. 0→86도로 돌리고, 그 지점에서 내용을 바꾸고, -86도에서
0으로 돌아왔다. 두 면의 높이가 다르니 **정확히 중간 지점에서 카드 크기가 바뀐다.** 회전
중간의 리사이즈는 카드가 넘어가는 게 아니라 패널이 갈라지는 것으로 읽힌다.

고친 방식: 고정 크기(300pt) 상자 안에 **두 면을 동시에 그려 쌓아두고**, 뒷면을 반 바퀴
뒤에 세운 뒤 **둘을 함께** 0→180도로 한 번에 돌린다. 교체도 없고 리사이즈도 없다.
어느 면이 보이는지는 `backfaceVisibility`가 아니라 90도에서의 opacity 하드 스위치가
결정한다 — 90도는 카드가 정확히 옆면인 순간이고, 플랫폼이 회전된 뷰의 뒷면을 어떻게
합성하는지에 기대지 않는다. 흰 카드 스타일은 talk.tsx에서 컴포넌트로 완전히 옮겼다:
함께 도는 두 면이 각자 카드를 입고 있어야 한다.

**원칙(적용).** *애니메이션 중간에 레이아웃을 바꾸지 마라.* 위치 변화만 있는 변환은 매끄럽게
읽히지만, 크기 변화가 섞이는 순간 사용자는 다른 사건으로 해석한다.

`npm run validate` exit 0.

## 2026-09-12 — 키보드에 가려지는 시트 셋, 그리고 안 자라는 선택 UI

**키보드.** Edit phrase 시트가 autofocus라 키보드가 항상 올라와 있는데, 정작 편집할 필드를
가리고 있었다. 원인은 backdrop과 시트가 **하나의 Pressable**이라 `KeyboardAvoidingView`를
넣을 자리가 없던 것. 같은 모양의 시트가 셋이었다(phrases / capture / practice). Studio의
Sheet가 쓰던 구조로 통일.

**칩 격자는 개수를 모르는 목록에 쓰면 안 된다.** 줄바꿈이 예측 불가라 시트 높이가 내용에
따라 움직이고, 긴 제목이 잘리고, 가로 칩 레일이 세로 시트 안에 들어가 스크롤 방향이 섞이고,
무엇보다 **검색할 자리가 없다.** Studio가 네 가지를 한꺼번에 겪고 있었다.

**그리고 이미 데이터가 새고 있었다 — 조용한 truncation 넷.**
- `phraseChoices().then(items => items.slice(0, 20))` → 다시 렌더에서 `slice(0, 10)`.
  **이중 캡**이라 표현 11번째부터는 도달 불가.
- `PhrasePicker`의 `.slice(0, 30)` — 검색 필터 **뒤에** 걸려 있어서, 뭘 치든 31번째는 안 나옴.
- story picker의 `slice(0, 10)` / `slice(3, 10)` — 검색창이 비어 있으면 11번째 story는 없음.
모두 "나중에 불편해질 것"이 아니라 **지금 있는 버그**였다. 캡 자체를 없앰(시트가 스크롤된다).

**공용 `PickerSheet`.** 행 + 섹션 + 8개 넘을 때만 나오는 검색. `practice.tsx`의 Add-to-a-story가
이미 그 모양이라 발명이 아니라 일반화였다. Quick capture의 situation 선택은 **topic 칩 → situation
칩** 2단계를 없애고 한 목록으로 폈다 — situation은 이미 자기 topic을 알고 있으니 하나 고르면
둘 다 정해진다. `Unsorted · About me`는 이 필드가 원래 보여주던 문자열 그대로라, 행이 값과
같은 모양으로 읽힌다. Organize note도 같은 목록으로 바꾸고 탭 즉시 저장(고르는 게 결정 전부라
확인 버튼이 한 번 더 있을 이유가 없다).

**설계 하나 되돌림:** 검색 결과가 있을 때도 `Create "Daily"`를 같이 띄웠더니, `Daily life` 행 셋
아래에 **다른 topic에 만들겠다는** 버튼이 붙었다. 결과가 0일 때만 뜨게 수정.

`npm run validate` exit 0. 시뮬레이터에서 검색·섹션·생성·단일선택·다중선택 전부 확인.

## 2026-09-17 — MVP 커밋 + 시뮬레이터 폴리시 1차 (Pill 에러, 빈 노트)

**만든 것.** 커밋 안 된 채로 시뮬레이터에서 돌던 MVP(Phrases·Studio·Profile, migration 031)를 `6249f00`으로 먼저 커밋. 그다음 시뮬레이터 워크스루로 찾은 것 중 두 개를 고침 → `6d9d3b3`.
- **Pill 라벨 에러**: `{rate}× speed`가 배열이라 `<Text>` 밖에서 렌더 → 빈 캡슐 + LogBox 에러. `Pill`이 string/number 혼합을 라벨로 처리. → `postmortems/2026-09-17-pill-number-child-threw-text-error.md`
- **빈 노트 누적**: "New note"가 입력 전에 row를 만들어서, 그냥 나가면 "Untitled note"가 남고 Phrases 히어로가 그 빈 노트로 초대했다. 템플릿 그대로인 노트는 나갈 때 삭제(Talk로 갈 땐 유지), 히어로는 빈 노트를 건너뜀.

**원칙.** 호출부 하나를 고치지 말고 오분류하는 분기(컴포넌트)를 고친다. "생성 즉시 저장"은 취소 경로에서 쓰레기를 남긴다 — 나가는 길에 되돌린다.

**검증.** tsc 통과, `test:mvp` 4/4 (isBlankNote 케이스 추가), 변경 파일 eslint 0. 시뮬레이터에서 속도 토글, 새 노트 → 뒤로 → pull-to-refresh 후에도 노트 수 7 유지 확인.

**남은 것 (워크스루에서 찾음, 미착수).** Studio 카드 "0 POINTS"(`-`/`•` 줄만 셈) · Phrases 홈 로딩 중 "All 0"/빈 히어로 깜빡임 · Profile 시간 "77 min 31s" 표기 + transcript 없는 59분 세션 · 날짜 포맷 혼재 · 소문자 라벨에 넓은 자간.

## 2026-09-18 — Phrases 홈 Figma 적용 + Talk 탭 편입

**만든 것.** Figma 프레임 + PM 메뉴구조 노트대로 Phrases 홈을 다시 짰다(`7c5987e`). 헤더(타이틀 / +·필터 캡슐 / 48pt 프로필, Studio도 동일), 히어로 캐러셀(스피킹 카드 + "Today's phrases for you" done/total), 기간별 그룹 리스트(Today / Yesterday / Last 7 days / Last 30 days / Earlier), 검색·스테이지 필터는 필터 시트로. Pretendard 4웨이트 + Instrument Serif 번들. Talk는 바 안의 세 번째 탭. 결정 → `decisions/0025-phrases-home-daily-picks-and-three-tab-bar.md`

**원칙.** 제품 규칙(오늘의 픽, 기간 분류)은 화면이 아니라 순수 함수에 둔다 — 그래야 "하루 동안 카운트가 거꾸로 안 간다" 같은 약속을 테스트로 고정할 수 있다. 테스트가 처음 틀렸던 건 코드가 아니라 테스트였다(8월은 31일).

**걸린 것.** `Pill full`은 `flex: 1`이라 세로 컨테이너(필터 시트) 안에서 높이 0으로 접혔다 — "Show results" 버튼이 안 보임. 시트에선 `alignSelf: "stretch"`로.

**검증.** tsc 통과, `test:mvp` 6/6(todaysPicks·periodOf 추가), 변경 파일 eslint 0. 시뮬레이터: 헤더·히어로 두 장·그룹 리스트, 필터 시트(스테이지 선택 → 점 표시 + "35 Collected phrases · Clear", 검색 0건 → 빈 상태), Studio 헤더, Talk 탭 진입 확인.

## 2026-09-18 — 폰트 앱 전체 교체 + 필터를 네이티브 메뉴로

**만든 것.** (`009bac0`) 26개 파일의 `Text`/`TextInput`을 `design/text.tsx` 래퍼로 교체 — style에 fontFamily가 없으면 fontWeight에 맞는 Pretendard 패밀리를 붙인다. SERIF = Instrument Serif(Newsreader 대체). 필터 버튼은 바텀 시트 대신 `@expo/ui` 네이티브 Menu(인라인 Picker, 체크마크). 검색은 `SEARCH_ENABLED=false`로 숨김. ADR 0025에 개정으로 기록.

**원칙.** RN엔 전역 기본 폰트가 없다 — 앱 전체 폰트는 "모든 화면이 우리 Text를 쓰게" 하는 한 지점에서 결정한다. 정적 웨이트 폰트는 웨이트마다 패밀리가 달라서, 래퍼가 fontWeight → 패밀리 이름으로 바꿔준다. 네이티브 모듈을 JS에서 새로 쓰기 전에 설치된 빌드 바이너리에 그 뷰(`MenuView`)가 있는지 먼저 확인.

**걸린 것.** 프로젝트 보안 훅(환경변수 파일 보호용)이 환경변수 참조 문자열이 든 명령을 막음 — 우회하지 않고 플래그를 상수로 만듦.

**검증.** tsc 통과, `test:mvp` 6/6, 변경 29개 파일 eslint 에러 0(경고 1은 기존 `phrases.tsx:1026`). 시뮬레이터: 필터 메뉴가 버튼에서 펼쳐짐 → Collected 선택 → 점 + 요약 줄, Clear. Phrase 상세·Studio·Profile에서 Pretendard/Instrument Serif 확인.

## 2026-09-20 — Figma 듣기 버튼 + Studio 리스트를 같은 패턴으로

**만든 것.** (`5a8f9ec`) 리스트 행의 듣기 버튼을 Sumin이 준 `button.svg` 그대로 그림(react-native-svg): 반투명 #F2F2F7 원 + 회색 스피커, 재생 중엔 같은 원 안에 네이비 일시정지, 로딩은 스피너. Studio는 노트 한 개당 카드이던 구조를 Phrases와 같은 패턴으로 — 기간별 섹션 카드, 행 시작의 마이크 원(누르면 그 노트로 Talk), 제목 + 한 줄 미리보기, 오른쪽 셰브론. `SectionCard` / `Row` / `RowCircle`로 두 화면이 같은 부품을 쓴다.

**없앤 것.** 노트 카드의 "0 POINTS · OPEN NOTE" — 불릿(`-`/`•`) 줄만 세는 계산이라, 글이 가득한 노트에서도 0으로 보였다. 워크스루에서 찾았던 항목(2026-09-17 기록의 "남은 것" 3번) 해소.

**원칙.** 두 번째 화면에 같은 모양이 필요해지는 순간이 부품을 뽑을 때다 — 먼저 Phrases 리스트를 `SectionCard`/`Row`로 바꾸고, Studio는 그걸 사용만 했다.

**검증.** tsc 통과, `test:mvp` 6/6, eslint 에러 0. 시뮬레이터에서 Studio(기간 섹션 2개, 마이크 원, 미리보기 한 줄)와 Phrases 듣기 버튼(유휴/로딩) 확인. 오늘이 9/20이라 9/12 저장분이 LAST 7 DAYS → LAST 30 DAYS로 내려간 것도 기간 분류가 도는 증거.

## 2026-09-20 — 남은 항목 정리: 말한 시간, 시간 표기, 날짜 표기

**고친 것.** (`1abcd44`) 2026-09-17 워크스루의 남은 3건을 닫았다.
- **거울 타이머가 화면 켜둔 시간을 셌다** → 새 단어가 들어온 뒤 10초 이내일 때만 카운트. `postmortems/2026-09-20-mirror-timer-counted-screen-time.md`
- **`durationLabel`**: 한 시간이 넘으면 시/분으로 — "77 min 31s" → "1 h 17 min". 초는 한 시간 넘어가면 노이즈.
- **날짜 표기 통일**: `dateLabel`(Sep 12, 연도가 다를 때만 연도) / `dateTimeLabel`(Sep 12 · 1:05 PM). phrase 상세·Profile·세션 화면에 섞여 있던 `9/12/2026`을 없앴다.

**원칙.** 지표 이름이 곧 계측 정의다 — "of speaking"이라고 쓰면 말한 시간을 세야 한다. 판정 규칙은 화면이 아니라 순수 함수에 두고 테스트로 고정한다(세 건 모두 `mvp-model`).

**검증.** tsc 통과, `test:mvp` 8/8(시간·날짜·타이머 케이스 추가), eslint 에러 0. 시뮬레이터에서 Profile "3 h 4 min spoken in total", 세션 날짜 "Sep 12" 확인. 타이머 수정은 시뮬레이터에 음성 인식이 없어 런타임 확인 불가 — 단위 테스트까지가 근거.

**남은 판단.** 과거 세션 행의 부풀려진 seconds는 그대로다(합계에 포함). 정리 여부는 Sumin 결정.

## 2026-09-20 — 앱 안에서 세션 삭제 (빨간 버튼 + 스와이프)

**만든 것.** (`8e309b9`) 세션 상세에 빨간 "Delete session"(`Pill tone="danger"` 신설 — AA 검증된 `warn` 색 + 12% 배경), Profile 목록은 스와이프 삭제(`SwipeRow`, 기존 빨간 패널 재사용). 둘 다 `confirmDelete`로 길이를 문장에 넣어 확인받는다.

**원칙.** 삭제 순서는 "되돌릴 수 있는 쪽이 먼저 깨지게" — 녹음 파일을 먼저 지우고 행을 지운다. 행이 그 파일을 가리키는 유일한 포인터라, 반대로 하면 아무도 닿을 수 없는 파일이 남는다. 행만 남고 오디오가 없는 상태는 화면에서 복구 가능.

**맥락.** 부풀려진 과거 세션 정리를 SQL 대신 앱에서 하기로 함(`supabase/maintenance/2026-09-20-delete-empty-long-talk-sessions.sql`은 미실행 상태로 남겨둠 — 대량 정리가 필요해지면 쓸 수 있다).

**검증.** tsc 통과, `test:mvp` 8/8, eslint 에러 0. 시뮬레이터: 스와이프 → 빨간 Delete 패널 → 확인 다이얼로그("59 min 6s of speaking, and its recording, will be removed.") → **Cancel로 종료(실제 삭제는 Sumin 몫이라 하지 않음)**. 상세 화면의 빨간 버튼 렌더 확인.

## 2026-09-22 — "+" 한 페이지로 합치기 (타이핑 · 카메라 · 앨범 OCR)

**만든 것.** (`73449a0`) MVP의 "+" 페이지가 타이핑만 되던 걸, 예전 capture 화면의 OCR을 되살려 한 페이지로 합쳤다. Camera / Photos → `extractPhraseFromImage` → **같은 입력칸을 채운다**(사진은 미리보기 + 읽어낸 텍스트 카드로 보여주고, Save 전까지 아무것도 저장 안 됨). 사진에서 온 표현은 `source: "image_ocr"` + 읽어낸 텍스트를 context로 저장. Delete note도 다른 전체폭 버튼처럼 늘림.

**걸린 것 — 모델이 프롬프트의 예시값을 그대로 돌려줬다.** 글자 없는 사진(시뮬레이터 샘플 꽃 사진)에서 phrase 칸에 `all legible text`, meaning 칸에 `short English meaning`이 채워졌다. 원인은 앱이 아니라 `supabase/functions/phrase-capture`의 프롬프트: 반환 JSON 예시 문자열을 모델이 그대로 복사했다. 앱에서 그 예시값 목록 + 빈 문자열을 "못 읽음"으로 처리 → "No English text found. Type it instead."

**원칙.** 자동 채움은 사용자가 고칠 수 있는 칸에만 넣는다 — 잘못 읽어도 지우면 그만인 상태로. 그리고 못 읽었을 때는 카드 한 곳에서만 말한다(같은 말을 배너로 한 번 더 하면서 아무 일도 안 하는 "Try again"을 붙이지 않는다).

**검증.** tsc 통과, `test:mvp` 8/8, eslint 에러 0. 시뮬레이터: 앨범 선택 → 썸네일 + "READING THE PHOTO…" → 채움(첫 시도) / 못 읽음 안내(수정 후) 확인. 카메라 경로는 시뮬레이터에 카메라가 없어 미검증 — 실기기 확인 필요.

**남은 것.** 프롬프트 쪽 근본 수정(예시값 대신 스키마 설명, "글자 없으면 빈 문자열")은 Edge Function 배포가 필요해서 손대지 않음. 예전 `capture.tsx`도 같은 함수를 쓰므로 같은 증상이 있을 수 있다.
