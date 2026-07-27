# Speaking Memory Web Beta Launch Plan

**Status:** proposed — review gate before implementation  
**Target:** an invite-only, free web beta in two weeks (28–56 focused hours)  
**First experience:** one private Language Island, **Explain what I do**  
**Non-goal:** broad public launch, paid plans, a public YouTube importer, or an App Store release.

## Outcome

Ship a safe, observable web beta where a learner can turn a real explanation of
what they do into an editable message, select language they already own, make
two spoken attempts, repair one failure, and schedule the remaining weakness for
review.

The beta promise is:

> Stop collecting English. Start using the English you already know.

The beta is **invite-only (5 users first, then up to 10)** until account isolation,
audio handling, and the core loop have been observed in production. This is a
product-validation cohort, not a claim of learning efficacy.

## Launch flow

```text
Release safety gate
  → founder dogfood
  → 5-person invite-only alpha
  → fix the highest-friction step
  → 10-person web beta
  → evidence review
  → decide: second Island / native TestFlight / broader access
```

Within one learner session:

```text
Rough explanation
  → editable personal beats
  → choose 1–3 phrases already in their bank
  → spoken attempt 1
  → one diagnosed gap + one drill
  → spoken attempt 2
  → mark earned use + schedule review
```

## Non-negotiable launch gates

| Gate | Required evidence | Why it comes first |
| --- | --- | --- |
| Multi-user safety | Auth redirect settings, session layer, migrations 008–017 applied in the real Supabase project, and the two-account isolation checks pass | Source files cannot prove migrations are live. Current runbook says 008 was not applied; without it, external accounts may see or change one another’s data. |
| Private media | Test account can upload/play only its own R2-backed asset; no public YouTube import path or private ASR worker is enabled | The public product accepts user-owned uploads and manual phrase text only. |
| Voice-data policy | Privacy/Terms explain attempt-audio retention, processors, deletion, and consent; the implemented deletion behavior is tested | An Island contains particularly sensitive personal ideas and voice. |
| Core-loop truth | Founder completes the full two-attempt loop on desktop and mobile; analytics/feedback records each step | The beta must test retrieval and repair, not merely a polished phrase library. |
| Operational readiness | Production environment variables, R2 CORS, cron secret, quota, error capture, and a support contact are verified | Prevents a small beta from becoming an unobservable cost/support problem. |

## Scope decision

### Build now

- Authenticated **Explain what I do** workspace.
- Text-first brain dump; audio input is supported only if the short-attempt recorder
  meets the MIME/privacy gate below.
- AI-assisted, editable personal beats. The model may organize; it must not invent
  personal facts or output a replacement “native answer.”
- Manual phrase entry plus existing `phrase_items` inventory.
- In-app transcript selection for user-owned uploads: select a short chunk within
  one subtitle, inspect a context-aware explanation, then save it to Phrase Bank.
- Transparent, user-scoped phrase suggestions: 1–3 candidates, source/provenance,
  and explicit accept/reject.
- A private **Speaking Memory Search**: search by phrase, meaning, or “what I am
  trying to say,” then take a result directly into a rehearsal.
- Attempt 1 → one diagnosis (`meaning`, `new_language`, `retrieval`, `pressure`) →
  one compact drill → attempt 2.
- Separate Island phrase progress/SRS state: `saved → shadowed → retrieved → used`.
- Event instrumentation, one-question feedback, invite/support workflow.

### Explicitly defer

- Generic mock interviews, pronunciation scoring, multi-Island map, automatic
  third-party-course imports, public Chrome extension, public YouTube captions or
  downloads, payments, and public App Store release.
- TestFlight development. It becomes a post-beta architecture decision after the
  web loop works; a thin wrapper does not justify native scope.
- Embeddings/vector infrastructure. Start with inspectable lexical retrieval over
  a user’s own Phrase Bank and bookmarks. Promote it only if beta evidence shows
  insufficient relevance.
- Habit/streak mechanics. A later **Speaking Readiness** recommendation layer may
  propose a 2-minute mouth warm-up, pronunciation practice, short speaking
  rehearsal, focused listening, or retrieval review based on onboarding context
  and learner feedback. It must optimize readiness to speak—not engagement time—
  and must not delay this beta.

## Implementation plan

### 0. Establish the production baseline (Days 1–2)

1. Reconcile production migration state rather than relying on conflicting docs.
   - In Supabase, record which migrations 001–017 are applied and compare them to
     `supabase/migrations/`.
   - Follow and then update `docs/ver2.0 plan/PHASE-1-APPLY-RUNBOOK.md`; it
     currently says `008_auth_rls.sql` is not live, while newer project notes say
     it is.
   - Configure Auth redirect URLs and ensure the deployed session layer works
     before enabling/forcing RLS.
   - Apply missing migrations in order, with a backup and migration log. Do not
     replay an already-applied migration blindly.

2. Run the two-account security test in the runbook (`PHASE-1-APPLY-RUNBOOK.md`
   lines 52–61): library, direct media URL, usage, job feed, browser query,
   cross-user retry, and logged-out routing.

3. Produce a production smoke checklist for: sign-up/login, private upload →
   pipeline → playback → bookmark → practice, quota refusal, feedback submission,
   desktop/mobile layout, and cron authorization.

4. Update the stale setup/deployment material in `README.md` (it only lists
   migrations 001–004) and write down actual production values **without placing
   secrets in Git**.

5. Add lightweight production error/reporting coverage and a beta-support channel.
   Error messages must never expose transcripts, R2 keys, auth tokens, or prompts.

**Exit:** both accounts are isolated, a test upload is private end-to-end, and the
existing web app passes `npm test`, `npm run lint`, and `npm run build` from `web/`.

### 1. Create the Island’s private data model and entry (Days 2–4)

1. Before modifying Next.js code, read the relevant current Next 16 guides under
   `web/node_modules/next/dist/docs/` for App Router route handlers, proxy, and
   server/client boundaries; record any convention that changes implementation.

2. Add `supabase/migrations/018_speaking_memory_island.sql` with direct owner
   tables and `ENABLE` + `FORCE ROW LEVEL SECURITY`:
   - `islands`: one active `explain_what_i_do` Island per user, raw answer text,
     status, timestamps.
   - `island_beats`: ordered editable message beats and optional learner evidence.
   - `island_attempts`: attempt number, transcript, duration, optional private
     audio key/content type, timestamps.
   - `island_repairs`: selected beat, optional `phrase_item_id`, diagnosis,
     drill, SRS fields, and completion state.
   - `island_phrase_events`: append-only `saved/shadowed/retrieved/used/rejected`
     evidence for analytics and honest status.
   Child policies must traverse an owned Island (or safely denormalize `user_id`)
   and every privileged route must additionally scope by `user_id`.

3. Keep Island review state separate from `bookmarks`. A bookmark requires a real
   `segments` row (`001_rebuild_schema.sql`), so using it for manually entered
   phrases would corrupt the media model. Reuse the pure SRS algorithm only after
   adapting it to Island repair state.

4. Preserve `/island` as a public marketing teaser **or** replace it with a
   protected workspace at `/app/island`; do not make drafts/attempts accessible
   through the current public `/island` route. Update `web/src/proxy.ts` and app
   navigation accordingly.

5. Implement the entry experience:
   - Ask for a rough explanation in the learner’s own words.
   - Ask a small Boiling-style set of questions only when a beat lacks claim,
     evidence, audience, or purpose.
   - Generate a short editable beat outline and visibly distinguish learner facts
     from AI structuring.
   - Add a brief, accessible onboarding explanation with a **Passive English /
     Active English** Venn diagram: “I recognize it when I hear/read it” → “I can
     retrieve it when I have something to say,” with the overlap framed as
     “English ready for my real conversations.” This is a conceptual model, not
     a proficiency score or a fake assessment.

**Validation:** migration applies in a non-production project first; user A cannot
read/write any Island row belonging to B; a user can create, edit, reload, and
delete their own Island and no other user’s Island.

### 2. Build the Phrase Bank bridge, not a generic RAG layer (Days 4–6)

1. Bring the valuable part of the founder-only extension into the authenticated
   **web player**, without making the extension public. For the beta, a learner
   selects a short chunk *within one subtitle* from their own uploaded media; the
   app shows the selected chunk with immediate surrounding context, a
   context-aware explanation, and an explicit **Save to Phrase Bank** action.
   Reuse/extract the extension route’s normalization and explanation helpers where
   possible, but keep web authorization/session handling separate. Multi-subtitle
   selection is deliberately deferred until its timestamp/provenance model is
   explicit. Match the Korean explanation quality/format in
   `docs/ver2.0 plan/2026-07-24-contextual-chunk-explanation-example.md`:
   contextual meaning, unfamiliar usage distinction, short nuance, and a natural
   whole-context translation where multiple selected chunks are being learned.

2. Enforce that the selected text belongs to the selected user-owned video/segment,
   cap the selection length, and save media/segment/timestamp provenance alongside
   the phrase. The web player must not turn arbitrary pasted third-party text into
   a bulk-import pathway.

3. Add an authenticated manual Phrase Bank route and UI for cold start. Store
   bounded phrase text, optional learner meaning/usage note, and a clear
   provenance type: `manual`, `own_upload`, or `saved_clip`. Do not accept a
   pasted third-party transcript bulk import.

4. Make `/phrases` actionable: add phrase, show its provenance and lifecycle, and
   link it to relevant Island repairs without exposing another user’s data.

5. Build **Speaking Memory Search** as a retrieval surface, not a library filter.
   The prompt is “What are you trying to say?” and accepts a known phrase, a
   learner-entered meaning, or a short intended message. Search only the
   authenticated user’s `phrase_items`, learner meanings/usage notes, and
   bookmark-linked segment context. Each result shows source, relevance reason,
   and evidence level (`Recognize`, `Retrieve`, or `Use`), with a direct action to
   bring it into the current Island. Also support literal phrase search. Do not
   add cross-user corpus search or embeddings in this beta.

6. Capture selection/rejection and later “used” evidence; never count a displayed
   candidate as learned or used. Search events are product evidence:
   query submitted → result shown → result selected/rejected → phrase retrieved/
   used in an attempt.

**Validation:** unit-test normalization, selected-text containment/length checks,
context construction, literal/meaning ranking, empty-bank behavior, provenance
labels, evidence-level display, and state transitions. Manually verify a second
user cannot save or retrieve first-user phrases through a crafted request.

### 3. Build the attempt → repair → retry loop (Days 6–9)

1. Add an attempt service/API that always verifies session ownership, enforces a
   short duration/size limit, and records provider usage with `recordUsage`.

2. Decide recording storage before coding UI:
   - Preferred beta default: upload an attempt to a private R2 key, transcribe it,
     retain it only for a stated short period or until the learner deletes it.
   - Provide a deletion path that removes the R2 object and corresponding attempt
     record. If this cannot be completed safely, accept text attempts for beta and
     do not collect raw voice.

3. Validate browser `MediaRecorder` MIME output against the ASR integration. The
   current Groq adapter hard-codes `audio.mp3`; it must preserve a supported
   WebM/Opus content type/filename or recordings must be normalized before
   transcription. Do not route attempts through the long video `jobs/videos`
   pipeline unless they are intentionally library media.

4. After attempt 1, produce exactly one repair:
   - `meaning`: revise an unclear beat;
   - `new_language`: save one new phrase clearly labeled as new;
   - `retrieval`: shadow or vary one learner-owned phrase;
   - `pressure`: retry a shorter time-boxed answer.
   The user controls final edits; the diagnosis is an aid, not a verdict.

5. Capture attempt 2 and let the learner explicitly mark the selected phrase
   `retrieved` or `used`. Schedule the incomplete repair using Island SRS. Use
   learner-facing evidence labels rather than generic grades:
   - **Not yet** — neither recognition nor supported production worked;
   - **I recognized it** — meaning was clear in context, but independent recall
     was not yet there;
   - **It came back** — the learner produced it from their own intention before
     seeing the target phrase.
   `Use` is not a button claim: it is an explicit event from an Island/real-use
   attempt, ideally supported by the transcript.

**Validation:** unit-test diagnosis parsing/fallbacks and state transitions;
manually test microphone denial, unsupported MIME, failed transcription, retry,
and deletion. No raw attempt should appear in public logs or analytics.

### 4. Make beta operations and consent real (Days 9–11)

1. Update `web/src/app/privacy/page.tsx` and `web/src/app/terms/page.tsx` for
   Island written/audio attempts, AI transcription/structuring, retention,
   deletion, and current beta contact. Have a qualified professional review before
   a wider launch; the documents already say they are good-faith beta documents.

2. Update public Island/landing copy so it says own voice, phrase provenance, and
   private rehearsal—not “native answers,” scripts, or public video importing.

3. Add a minimal event taxonomy:
   `island_created`, `beats_edited`, `phrase_shown`, `phrase_selected`,
   `memory_search_submitted`, `memory_search_result_selected`,
   `memory_search_result_rejected`, `attempt_recorded`, `repair_completed`,
   `attempt_retried`, `phrase_recognized`, `phrase_retrieved`, `phrase_used`,
   `review_scheduled`, `feedback_submitted`.
   Store only necessary IDs/aggregates; avoid raw drafts and transcripts in
   analytics payloads.

4. Add a short in-product feedback prompt after the second attempt:
   “Did the suggested phrase fit what you meant?” (1–5) plus optional free text.
   Establish a 24-hour support/bug-response routine and an invite tracker.

5. Set beta cost guardrails: ASR/AI per-user limits, rate limiting, upload/attempt
   duration limits, owner exemption only where intentional, and an alert/review
   routine for usage failures.

**Validation:** review all public text/routes/env flags against the YouTube and
extension boundaries; submit feedback with two accounts; check that event payloads
do not contain personal content; run the full test/lint/build suite.

### 5. Release progressively and learn (Days 11–14)

1. Founder dogfood three real explanations across desktop and mobile. Fix only
   loop-breaking problems: account access, data isolation, unusable recording,
   incorrect retrieval, failed retry, or loss of a user’s work.

2. Invite five target users individually. Suggested invite framing:
   “I’m testing a private rehearsal tool for explaining what you do in English.
   It uses your own notes/phrases; it is free and early. I’d love one 15-minute
   session and blunt feedback.”

3. Observe completion without steering the content. After each session, record
   where the loop stopped and whether the learner recognized a phrase as useful.

4. Fix the single highest-frequency, highest-severity friction point; do not add
   another Island or mock-interview mode.

5. Expand to ten invited users only if the safety gates stay green. Review:
   - ≥5/10 finish two attempts;
   - ≥5 say they used at least one previously saved phrase in attempt 2;
   - average phrase-fit feedback ≥4/5 from at least seven responses;
   - zero cross-account data incidents;
   - clear 7-day return/rehearsal signal from at least four users.

6. Hold an evidence review. Choose one next investment:
   - improve retrieval/phrase cold start;
   - add a second Island; or
   - prototype a feedback-adaptive **Speaking Readiness** routine recommender; or
   - build a focused Expo/TestFlight client for microphone + notifications.
   TestFlight is selected only if the web cohort proves repeat use and native
   capabilities remove a measured pain.

## Release checklist

- [ ] Supabase migration ledger verified; Auth/RLS two-account test passed.
- [ ] R2 upload/playback/private attempt storage and deletion tested.
- [ ] No public YouTube ingestion, downloader, worker, or extension dependency.
- [ ] Island APIs check session and ownership; RLS policies are forced.
- [ ] Manual Phrase Bank cold start works and provenance is visible.
- [ ] First and second attempt complete on mobile Safari/Chrome and desktop Chrome.
- [ ] Privacy/Terms/copy match implemented data handling.
- [ ] Usage quotas, cron secret, error reporting, feedback, and support contact live.
- [ ] `cd web && npm test && npm run lint && npm run build` pass on the intended
      release commit.
- [ ] Founder dogfood completed; five-user invitation list ready.

## Risks and decisions

| Risk | Decision / mitigation |
| --- | --- |
| Production RLS state is unknown | Treat as a hard blocker; verify dashboard state and two-account isolation before inviting anyone. |
| Voice collection expands privacy/security work | Text-first is an acceptable beta fallback; do not retain voice without deletion and disclosure. |
| User has no saved phrases | Manual entry and clearly marked “new language” prevent a fake personalization claim. |
| Retrieval feels irrelevant | Show few candidates with provenance and user choice; collect rejection signal before adding embeddings. |
| Two weeks turns into an app rewrite | Protect the Must loop; native/TestFlight and multiple Islands remain post-evidence. |
| F-1 restrictions | This is a free beta. Do not activate paid operations, subscriptions, or sales without written DSO/qualified immigration-counsel guidance. |

## Later acquisition connection

`Your Ideal Role Model` remains a separate, free lead surface. Its handoff is an
optional, consented **derived communication-style profile**, never automatic raw
audio/transcript transfer. The product bridge is: “find a learning direction” →
“practice explaining what you do in your own voice.” See
`docs/ver2.0 plan/2026-07-24-role-model-lead-funnel.md`.

## Confidence

**High:** existing auth/RLS patterns, private R2 pipeline, Phrase Bank schema, SRS
utilities, and feedback/interest infrastructure can support this plan.

**Medium:** two weeks is sufficient for the invite-only web loop if the production
RLS state is already healthy and recorder MIME/retention are solved early.

**Low until verified:** current production migration state and direct browser
recording compatibility with the ASR provider. These are deliberately placed ahead
of feature polish.
