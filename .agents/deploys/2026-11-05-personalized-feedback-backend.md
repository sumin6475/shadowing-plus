# Personalized feedback backend — applied and verified

User explicitly approved server application in this chat. Target matched the mobile Supabase URL before changes.

- Deployed only `coaching-profile` and `talk-advanced-feedback`; both ACTIVE, version 1, JWT verification retained.
- Applied only additive migration 036 and its schema_migrations ledger entry in a single transaction via the linked Management API. Legacy pending migration files were not replayed.
- Confirmed all five new tables have forced owner RLS. Authenticated direct writes and completion RPC access are blocked; service completion access is allowed.
- Reproduced original missing-table failure before application: HTTP404 / PGRST205. Same check afterwards sees the table and correctly rejects anonymous access (42501).
- Native signed-in settings load now succeeds. Saved the existing B2/Korean choice with an empty focus and reopened it successfully. DB check: one preference row, empty rich_text/plain_text, preserved B2/Korean. Placeholder examples were not saved.
- UI recovery action uses the full parent content width, aligned inside the same card; loading and error states are exclusive. Guidelines: apps/mobile/docs/design/button-guidelines.md, linked from mobile AGENTS.md.

Validation: focused tests19/19, typecheck PASS, lint baseline PASS (one existing phrases effect warning), iOS export PASS; isolated migration test PASS before application. Native saved-state screenshot is in ignored local docs/journal/quality/2026-11-05-speaking-focus-saved.png.

This verification establishes settings load/save/reopen and backend availability. It does not certify the outstanding full AI semantic golden evaluation or two-account end-to-end analysis suite. No TestFlight upload, commit or push in this step.

Rollback: return the app to the preceding feature state while retaining additive tables and saved data. Do not drop tables to roll back a client issue. Function source is in the current working tree and migration036 remains additive.

The first final function-status check was blocked by an automatic-approval usage-limit failure; after the user resumed, the same read-only check succeeded.
