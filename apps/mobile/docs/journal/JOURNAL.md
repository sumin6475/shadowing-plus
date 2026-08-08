# Journal — 누적 학습 로그

빌드 여정의 시간순 인덱스. 최신 항목이 위로 온다. 각 항목은 짧게: 무엇을 했고, 무슨 원칙을 배우거나 적용했고, 어떤 스킬/도구를 썼고, 실패·결정·품질 산출물이 있으면 링크.

> 채우는 사람: 학습 동반자 (자동). 규칙은 `CLAUDE.md`의 Auto-Journal 섹션. 진행 상태의 정본은 프로젝트의 status 문서(MEMORY.md / 체크리스트)다.

---

## 항목

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

<!-- 새 항목은 이 위에 추가 (최신이 위로). -->
