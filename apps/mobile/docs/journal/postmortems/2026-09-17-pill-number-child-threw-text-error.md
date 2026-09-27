# Postmortem — 숫자가 섞인 Pill 라벨이 Text 에러를 내고 빈 캡슐로 그려짐

- **날짜**: 2026-09-17
- **스텝**: MVP 시뮬레이터 폴리시
- **심각도**: P1 (핵심 연습 화면에 빨간 에러 토스트 + 버튼 하나 사라짐)

## 실패 현상
Phrase 상세(1단계 카드)에서 "Repeat 5×" 옆 속도 버튼이 **빈 회색 원**으로 그려지고, 화면 하단에 LogBox 토스트:

```
Console Error
Text strings must be rendered within a <Text> component.
  ui.tsx (469:7)  <View style={{ flexDirection: "row", ...
  Component Stack: <View /> <Pill /> ui.tsx:469
```

## 가설
- **H1**: `Pill`에 문자열이 아닌 children이 들어가 `<Text>` 밖에서 렌더된다.

## 검증 방법과 결과
- H1 → 확정. 호출부 `screens/mvp/index.tsx`의 `<Pill …>{rate}× speed</Pill>`는 JSX상 `[1, "× speed"]` **배열**이다. `Pill`은 `typeof children === "string"`일 때만 `<Text>`로 감싸고, 나머지는 그대로 `<View>`에 넣는다.

## 근본 원인
`Pill`의 "라벨이냐 커스텀 노드냐" 판정이 `typeof === "string"` 하나였다. JSX 보간(`{n}단어`)은 문자열이 아니라 배열을 만들기 때문에, 평범한 텍스트 라벨이 커스텀 노드로 오분류됐다. 2026-09-10 postmortem(`pill-white-tone-fix-blanked-a-label`)과 같은 분기점 — 이 분기는 두 번째로 사고를 냈다.

## 수정
`ui.tsx` `Pill`: children(단일이든 배열이든)이 전부 string/number면 라벨로 보고 `<Text>`로 감싼다 (`isLabel`). 호출부를 템플릿 리터럴로 바꾸는 대신 컴포넌트에서 막아, 같은 모양의 다른 호출부도 함께 막힘.

## 지표 before / after
- before: 속도 버튼 빈 원 + LogBox 에러
- after: "1× speed" 표시, 탭하면 "0.75× speed"로 토글, 에러 없음 (iPhone 17 Pro 시뮬레이터)

## 재발 방지 (회귀 스위트에 추가)
- 없음. RN 컴포넌트 렌더 테스트 환경이 아직 없어서 `Pill`은 단위 테스트로 못 묶었다. 같은 세션의 blank-note 수정은 `tests/mvp-model.test.mjs`(`isBlankNote`)에 케이스를 추가했다.
