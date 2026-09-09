# Situation 상세 — Claude Design 포팅 quality snapshot

Date: 2026-09-09
소스: Claude Design `817dcc92-…` / `Situation Detail.html` (컨펌 2026-09-09)

## Scope

컨펌된 프레임 전부 구현. **`Phrase 상세 — 리스트 행 탭`은 컨펌 제외라 미구현**이며, 그래서 phrase 행은 탭 불가로 남겼다.

| 디자인 프레임 | 구현 |
|---|---|
| Full — Light / Dark | `StudioSituationScreen` |
| Completely empty | 같은 화면의 빈 상태 (세 섹션 모두 노출) |
| Notes only | 같은 화면의 부분 상태 |
| Loading / Error | 같은 화면의 전용 분기 |
| Useful Phrases — pushed full list | `SituationPhrasesScreen` (신규 route `situationPhrases`) |
| Attempts — pushed full list | `SituationAttemptsScreen` (신규 route `situationAttempts`) |
| Hero row 정렬 변형 A~E | 디자인이 A를 "현재"로 표기 → A 채택 (44pt 원형, 수직 중앙) |
| Phrase 상세 | **제외** |

## 토큰 처리

디자인이 전역 테마와 미세하게 다른 값을 쓴다. 전역 토큰을 건드리면 다른 화면이 흔들리므로 `useSituationTokens()`로 이 화면 계열에서만 파생했다.

| 값 | 디자인 | 전역 테마 | 처리 |
|---|---|---|---|
| well | `rgba(120,120,128,0.08 / 0.14)` | `soft` `0.12 / 0.24` | 로컬 파생 |
| hairline | `rgba(60,60,67,0.14)` | `sep` `#C6C6C8` | 로컬 파생 |
| dark accent | `#5B8AF5` | `accD` `#8FACEF` | 로컬 파생 |
| accent-soft (light) | `rgba(59,110,225,0.11)` | `accS` 동일 | 그대로 |

액센트는 코발트 유지. 디자인이 이미 코발트로 와서 리틴트 불필요.

## 코드에 없던 것 두 가지

- **`+ Date` 칩.** `situations.event_date`는 migration 028에 있었지만 **쓰는 코드가 없어 항상 null**이었다. `setSituationEventDate()`를 추가하고 칩 → `EventDateSheet`(YYYY-MM-DD 입력) → 저장까지 연결했다.
- **`Last time:` repair 노트.** `attempt.repairSuggestion`은 이미 내려오는데 화면에서 안 쓰고 있었다. 최근 attempt의 것을 Recent Attempts 위에 올렸고, 전체 목록에서는 각 행 아래에 붙였다.

## Automated checks

- `npm run typecheck`: PASS.
- `npm run lint:baseline`: PASS. 0 errors / 15 warnings (기존 기준).
  - 포팅 직후 19개로 늘었던 4건은 전부 해소: `EventDateSheet`의 effect 내 동기 setState, 두 pushed 화면의 `all` memo 의존성, 렌더 중 `Date.now()` 호출(→ fetch 시점의 `loadedAt`으로 대체).
- `npm run export:ios`: PASS.

## Simulator smoke (iOS 26.5, Saylo Dev)

- Situation 상세: `IDEAS` / `Something I learned` / `+ Date`·`1 note`·`2 attempts` 칩 / `Speaking Notes` + `+ New` 캡슐 / hero 행의 채워진 44pt 마이크 / `Useful Phrases` 뱃지(`Recognizing`) / `Recent Attempts` + `All 2` — 디자인과 일치.
- `All 2` → Attempts 전체 목록 진입 확인. `SOMETHING I LEARNED` / `Attempts` / `2 attempts`·`0 min total` 칩 / `THIS MONTH` 그룹 헤더 / 행에 chevron.

## Not verified

- **다크 모드 미확인.** 토큰은 디자인 값대로 넣었으나 시뮬레이터에서 다크로 띄워보지 않았다.
- Useful Phrases pushed 목록(`situationPhrases`)은 이 상황에 phrase가 1개뿐이라 `N more phrases` 행이 안 떠서 진입하지 못했다. 상태 필터 칩도 함께 미확인.
- `+ Date` 시트의 저장 경로(`setSituationEventDate` → Supabase update) 미실행.
- 빈 상태 / Notes only 프레임 미확인 (현재 데이터가 해당 상태가 아님).
