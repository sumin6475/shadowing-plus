# ADR 0011 — AI 세부정보 채움은 사용자가 확정한 Phrase에 고정

- **날짜**: 2026-08-07
- **스텝**: 수동 Phrase 및 OCR 수정 후 AI 자동 채움
- **상태**: accepted
- **선행 결정**: [ADR 0010 — Phrase 빠른 source menu와 공통 편집기](0010-phrase-capture-quick-source-menu.md)

## 맥락 (Context)
기존 AI 채움은 context에서 Phrase까지 선택하는 방식이라 문맥 없이 Phrase만 직접 입력한 사용자는 뜻·종류·usage note를 자동 생성할 수 없었다. 또한 OCR이 제안한 Phrase를 사용자가 수정하면 기존 AI 세부정보가 이전 표현을 설명하는 상태로 남을 수 있었다.

## 검토한 선택지 (Options)
1. **Phrase 입력 때마다 자동 재생성** — 조작은 적지만 타이핑 중 호출·비용·race가 발생하고 사용자가 작성한 필드를 예고 없이 덮어쓴다.
2. **context 추출만 재사용** — 문맥 없는 직접 입력을 처리하지 못하고 AI가 사용자의 Phrase를 다른 표현으로 바꿀 수 있다.
3. **현재 Phrase 고정 + 명시적 세부정보 채움** — 사용자가 호출 시점을 정하고 Phrase는 보존한 채 나머지 필드만 갱신한다.

## 결정 (Decision)
`Fill details with AI`는 현재 Phrase와 선택적 context를 서버에 보내고 kind·meaning·usage note만 채운다. 서버는 모델이 반환한 Phrase를 사용하지 않고 요청의 `phrase_text`를 응답에 그대로 고정한다. OCR/문맥 추천 Phrase가 수정되면 UI를 `Update AI details`로 바꿔 세부정보가 오래됐음을 표시한다.

## 기각 이유 (판단의 증거)
타이핑 debounce 자동 호출은 미완성 문자열과 사용자의 수동 세부정보를 다루는 정책이 복잡하다. context 추출은 “문맥에서 무엇을 저장할지”를 고르는 동작이고, 사용자가 이미 Phrase를 정한 뒤 “이 표현을 설명해 달라”는 동작과 목적이 다르다.

## 결과 (Consequences)
- 문맥 없이 Phrase만 입력해도 AI 보조를 받을 수 있다.
- OCR Phrase 수정 후 기존 의미가 어긋난 상태를 UI가 드러낸다.
- 버튼을 누르면 현재 kind·meaning·usage note는 AI 초안으로 교체되지만 Phrase와 context는 유지된다.
- **재검토 조건**: 사용자가 update 버튼을 발견하지 못하거나, 수동 입력 후 자동 채움 완료율이 낮거나, 명시적 클릭보다 안전한 on-blur 동작이 검증될 때.
