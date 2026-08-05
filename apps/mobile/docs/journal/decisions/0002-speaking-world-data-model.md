# ADR 0002 — Speaking World 데이터 모델 (새 트리, islands 재사용 아님)

- **날짜**: 2026-08-05
- **스텝**: Speak/Topics 실데이터화 — 설계
- **상태**: accepted

## 맥락 (Context)
모바일 제품 문서(`docs/product/speaking-world.md`)는 `Speaking World → Domain → Story → Message → Session` 트리를 제품 방향으로 못박았다. 표현(Phrase)은 Story에 속하고, AI는 빈 영역을 넓혀준다. 그런데 현재 Topics(world)·Speak(talk) 화면은 전부 목업이고, 백엔드에는 이 트리가 없다.

백엔드에 있는 건 웹의 `islands` 시스템(migration 019): `islands`(kind=`explain_what_i_do`) + `island_beats`/`island_attempts`/`island_repairs`/`island_phrase_events`. 이건 **"내가 하는 일 설명하기" 하나짜리 워크스페이스**로, 여러 Domain·여러 Story·Message 계층을 모델링하지 않는다. 웹은 이걸 활발히 사용 중이라 스키마를 바꿀 수 없다.

## 검토한 선택지 (Options)
1. **기존 `islands` 재사용** — 모바일 Speak을 explain_what_i_do island 위에 구축, 웹과 데이터 공유 / 하지만 island는 단일 목적이라 Domain(여러 개)·여러 Story·Message 계층을 표현하려면 `kind` 확장 + 억지 매핑이 필요. 제품 모델과 어긋남.
2. **새 Speaking World 트리 신설** — `domains/stories/messages/message_beats/talk_sessions` 마이그레이션(020) / 더 크고 greenfield, 웹 island와 분기.
3. **하이브리드** — island 깊이 먼저, 트리 나중.

## 결정 (Decision)
옵션 2 — **새 트리(migration 020)**를 go-forward 모델로 신설. owner-scoped RLS(008/013/019 패턴). 1차 범위는 **스키마 + Topics 트리 실데이터**(도메인/스토리/메시지 탐색·생성·초기 시드); **녹음·AI는 다음 단계**.

## 기각 이유 (판단의 증거)
옵션 1의 `islands`는 `kind='explain_what_i_do'` 단일 목적이고 `(user, kind)` 유니크 제약까지 있어, 제품 문서의 "여러 Domain × 여러 Story × 여러 Message"를 담으려면 스키마를 사실상 다시 짜야 한다. island를 재사용하면 제품 모델(내가 만드는 Speaking World)과 계속 싸우게 된다. 옵션 3은 옵션 2의 1차 범위와 실질적으로 같으므로 별도 선택지가 아니다. 제품 문서가 "완벽한 분류 체계일 필요 없다, 먼저 만들고 피드백으로 발전"이라 명시하므로 트리를 지금 세우고 진화시키는 게 방향에 부합.

## 결과 (Consequences)
- **웹 `islands`와 당분간 공존**한다 — Speaking 시스템이 둘(웹 island / 모바일 트리). 이 divergence가 이 결정의 비용. `islands`의 explain_what_i_do는 나중에 `domains=About me / stories=What I do`로 흡수할 레거시 부분집합으로 본다.
- 020은 **공유 Supabase 스키마 변경**이라 SQL Editor에서 수동 실행해야 하고, 웹에도 (읽지 않더라도) 존재하게 된다.
- **Phrase↔Story 링크는 이번에 미룸**(`phrase_items` vs `bookmarks` 두 표현 개념이 있어 별도 판단 필요) — 후속 마이그레이션.
- 초기 Domain 5개는 마이그레이션이 아니라 **첫 사용 시 클라이언트가 시드**(마이그레이션은 per-user 시드를 못 하므로).
- **재검토 조건 (revisit trigger)**: 사용자 피드백에서 Domain/Story 구분이 실제 말하기 흐름과 안 맞으면 재구성한다(제품 문서가 예상한 진화). 또는 웹이 같은 트리로 옮겨오면 island 흡수 마이그레이션을 실행한다.
