# ADR 0012 — 하나의 Context에서 Phrase를 한 개씩 연속 저장

- **날짜**: 2026-08-07
- **스텝**: OCR Context 다중 Phrase 저장
- **상태**: accepted
- **선행 결정**: [ADR 0011 — AI 세부정보 채움은 사용자가 확정한 Phrase에 고정](0011-ai-details-anchor-to-user-phrase.md)

## 맥락 (Context)
하나의 자막·문장에서 `not that it matters`, `baked into`처럼 둘 이상의 표현을 보관하고 싶을 수 있다. 각 표현을 저장할 때마다 사진 선택과 OCR을 반복하면 포착 흐름이 끊기지만, AI가 감지한 후보를 한 번에 모두 저장하면 사용자가 Phrase Bank에 넣을 표현을 직접 고른다는 원칙이 약해진다.

## 검토한 선택지 (Options)
1. **한 번에 여러 후보를 선택해 일괄 저장** — 빠르지만 AI 후보 검토·뜻 수정·중복 처리와 실패 복구가 복잡하다.
2. **매 저장 후 capture를 종료** — 구현은 단순하지만 같은 source를 다시 가져와야 한다.
3. **한 개씩 저장하고 shared context를 유지** — 각 Phrase는 독립적으로 검토하면서 사진·원문·번역·Story 연결은 재사용한다.

## 결정 (Decision)
Phrase는 한 번에 하나씩 명시적으로 저장한다. 저장 직후 `Save another`와 `Done`을 제공하고, `Save another`는 사진·OCR 원문·전체 번역·source·Story를 유지한 채 Phrase 전용 필드만 비운다. 같은 capture에서 저장된 Phrase는 `SAVED FROM THIS CONTEXT` chip으로 표시하며, chip을 누르면 저장값을 확인하고 Phrase·종류·뜻·usage note를 바로 수정할 수 있다.

OCR 또는 context AI 응답은 원문 전체의 자연스러운 한국어 번역을 함께 반환한다. 번역은 기존 `source_context` JSON에 저장해 Phrase 상세에서도 원문과 함께 확인한다. 사용자가 context 원문을 직접 바꾸면 오래된 번역은 즉시 제거하고 다음 AI 채움 때 다시 생성한다.

## 결과 (Consequences)
- 같은 문맥에서 여러 표현을 저장해도 OCR·사진 선택을 반복하지 않는다.
- 각 Phrase의 최종 선택과 세부정보는 계속 사용자 통제 아래 있다.
- 저장 완료 sheet는 배경 탭으로 우발적으로 넘어가지 않고 명시적 버튼으로만 진행한다.
- 별도 테이블이나 migration 없이 기존 `source_context` JSON으로 전체 번역을 보존한다.
- **재검토 조건**: 한 context당 저장 개수가 크게 늘어 one-by-one 흐름이 병목이 되거나, 후보 일괄 선택 요구가 반복해서 관찰될 때.
