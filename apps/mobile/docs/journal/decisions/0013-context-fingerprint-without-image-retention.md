# ADR 0013 — 이미지 없이 OCR Context fingerprint로 저장 Phrase 복원

- **날짜**: 2026-08-07
- **스텝**: `SAVED FROM THIS CONTEXT` 영속 복원
- **상태**: accepted
- **선행 결정**: [ADR 0012 — 하나의 Context에서 Phrase를 한 개씩 연속 저장](0012-multi-phrase-shared-context.md)

## 맥락 (Context)
같은 capture 화면에서는 저장한 Phrase chip을 React state로 표시할 수 있지만, 화면 재생성·앱 재시작·동일 사진 재선택 후에는 어떤 Phrase가 같은 문맥에서 왔는지 복원할 식별자가 없었다. 원본 이미지는 개인정보·비용 원칙상 서버나 Phrase Bank에 저장하지 않는다.

## 검토한 선택지 (Options)
1. **이미지 또는 image URI 저장** — screenshot identity는 직접적이지만 개인정보 안내와 임시 URI 수명에 어긋난다.
2. **OCR 원문 완전 일치만 사용** — migration 없이 단순하지만 줄바꿈·대소문자·문장부호의 OCR 변동에 취약하다.
3. **정규화 OCR 원문의 fingerprint 저장** — 이미지는 보관하지 않고 같은 언어 문맥을 안정적으로 재식별한다.
4. **별도 capture context 테이블 신설** — 확장성은 높지만 현재 beta의 한 문맥 다중 저장에는 migration과 관계 관리 비용이 크다.

## 결정 (Decision)
OCR/text Context를 1,200자로 제한한 뒤 NFKD·소문자화·발음기호 제거·영숫자 토큰·공백 정규화를 거쳐 버전된 `ctx1` fingerprint를 만든다. fingerprint는 Phrase의 기존 `source_context` JSON에 저장하며 이미지는 저장하지 않는다.

capture 진입 시 조회 순서는 다음과 같다.

1. `source_context.context_fingerprint` 일치
2. fingerprint 도입 전 데이터의 `source_context.context_text` 완전 일치
3. 두 결과가 없을 때 최근 500개 Phrase의 정규화 fingerprint 비교

hash 일치만 신뢰하지 않고 저장된 `context_text`를 다시 정규화해 동일 fingerprint인지 검증한다. 같은 Context의 legacy duplicate를 다시 저장할 때는 기존 JSON을 보존하며 fingerprint만 backfill한다.

## 결과 (Consequences)
- 화면·앱 state가 초기화돼도 동일 OCR Context의 Phrase chip을 복원할 수 있다.
- 같은 사진을 다시 골라도 이미지 자체를 저장하지 않는다.
- 대소문자·줄바꿈·일반 문장부호 차이는 같은 Context로 인식한다.
- OCR이 실제 단어를 다르게 읽으면 다른 Context로 취급해 오탐 그룹을 피한다.
- Phrase Bank가 매우 커지면 JSON lookup index 또는 별도 capture context relation으로 승격할 수 있다.
- **재검토 조건**: legacy fallback 500개 제한을 넘는 사용자가 생기거나, 한 Phrase가 여러 source context에 속해야 한다는 요구가 커질 때.
