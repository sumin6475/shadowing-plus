# Journal — 누적 학습 로그

빌드 여정의 시간순 인덱스. 최신 항목이 위로 온다. 각 항목은 짧게: 무엇을 했고, 무슨 원칙을 배우거나 적용했고, 어떤 스킬/도구를 썼고, 실패·결정·품질 산출물이 있으면 링크.

> 채우는 사람: 학습 동반자 (자동). 규칙은 `CLAUDE.md`의 Auto-Journal 섹션. 진행 상태의 정본은 프로젝트의 status 문서(MEMORY.md / 체크리스트)다.

---

## 항목

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

<!-- 새 항목은 이 위에 추가 (최신이 위로). -->
