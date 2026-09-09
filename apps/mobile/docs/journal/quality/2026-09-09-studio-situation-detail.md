# Situation 상세 위계 재정렬 — quality snapshot

Date: 2026-09-09

## Scope

스펙 3절. PRD가 정한 `Speaking Notes(1) ≫ Useful Phrases(2) ≫ Recent Attempts(3)` 위계를 화면에 실제로 반영했다.

- **Hero 제거.** 현재 노트를 큰 별도 카드로 띄우던 `Hero`를 없앴다. 같은 노트가 Hero와 목록에 두 번 나오면서 위계를 흐렸고, Hero + `New speaking note` 풀폭 버튼 + 섹션 헤더가 쌓여 정작 노트 목록이 첫 화면 밖으로 밀렸다. 연습 진입은 목록 첫 행 안의 마이크 버튼으로 흡수했다(첫 행만 채운 accent, 나머지는 연한 톤).
- **헤더에 메타 한 줄.** `event_date · N notes · N attempts`. 날짜는 있을 때만.
- **`+ New`를 섹션 헤더 액션으로.** 목록 위를 차지하던 풀폭 `Pill`을 걷어냈다.
- **Useful phrases를 실제 2열로.** `PHRASE` / `STATUS` 컬럼 헤더, 5개까지 노출 + `All N` 토글. 상태 문자열은 `phraseStatusLabel`로 정규화(`recognizing` → `Recognizing`).
- **Recent attempts를 카드 밖으로.** `Card` 크롬을 벗기고 구분선만 남긴 저강도 3줄로 축소. 날짜 · 노트 제목 · 길이. 4개 이상이면 `All`로 전체 목록.

## Automated checks

- `npm run typecheck`: PASS.
- `npm run lint:baseline`: PASS. 0 errors / 15 warnings (기존 기준). Hero 제거로 뜬 미사용 import 경고 1건은 import를 지워 해소했다.
- `npm run export:ios`: PASS.

## Simulator smoke (iOS 26.5, Saylo Dev)

`Ideas / Something I learned` 상황에서 확인.

- 헤더가 `1 note · 2 attempts`로 렌더. eventDate가 없어 날짜는 생략됨(의도대로).
- Speaking notes가 카드 목록으로 가장 크게 나오고, 첫 행 우측에 채워진 마이크 버튼이 붙음.
- Useful phrases가 `PHRASE` / `STATUS` 헤더와 함께 2열로 렌더. `What I'm trying to do is...` / `Recognizing`.
- Recent attempts가 카드 없이 `Aug 17  30-second version  0s` 형태의 저강도 줄로 렌더.
- 세 섹션의 시각 무게가 눈으로 구분된다. 이전에는 셋 다 같은 `Sect` + `Card`였다.

## Not verified

- 노트 행의 마이크 버튼(연습 진입)은 탭하지 않았다. `startNotePractice`는 홈에서 이미 쓰이던 동일 경로다.
- `All N` phrase 토글은 이 상황에 phrase가 1개뿐이라 노출되지 않아 확인 못 했다.

## Deferred

Speaking Note 상세(스펙 4절)는 이번 범위에 넣지 않았다. 자동 저장·열린 편집·sticky CTA는 연습 후 노트로 복귀하는 6절 `returnTo` 작업과 짝을 이뤄야 의미가 있어서, 둘을 다음 PR에서 같이 처리한다.
