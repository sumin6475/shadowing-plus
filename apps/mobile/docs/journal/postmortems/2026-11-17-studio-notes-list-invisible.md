# 2026-11-17 — Studio Notes 목록이 데이터가 있는데도 안 보임

## 증상
Studio → Notes 탭이 행도, 빈 상태 카드도, 로딩 표시도 없이 비어 있음. 두 번 관찰:
1. 노트 편집기에서 노트를 삭제하고 Studio로 돌아왔을 때. 탭을 바꿔도(Phrases → Studio) 그대로, Profile → My Sentences에 다녀오자 나타남.
2. 앱이 통째로 다시 로드된 직후(테마 토큰 수정 → Metro full reload).

노트 4개는 그대로 있었음(My Sentences 편집 화면의 노트 목록에 다 보임).

## 가설
- `useRefresh`의 generation 카운터 경합으로 첫 요청 결과가 버려지고 `loading`이 true로 남음 → 임시 로그로 확인: `loadNotes resolved key 1 current 1 len 4`. 데이터는 정상 반영됨. **기각.**
- `loadNotes` 요청이 멈춤 → 같은 로그로 기각.
- 목록은 렌더되지만 보이지 않음 → Folders ↔ Notes를 한 번 바꾸자 같은 데이터가 즉시 나타남. **채택.**

## 원인
목록 전체(행·빈 상태)가 `Reanimated.View key={view} entering={FadeIn.duration(150)}` 안에 있었다. 이 진입 애니메이션은 화면이 마운트될 때마다 돈다. 앱 리로드처럼 마운트 직후 네이티브 쪽이 다시 그려지는 상황에서 애니메이션이 중간에 끊기면 그 투명도에서 멈춘다. 재현: Studio를 연 채 full reload → 목록이 흐린 잔상(거의 투명)으로 몇 초가 지나도 그대로. Fast Refresh, 숨은 탭에서의 재마운트, 노트 삭제는 이번엔 재현되지 않았다(간헐적).

## 수정
목록은 마운트할 때 페이드하지 않는다. 사용자가 Folders / Notes / 폴더를 직접 바꿀 때만(`switchView` → `fadeOnSwitch`) 150ms 페이드. 모든 `setView` 호출은 `switchView`를 거친다. (`src/screens/mvp/index.tsx`, `NotesStudio`)

## 전 / 후
- 전: Studio 연 채 full reload → 목록이 흐린 잔상으로 멈춤.
- 후: 같은 절차 3회 + Folders에 둔 채 reload(상태가 Notes로 초기화되는 것으로 실제 리로드 확인) → 매번 목록이 완전히 보임. 탭 전환 페이드 유지.

## 회귀 케이스
`tests/studio-list-visibility.test.mjs`(`npm run test:mvp`에 포함): NotesStudio 안의 `entering=`이 전부 `fadeOnSwitch ?`로 가드돼 있고, 첫 상태가 false이며, `setView`가 `switchView` 안에서만 불리는지 소스에서 확인. main 코드에서는 2/2 실패, 수정 후 2/2 통과.

## 남은 것
같은 패턴의 마운트 시 진입 애니메이션: `EnterStagger`(`src/design/ui.tsx`, Settings·Privacy 사용), 온보딩 화면. 비동기 목록을 감싸지 않아 이번 범위에서 제외.
