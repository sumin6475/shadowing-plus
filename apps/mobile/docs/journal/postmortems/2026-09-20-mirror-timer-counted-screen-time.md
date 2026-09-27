# Postmortem — 거울 타이머가 "말한 시간"이 아니라 "화면 켜둔 시간"을 셌다

- **날짜**: 2026-09-20
- **스텝**: MVP 시뮬레이터 폴리시 — 남은 항목 정리
- **심각도**: P1 (핵심 지표인 speaking time이 조용히 부풀어 있었음)

## 실패 현상
Profile "RECENT SESSIONS"에 transcript가 없는데 길이만 긴 세션이 남아 있었다.

```
59 min 6s of speaking      9/12/2026
No transcript captured.
```

"SPEAKING TIME · LAST 7 DAYS"가 77 min 31s로 뜨는데 실제로 그만큼 말한 기억이 없다 — 2026-09-17 워크스루에서 "transcript 없는 59분 세션"으로 기록해 둔 항목.

## 가설
- **H1**: 저장 시 seconds 계산이 틀렸다(ms/s 혼동 등).
- **H2**: 타이머가 "인식기가 켜져 있는 동안" 돌아서, 말하지 않아도 초가 쌓인다.

## 검증 방법과 결과
- H1 → 기각. `talk.tsx` `persist()`는 화면 상태 `sec`를 그대로 넘기고, `saveMirrorSession`도 그대로 저장한다. 단위 변환 없음.
- H2 → 확정. 타이머가 `phase === "live" && speech.recognizing` 조건에서 1초마다 무조건 증가:

```tsx
useEffect(() => {
  if (phase !== "live" || !speech.recognizing) return;
  const timer = setInterval(() => setSec((s) => s + 1), 1000);
  return () => clearInterval(timer);
}, [phase, speech.recognizing]);
```

거울을 열어두고 자리를 뜨면 인식기는 계속 돌고, 말은 없으니 transcript는 비어 있고, 초만 쌓인다 → "59분, transcript 없음"의 정확한 형태.

## 근본 원인
지표의 정의와 계측이 달랐다. 화면은 "of speaking"이라 말하지만, 세고 있던 건 마이크가 켜져 있던 시간이었다. 말했는지 여부를 판별할 신호(`speech.transcript`가 갱신되는가)가 이미 손에 있었는데 쓰지 않았다.

## 수정
`tickCountsAsSpeaking(now, lastHeard)` — 마지막으로 새 단어가 들어온 시점에서 `SPEECH_IDLE_GRACE_MS`(10초) 이내일 때만 1초를 센다. 문장 사이의 보통 멈춤은 그대로 세고, 조용한 화면은 최대 10초까지만 센다. 판정은 순수 함수로 `mvp-model.ts`에 두고, 화면은 `Date.now()`만 넘긴다.

## 지표 before / after
- before: 조용히 열어둔 59분 → 59분으로 저장.
- after: 같은 상황에서 최대 10초. (시뮬레이터에는 음성 인식이 없어 런타임 재현은 못 함 — 단위 테스트로 고정.)
- **기존 DB 행은 그대로다.** Profile 합계(3 h 4 min)에는 부풀려진 과거 세션이 아직 포함돼 있다. 삭제/보정은 Sumin 결정 대기.

## 재발 방지 (회귀 스위트에 추가)
`tests/mvp-model.test.mjs` → "a silent mirror stops banking speaking time": 같은 시각·3초 멈춤은 센다, 유예 초과와 59분 침묵은 세지 않는다.
