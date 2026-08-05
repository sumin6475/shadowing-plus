# Postmortem — Speak 세션 실기기 첫 실행의 두 버그 (오디오 인터럽트 + RLS)

- **날짜**: 2026-08-05
- **스텝**: Speak 세션 온디바이스 STT — 실기기(iPhone 16 Pro Max) 첫 검증
- **상태**: 해결. 실기기에서 자막 지속 + `talk_sessions` 저장 성공 확인.

## 증상 (verbatim)
실기기에서 Speak 세션을 돌리자 두 에러가 동시에:
```
Audio session was interrupted
new row violates row-level security policy for table "talk_sessions"
```
자막이 뜨자마자 끊기고, Finish 시 저장이 RLS로 거부됨.

## 버그 1 — "Audio session was interrupted" (자막이 끊김)
**근본 원인**: `TalkScreen`에 unmount 정리를 이렇게 걸었다 —
```ts
useEffect(() => () => { speech.stop(); }, [speech]);
```
`speech`는 `useSpeechSession()`이 **매 렌더마다 새로 만드는 객체**다. live 중 1초 타이머가 매초 `setSec` → 리렌더 → `speech` 참조 변경 → effect의 deps 변경 → React가 **이전 cleanup(`stop()`)을 실행**. 즉 인식 시작 ~1초 뒤부터 매 렌더마다 `ExpoSpeechRecognitionModule.stop()`이 불려 오디오 세션이 계속 끊겼다. iOS는 이를 "Audio session was interrupted"로 보고.

**수정**: 정리를 **훅 내부로 옮기고 빈 deps로** unmount 시에만 실행 —
```ts
// use-speech-session.ts
useEffect(() => () => { try { ExpoSpeechRecognitionModule.stop(); } catch {} }, []);
```
그리고 `TalkScreen`의 문제 effect 삭제. start effect의 deps도 `[phase, speech]`→`[phase]`(startedRef 가드가 1회만 보장).

**교훈/원칙**: 훅이 반환하는 **객체를 effect deps에 넣지 말 것** — 매 렌더 새 참조라 cleanup이 매번 돈다. 부수효과의 생명주기(여기선 "화면이 사라질 때 한 번")는 그 자원을 소유한 훅 안에서 빈 deps로 관리한다.

## 버그 2 — RLS 위반 (저장 실패)
**근본 원인**: 이 실기기 설치엔 **Supabase 세션이 없었다**. 루트 게이트가 `SKELETON_PREVIEW = true`라 세션 없이도 (app) 그룹을 보여줘서(디자인 스켈레톤용) **로그인 화면이 안 떴고**, 그래서 로그인한 적이 없다. `talk_sessions.user_id`의 기본값 `auth.uid()`가 null → owner 정책 `WITH CHECK (user_id = auth.uid())` 위반. (시뮬레이터엔 예전 세션이 남아 있어 이 문제가 안 보였다.)

**수정**: `SKELETON_PREVIEW = false`로 전환 → 세션 없으면 (auth) `sign-in` 화면이 뜬다. 사용자가 **이메일/비밀번호**(`signInWithPassword`)로 로그인 → 세션이 AsyncStorage에 저장 → 이후 RLS 쓰기 통과.

**교훈/원칙**: RLS 쓰기 경로를 검증할 땐 **실제 인증 세션이 있는 상태**로 테스트해야 한다. 인증 게이트를 우회하는 프리뷰 플래그는 읽기(남은 세션)만 가려주고 쓰기에서 진실이 드러난다. 실 데이터 쓰기를 붙이는 순간 프리뷰 우회는 끈다.

## 재발 방지 / 후속
- RN 화면엔 유닛 테스트 스위트가 없어(설계상 postprocess/SRS 순수함수만) 이 두 버그는 코드 리뷰 규칙으로 방지: (1) 훅 반환 객체를 effect deps에 넣지 않기, (2) 실 쓰기 검증은 로그인된 세션에서.
- `SKELETON_PREVIEW`는 이제 `false`. main 병합 전 이 상태가 정본.
- audio_key/R2 업로드는 여전히 미룸(transcript+duration만 저장). on-device STT 자체는 실기기에서 정확히 동작 확인.
