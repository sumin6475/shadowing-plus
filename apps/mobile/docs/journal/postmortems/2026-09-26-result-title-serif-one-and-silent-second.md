# Postmortem — 결과 화면 "ls of speaking.": 세리프의 1이 l로 보이고, 말 없는 1초가 저장됨

- **날짜**: 2026-09-26
- **스텝**: build 31 실기기 피드백 — Mirror 결과 화면
- **심각도**: P2

## 실패 현상
TestFlight 1.0.0 (31)에서 Mirror를 열고 말없이 곧바로 Finish. Sumin: "speaking 하고 나서 화면이 아직도 이상해".

```
SESSION SAVED
ls
of speaking.
A little more English, in your own voice.
TRANSCRIPT
The microphone didn’t capture any words. Your speaking time is still recorded.
```

Profile의 RECENT SESSIONS에도 `1s of speaking · No transcript captured.`가 남았다.

## 가설
- **H1**: 제목 문자열이 또 깨졌다(9/24의 `\n` 리터럴 버그 재발).
- **H2**: 글꼴 — "1s"가 "ls"로 보인다.
- **H3**: 말이 없었는데 1초가 기록된 건 타이머가 아직 무음을 센다.

## 검증 방법과 결과
- H1 → 기각. 문자열은 `${durationLabel(1)}\nof speaking.` = `"1s\nof speaking."`, 줄바꿈은 의도대로 동작.
- H2 → 확인. PIL로 번들된 `InstrumentSerif-Regular.ttf`에 "1s", "11 sec", "0:01"을 렌더 → "ls", "ll sec", "0:0l". fontTools로 확인: GSUB 기능 `aalt, case, ccmp, dlig, liga, locl, ordn, ss01`, 1 글리프는 `one` 하나 — 대체 글리프 없음. Profile의 "SPEAKING TIME · LAST 7 DAYS" 합계와 표현 개수(Serif)도 같은 문제.
- H3 → 확인. `recognizing`이 켜질 때 `heardAt = Date.now()`로 리셋 → 첫 `SPEECH_IDLE_GRACE_MS`(10초)는 단어가 없어도 틱이 셈. 1초 만에 Finish → `sec = 1`.

## 근본 원인
세 겹.
1. 디스플레이 세리프(Instrument Serif)의 "1"은 "l"과 같은 모양이다. 숫자를 이 글꼴로 크게 쓰는 모든 곳이 오독된다 — 글꼴을 들일 때(ADR 0025) 숫자는 확인하지 않았다.
2. 9/20 타이머 수정은 "말하는 동안만 센다"였지만, 시작할 때 grace를 한 번 공짜로 줬다 — "아직 아무것도 못 들음"과 "방금 들음"을 구분하지 않았다.
3. 결과 화면은 전사 유무와 상관없이 무조건 저장했고, "말한 시간은 기록된다"는 문구는 타이머 수정 이후 거짓이 됐다.

## 수정
- 숫자: `FONT.figure = "ui-serif"`(iOS 시스템 세리프 New York — 1에 깃발과 받침). `Serif`는 브랜드 세리프 안의 숫자 구간(`lib/figures.ts` `splitFigures`)을 자동으로 New York으로 그린다. 결과 화면은 Wispr Flow/SpeakType식 통계 카드로 재구성(큰 숫자 + 옆 라벨, 2×2 격자).
- 타이머: `heardAt`은 전사가 비어 있지 않을 때만 갱신, 시작 시 리셋 제거 → 첫 단어 전에는 0초. 단어가 있으면 최소 1초.
- 빈 세션: 저장하지 않고 "NOTHING SAVED · No words caught." + Listen back / Try again (ADR 0026).

## 지표 before / after
- 무음 Finish: `1s` 저장 + "ls of speaking." → 저장 없음, "No words caught."
- Profile 합계 "27 min 56s": 1과 l이 구분됨(숫자 구간 New York).
- 시뮬레이터(가짜 전사 임시 주입, 커밋 전 제거): 결과 카드 "46 words spoken · 1m 23s · 33 wpm · 2/5 · 35 different words", 빈 상태 화면, 저장된 세션(995 words · 10m 29s · 95 wpm · 310) 확인.

## 재발 방지 (회귀 스위트에 추가)
`tests/mvp-model.test.mjs`
- "before the first words, no second counts as speaking" — `heardAt` 0(못 들음)이면 틱 없음.
- "figures split out of serif text so a 1 never reads as an l" — `splitFigures`.
- "session stats: words, different words, and a pace only once it means something" — 15초 미만은 wpm null(3단어/2초 = 90 wpm 같은 헛수치 방지).
