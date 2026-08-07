# Journal — 누적 학습 로그

빌드 여정의 시간순 인덱스. 최신 항목이 위로 온다. 각 항목은 짧게: 무엇을 했고, 무슨 원칙을 배우거나 적용했고, 어떤 스킬/도구를 썼고, 실패·결정·품질 산출물이 있으면 링크.

> 채우는 사람: 학습 동반자 (자동). 규칙은 `CLAUDE.md`의 Auto-Journal 섹션. 진행 상태의 정본은 프로젝트의 status 문서(MEMORY.md / 체크리스트)다.

---

## 항목

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
