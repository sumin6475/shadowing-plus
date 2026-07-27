# MVP Web Beta — Pre-launch Checklist

**Current focus:** Ship an invite-only, free web beta for the first Language
Island, **Explain what I do**.  
**Out of scope:** payments, public YouTube import, public Chrome extension,
generic AI mock interviews, multi-Island expansion, and TestFlight development.

## 1. Confirm multi-user safety first

- [ ] Verify which Supabase migrations are actually applied in production; do not
  infer this from source files or older notes.
- [ ] Configure and verify Auth redirect URLs and the deployed session layer.
- [ ] Run the two-account isolation test: videos, transcripts, Phrase Bank,
  Islands, usage, jobs, direct URLs, and API routes must never cross accounts.
- [ ] Confirm logged-out users are redirected from protected routes.

**Gate:** do not invite an external user until this passes.

## 2. Verify the current app’s beta baseline

- [ ] Sign-up / login.
- [ ] Private upload → transcript → playback → bookmark → review.
- [ ] R2 signed media access and quota refusal.
- [ ] Desktop and mobile layout.
- [ ] Feedback submission and error states.
- [x] From `web/`: `npm test`, `npm run lint`, and `npm run build`. *(2026-07-26: 72 tests, 0 lint errors, build ok.)*

## 3. Make the product promise clear

- [ ] Use the core message: **“Stop collecting English. Start using the English
  you already know.”**
- [ ] Add the Passive English / Active English onboarding Venn diagram.
- [ ] Keep the first job concrete: **Explain what I do**.
- [ ] Remove any implication that the product is a native-answer generator or a
  generic AI mock-interview app.

## 4. Complete Phrase Bank input  ✅ done 2026-07-26

- [x] In the authenticated web player, let a learner select a short chunk within
  one subtitle from their own uploaded media.
- [x] Show a Korean context-aware explanation, immediate transcript context, and
  a clear Save to Phrase Bank action.
- [x] Preserve source video, subtitle, timestamp, selected text, and explanation
  provenance.
- [x] Support manual phrase/chunk entry for users with a cold Phrase Bank.

See [the contextual explanation reference](2026-07-24-contextual-chunk-explanation-example.md)
for the required Korean explanation format.

> **2026-07-26:** Shipped the in-player selection→save popover + a manual
> add-phrase form on /phrases. Also pulled Phase-3 forward: the Phrase Bank page
> is the full Claude Design port with a real learning-status/SRS system
> (migration 018). Commits `2223c9c`, `268b171`, `3d30821`. Runtime-verified in
> the running app; migration 018 applied to production.

## 5. Build Speaking Memory Search

- [ ] Prompt: **“What are you trying to say?”**
- [ ] Search only the learner’s own memory by English phrase, Korean meaning, or
  intended message.
- [ ] Show phrase, source/context, why it matches, and current evidence level.
- [ ] Let the learner bring a result directly into an Island rehearsal.
- [ ] Track selected and rejected results; do not build vector/RAG infrastructure
  until the transparent first version has evidence of failure.

## 6. Build the first Language Island

- [ ] Brain-dump a real explanation.
- [ ] Use a few Boiling-style questions only where meaning is unclear.
- [ ] Produce an editable message structure; AI may organize but must not invent
  the learner’s story.
- [ ] Retrieve 1–3 learner-owned phrases for a selected beat.

## 7. Complete the use loop

- [ ] Attempt 1 (voice only after the recorder MIME, retention, and deletion
  checks pass; text is a safe temporary fallback).
- [ ] Diagnose only one gap: meaning / new language / retrieval / pressure.
- [ ] Give one compact repair drill.
- [ ] Attempt 2.
- [ ] Save the remaining repair for review.

### Evidence language for review

| User-facing state | Meaning |
| --- | --- |
| **Not yet** | I could not understand it in context or say it even with support. |
| **I recognized it** | I understood it in context, but could not yet recall it independently. |
| **It came back** | I produced it from my own intention before seeing the phrase. |
| **Use** | A separate behavior event: it appeared in a real/Island explanation. Never award this from a review button alone. |

## 8. Prepare privacy and operations

- [ ] Update Privacy/Terms for personal drafts, voice attempts, transcription,
  retention, and deletion.
- [ ] Keep public YouTube ingestion and the private ASR worker disabled.
- [ ] Set cost/rate/duration guardrails for AI and ASR calls.
- [ ] Verify cron secret, R2 CORS, error reporting, feedback path, and support
  contact.

## 9. Release in small steps

- [ ] Founder dogfoods three real explanations on desktop and mobile.
- [ ] Invite five target users for a short, free, private alpha.
- [ ] Fix the highest-frequency loop-breaking issue only.
- [ ] Expand to ten invited users if no safety issue appears.
- [ ] Decide next investment from evidence: retrieval, second Island, Speaking
  Readiness routines, or a focused native/TestFlight client.

## Reference documents

- [Speaking Memory MVP PRD](../../.agents/PRDs/speaking-memory-mvp.md)
- [Web beta launch plan](../../.agents/plans/2026-07-24-speaking-memory-web-beta-launch.md)
