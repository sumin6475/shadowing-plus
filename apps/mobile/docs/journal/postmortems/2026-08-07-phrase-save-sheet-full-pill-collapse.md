# Postmortem — Phrase 저장 sheet의 `Save another` 버튼 누락

- **날짜**: 2026-08-07
- **영향**: Phrase 저장 완료 sheet에서 primary CTA가 보이지 않고 `Done`이 왼쪽으로 치우쳐, 같은 context에서 다음 Phrase를 저장하는 핵심 경로를 사용할 수 없었음.

## 증상
저장 완료 sheet의 제목과 설명은 보이지만 `Save another`는 렌더 영역에서 사라지고, ghost `Done` 버튼은 중앙이 아닌 왼쪽에 나타났다.

## 원인
공용 `Pill`의 `full` 옵션은 `flex: 1`을 적용한다. 이는 가로 row 안에서 버튼들이 폭을 나눌 때는 맞지만, `alignItems: "center"`인 세로 bottom sheet 안에서는 버튼이 남은 **세로 공간**을 차지했다. 다음 요소들이 아래로 밀리며 primary CTA의 내용이 정상 위치에 보이지 않았다. `Done`은 `full`이 없어 공용 기본값인 `alignSelf: "flex-start"`가 적용됐다.

## 수정
- 저장 sheet의 primary CTA는 `full` 대신 `width: "100%"`와 `alignSelf: "stretch"`를 명시했다.
- `Done`에는 `alignSelf: "center"`를 명시했다.
- 공용 `Pill` 계약은 가로 button group 사용처에 영향을 주지 않도록 변경하지 않았다.

## 회귀 확인
- TypeScript PASS
- ESLint PASS
- `git diff --check` PASS
- iOS production export PASS(1,850 modules)
- 연결된 iPhone 앱 재실행/process 유지 PASS
- 실기기 sheet의 최종 시각 확인은 사용자 탭 대기

품질 스냅샷: [Phrase capture quick source menu](../quality/2026-08-07-phrase-capture-quick-source-menu.md)
