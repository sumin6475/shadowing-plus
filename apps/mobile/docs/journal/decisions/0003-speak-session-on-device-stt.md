# ADR 0003 — Speak 세션 전사: 온디바이스 iOS 음성인식

- **날짜**: 2026-08-05
- **스텝**: Speak 세션 녹음 — 음성→텍스트 방식 선택
- **상태**: accepted

## 맥락 (Context)
Speak 탭은 "거울 보고 그냥 말하기" 세션인데 현재 전부 목업이다. 실제로 말한 걸 `talk_sessions.transcript`에 남기려면 음성→텍스트가 필요하다. 확인해보니 **웹에는 라이브 음성 전사 경로가 없다** — island 스피킹 플로우조차 textarea에 "들린 대로 타이핑"(`Type your attempt exactly as it came out…`)하는 방식이라 재사용할 서버 라우트가 없다. 모바일 제약: 번들에 시크릿 금지(Groq/ElevenLabs 클라이언트 직접 호출 불가), 앱은 이미 dev-build 경로.

## 검토한 선택지 (Options)
1. **온디바이스 iOS 음성인식** — `expo-speech-recognition`(커뮤니티, iOS `SFSpeechRecognizer` 래핑). 말하는 대로 실시간 자막, 서버·시크릿 불필요, 웹 무변경. 네이티브 모듈 → dev 재빌드 1회. 한국어 억양 영어 정확도는 서버 Whisper보다 낮을 수 있음.
2. **녹음 → 서버 전사(Groq)** — expo-audio 녹음 후 새 웹 라우트로 업로드, 서버가 검증된 Groq Whisper로 전사. 품질↑이지만 **웹 작업(신규 라우트 + 업로드 배관)** 필요 + 실시간 아님(후처리형).
3. **녹음만, 전사는 나중** — 배관만 먼저.

## 결정 (Decision)
옵션 1 — **온디바이스 iOS 음성인식**(`expo-speech-recognition`, `requiresOnDeviceRecognition`). 이번 스텝 범위: **실시간 녹음/전사 → `talk_sessions` 저장**(story_id/message_id는 talkCtx). AI 진단(moments·추천 표현·retry)은 다음 스텝으로 미룸 — done 화면엔 **실제 transcript**를 정직하게 표시하고 mock 진단 경로는 남겨둔다.

## 기각 이유 (판단의 증거)
옵션 2는 제품엔 좋지만 이번 작업을 **웹 코드베이스 변경**으로 끌고 간다(웹/모바일 병행 충돌 위험 + 업로드/R2 배관). 개인 테스트 우선 단계에선 웹 무변경·실시간이 더 맞는다. 옵션 3은 전사가 빠져 Speak의 핵심 가치를 못 보여줌. 웹 island도 on-device 타이핑(=클라이언트에서 텍스트 확정)이라, 모바일의 on-device STT가 그 철학의 자연스러운 병렬이다.

## 결과 (Consequences)
- **네이티브 의존성 추가** → dev-client 재빌드 1회(공백 없는 워크트리 경로라 안전, [[postmortems/2026-08-04-space-in-path-native-build]]).
- **SDK 버전 리스크**: 최신 `expo-speech-recognition`은 **56.0.1(SDK 56 대상)**, 아직 57.x 없음. peer는 `expo:'*'`라 차단은 없으나 네이티브 호환은 **재빌드로 검증**해야 함(SDK 57 = expo-modules-core 57). 빌드 실패 시 재검토.
- **시뮬레이터 한계 가능성**: on-device STT는 실기기(마이크 + on-device 모델)가 필요할 수 있어, 최종 검증은 물리 iPhone(dev client)일 수 있음. 시뮬레이터에서 안 되면 기기 테스트로 전환.
- **audio_key/R2 업로드는 이번에 미룸** — transcript + duration만 저장(모바일은 R2 접근 없음).
- **재검토 조건 (revisit trigger)**: 한국어 억양 영어 정확도가 실사용에서 부족하면 옵션 2(서버 Groq 전사)로 전환하거나 병행. 또는 `expo-speech-recognition` SDK 57 빌드가 나오면 그 버전으로 업그레이드.

## 후속 — AI 진단 구현 완료 (2026-08-05)

이 결정에서 "다음 스텝"으로 미뤘던 **AI 진단(moments)**을 구현·검증함. 결정의 방향(옵션 1: on-device STT, 웹 무변경)과는 별개로, 진단은 GPT가 필요해 **웹에 additive 프록시 라우트**를 신설(모바일 시크릿 금지 제약 그대로). 옵션 2가 우려했던 "웹 코드베이스 변경"은 여기서 **읽기 전용·stateless 신규 라우트 1개**로 최소화됨(기존 웹 동작 무변경, R2/업로드 없음).

- 웹: `src/lib/talk-diagnose.ts`(순수 파서+타입), `talk-diagnose-ai.ts`(gpt-4o-mini), `src/app/api/talk/diagnose/route.ts`(Bearer, `{transcript,topic}`→`{moments}`). 웹 `/api/island/diagnose` 패턴 미러링.
- 모바일: `src/lib/talk.ts` + `src/screens/talk.tsx`(done/moment/retry 실 진단 배선).
- **검증**: tsc/lint/vitest(파서 5케이스) 통과 + **로컬 웹 E2E 실기기 성공**(실제 발화 교정·반복 포착). 커밋 `d358aa5`(mobile)/`0f934f8`(web).
- **미결**: prod 배포(로컬 우선이라 보류, 사람이 /deploy).
