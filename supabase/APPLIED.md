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
| 029 | `029_situation_favorites` | **2026-09-10** | Situation 즐겨찾기(`stories.is_favorite`) + 부분 인덱스. SQL Editor에서 실행 |
| 030 | `030_phrase_meaning_rename_expand` | **2026-09-10** | `phrase_items.meaning_ko` → `meaning` 의 **EXPAND** 절반. 컬럼 추가 + 백필 + 양방향 동기화 트리거. 데이터 백필 포함이므로 실행 전 스냅샷. 붙여넣을 SQL 전문은 아래 [030 붙여넣기용 SQL](#030-붙여넣기용-sql) |

## 030 붙여넣기용 SQL

**2026-09-10 적용 완료.** 트리거 확인 쿼리 `trg = 1`. 트랜잭션으로 묶여 있어 트리거가 있으면 백필도 커밋된 것이다. 아래를 Supabase SQL Editor에 그대로 붙여넣고 한 번 실행한다. `UPDATE`가 들어 있으므로 실행 전에 `phrase_items` 스냅샷을 뜬다.

**순서: 030 적용이 먼저, main push와 엣지 함수 배포는 그다음.** 웹(`web/src/lib/phrases.ts`의 `PHRASE_SELECT_COLUMNS` → `/api/phrases`, `/api/extension/phrases`)과 엣지 함수 `phrase-embed`·`talk-phrase-suggest`는 `meaning` 을 fallback 없이 select 한다. 030 없이 push/배포하면 PostgREST 42703으로 Phrase Bank가 비고 저장이 실패한다. 030 이전 DB로 한 번 재시도하는 fallback은 모바일(`apps/mobile/src/lib/phrases.ts`, `studio-information.ts`)에만 있다.

실행 후 확인 쿼리 (첫 번째는 0, 두 번째는 1이어야 한다):

```sql
-- 백필 누락
SELECT count(*) AS unbackfilled
FROM public.phrase_items
WHERE meaning IS DISTINCT FROM meaning_ko;

-- 트리거 존재 확인 (1이어야 한다)
SELECT count(*) AS trg
FROM pg_trigger
WHERE tgname = 'phrase_items_sync_meaning' AND NOT tgisinternal;
```

`meaning_ko` 를 지우는 **CONTRACT** 절반은 `031_phrase_meaning_contract.sql` 로 따로 쓴다. 구버전 웹 번들과 배포된 TestFlight 빌드가 전부 `meaning` 으로 넘어간 뒤에만 실행한다.

031 **전에** 코드에서 먼저 지울 back-compat (남겨두면 031 직후 42703):
- `web/src/lib/phrases.ts` `PHRASE_SELECT_COLUMNS` 의 `meaning_ko`
- `web/src/app/api/phrases/route.ts` 의 `meaning_ko` 입력 필드와 `?? body.meaning_ko`
- `apps/mobile/src/lib/phrases.ts`, `apps/mobile/src/lib/studio-information.ts` 의 `meaning_ko` fallback 사다리
- `extension/content.js` 의 `|| item.meaning_ko` (응답에서 사라지면 무해하지만 같이 정리)

```sql
-- ============================================================================
-- 030 — phrase_items.meaning_ko -> meaning (EXPAND half)
-- ============================================================================
-- `meaning_ko` holds the learner-language gloss of a saved English phrase. The
-- app is N:1 (many learner languages : English), so since ADR 0022 that column
-- has held Korean, Traditional Chinese, Japanese, Spanish or Russian depending
-- on the learner. The `_ko` suffix is now a lie; the column becomes `meaning`.
--
-- This is the EXPAND half of expand / migrate / contract. A plain
-- `ALTER TABLE ... RENAME COLUMN` is NOT backward compatible and would break
-- two live clients:
--   1. web auto-deploys on push to main, so the old bundle is still served for
--      a window after the schema changes;
--   2. TestFlight builds ALREADY INSTALLED on testers' phones cannot be updated
--      in lockstep with a migration and keep selecting `meaning_ko` for as long
--      as a tester keeps that build. PostgREST would answer 42703 and the
--      phrase list would render empty.
-- So both columns exist and stay in sync in BOTH directions: an old client
-- reading or writing `meaning_ko` and a new client reading or writing `meaning`
-- both see consistent data.
--
-- CONTRACT (later, separate migration): `031_phrase_meaning_contract.sql` drops
-- the trigger `phrase_items_sync_meaning`, the function
-- `public.sync_phrase_meaning_columns()`, and the column `meaning_ko`. Do NOT
-- run it until no build that selects `meaning_ko` is still in the wild — that
-- means the web prod bundle is on `meaning` AND every TestFlight build that
-- predates the switch has expired or been superseded.
--
-- Purely additive otherwise: no index, constraint, view or generated column
-- referenced `meaning_ko` (grep of supabase/migrations confirms 016 declared it
-- and nothing else touched it), so there is nothing to mirror for `meaning`.
-- No new RLS either — the existing `phrase_items_owner` policy (016, FOR ALL
-- USING user_id = auth.uid()) already covers these rows.
--
-- Run this once in the Supabase SQL Editor. Take a backup snapshot first: it
-- backfills data.
-- ============================================================================

-- One transaction, all or nothing. Two reasons, both about silent damage rather
-- than loud failure:
--   1. Without it there is a window between the backfill and CREATE TRIGGER in
--      which an old client writing `meaning_ko` leaves that row's `meaning`
--      stale forever — nothing afterwards would ever reconcile it.
--   2. A partial run (column added, backfill or trigger missing) would let the
--      Edge Functions, which read `meaning`, embed phrases without their gloss.
--      That corrupts vectors quietly instead of erroring.
BEGIN;

-- Same type and nullability as meaning_ko in 016_phrase_bank.sql: plain
-- nullable TEXT, no length CHECK (only `text` is length-checked there).
ALTER TABLE public.phrase_items
  ADD COLUMN IF NOT EXISTS meaning TEXT;

-- Backfill. Guarded by `meaning IS NULL` so re-running is safe and so a value
-- already written through the new name is never clobbered by the old column.
UPDATE public.phrase_items
SET meaning = meaning_ko
WHERE meaning IS NULL;

-- ----------------------------------------------------------------------------
-- Two-way sync
-- ----------------------------------------------------------------------------
-- Invariant this enforces: after every statement,
--   meaning IS NOT DISTINCT FROM meaning_ko.
--
-- THE RULES, and why — this is the part a reader will question:
--
-- UPDATE, exactly one column changed: mirror the changed one into the other.
--   The test is `IS DISTINCT FROM OLD`, deliberately NOT `IS NOT NULL`. A
--   learner clearing their gloss sends meaning = NULL; that is a real change
--   and must propagate, so meaning_ko becomes NULL too. A COALESCE-style
--   implementation would silently resurrect the old text here — that is the
--   bug this shape exists to avoid.
--
-- UPDATE, BOTH columns changed to different values in one statement: `meaning`
--   wins. A BEFORE trigger cannot tell an omitted column from one explicitly
--   re-set to its current value, so a deterministic winner is required rather
--   than guessable. `meaning` is the migration target and the only name new
--   code writes on purpose; a statement that sets both to *different* values
--   can only come from a confused client, and the new name is the one we want
--   to believe. (Both changed to the SAME value — the common case while the
--   repo is mid-migrate and a writer sends both — needs no arbitration.)
--
-- UPDATE, neither changed: no-op.
--
-- INSERT: whichever column is non-NULL fills the other; if both are non-NULL,
--   `meaning` wins, same reason as above. On INSERT there is no OLD, so an
--   explicit NULL is indistinguishable from an omitted column — which is
--   harmless, because a client that sends NULL for one name while filling the
--   other is exactly a client that does not know that name.
CREATE OR REPLACE FUNCTION public.sync_phrase_meaning_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.meaning IS NOT NULL THEN
      NEW.meaning_ko := NEW.meaning;          -- new client, or both sent
    ELSIF NEW.meaning_ko IS NOT NULL THEN
      NEW.meaning := NEW.meaning_ko;          -- old client
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.meaning IS DISTINCT FROM OLD.meaning THEN
    NEW.meaning_ko := NEW.meaning;            -- new client wrote; also wins ties
  ELSIF NEW.meaning_ko IS DISTINCT FROM OLD.meaning_ko THEN
    NEW.meaning := NEW.meaning_ko;            -- old client wrote
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_phrase_meaning_columns() FROM PUBLIC;

-- `UPDATE OF` narrows firing to statements that list one of the two columns.
-- Safe: a statement that lists neither cannot change either, so the no-op
-- branch would have applied anyway.
DROP TRIGGER IF EXISTS phrase_items_sync_meaning ON public.phrase_items;
CREATE TRIGGER phrase_items_sync_meaning
  BEFORE INSERT OR UPDATE OF meaning, meaning_ko
  ON public.phrase_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_phrase_meaning_columns();

COMMENT ON COLUMN public.phrase_items.meaning IS
  'Learner-language gloss of the phrase. Canonical name; language varies per learner (ADR 0022).';
COMMENT ON COLUMN public.phrase_items.meaning_ko IS
  'DEPRECATED misnomer for meaning. Kept in sync by phrase_items_sync_meaning for old web/TestFlight builds; dropped in 031_phrase_meaning_contract.';

COMMIT;
```

## 상태를 다시 확인해야 할 때

`.agents/plans/2026-09-09-migration-history-reconciliation.md` 3절의 읽기 전용 조사 쿼리를 쓴다. 객체 존재 여부로 판정하며, ledger는 보지 않는다.
