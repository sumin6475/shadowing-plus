# System Review — AI-Layer Evolution Proposal

## Meta
- Plan: none (ad-hoc conversational session — no `/plan-feature` artifact) · Execution report: this session's transcript · Date: 2026-07-18

## Alignment Score: 4/10

Mixed. The individual fixes were correct and verified (login, review-bot E2E, one-card-per-message, bookmark deep-link). But the central incident — all media playback broken in production — took a long, avoidable detour: three rounds of speculative client-side audio fixes were shipped before the actual cause (a `.vercelignore` pattern dropping `/api/media` from every deploy) was even looked for. The deploy discipline that would have caught it on the first deploy already exists as a skill and was never invoked. Score is dragged down by process failure, not code quality.

## Divergence Analysis

- **divergence**: Deploys were run as bare `npx vercel --prod` throughout, never via the `/deploy` skill.
  - classification: bad ❌
  - root cause: repeated manual step that should have been the skill. `/deploy` Step 6 (`curl` key API routes on prod) would have surfaced the `/api/media` 404 on the very first deploy.

- **divergence**: Symptom "mobile playback fails" was diagnosed as a Telegram/PWA audio-autoplay policy issue; three fixes (audio unlock → preload → TTL) were written and deployed before verifying the route was even shipped.
  - classification: bad ❌
  - root cause: missing validation step — never checked "is the route actually in production?" before theorizing about client behavior. A cross-platform symptom (desktop+mobile+PWA all silent) points at a shared server/deploy cause, not a client policy.

- **divergence**: Announced "deployed" / "배포 완료" several times without confirming the stable alias pointed at the new build or that the changed route existed in prod.
  - classification: bad ❌
  - root cause: missing post-deploy verification; `npx vercel --prod` output was treated as proof of a working production state.

- **divergence**: Session-layer, review-bot, and media routes were left git-untracked while being relied on in production for the whole session; only committed at the end during incident triage.
  - classification: bad ❌
  - root cause: no precondition check that shippable code is committed (this is `/deploy` Step 1.3, which was bypassed by not using the skill).

- **divergence**: The `.vercelignore` root cause was found by comparing HTML-404 vs JSON responses across sibling routes on the alias.
  - classification: good ✅ (effective diagnostic once finally attempted) — worth codifying so it's the *first* move next time, not the last.

## Pattern Compliance
- [x] Followed codebase architecture (fixes matched existing patterns)
- [ ] Used documented patterns — the `/deploy` skill existed and was not used
- [x] Applied testing patterns correctly (tsc/lint/vitest run each change)
- [ ] Met validation requirements — no `/validate`, no `/deploy` post-deploy verification until forced by the incident

## Proposed Changes

### Proposal 1 — [PROJECT] UPDATE `CLAUDE.md` (Shadowing Plus)
- Why: The single most expensive lesson of the session — a route can build locally yet be absent in production because of `.vercelignore` — has no home in the project's own rules. The existing Deploy rule warns only about the 100 MB limit.
- Exact change: In `Shadowing Plus/CLAUDE.md`, under `## Rules`, add a bullet after the "Deploy only from the repo root" bullet:
  > - **After every `vercel --prod`, `curl` a key API route on `shadowing-plus.vercel.app` before calling it done** — an HTML 404 means the route wasn't shipped (not that it's broken). `.vercelignore` patterns are unanchored: a bare `media`/`model`/`supabase` line matches `web/src/app/api/media/` etc., so anchor root-only ignores with a leading `/`. A route that 404s only in prod is a deploy/ignore problem, not a code problem.

### Proposal 2 — [PACK] UPDATE `.claude/skills/deploy/SKILL.md`
- Why: Step 6 says to `curl` key routes but doesn't tell the agent how to *read* the result. The whole incident hinged on the difference between an HTML 404 (route missing) and a JSON error (route present) — that distinction should be explicit, and `.vercelignore` should be a named checkpoint since it silently removes files from the upload.
- Exact change: In Step 6, replace the first bullet:
  > - `curl` the health endpoint / key API routes on the production URL — status codes and response shape

  with:
  > - `curl` the health endpoint / key API routes on the production URL. **Read the body, not just the status**: an HTML `<!DOCTYPE html>…` 404 means the route was never deployed (missing file / ignored by `.vercelignore`), while a JSON body (`{"error":…}`) means the route exists and ran. Compare a changed route against a sibling route known to deploy.

  And add to Step 3's checklist:
  > - [ ] `.vercelignore` (repo root AND `web/`) has no unanchored token that matches an app path — patterns match any path segment, so a bare `media` drops `src/app/api/media/`. Anchor root-only dirs with a leading `/`.

### Proposal 3 — [PACK] UPDATE `.claude/skills/deploy/SKILL.md` — verify the alias
- Why: `vercel --prod` can succeed while the stable alias still points at an older deployment; "deployed" was announced on that false signal.
- Exact change: Add to Step 6:
  > - Confirm the stable alias serves the new build: `curl -s <alias>/<changed-route>` should hit the just-deployed code (check the `dpl_…` id in the HTML or a known new response). If the alias lags, `vercel alias set <deployment-url> <alias>`.

### Proposal 4 — [PROJECT] UPDATE `CLAUDE.md` (Shadowing Plus) — cross-platform symptom heuristic
- Why: The detour happened because a shared-cause symptom was read as a client-specific one. A one-line heuristic prevents the next such detour.
- Exact change: In `Shadowing Plus/CLAUDE.md` under `## Rules`, add:
  > - **A failure that spans desktop + mobile + PWA at once is a shared server/deploy cause, not a client policy** — verify the API/route responds in prod before writing client-side workarounds.

## Reflector Draft
Adjudicated `.claude/claude-md-review.md` (2026-07-18, over `agent-workforce/CLAUDE.md`): its verdict was "No change needed," which is correct — that file was co-authored with the code it describes. Its two out-of-scope notes are **not** folded into this review (they concern `agent-workforce/` discoverability and a README dir inconsistency, unrelated to this session's deploy incident) — left for the `agent-workforce` area's own follow-up, already tracked in its MEMORY.md. The draft can be deleted; nothing actionable was lost.

## Key Learnings
- What worked well: once attempted, the HTML-404-vs-JSON diagnostic nailed the root cause fast; each code fix was independently verified (tsc/lint/tests); the eventual commit cleanly separated deploy-relevant code from local-only files.
- What needs improvement: reach for `/deploy` instead of bare `vercel --prod`; verify the route is *shipped* before theorizing about client behavior; treat a broadening bug report ("desktop too") as a signal the current hypothesis is wrong, not as a cue for more of the same fix.

## Summary
If accepted, the system will (a) always verify a route is actually shipped — reading response *shape*, not just status — before treating a prod failure as a code bug, and (b) know that `.vercelignore` silently drops files whose path contains an unanchored ignore token, turning today's multi-hour detour into a first-deploy catch.
