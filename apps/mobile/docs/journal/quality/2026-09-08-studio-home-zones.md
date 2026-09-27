# Studio 홈 3-존 재구성 — quality snapshot

Date: 2026-09-08

## Scope

스펙 2절. Studio 홈을 `연습(A) → 기록(B) → 정리(C)` 세 구역으로 정리하고, 각 구역이 실제로 판단 근거를 주도록 고쳤다.

- **A. Continue practicing 선택 규칙 교체.** `updated_at` 최신 하나만 보던 것을 순수 함수 `pickCurrentNote(notes, attempts, now)`로 분리했다. ① 최근 7일 내 attempt가 있는 노트 → ② 연결된 phrase가 있는 최신 노트 → ③ 최신 노트 순. `fetchStudioOverview`가 `recentAttempts`(25건)를 함께 싣는다.
- **B. Recent notes 행 재설계.** 의미 없이 순환하던 원형 아이콘(`index % 3`)을 제거하고 78 → 64pt로 줄였다. 대신 `상황 · N phrases · N attempts`를 싣고, 미분류 노트는 제목 앞 점으로 표시한다. 기본 노출 3 → 5개.
- **C. Situation 타일 → 행.** 3분할 82pt 타일은 제목을 전부 잘라 먹고 아무 수치도 주지 않았다. 세로 행으로 바꿔 전체 제목 + `N notes · N attempts` + `event_date`(있을 때)를 보여준다. 4개 이상이면 `See all` 토글, 3개 이하면 Topics로 가는 `All`.
- **용어 정리.** 1절 smoke에서 발견한 옛 어휘를 PRD 어휘로 교체: Topics 목록 `N stories` → `N situations`, 대시보드 `Active stories` / `With stories you can speak` / `With talks or versions` → `Active situations` / `With situations you can speak` / `With notes or attempts`, 세션 목록 `Your sessions` → `Your attempts`.

## Automated checks

- `npm run typecheck`: PASS.
- `npm run lint:baseline`: PASS. 0 errors / 15 warnings (기존 기준, 신규 경고 없음).
- `npm run export:ios`: PASS.

## Simulator smoke (iOS 26.5, Saylo Dev)

- **A 확인됨.** 규칙 교체 전에는 phrase 0 / attempt 0인 `Interview version`이 상단을 차지했다. 교체 후에는 `30-second version`(IDEAS · SOMETHING I LEARNED, 1 linked phrase, 2 attempts)이 올라온다. 연습 이력이 반영된다.
- **B 확인됨.** 장식 아이콘 사라지고 `Something I learned · 1 phrase · 2 attempts` 형태로 렌더. 같은 화면에 3개 대신 4개가 들어온다.
- **C 확인됨.** `What I believe` / `Something I learned` / `My design background` 모두 제목 전체 + 노트·attempt 수 표시. 이전 타일에서는 `What I b...`로 잘렸다.
- **용어 확인됨.** 대시보드가 `Active situations` / `With situations you can speak` / `With notes or attempts`로 렌더.

## Not verified

- Situations 섹션의 `See all` 토글은 탭으로 확인하지 못했다. 확인 시도 중 Expo dev-client 메뉴가 열렸고 합성 탭으로 닫히지 않아 앱을 재시작했다. 렌더는 정상이고 `showAllNotes`와 같은 패턴이라 위험은 낮지만, 실제 토글 동작은 미확인으로 남긴다.
- `pickCurrentNote`는 순수 함수로 분리했으나 `apps/mobile`에는 테스트 러너가 없어 단위 테스트를 붙이지 못했다. 웹 패키지의 vitest 설정을 모바일로 확장할지는 별도 결정이 필요하다.

## Carried over

대시보드 `Last 7 days`가 `0 min spoken`으로 나오는 선행 버그는 그대로다(총계는 1h 17m / 46 sessions). 이번 범위 밖.
