# agent-workforce/ — the launch operating system

Home for running Shadowing Plus's **launch** as a Director-led AI agent crew. The repo-root `CLAUDE.md` / `MEMORY.md` stay focused on the **codebase**; this folder is the launch layer.

## Folder map

    agent-workforce/
    ├── CLAUDE.md                  operating rules (always-on)
    ├── MEMORY.md                  starter decision · why · bets · revisit hooks
    ├── README.md                  you are here
    ├── templates/                 the reusable RESOURCES agents pull from
    │   ├── intent-brief.md            how the Director assigns work
    │   ├── handoff.md                 Ralph-loop relay doc
    │   ├── weekly-sync.md             Monday agenda
    │   ├── metric-scorecard.md        the 3 numbers
    │   ├── decision-log-entry.md      one decision + one-sentence why
    │   └── translation-eval-rubric.md Content QA
    ├── brand-kit/brand-kit.md     Design & Brand source of truth
    ├── handoffs/                  active relay docs (dated)
    └── logs/                      daily "dreaming" trail (dated) → promoted to MEMORY.md

    ../.claude/agents/             the 7 personas (auto-discovered) — next step

## How a weekly loop runs
1. **Plan (Mon)** — Ops Scribe fills `templates/metric-scorecard.md` → Director picks one metric → briefs each Lead with `templates/intent-brief.md`.
2. **Build (Tue–Thu)** — Leads work in parallel (drafts only); sequential steps move via `templates/handoff.md` into `handoffs/`.
3. **Verify (Thu–Fri)** — Reality-Checker certifies with evidence.
4. **Evolve (Fri)** — Ops Scribe writes `logs/YYYY-MM-DD.md` and promotes durable rules into `MEMORY.md`.

## Repo ↔ Notion split
| Lives in the **repo** (here) | Lives in **Notion** (live boards) |
|---|---|
| Agent personas (`.claude/agents/`) | Task Board |
| Operating rules (`CLAUDE.md`) | Decisions Log |
| Memory + why (`MEMORY.md`) | Metrics Tracker |
| Templates · brand kit | Feedback (ranked) |
| Daily logs · handoffs (until Notion) | Daily Logs · Clip Pipeline · Experiments |

## Start here
1. Read `CLAUDE.md` (rules) and `MEMORY.md` (why + what to revisit).
2. Scaffold `../.claude/agents/` (see its README + plan Appendix B).
3. Stand up the Notion workspace; move the live boards there.

Full plan & reasoning: [`../docs/launch/2026-06-19-shadowing-plus-ai-agent-workforce-plan.md`](../docs/launch/2026-06-19-shadowing-plus-ai-agent-workforce-plan.md)
