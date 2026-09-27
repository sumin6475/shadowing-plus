# Architecture documentation baseline — 2026-09-14

## Scope

Documentation-only baseline derived from tracked source. No application, schema, configuration, or asset files were modified.

## Evidence read

- Mobile Expo Router layouts, shell navigation contract, registered detail screens, and primary screen entry points.
- Mobile data-access modules for Studio, Speaking World, Phrases, Talk, Library, preferences, and authentication.
- Supabase migrations 001–030 and the manually maintained applied-migration ledger.
- Web application routes, API routes, pipeline modules, extension, and YouTube ASR worker boundaries.
- Current PRDs, recent Studio IA plans, ADRs, README files, and build journal.

## Checks

| Check | Result |
| --- | --- |
| Six baseline documents exist and are non-empty | PASS |
| Five links in the documentation index resolve to local files | PASS |
| Current UI terms are mapped to legacy database terms | PASS |
| Current-state statements are separated from plans/proposals | PASS |
| Navigation depth includes root tabs and shell detail stack | PASS |
| Data guide covers ownership, RLS, lifecycle, and migration process | PASS |
| Application code changed | NO |

## Limitations

- No live Supabase introspection was performed. Remote schema status relies on `supabase/APPLIED.md`, last updated for migration 030.
- No runtime UI walkthrough was needed for this documentation-only change; navigation was derived from route and shell source.
- The repository has pre-existing untracked icon assets, which were left untouched.
