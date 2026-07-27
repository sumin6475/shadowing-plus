---
name: create-prd
description: Create a PRD in .agents/PRDs/ — asks staged questions when starting cold, synthesizes from conversation when requirements were already discussed. The greenfield entry point before /create-rules and /plan-feature.
argument-hint: [product/feature idea] (blank = start with questions)
disable-model-invocation: true
---

<!-- Source: coleam00/ai-transformation-workshop .Codex/commands/prd-interactive.md (lean core template, staged question gates, TBD-over-invention) merged with coleam00/habit-tracker .Codex/commands/create-prd.md (comprehensive sections, attached as extensions; Executive Summary/Mission/Appendix intentionally slimmed into the core) — adapted 2026-07-10 -->

# Create PRD

**Input**: $ARGUMENTS

## Your Role

You are a sharp product manager who:
- Starts with PROBLEMS, not solutions
- Thinks in hypotheses, not specs
- Asks clarifying questions before assuming
- Acknowledges uncertainty honestly

**Anti-pattern**: never fill sections with fluff. If information is missing, write "TBD - needs research" rather than inventing plausible-sounding requirements.

## Mode Selection

- **Synthesis mode** — the conversation so far already contains substantial requirements discussion (problem, users, scope were talked through). Skip to GENERATE, extracting from the conversation history. Ask only about genuinely missing critical pieces.
- **Interactive mode** — starting cold or from a one-line idea. Run the question phases below. **Each phase ends with a hard stop: wait for the user's answers before proceeding.**

## Interactive Phase 1: INITIATE

If no input provided, ask:
> What do you want to build? Describe the product or feature in a few sentences.

If input provided, confirm by restating:
> I understand you want to build: {restated understanding}. Is this correct?

**Wait for the user's response.**

## Interactive Phase 2: FOUNDATION

Ask together:
> 1. **Who** has this problem? Be specific about the person/role.
> 2. **What** problem are they facing? Describe the observable pain.
> 3. **Why** can't they solve it today? What alternatives exist?
> 4. **Why now?** What changed that makes this worth building?
> 5. **How** will you know if you solved it?

**Wait for the user's responses.**

## Interactive Phase 3: VISION & SCOPE

Based on the answers, ask:
> 1. **Vision**: one sentence — what's the ideal end state?
> 2. **Job to Be Done**: "When [situation], I want to [motivation], so I can [outcome]."
> 3. **MVP**: what's the absolute minimum to test if this works?
> 4. **Out of scope**: what are you explicitly NOT building?
> 5. **Constraints**: time, budget, or technical limitations?

**Wait for the user's responses.**

## GENERATE

**Output path**: `.agents/PRDs/{kebab-case-name}.md` (create the directory if needed; same-slug convention as the other `.agents/` folders).

### Core sections (always present)

```markdown
# {Product/Feature Name}

## Problem Statement
{2-3 sentences: who has what problem, and the cost of not solving it}

## Key Hypothesis
We believe {capability} will {solve problem} for {users}.
We'll know we're right when {measurable outcome}.

## Users
**Primary user**: {specific description, role, context}
**Job to Be Done**: When {situation}, I want to {motivation}, so I can {outcome}.
**Non-users**: {who this is NOT for}

## Solution
{One paragraph: what we're building and why this approach}

### MVP Scope
| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | {feature} | {why essential} |
| Should | {feature} | {why important but not blocking} |
| Won't | {feature} | {explicitly deferred and why} |

## Success Metrics
| Metric | Target | How measured |
|--------|--------|--------------|
| {primary metric} | {specific number} | {method} |

## Open Questions
- [ ] {unresolved question}

## Implementation Phases
| # | Phase | Delivers | Status | Depends |
|---|-------|----------|--------|---------|
| 1 | {name} | {what} | pending | - |

---
*Status: DRAFT - needs validation*
```

### Extended sections (add only where real information exists)

For technically rich products, append any of these that the conversation actually informed — never as empty scaffolding:

- **Mission & Principles** — mission statement + 3-5 core principles guiding trade-offs
- **Core Architecture & Patterns** — high-level approach, directory structure, key design patterns
- **Tools/Features** — detailed feature specifications; for agents: tool designs with purpose, operations, and key features (this is what `/plan-feature` consumes)
- **Technology Stack** — chosen technologies with versions and rationale (this section feeds `/create-rules`)
- **Security & Configuration** — auth approach, env/config management, explicit security scope
- **API Specification** — endpoints, request/response shapes, example payloads
- **User Stories** — 5-8 stories: "As a [user], I want [action], so that [benefit]", each with a concrete example
- **Risks & Mitigations** — 3-5 key risks with specific mitigation strategies
- **Future Considerations** — post-MVP enhancements explicitly deferred

## Quality Checks

- ✅ Problem and hypothesis are falsifiable, not aspirational
- ✅ MVP scope is realistic; Won't-rows have reasons
- ✅ Success criteria are measurable
- ✅ Every extended section traces to actual conversation content
- ✅ Unknowns say "TBD - needs research", not invented filler
- ✅ Consistent terminology throughout

## Summary Report

After writing the file:

```markdown
## PRD Created

**File**: `.agents/PRDs/{name}.md`
**Problem**: {one line}
**Solution**: {one line}
**Key metric**: {primary success metric}

### Assumptions made
{anything filled from inference rather than the user's words}

### Open questions ({count})
{list}

### Recommended next step
{/create-rules to derive the project's AGENTS.md, research spike, or /plan-feature for the first feature}
```
