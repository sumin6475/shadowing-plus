# AI Agent Workforce — Memory

*Durable decisions for the launch crew, and the reasoning behind each one. This is the **"dreaming" target** — the crew promotes lasting rules and decisions here. Written to be **revisited with a bird's-eye view**: every major choice records its **why** and a **revisit-when**.*

---

## ⭐ STARTER decision (v0 — not yet run)
**On 2026-06-19, adopted the AI Agent Workforce Plan as the launch operating system — as a STARTER, not a final design.**
- Full plan: [`../docs/launch/2026-06-19-shadowing-plus-ai-agent-workforce-plan.md`](../docs/launch/2026-06-19-shadowing-plus-ai-agent-workforce-plan.md)
- Distilled rules: [`CLAUDE.md`](CLAUDE.md) (this folder)

## Why this plan was picked for the starter
*Sumin's call — "it looks solid and has decent principles & guidelines worth trying." Articulated here so it stays **challengeable** later, not treated as settled:*

1. **Continuity** — it mirrors the human team Sumin already designed (founder + Growth / Content / Community / Design, the 3 metrics). No new mental model to learn, so it's easy to start.
2. **Principled, not vibes** — it's grounded in a coherent method (Director's Standard · Architecture Guide · Subagents Workbook): Plan→Build→Verify→Evolve, mandatory verification, fiscal tiers, layered security.
3. **Actually buildable** — it maps onto tools already connected (Notion, Figma, Canva, Intercom, Ahrefs, Amplitude…) and the open-source `agency-agents` roster, so it can be stood up cheaply and fast.
4. **Outcome-anchored** — every agent ties back to ① ② ③, so the crew chases proof of product-market-fit, not busywork.
5. **Safe by construction** — read-only agents + draft-by-default fit this project's real risks (RLS off, user uploads, pre-launch legal exposure).

> The point of recording this: when we zoom out later, we judge the plan against *these five reasons*. If a reason stops holding, that part of the plan is the first to change.

## Core bets — the assumptions to challenge
| Bet | Why we're betting it | Revisit when |
|---|---|---|
| 7 agents + 1 advisor is the right size | mirrors the human roles + the method's 2 cross-cutting roles | a role sits idle, or a real job has no owner |
| Agents augment / stand in for unpaid friends | solo founder, passion-project team | a human owner joins (agent → assistant), or friends flake |
| Draft-by-default + read-only agents = enough safety | RLS off, anon writes, uploads, legal exposure | first real incident, or before public launch |
| Weekly Plan→Build→Verify→Evolve cadence | matches the playbook's Monday sync | the loop feels too slow / too fast after 2–3 runs |
| Haiku / Sonnet / Opus tiering controls cost | high-volume work runs on the cheap tier | the weekly `usage_events` cost report spikes |
| Notion is the right ops home | connected, friend-friendly, DBs + docs in one place | friends won't adopt it, or it gets cluttered |

## Revise with a bird's-eye view — when & how
Zoom out and re-read the whole plan after: **(a)** the first 1–2 weekly loops · **(b)** the first public-launch legal review · **(c)** any cost spike · **(d)** any safety or quality incident · **(e)** a friend joining or leaving a role.

Then ask: Are the 3 metrics moving? Is the Director still the calm center, or the bottleneck? Which **bet** above broke? **Update order:** this file first → then `CLAUDE.md` → then the full plan.

## Status
- **v0 STARTER** adopted 2026-06-19. **Not yet run** — no weekly loop completed.
- **2026-07-18:** all 8 launch-crew personas scaffolded in `.claude/agents/` (director, growth-lead, content-learning-lead, community-support-lead, design-brand-lead, reality-checker, ops-scribe, legal-policy-advisor). Composed from the plan §3.1–3.8 + this project's own context (not lifted from external agency-agents). `model` uses resolving aliases (opus/sonnet/haiku); least-privilege lives in each persona's "Rules — the harness" body, not a `disallowed_tools` key. Reality-Checker is `memory: none` on purpose.
- **Next:** stand up the Notion workspace (Launch hub + the 5 boards in `daily-driver.md`), then run the first weekly loop (Plan → Build → Verify → Evolve).

## Open threads
- Choose exactly which `agency-agents` personas to lift per agent (shortlist in the plan, Appendix B).
- Decide the public-launch legal gate — owner and timing.
- Re-confirm Notion vs. a dedicated PM tool once friends are onboarded.
- (Optional) wire a one-line pointer from the **root** `CLAUDE.md` to this folder so the operating system is discoverable from the top.
