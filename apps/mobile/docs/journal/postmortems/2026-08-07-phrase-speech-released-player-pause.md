# Postmortem — Phrase 저장 시 Render Error: 해제된 expo-audio 플레이어 pause

- **날짜**: 2026-08-07
- **화면**: Phrases (`PhrasesScreen` → `usePhraseSpeech`)
- **영향**: Phrase 저장 버튼을 누르면 화면이 Render Error로 죽음 (e2e 중 발견)

## 증상 (verbatim)

```
Render Error
FunctionCallException: Calling the 'pause' function has failed
  (at ExpoModulesCore/SyncFunctionDefinition.swift:94)
→ Caused by: NotFoundException: Unable to find the native shared object
  associated with given JavaScript object
  (at ExpoModulesCore/DynamicSharedObjectType.swift:60)

use-phrase-speech.ts (48:19)   player.pause();
phrases.tsx (76:8)             export function PhrasesScreen(...)
```

## 가설 → 원인

- `usePhraseSpeech`는 `const player = useAudioPlayer(audioUrl, { downloadFirst: true })`.
- cleanup effect가 **`[player]` 의존성**으로 걸려 있었음:
  ```ts
  useEffect(() => () => { ...; player.pause(); Speech.stop().catch(()=>{}); }, [player]);
  ```
- **근본 원인**: `useAudioPlayer`는 소스(`audioUrl`)가 바뀌면 **이전 네이티브 플레이어를 해제하고 새 인스턴스를 만든다.** Phrase 저장 → 목록 갱신/`prepare()`가 `setAudioUrl()` 호출 → 플레이어 교체 → `[player]` cleanup이 **이미 해제된 옛 플레이어**에서 `player.pause()`를 호출 → 네이티브 shared object가 없어 `NotFoundException` → 동기 함수라 그대로 throw → Render Error.
- 같은 계열의 [[postmortems/2026-08-07-expo-file-system-abi-crash]]와 달리 ABI가 아니라 **객체 수명(lifecycle)** 문제.

## 수정

- cleanup을 **unmount 전용(`[]`)**으로 바꾸고, 최신 플레이어는 `playerRef`(effect로 동기화)에서 읽어 pause. 소스 교체 시 불필요하게 옛 플레이어를 건드리지 않음.
- 해제 레이스가 남아도 죽지 않도록 동기 호출을 방어:
  ```ts
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]); // 렌더 중 ref 대입 금지(react-hooks/refs)
  useEffect(() => () => {
    requestRef.current += 1; pendingRef.current = null;
    try { playerRef.current.pause(); } catch {}   // 해제됐으면 pause할 게 없음
    Speech.stop().catch(() => {});
  }, []);
  ```
- `stop()`의 `player.pause()`와 `startCloud()`의 `player.play()`도 try/catch로 감쌈. `seekTo`는 이미 `.catch()` 가드.

## Before / After

- **Before**: 저장 → 플레이어 교체 → 옛 플레이어 pause → 크래시.
- **After**: 교체 시 cleanup이 옛 플레이어를 건드리지 않음. tsc=0, eslint=0. 실기기 리로드 후 저장 재시도 확인 대기.

## 회귀 방지

- 이 프로젝트의 유닛 테스트는 postprocess/SRS 순수함수에 한정이라 훅 렌더 테스트 하네스는 없음. 대신 규칙으로 남김: **`useAudioPlayer` 같은 네이티브 shared object는 소스 교체 시 해제된다 — cleanup은 unmount 전용 + 최신 인스턴스는 ref로 + 동기 호출은 try/catch.** ([[mobile-audio-session-shared]] 관련)
