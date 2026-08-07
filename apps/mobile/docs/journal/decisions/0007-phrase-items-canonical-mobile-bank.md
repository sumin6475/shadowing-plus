# ADR 0007 — 모바일 Phrase Bank의 정본은 `phrase_items`

- **날짜**: 2026-08-07
- **스텝**: 모바일 표현 수집·복습·self-talk 재사용
- **상태**: accepted

## 맥락 (Context)
웹은 자막 한 줄을 저장하는 `bookmarks`와, 그 안에서 뽑은 구동사·표현·문장 패턴인 `phrase_items`를 구분한다. 모바일의 Phrases 화면은 `bookmarks`를 읽고 있어서 이름과 실제 데이터 의미가 달랐고, 사용자가 배운 표현을 Story나 self-talk 추천에 다시 쓰기 어려웠다.

## 검토한 선택지 (Options)
1. `bookmarks`를 계속 Phrases로 표시하고 추천용 메타데이터를 덧붙인다.
2. `phrase_items`를 Phrase Bank의 단일 정본으로 두고, `bookmarks`는 자막 위치·문맥 저장으로만 유지한다.

## 결정 (Decision)
**옵션 2.** 모바일 Phrases, Today 복습, 즐겨찾기, SRS, 직접 입력, 붙여넣기, 스크린샷 OCR, 클립 내 선택 저장, self-talk 추천은 모두 `phrase_items`를 읽고 쓴다. `bookmarks`는 클립 자막 라인을 다시 찾는 별도 개념으로 유지한다.

표현은 원문 문맥과 출처를 함께 보존하고, `phrase_story_links`로 여러 Story에 연결한다. `phrase_events`에는 추천·수락·회상·사용·거절을 기록해 추천의 개인화와 반복 방지를 지원한다.

## 결과 (Consequences)
- 기존 `bookmarks`는 모바일 Phrases 목록에 자동으로 섞이지 않는다. 필요한 항목은 표현으로 명시적으로 저장해야 한다.
- 표현 수집 경로가 달라도 동일한 `phrase_items` 모델과 복습 상태를 공유한다.
- self-talk는 현재 Story 연결, 누적 사용, 최근 거절을 반영해 저장 표현을 먼저 추천할 수 있다.
- 스키마 사용 전 `022_phrase_story_memory.sql` 적용과 Edge Function 배포가 필요하다.
