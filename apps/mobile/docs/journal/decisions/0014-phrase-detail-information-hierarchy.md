# ADR 0014 — Phrase 상세는 학습 행동 중심의 정보 위계로 구성

- **날짜**: 2026-08-07
- **스텝**: Phrase 상세 재디자인
- **상태**: accepted

## 맥락 (Context)
기존 Phrase 상세는 히어로·출처·원문·노트·현재 단계가 모두 같은 흰색 Card와 같은 파란 대문자 제목을 사용했다. 사진에서 저장한 Phrase에는 `WHERE YOU FOUND IT / Saved from photo · 0:00`이 별도 Card로 보여 정보 가치보다 시각적 무게가 컸고, 저장된 종류(Expression/Phrasal verb 등)와 편집 진입점은 보이지 않았다.

## 결정 (Decision)
- Phrase·뜻·TTS·kind·상태를 가장 큰 흰색 hero에 모은다.
- 원문과 전체 번역은 옅은 파란색 `In context` 패널로 묶어 저장 이유를 두 번째 위계로 둔다.
- 출처는 context 패널 하단 metadata로 낮춘다. 실제 Library clip으로 이동할 수 있을 때만 탐색 affordance를 제공한다.
- note는 배경 위의 가벼운 section으로, proficiency stage만 하나의 흰색 Card로 유지한다.
- 편집과 삭제는 우측 상단 overflow menu에 넣고, 편집 bottom sheet에서 Phrase·kind·meaning·usage note를 함께 고친다.
- 상세 화면에서는 전역 capture FAB를 숨겨 현재 Phrase의 학습 행동과 충돌하지 않게 한다.

## 결과 (Consequences)
- 큰 hero → context → note → practice 순서로 시선과 행동 흐름이 명확해진다.
- photo/manual source는 불필요한 Card를 차지하지 않으며 실제 clip source는 계속 열 수 있다.
- Phrase 종류를 상세에서 확인하고 저장값을 같은 화면에서 수정·삭제할 수 있다.
- Phrase 추가는 목록/Today 등 collection surface의 전역 FAB에서 시작하고, 개별 상세는 현재 Phrase에 집중한다.

