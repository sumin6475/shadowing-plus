# Code Review: mobile TestFlight candidate

**Scope**: Uncommitted mobile, Edge Function, migration, and report changes on `codex/self-talk-used-today`.
**Requirement**: Ship balanced daily phrases and used-today hints, an Ask phrase review save flow, persistent Ask history with the revised sidebar, and minimal AI cost metering.
**Recommendation**: APPROVE for a release candidate commit. Remote integration remains a deployment gate.

## Stats

- 22 tracked files modified; 15 source, test, migration, and report files added.
- Tracked diff: +624 / -143 lines before the new files.

## Findings

No unresolved technical findings in the reviewed change. During review, the `SECURITY DEFINER` legacy cleanup trigger in migration 035 was tightened to an empty `search_path` and an explicitly qualified `public.note_chat_turns` reference.

## Checks

- `npm run test:mvp`: 62/62 passed.
- `npm run validate`: release config, TypeScript, baseline lint, and iOS export passed. The pre-existing `phrases.tsx:1025` lint warning remains.
- `git diff --check`: passed.
- Remote migration history: 035 pending; isolated `supabase db push --linked --dry-run` selected only 035.
- Live DB/RLS and Edge Function behavior: pending until server deployment.

## Verdict

The code paths and tests cover the requested candidate behavior and are ready for a commit. The new database schema, owner isolation, and Ask persistence still need live checks after applying 035 and before submitting a TestFlight build.
