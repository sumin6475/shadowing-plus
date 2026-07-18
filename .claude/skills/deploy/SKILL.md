---
name: deploy
description: Ship a validated, reviewed, committed change to production — preconditions check, pre-deploy checklist, preview/dry-run first, explicit human confirmation before the production command, post-deploy verification, rollback instructions. Defaults Vercel (web/frontend) and Railway (backend/DB); per-project tweaks live in CLAUDE.md's Deployment section.
argument-hint: [what to ship, blank = latest committed work]
disable-model-invocation: true
---

<!-- Source: newly authored for Build System 2026-07-10. Patterns from coleam00/frontend-mix .claude/skills/frontend-mix-deploy/SKILL.md (refuse-unless-validated, dry-run first, deploy-summary artifact, rollback notes) and frontend-mix-smoke (post-deploy verification discipline, don't-cry-wolf); checklist shape from deploy-checklist practice. Platform defaults per Sumin's 2026-07-10 decision: Vercel + Railway. -->

# Deploy

**Input**: $ARGUMENTS (what to ship — scopes the precondition checks and the diff spot-check below; blank = the latest committed work)

The most outward-facing step in the loop. Slow is smooth: every gate below exists because production mistakes are the expensive kind.

## Step 1: Preconditions — refuse to deploy unless ALL hold

1. **Validation is green**: a `/validate` PASS in this session; in a fresh session, ask the user for the `/validate` verdict — their confirmation is the evidence. If FAIL or unknown → stop: "run `/validate` first."
2. **Review is resolved**: the change's `.agents/code-reviews/{slug}.md` says APPROVE, or all findings are `fixed`/`waived`. Unresolved criticals → stop.
3. **Work is committed**: `git status` clean for the shippable scope. Uncommitted changes → stop: "run `/commit` first."

Do not rationalize around a failed precondition. Report the blocker and exit.

## Step 2: Determine the target

Read the project CLAUDE.md's **Deployment** section (per-project tweaks live there: platform choice, env promotion, migration commands, edge cases). If absent, apply the defaults:

| What's shipping | Default target |
|-----------------|----------------|
| Frontend / full-stack JS (Next.js, Vite, ...) | **Vercel** |
| Backend service / API / DB / workers | **Railway** |
| Split app | Vercel (front) + Railway (back) — deploy back first |

First deploy for this project: link it (`vercel link` / `railway link`), then record the chosen setup in CLAUDE.md's Deployment section so next time isn't a first time.

## Step 3: Pre-deploy checklist

- [ ] Env vars on the platform match `.env.example` — compare **names only**: `vercel env ls` (values show encrypted) / `railway variables --json | jq 'keys'`. Secret values must never be printed into chat or logs
- [ ] No secrets in the repo (spot-check the diff being shipped)
- [ ] DB migrations: identified, ordered, with a rollback path (run per CLAUDE.md's migration commands — Railway: before or during release per project convention)
- [ ] Local production build passes (`npm run build` or the project's build command)
- [ ] `.vercelignore` (repo root AND `web/`) has no unanchored token matching an app path — patterns match any path segment, so a bare `media` drops `src/app/api/media/`. Anchor root-only dirs with a leading `/`
- [ ] Rollback plan written down BEFORE deploying (the same instructions Step 7 records — know the undo before doing)

Report the checklist with each box resolved. Any unchecked box is a stop.

## Step 4: Preview / dry-run first

- **Vercel**: `vercel deploy` (no `--prod`) → preview URL. Open it, verify the change works there (key routes render styled, primary interaction works, console clean — a 200 is not enough).
- **Railway**: deploy to a staging environment if the project has one (`railway status` to see the current one, `railway environment <name>` to switch — never argument-less, it opens an interactive selector); otherwise state that Railway will go straight to the service and treat Step 3 + local verification as the preview evidence.

## Step 5: 🧑 Production confirmation gate

Present to the user: checklist results, preview URL + what was verified on it, exactly which command will run next. **Wait for explicit confirmation. Silence, questions, or feedback are not confirmation.** Never run the production command without it.

Then:
- Vercel: `vercel --prod`
- Railway: `railway up` (against the production environment/service)

## Step 6: Post-deploy verification

- `curl` the health endpoint / key API routes on the production URL. **Read the body, not just the status**: an HTML `<!DOCTYPE html>…` 404 means the route was never deployed (missing file / ignored by `.vercelignore`), while a JSON body (`{"error":…}`) means the route exists and ran. Compare a changed route against a sibling route known to deploy.
- Confirm the stable alias serves the new build: the just-deployed `dpl_…` id should appear in the response. If the alias lags an older deployment, `vercel alias set <deployment-url> <alias>`.
- Load the main pages (agent-browser if available) — rendered, styled, console clean
- Tail platform logs briefly (`vercel logs` / `railway logs`) for startup errors
- If verification fails → execute the rollback plan immediately, then report; don't debug live in production

## Step 7: Record the deploy

Write `.agents/deploys/{YYYY-MM-DD}-{slug}.md` (create the directory if needed):

- Target(s) and production URL
- Every command run, with condensed output
- Checklist state, preview URL, what was verified pre- and post-deploy
- **Rollback instructions**: Vercel → promote the previous deployment (`vercel rollback` / dashboard); Railway → redeploy the previous build from the dashboard; plus DB migration down-steps if any ran
- Follow-ups flagged (DNS, domains, monitoring)

Report the summary path and the production URL to the user.
