# Decision — Your Ideal Role Model is a free acquisition product, not the Speaking Memory core

**Date:** 2026-07-24  
**Status:** Direction approved; no integration work authorized yet.

## Decision

Keep **Your Ideal Role Model** as a separate, lightweight free experience that can be shared with friends. It is the top of the funnel for Shadowing Plus, not a feature to merge into the first two-week Speaking Memory MVP.

Its promise is:

> Find an English-speaking role model whose way of building thoughts resembles yours.

Shadowing Plus' promise is different:

> Turn your own ideas and the English you have already learned into words you can retrieve under pressure.

Together:

> **Role Model tells you who feels natural to learn from. Shadowing Plus helps you turn what you learn into your own voice.**

## Why this is a useful lead product

- **Low-friction curiosity:** native-language recording is less intimidating than an English assessment and can be tried without a long commitment.
- **Shareable outcome:** a communication-style result and a role-model match are naturally easier to show friends than an SRS dashboard.
- **Evidence rather than horoscope:** show `You said → Creator does → Match`, a resemblance word (`strong`, `clear`, `partial`), and no fabricated precision score.
- **Natural next action:** the selected creator can inspire a learning source; the learner still chooses what to save and practice.

The current Role Model project already protects the key trust boundaries: native-language in, an evidence chain, resemblance as a word rather than a percentage, and deletion of raw audio after transcription. It should preserve those boundaries if it becomes a public lead surface.

## Product relationship

```text
free Role Model → communication-style result → suggested English role model
  → learner chooses content / saves phrases → Phrase Bank → Language Island
  → own spoken attempt → repair drill → SRS follow-up
```

The role model is a **learning-direction signal**, not a prescription to copy another person's identity or a full answer generator. The Language Island remains grounded in the learner's own facts, story, and voice.

## Recommended lead flow

1. Invite a user to speak for about one minute in their native language about something they care about or what they do.
2. Return a communication-style read, three creator matches, and evidence for each match.
3. Offer a shareable result card. Share the learner's style descriptor, not an overconfident “you are X% this creator” score.
4. Offer one primary CTA: **“Practice explaining what you do in your own style.”**
5. Only at this handoff, offer an optional email/beta invite or account connection to Shadowing Plus.

## Privacy and handoff rule

The no-account/free Role Model surface must not silently transfer raw audio or transcripts into Shadowing Plus. If a learner opts in, transfer only a small, user-approved derived profile (for example, selected communication traits and the chosen creator ID) through an explicit handoff. The raw recording remains request-scoped and deleted as promised.

## Scope guardrails

- Do not merge the FastAPI/Next Role Model codebase into Shadowing Plus during the first two-week MVP.
- Do not make a Role Model result necessary to create the first Language Island; it is an optional acquisition and personalization path.
- Do not promise that the recommended creator's public content may be automatically imported or transcribed.
- Do not market the result as a personality test, psychological assessment, or precise similarity measurement.
- Be transparent that a live match can take about a minute; do not imply instant “fortune” results.

## Later integration contract (TBD)

If lead conversion validates, define a minimal versioned handoff payload, authenticated only after explicit consent:

```json
{
  "profile_version": 1,
  "selected_traits": ["step-by-step", "reflective"],
  "selected_creator_id": "...",
  "consent_at": "..."
}
```

Shadowing Plus can use this only to personalize coaching structure, initial prompts, and optional content suggestions. It must not treat a match as a fact about the learner or override the learner's chosen Island.
