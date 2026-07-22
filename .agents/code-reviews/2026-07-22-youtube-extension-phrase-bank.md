# Code Review: YouTube extension, Phrase Bank, and extension authentication

**Scope**: Chrome extension files plus the Shadowing Plus extension API, OAuth callback, Phrase Bank, and migration changes.
**Requirement**: Add a private YouTube learning panel with account hand-off, contextual subtitles, in-panel dictionary lookup, shared sentence bookmarks, and separately saved phrase explanations.
**Recommendation**: APPROVE

## Stats

- Files reviewed: 25
- Validation: extension JavaScript syntax checks, TypeScript, ESLint, and 52 tests passed. ESLint has one pre-existing unused-variable warning in `web/scripts/wipe-supabase.mjs`.

## Findings

Code review passed. No technical issues detected in the reviewed scope.

## What's Good

- Extension API endpoints authenticate bearer tokens server-side and scope all user-owned data before reading or writing it.
- The dictionary proxy avoids broad extension host permissions and constrains the response sent to the panel.
- Phrase items preserve their source segment and surrounding context while remaining separate from SRS sentence bookmarks.
- Phrase explanation usage is recorded through the existing usage ledger rather than introducing a parallel cost counter.

## Verdict

The reviewed changes meet the requested extension and Phrase Bank behavior. The Phrase Bank migration must be applied in Supabase before its new endpoints are used; this is documented in the delivery instructions and is not a code defect.
