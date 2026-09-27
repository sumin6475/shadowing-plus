# ADR 0020 — Studio tab, iOS chrome, leftover-only review

- **날짜**: 2026-08-24
- **스텝**: iOS depth + tab IA
- **상태**: accepted

## 맥락 (Context)
하단 바가 평면적이고, Topics가 스토리 bento의 홈이었다. 학습자는 iOS 프리셋에 가까운 탭바(Today / Phrases / Studio + 가운데 Talk)와, Studio를 포트폴리오 허브로, 토픽 안은 원래 스토리 리스트로 되돌리기를 골랐다. Phrases에서는 가운데 컨트롤이 + 가 되어 문구 추가 리스트를 연다.

## 검토한 선택지 (Options)
1. **Expo Router / SwiftUI `TabView` native UITabBar** — 시스템 탭바이지만 Talk 오버레이·캡처 스택을 깨고, 가운데 칸을 Talk→Plus로 바꿀 수 없다.
2. **커스텀 셸 탭바 + `expo-blur` + `expo-symbols`** — 기존 `shell.tsx`를 유지. 블러 트레이와 SF Symbols. 가운데 orb만 페이지에 따라 아이콘이 바뀐다.
3. **`expo-glass-effect` (iOS 26 Liquid Glass)** — 최신 글래스지만 배포 타깃이 iOS 26 미만이면 쓸 수 없다.

## 결정 (Decision)
**옵션 2.** 탭은 Today · Phrases · Studio(`topics` id 유지). 가운데는 mic Talk, Phrases에서만 +. Open studio / speaking-world 배너는 프로필에서 My Studio로 옮긴다. 토픽 상세는 스토리 리스트(bento 아님). Today의 리뷰 카드는 오늘 남은 문구만 `ReviewFlow` 큐로 연다.

## 기각 이유 (판단의 증거)
1. Native UITabBar는 가운데 아이템을 Talk/Plus로 morph할 수 없고, 이 앱의 Talk·capture 스택은 Router Tabs와 충돌한다.
3. `expo-glass-effect`는 iOS 26 전용. 지금은 `BlurView` `systemChromeMaterial`이 같은 계열에서 지원 범위가 넓다.

## 결과 (Consequences)
- Sessions는 탭에서 빠지고 Studio의 Recently recorded → See all로만 간다.
- Android는 SF Symbols 대신 기존 stroke Icon으로 떨어진다.
- 재검토: iOS 26을 최소 타깃으로 올리거나, Talk를 탭이 아닌 모달로 분리하면 native TabView를 다시 볼 수 있다.
