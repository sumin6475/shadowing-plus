# 적용된 마이그레이션 (원격)

이 리포는 Supabase CLI를 쓰지 않는다. `supabase/migrations/*.sql`을 Supabase SQL Editor에 **번호 순서대로 붙여넣어** 실행한다. 그래서 어디까지 적용됐는지 아는 유일한 방법이 이 파일이다.

**`supabase_migrations.schema_migrations`를 믿지 말 것.** 2026-09-09 확인 결과 `020` 한 줄만 들어 있는데, 001–019는 명백히 적용된 상태였다. CLI를 한 번 스쳤을 때 남은 흔적이지 적용 목록이 아니다.

## 규칙

- 마이그레이션을 원격에 적용하면 **같은 커밋에서** 아래 표에 줄을 추가한다.
- 한 번에 파일 하나씩 실행한다. 합치면 어디서 실패했는지 알 수 없다.
- 데이터 백필이 있는 파일은 실행 전 백업 스냅샷을 뜬다.

## 적용 현황

| # | 파일 | 적용일 | 비고 |
|---|---|---|---|
| 001–020 | `001_rebuild_schema` … `020_speaking_world` | 2026-09-09 이전 | 정확한 날짜 미상. 2026-09-09 스키마 조사에서 모두 존재 확인 |
| 021 | `021_favorites` | 2026-09-09 이전 | 조사에서 확인 |
| 022 | `022_phrase_story_memory` | 2026-09-09 이전 | 조사에서 확인 |
| 023 | `023_talk_suggestion_feedback` | 2026-09-09 이전 | 조사에서 확인 |
| 024 | `024_phrase_learner_note` | 2026-09-09 이전 | 조사에서 확인 |
| 025 | `025_talk_suggestion_verdict_note` | 2026-09-09 이전 | 조사에서 확인 |
| 026 | `026_avatars_bucket` | 2026-09-09 이전 | 조사에서 확인 |
| 027 | `027_talk_feedback_detail_contract` | **2026-09-09** | 이게 빠져 있어 AI 피드백 저장이 전부 실패하고 있었다 |
| 028 | `028_studio_information_architecture` | **2026-09-09** | 백필 포함. 사전 점검 `messages_without_a_topic = 0` 확인 후 실행 |

## 상태를 다시 확인해야 할 때

`.agents/plans/2026-09-09-migration-history-reconciliation.md` 3절의 읽기 전용 조사 쿼리를 쓴다. 객체 존재 여부로 판정하며, ledger는 보지 않는다.
