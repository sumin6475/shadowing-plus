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

## Follow-up pass — 나머지 상태 전부 확인 (같은 날)

`+ more` 노출 조건 변경 후, 앞서 미확인이던 항목을 실기기 경로로 모두 확인했다. 별도 테스트 데이터는 만들지 않았다 — 기존 계정에 필요한 상태가 이미 다 있었다.

| 항목 | 사용한 데이터 | 결과 |
|---|---|---|
| Phrases pushed 목록 | `Ideas / Something I learned` (phrase 1개) | PASS. `All 1 phrase` 행 → 목록 진입 |
| 상태 필터 칩 | 같음 | PASS. `All 1` / `Recognizing 1`, 선택 시 accent 채움으로 토글 |
| 빈 상태 | `Work / Study / Current project` (0 notes · 0 attempts) | PASS. 디자인 그대로 — `What will you need to say here?` + `Write your first note` CTA, `+ Add phrase`, `Start your first attempt` 행. 빈 상태에서 섹션 헤더의 `+ New`가 사라지는 것도 디자인과 일치 |
| Notes only | `Work / Study / My research` (1 note · 0 phrases · 0 attempts) | PASS |
| 다크 모드 | `simctl ui booted appearance dark` | PASS. accent가 `#5B8AF5`로 전환, 카드 `#1C1C1E`, hairline·뱃지·dashed 칩 모두 판독 가능. 확인 후 light로 복구 |
| `+ Date` 저장 | `Something I learned` | **FAIL — 서버 오류. 아래 참조** |

## `+ Date`는 원격 스키마 때문에 동작하지 않는다

시트에서 `2026-09-18` 입력 후 저장하면 Supabase가 그대로 거절한다:

```
Could not find the 'event_date' column of 'stories' in the schema cache
```

**즉 원인은 "쓰는 코드가 없었다"가 아니라 컬럼이 원격에 아예 없다는 것이다.** 앞선 스냅샷의 기록대로 local migration은 001–028인데 원격 ledger는 020까지만 잡혀 있어 `028_studio_information_architecture.sql`이 적용되지 않았다. `fetchStudioSituations`의 legacy fallback이 `event_date`를 빼고 조회하기 때문에 읽기는 조용히 null로 넘어가고, 쓰기에서만 드러났다.

- UI 동작 자체는 정상: 오류가 시트 안에 그대로 노출되고 앱이 죽지 않는다.
- **원격 DB는 건드리지 않았다.** ledger 불일치 상태에서 028만 적용하면 미기록 선행 마이그레이션을 건너뛰게 되어 위험하다. 마이그레이션 이력을 먼저 정리해야 한다.
- 그때까지 `+ Date` 칩은 눌러도 저장되지 않는다. 코드 되돌림 없이 남겨둔다 — 스키마가 맞춰지는 순간 동작한다.

## 부수적으로 고친 것

- **`+ Date` 시트에서 키보드가 올라오면 저장 버튼이 화면 밖으로 밀렸다.** 시트 본문을 `ScrollView`로 감쌌다 (`QuickNoteSheet`와 같은 방식). 이 버그 때문에 처음엔 저장을 눌러보지도 못했다.
- **`N more phrases` 행을 항상 노출하도록 변경.** 5개 이하일 때 pushed 목록으로 갈 길이 없었다. 숨긴 게 없으면 라벨이 `All N phrases`로 바뀐다 — 디자인의 다크 프레임이 쓰던 문구다.

## 재검증

- `npm run typecheck`: PASS.
- `npm run lint:baseline`: PASS. 0 errors / 15 warnings.
- `npm run export:ios`: PASS.

## 남은 미확인

- 노트 행 마이크 버튼(연습 진입) 탭 — `startNotePractice`는 홈에서 쓰던 동일 경로.
- Attempts pushed 목록의 주차 그룹 경계(`Last week` / `Earlier`) — 현재 데이터가 전부 한 버킷에 들어간다.
- 각 attempt의 `repairSuggestion` 인라인 노출 — 현재 데이터에 repair가 붙은 attempt가 없다.
