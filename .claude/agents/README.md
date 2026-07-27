# .claude/agents/ — Launch crew personas

Project-level subagent definitions for the Shadowing Plus **launch crew**, auto-discovered here. The rules they all follow live in [`../../agent-workforce/CLAUDE.md`](../../agent-workforce/CLAUDE.md); shared resources in [`../../agent-workforce/templates/`](../../agent-workforce/templates/).

> Status: **personas scaffolded ✅** (2026-07-18) — all 8 files below exist. This README documents the convention they follow. Next: stand up the Notion workspace and run the first weekly loop.

## Convention — one `.md` file per agent

YAML front matter (the control panel) + a body (persona · tasks · constraints):

    ---
    name: growth-lead
    description: Use for Metric ① work — getting learners in. Trigger on "growth", "launch post", "find communities".
    model: sonnet                     # resolving alias: haiku bulk · sonnet craft · opus orchestrate/review
    memory: project                   # use `none` for an unbiased reviewer (Reality-Checker)
    ---
    # Role & persona      (composed from the plan §3.x + this project's context)
    # Task instructions   (subtasks + granular tasks + cadence)
    # Constraints         (the harness — what it may NOT do)

Notes on the front matter, as actually shipped:
- **`model`** uses resolving aliases (`opus` / `sonnet` / `haiku`) — the same convention the repo's code agents use — not versioned IDs, which go stale.
- **Least-privilege is written into the persona body** (each agent's "Rules — the harness" section: draft-only, read-only on Supabase, no secrets) rather than a `disallowed_tools` key, since these are project subagents whose tool grants are governed by the operating-system `CLAUDE.md`. The Reality-Checker is read-only *by prompt and by role*; keep it that way.

## The 8 personas (created 2026-07-18 · plan Appendix B)

| File | Owns | Model | Lift from agency-agents |
|---|---|---|---|
| `director.md` | routing · final say | Opus | specialized/agents-orchestrator · chief-of-staff |
| `growth-lead.md` | ① WAL | Sonnet | marketing/growth-hacker · reddit-community-builder |
| `content-learning-lead.md` | ② retention | Sonnet | specialized/language-translator · voice-ai-integration |
| `community-support-lead.md` | ③ love | Sonnet | support/support-responder · product/feedback-synthesizer |
| `design-brand-lead.md` | visuals · brand | Sonnet | design/ui-designer · brand-guardian · visual-storyteller |
| `reality-checker.md` | quality gate | Opus · `memory:none` | testing/reality-checker · evidence-collector |
| `ops-scribe.md` | metrics · logs | Haiku | project-management/meeting-notes · support/analytics-reporter |
| `legal-policy-advisor.md` | risk (on-demand) | Opus | support/legal-compliance-checker · data-privacy-officer |

**Inherited by every persona:** only the Director routes between agents · draft-by-default · read-only on Supabase · no secrets. Full rules in the operating-system [`CLAUDE.md`](../../agent-workforce/CLAUDE.md).
