# 2026-09-12 — 카드 뒤집기 첫 탭에 UI 스레드가 스택 오버플로

## 증상

힌트 패널에서 phrase를 처음 누르는 순간 레드박스.

```
Uncaught Error
Maximum call stack size exceeded

[UI]: set (react-native-reanimated/src/mutables.ts:104)
[UI]: talkHintSheetTsx2 (src/components/talk-hint-sheet.tsx:136)
[UI]: valueSetter_reactNativeReanimated_valueSetterTs1 (.../valueSetter.ts:13)
[UI]: set (react-native-reanimated/src/mutables.ts:104)
[UI]: talkHintSheetTsx2 (src/components/talk-hint-sheet.tsx:136)
...  (같은 3프레임이 끝까지 반복)
```

## 근본 원인

뒤집기를 "0→84도 애니메이션, 콜백에서 면 교체 후 -84도로 점프, 다시 0도로" 로 짰다.
점프와 두 번째 구간을 **첫 애니메이션의 완료 콜백 안에서 `rot.value`에 대입**해서 만들었다.

```ts
rot.value = withTiming(84, { duration: 140 }, (finished) => {
  if (!finished) { rot.value = 0; return; }   // <- 136행
  runOnJS(setBack)(!back);
  rot.value = -84;                            // <- 140행, 여기서 시작된다
  rot.value = withTiming(0, { duration: 160 });
});
```

shared value에 대입하면 Reanimated의 `valueSetter`가 **현재 붙어 있는 애니메이션을
취소**하고, 취소는 같은 콜백을 `finished === false`로 다시 부른다. 그 콜백이 136행에서
또 대입한다 → `set → valueSetter → callback → set` 무한 재귀. JS가 아니라 **UI 스레드**에서
터지므로 화면 전체가 멈춘다.

규칙: **애니메이션의 완료 콜백은 JS 작업만 예약할 수 있다(`runOnJS`). 대입은 안 된다.**

## 고친 것

구간 세 개를 하나의 `withSequence`로 합쳤다. 콜백은 면 교체만 예약하고 값은 건드리지 않는다.

```ts
const showBack = !back;
rot.value = withSequence(
  withTiming(84, { duration: 140 }, (finished) => { if (finished) runOnJS(setBack)(showBack); }),
  withTiming(-84, { duration: 1 }),   // 0이 아니라 1ms: timing이 경과시간을 duration으로 나눈다
  withTiming(0, { duration: 160 }),
);
```

`!back`을 콜백 안에서 읽지 않고 미리 `showBack`으로 고정한 것도 같이 고친 부분 — 콜백은
워클릿이라 나중에 캡처된 `back`을 읽으면 한 박자 늦은 값을 쓸 수 있다.

## 회귀 방어

정적 검사로는 안 잡힌다(`npm run validate` exit 0 상태로 터졌다). 다음에 flip/spring을
쓸 때의 체크리스트 한 줄로 남긴다: *withTiming/withSpring 콜백 안에 `.value =` 가 있으면
그건 버그다.*
