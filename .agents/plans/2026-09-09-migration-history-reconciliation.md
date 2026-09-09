# 마이그레이션 이력 정리 — 런북

작성 2026-09-09 · 계기: `+ Date` 저장 실패 (`Could not find the 'event_date' column of 'stories'`)

**나는 원격 DB에 접근할 수 없다.** 환경변수 파일은 보안 훅이 막고 있고, 이 리포는 CLI 없이 Supabase SQL Editor에 붙여넣어 마이그레이션을 돌린다. 아래 SQL은 전부 **Sumin이 SQL Editor에서 직접 실행**해야 한다. 나는 로컬 파일 28개를 읽고 안전성을 판정했을 뿐이다.

---

## 1. 아는 것과 모르는 것

**아는 것 (실측):**
- `028`은 원격에 **미적용**. 앱이 `stories.event_date`에 쓰려다 스키마 캐시에서 컬럼을 못 찾았다.
- `020`까지는 적용됨. `domains` / `stories` / `messages` / `talk_sessions`를 앱이 정상적으로 읽고 쓴다.

**모르는 것:**
- `021`~`027`의 적용 여부. 앱 동작만으로는 판정할 수 없다 — 예를 들어 `fetchPracticeAttempts`는 `talk_suggestion_feedback`(023) 조회 실패를 `if (!repairs.error)`로 조용히 삼킨다. 테이블이 없어도 화면은 멀쩡해 보인다.
- "원격 ledger가 020까지"라는 이전 기록의 출처. 이 리포는 CLI를 안 쓰므로 `supabase_migrations.schema_migrations`가 유지되고 있지 않을 가능성이 높다. **그렇다면 ledger가 아니라 실제 스키마를 봐야 한다.**

그래서 순서는 **① 실태 조사 → ② 판단 → ③ 적용**이다. 조사 없이 적용부터 하지 않는다.

---

## 2. 안전성 판정 — 021~028 전부 재실행 가능

로컬 파일 8개를 문장 단위로 확인했다. 모든 스키마 변경이 가드되어 있다.

| 패턴 | 사용처 | 재실행 |
|---|---|---|
| `ADD COLUMN IF NOT EXISTS` | 021·022·024·025·027·028 | 안전 |
| `CREATE TABLE / INDEX IF NOT EXISTS` | 022·023·028 | 안전 |
| `DROP POLICY IF EXISTS` → `CREATE POLICY` | 022·023·026·028 | 안전 |
| `DROP TRIGGER IF EXISTS` → `CREATE TRIGGER` | 022·028 | 안전 |
| `CREATE OR REPLACE FUNCTION` | 022·028 | 안전 |
| `DROP CONSTRAINT IF EXISTS` → `ADD CONSTRAINT` | 023·028 | 안전 |
| `INSERT … ON CONFLICT DO NOTHING/UPDATE` | 026·028 | 안전 |
| `ENABLE / FORCE ROW LEVEL SECURITY` | 022·023·028 | 안전 (멱등) |
| 028의 백필 `UPDATE` 3건 | `WHERE body = ''`, `WHERE domain_id IS NULL` 등으로 자기 제한 | 안전 (2회차는 0행) |

**즉 021→028을 순서대로 다시 돌려도 이미 적용된 것은 no-op이다.**

### 단 하나의 위험 문장

```sql
-- 028, 백필 직후
ALTER TABLE public.messages ALTER COLUMN domain_id SET NOT NULL;
```

앞선 백필이 모든 `messages.domain_id`를 채우지 못하면 여기서 **문장이 실패**한다. 백필은 ① Story의 Topic 상속 → ② 남은 것은 `Needs review` Topic을 만들어 할당, 두 단계라 정상적으로는 남지 않는다. 그래도 3절에서 미리 센다.

---

## 3. 1단계 — 실태 조사 (읽기 전용, 안전)

SQL Editor에 그대로 붙여넣는다. 아무것도 바꾸지 않는다.

```sql
-- A. CLI ledger가 존재하는가 (없으면 "020까지"라는 기록은 근거가 없다)
select coalesce(
  (select string_agg(version, ', ' order by version)
   from supabase_migrations.schema_migrations),
  '(ledger table missing or empty)'
) as cli_ledger;
```

```sql
-- B. 021~028이 만든 객체가 실제로 있는가
select '021 videos.is_favorite' as object,
       exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='videos' and column_name='is_favorite') as present
union all select '022 phrase_story_links', to_regclass('public.phrase_story_links') is not null
union all select '022 phrase_events',      to_regclass('public.phrase_events') is not null
union all select '023 talk_suggestion_feedback', to_regclass('public.talk_suggestion_feedback') is not null
union all select '024 phrase_items.learner_note', exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='phrase_items' and column_name='learner_note')
union all select '025 tsf.verdict_note', exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='talk_suggestion_feedback' and column_name='verdict_note')
union all select '026 avatars bucket', exists (select 1 from storage.buckets where id='avatars')
union all select '027 tsf.diagnosis_tag', exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='talk_suggestion_feedback' and column_name='diagnosis_tag')
union all select '028 stories.event_date', exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='stories' and column_name='event_date')
union all select '028 messages.domain_id', exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='messages' and column_name='domain_id')
union all select '028 note_phrase_links', to_regclass('public.note_phrase_links') is not null
union all select '028 attempt_phrase_candidates', to_regclass('public.attempt_phrase_candidates') is not null
order by object;
```

```sql
-- C. 028의 위험 문장 사전 점검 — 반드시 0이어야 한다
select count(*) as messages_without_a_topic
from public.messages m
left join public.stories s on s.id = m.story_id
where s.domain_id is null;
```

```sql
-- D. 백필이 건드릴 규모
select
  (select count(*) from public.messages) as messages,
  (select count(*) from public.stories)  as stories;
```

B에서 `phrase_story_links` / `phrase_events`가 `false`로 나오면 022가 미적용이라는 뜻이다.

---

## 3-a. 조사 결과 (2026-09-09 실행 완료)

**A — ledger:** `020` 한 줄뿐. 001–019가 없는데 앱은 그 테이블들로 정상 동작한다.
→ **이 ledger는 적용 목록이 아니다.** CLI를 한 번 스쳤을 때 남은 흔적이며, "원격은 020까지"라는 이전 기록은 여기서 나온 오해였다. 판단 근거로 쓰지 않는다.

**B — 실제 스키마:**

| 마이그레이션 | 원격 |
|---|---|
| 021 · 022 · 023 · 024 · 025 · 026 | 적용됨 |
| **027** talk_feedback_detail_contract | **미적용** |
| **028** studio_information_architecture | **미적용** |

**C — 위험 문장 사전 점검:** `messages_without_a_topic = 0`.
→ 028의 `ALTER COLUMN domain_id SET NOT NULL`은 안전하게 통과한다.

### 027 미적용은 지금 진행 중인 버그다

읽기 경로에는 fallback이 있다 (`fetchTalkFeedbackById`가 `diagnosis_tag|action|explanation` 오류를 잡아 legacy select로 재시도). 그래서 조회는 조용히 넘어간다.

**쓰기 경로에는 fallback이 없다.** `saveTalkFeedback`은 네 컬럼을 무조건 넣는다:

```ts
diagnosis_tag: moment.diagnosisTag?.trim() || null,
action: moment.action?.trim() || null,
explanation: moment.explanation?.trim() || null,
schema_version: 2,
...
if (error) throw new Error(error.message);
```

컬럼이 없으므로 **매 저장이 throw한다. 즉 지금 AI 피드백이 하나도 저장되지 않고 있다.**
Situation 상세를 확인할 때 `repairSuggestion`이 붙은 attempt가 하나도 없던 이유가 이것이다. 화면 문제가 아니라 저장이 안 되고 있었다.

### 확정된 적용 순서

1. `027_talk_feedback_detail_contract.sql` — 컬럼 4개 + 인덱스 1개. 데이터 백필 없음, 저위험.
2. `028_studio_information_architecture.sql` — 백필 포함. 실행 전 백업 스냅샷.

028은 022(`phrase_story_links`, `phrase_events`)에 의존하는데 022는 적용되어 있으므로 선행 조건은 충족이다.

## 4. 2단계 — 판단

| B 결과 | 할 일 |
|---|---|
| 021~027 전부 `true`, 028만 `false` | **028만** 실행 |
| 중간에 `false`가 섞임 | `false`인 것부터 **번호 순서대로** 실행. 앞의 것을 건너뛰지 않는다 |
| C가 0이 아님 | **멈춘다.** 028을 돌리지 않고 해당 행부터 조사한다 |

**028의 선행 의존 — 이래서 순서를 지켜야 한다:**
- `phrase_story_links` (022) — Story-level Phrase 링크를 Note 링크로 옮길 때 읽는다
- `phrase_events` (022) — attempt candidate 백필의 소스
- `domains.archived` (020) — `Needs review` Topic 조회 조건

---

## 5. 3단계 — 적용

- SQL Editor에서 **파일 하나씩, 번호 순서대로** 붙여넣어 실행한다. 여러 파일을 합치지 않는다 — 합치면 어디서 실패했는지 알 수 없다.
- 각 파일 실행 후 에러가 없는지 확인하고 다음으로 넘어간다.
- 028은 데이터 백필이 있으므로 **실행 전 Supabase 백업 스냅샷을 확보**한다.

### 028 실행 후 검증

```sql
-- 1) 컬럼이 생겼는가
select column_name from information_schema.columns
where table_schema='public' and table_name='stories' and column_name='event_date';

-- 2) NOT NULL이 걸렸는가 (기대: NO)
select is_nullable from information_schema.columns
where table_schema='public' and table_name='messages' and column_name='domain_id';

-- 3) 격리된 행 (있으면 UI에서 Needs review로 보인다)
select count(*) from public.messages where status = 'needs_review';

-- 4) Phrase 링크가 보존됐는가
select
  (select count(*) from public.phrase_story_links) as story_links,
  (select count(*) from public.note_phrase_links)  as note_links;
```

### 앱에서 최종 확인

Situation 상세 → `+ Date` → `2026-09-18` → `Save date`.
칩이 `Sep 18`로 바뀌면 끝이다. 지금은 여기서 스키마 캐시 오류가 난다.

---

## 6. 정리 후 남길 것

- **적용 이력을 어디엔가 기록한다.** 지금은 "어디까지 적용됐는지" 아무도 안 적어서 이번 같은 일이 반복된다. 최소한 `supabase/APPLIED.md` 한 장에 번호와 날짜를 적는 편이 낫다. Supabase CLI 도입은 자동으로 해결되지만 별도 결정 사안이다.
- `AGENTS.md`는 이미 "로컬과 원격 마이그레이션 이력을 모두 확인하라"고 요구한다. **확인할 방법이 없던 게 문제였다.** 3절의 조사 쿼리를 그 방법으로 고정한다.
