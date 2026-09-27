# ADR 0010 — Phrase 수집은 빠른 source menu에서 하나의 편집기로 합류

- **날짜**: 2026-08-07
- **스텝**: Phrase 외부 수집 흐름 단순화
- **상태**: accepted
- **선행 결정**: [ADR 0007 — Phrase items를 모바일 학습 표현의 정본으로](0007-phrase-items-canonical-mobile-bank.md)

## 맥락 (Context)
전 화면의 `+`는 학습 중 발견한 표현을 놓치지 않게 하는 capture 진입점이다. 기존 구현은 먼저 전체 화면을 열어 screenshot, paste text, type a phrase 중 하나를 다시 고르게 해 짧은 수집 동작에 화면 전환이 하나 더 필요했다. 붙여넣기와 직접 입력도 실제로는 같은 원문 문맥과 같은 Phrase 필드를 편집하므로 별도 흐름이 중복됐다.

## 검토한 선택지 (Options)
1. **전체 화면 source chooser 유지** — 설명 공간이 넓지만 모든 capture에 불필요한 화면 전환이 생기고 paste/type 편집기가 갈라진다.
2. **`+` 탭 즉시 단일 빈 편집기** — 가장 단순하지만 카메라와 사진을 빠르게 시작할 수 없고 이미지 OCR의 발견성이 낮다.
3. **작은 source menu → 공통 편집기** — 카메라·사진·텍스트 시작은 빠르고, AI 제안과 수동 수정·저장을 한 화면에서 일관되게 처리한다.

## 결정 (Decision)
전 화면의 `+`는 iOS attachment menu처럼 `Take a Photo`, `Choose from Photos`, `Write or Paste Text`를 보여주는 작은 오버레이를 연다. 카메라와 사진은 선택 즉시 네이티브 picker를 열고 OCR 후 공통 편집기로 합류한다. 텍스트는 같은 편집기에서 입력·붙여넣기하며, `Fill from context`를 사용자가 명시적으로 눌렀을 때만 AI가 Phrase·종류·뜻·메모 초안을 제안한다. 모든 제안은 저장 전에 사용자가 수정·확정한다.

## 기각 이유 (판단의 증거)
전체 화면 chooser는 사용자가 이미 `+`로 capture 의도를 밝혔는데 다시 방법을 고르기 위한 큰 화면을 요구한다. 빈 편집기 직행은 이미지 capture를 숨기고 사진 권한·OCR 동작을 텍스트 입력과 섞는다. Paste와 Type을 분리하면 같은 context/phrase/meaning/source 필드와 validation을 두 번 유지해야 한다.

## 결과 (Consequences)
- source 선택은 짧아지고, picker 취소 시 현재 화면을 그대로 유지한다.
- 이미지 capture는 자동 추출하되 원본 이미지는 앱 데이터로 저장하지 않는다.
- 텍스트 AI 호출은 opt-in이므로 단순 직접 입력은 네트워크 없이 저장할 수 있다.
- `expo-clipboard`가 네이티브 의존성으로 추가되어 dev-client 재빌드가 필요하다.
- **재검토 조건**: source menu가 발견되지 않거나 오선택이 반복될 때, 자동 채움 사용률이 매우 낮을 때, 또는 텍스트 입력과 이미지 OCR이 서로 다른 필드를 요구하게 될 때.
