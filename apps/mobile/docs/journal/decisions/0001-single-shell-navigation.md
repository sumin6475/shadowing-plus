# ADR 0001 — 단일 셸(single-shell) 내비게이션, Expo Router 탭 대신

- **날짜**: 2026-08-02
- **스텝**: 스켈레톤 포팅 — 디자인 → React Native
- **상태**: accepted

## 맥락 (Context)
Claude Design 프로토타입(웹 React, 인라인 스타일)을 Expo/RN으로 포팅. 디자인은 상태가 강한 다화면 플로우다 — Speak는 9스텝, Talk(미러 세션)는 count→live→done→moment→retry 페이즈, 하단은 커스텀 플로팅 코발트 탭바(가운데 Speak 버튼). 프로토타입은 `SPApp`이 tab 상태 + push/pop 스택을 직접 들고 렌더한다.

## 검토한 선택지 (Options)
1. **Expo Router 파일 기반 라우트(화면당 route + Tabs 네비게이터)** — 표준 방식, 딥링크 자유 / 하지만 상태 강한 플로우(Speak 9스텝, Talk 페이즈)를 route param으로 쪼개야 하고, 커스텀 플로팅 탭바와 Router `<Tabs>`가 충돌, 보일러플레이트 증가.
2. **단일 셸 컴포넌트(`src/shell.tsx`)가 tab + push/pop 스택 + 온보딩 게이트를 소유, Expo Router는 이 트리 하나만 호스팅** — 프로토타입 `SPApp` 구조를 1:1로 옮김 / 딥링크는 포기.

## 결정 (Decision)
옵션 2 — 단일 셸(`src/shell.tsx`). Expo Router는 `(app)/index.tsx`에서 이 셸을 렌더만 한다.

## 기각 이유 (판단의 증거)
옵션 1은 상태 강한 플로우를 15개 route로 파편화해 Speak의 스텝 상태·Talk의 페이즈 상태를 param으로 실어 날라야 한다 — 프로토타입의 단일 상태 트리와 정반대. 커스텀 플로팅 탭바(가운데 mic FAB, 다크 캡슐)를 Router `<Tabs>`로 재현하기도 어렵다. 디자인이 본질적으로 "하나의 상태 트리"라 옵션 2가 포팅 충실도·코드량·버그 표면 모두에서 유리.

## 결과 (Consequences)
- **`shell.tsx`는 반드시 `src/app/` 밖에 둔다.** `src/app/` 아래의 모든 파일을 Expo Router가 route로 취급해서, 셸을 거기 두면 `Route "./shell.tsx" is missing the required default export` 경고가 뜬다(실제로 처음에 밟음 → `src/`로 이동해 해결).
- 화면 간 이동은 `nav = { push, pop, go, startTalk }` 하나로 통일(스크린은 shell을 import하지 않아 순환 없음).
- **재검토 조건 (revisit trigger)**: 개별 화면으로의 **딥링크/공유 URL**이나 OS 수준 네비게이션 상태 복원이 필요해지면, 그때 Expo Router 라우트로 전환한다.
