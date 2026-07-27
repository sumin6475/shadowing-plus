# Speaking Memory MVP — Explain What I Do

## Problem Statement

Non-native English speakers often understand and collect useful expressions but cannot retrieve them while explaining their work under pressure. Generic language apps provide content, AI role-play, or pronunciation feedback, but do not connect a learner's own ideas to the phrases they have already saved and practiced.

The cost is not merely missed practice. A learner enters an interview, meeting, or networking conversation with relevant knowledge but loses their story, evidence, and familiar language at the moment it matters.

## Key Hypothesis

We believe that turning a learner's raw explanation into a personal message, then repairing the exact gaps in a spoken attempt with phrases from that learner's own bank, will help them complete a second attempt more clearly than generic practice.

We will know this is promising when at least **5 of 10** recruited target users complete an Island, make a second attempt, and report that they retrieved at least one previously saved phrase without being shown a full script. This is a validation target, not a claim of efficacy.

## Users

**Primary user:** A non-native English-speaking student, early-career professional, or builder who needs to explain their work, project, or research in English within the next month. They already consume English learning content and have at least a few saved expressions, but freeze or become vague when speaking about themselves.

**Job to Be Done:** When I need to explain what I do in English under time pressure, I want to organize my own point and retrieve language I already learned, so I can sound clear without memorizing someone else's script.

**Non-users:** Absolute beginners who need a foundational English course; learners looking only for entertainment content; users asking the product to source or reproduce copyrighted third-party transcripts.

## Solution

The first Language Island, **Explain what I do**, is a private rehearsal workspace. A learner writes or speaks a rough explanation, answers focused Boiling-style questions to make its meaning clear, and receives a small, editable message outline. Before and after a spoken attempt, the product finds relevant chunks in the learner's own Phrase Bank and saved learning material. It then identifies whether the failure was an idea gap, an unfamiliar expression, a retrieval failure, or performance under pressure; the learner receives one next drill and tries again.

The product is not an “AI-native answer generator.” It must preserve the learner's facts and voice, show phrase provenance, and never pretend that a generic generated answer is the learner's story.

## Mission & Principles

**Mission:** Help people use the English they already know when their own ideas matter.

1. **Own voice first.** AI structures and questions; the learner supplies facts, claims, and stories.
2. **Retrieval over collection.** A saved phrase only becomes valuable when the learner uses it unprompted in a relevant attempt.
3. **One failure, one next action.** Avoid a dashboard of corrections; identify the highest-leverage repair.
4. **Private by default.** Personal audio, written ideas, and user-uploaded media are sensitive learning data.
5. **Honest product boundaries.** Do not imply that third-party videos, captions, or branded learning-app content may be imported without the necessary rights.

## MVP Scope

| Priority | Capability | Rationale |
| --- | --- | --- |
| Must | Create one Island: **Explain what I do** | A single recurring speaking domain makes the product testable in two weeks. |
| Must | Capture a rough written or recorded answer, then create an editable short message outline | Preserves the Boiling Point insight: solve meaning before language. |
| Must | Let the learner manually add a phrase/chunk and reuse existing Phrase Bank items | The product must work with learning material from any source without copying or scraping it. |
| Must | In the web player, select transcript text, see a context-aware chunk explanation, and save it to the Phrase Bank | Turns the learner’s own uploaded media into reusable language without making the Chrome extension a public dependency. |
| Must | Retrieve 1–3 provenance-labeled saved phrases for a selected message beat | Tests the central “use what I already learned” promise. |
| Must | Search the learner's private speaking memory by phrase, meaning, or intended message | Makes stored learning material retrievable at the moment the learner has something to say. |
| Must | Record an attempt, transcribe it, and ask for a second attempt after one targeted repair | Makes retrieval visible instead of reducing the product to a phrase library. |
| Must | Save the repair as an evidence-based review: can recognize → can retrieve → has used | Measures usable language rather than memorization alone. |
| Should | Time-boxed retry and one changed follow-up prompt | Tests pressure without building a generic AI mock-interview product. |
| Should | TestFlight build that uses the existing backend and proves native microphone capture / notification eligibility | Validates the mobile-launch direction without duplicating the web product. |
| Should | A small onboarding survey and consented feedback capture | Required to recruit and learn from the first 10 users. |
| Won't | Generic AI interview simulator | Commodity feature; it is a later evaluation surface, not the product wedge. |
| Won't | “Native-like” full-answer generator | Risks erasing the learner's voice and lacks differentiation. |
| Won't | Public YouTube caption/video ingestion or server-side downloading | Official embeds do not authorize arbitrary caption collection; hosting does not change this. |
| Won't | Public Chrome extension or Chrome Web Store launch | The extension is a founder-only capture experiment. |
| Won't | Full multi-Island map, social features, paid subscriptions, or a public App Store release | All expand scope before the core loop has evidence. |

## Core Loop and Success State

```text
1. Brain-dump a real explanation
2. Distill the learner's message into editable beats
3. Retrieve learner-owned chunks that fit one selected beat
4. Speak an initial attempt
5. Diagnose one gap: meaning / new language / retrieval / pressure
6. Complete one short repair drill
7. Speak again; mark the phrase as retrieved or used only when earned
8. Schedule the remaining repair for SRS
```

**A successful first session** ends with a learner who has completed two attempts and can see: what they wanted to say, which phrase came from their own bank, what failed on attempt one, and what changed on attempt two.

## Search and Usability Evidence

### Onboarding concept: passive → active English

Add a compact onboarding visual after the learner understands the product promise:
a two-circle Venn diagram labeled **Passive English** and **Active English**.

- **Passive English:** “I recognize it when I hear or read it.”
- **Active English:** “I can retrieve it when I have something to say.”
- **Overlap / bridge:** “English ready for my real conversations.”

The visual is an explanatory model, not a scientific measurement claim. Its job is
to show why saved clips and familiar phrases alone are not the finish line:
Shadowing Plus helps a learner move personally useful language into the part they
can hear, retrieve, and use. Keep the first implementation static and accessible
(real text labels and a non-visual text alternative), with no fake percentage or
proficiency score.

### Search is a recall tool, not an archive filter

The primary search prompt is **“What are you trying to say?”**, not merely
“search saved clips.” A learner may enter an English phrase, a Korean meaning,
or an incomplete intention such as “why my project matters.” Results are limited
to the learner's own Phrase Bank, saved clips, and Island material and must show:

- the phrase or useful variation;
- the source/context where it came from;
- why it matches the intended message; and
- the strongest evidence currently earned: **Recognize**, **Retrieve**, or **Use**.

The first beta uses transparent, scoped matching across phrase text, learner
meaning, usage notes, and saved context. It should also support literal search
for when a learner remembers part of the phrase. Semantic/vector search is a
future quality upgrade, not an excuse for opaque or cross-user retrieval.

### The product measures usable access, not “memorized”

Each phrase has three independent evidence levels:

| Evidence | Learner-facing question | What counts | What it does not claim |
| --- | --- | --- | --- |
| **Recognize** | “When I hear or see this in context, do I understand it?” | Learner can identify the intended meaning after hearing/seeing its context. | That they can produce it. |
| **Retrieve** | “Given my own intention, can I say it before seeing the phrase?” | Learner produces the phrase or an acceptable variation in a prompted attempt. | That they used it spontaneously in life. |
| **Use** | “Did it come out naturally while I explained something real?” | Learner confirms it, ideally supported by an Island attempt transcript. | Native-like fluency or permanent mastery. |

`Saved` and `Shadowed` remain learning-history events, not proof of ability.
The product must never turn a display, a listen, or an AI suggestion into a
`Use` event automatically.

### Review language and scheduling

Keep the existing SM-2-lite values (`again`, `good`, `easy`) as internal scheduler
compatibility for bookmark review, but replace their learner-facing meaning:

| Internal value | Learner-facing action | Evidence meaning | Initial scheduling behavior |
| --- | --- | --- | --- |
| `again` | **Not yet** | I did not recognize the meaning or could not say it even with support. | Retry in about 1 minute. |
| `good` | **I recognized it** | I understood it in context, but it did not come back independently. | Review in about 2 days. |
| `easy` | **It came back** | I retrieved it from my own intention before the phrase was revealed. | Review in about 7 days. |

**Use** is recorded only in an Island or real-use attempt, separately from the
three scheduling buttons. A review card should first test listening/meaning, then
ask for a short response from an intention; it should not ask users to rate how
well they “memorized” a line.

## Existing Assets to Reuse

| Existing asset | MVP role |
| --- | --- |
| Private R2 upload and processing pipeline | User-owned media remains a legal public input path. |
| `phrase_items` Phrase Bank | Initial learner-owned chunk inventory; add manual-source support rather than assuming a video source. |
| Existing founder-only extension phrase flow | Reuse its selection → contextual explanation → save interaction pattern inside the authenticated web player; do not expose or distribute the extension. |
| Bookmarks + SM-2-lite SRS | Schedule targeted repairs and track repetition. |
| Multi-user Supabase auth/RLS | Scope Islands, attempts, and phrase retrieval to the learner. |
| Telegram review adapter | Temporary test-only notification path; do not couple Island logic to it. |
| Boiling Point's question-first coaching and story-card concepts | Product behavior reference only; do not copy its separate database or public surface into this MVP without an approved migration plan. |

## Success Metrics

| Metric | Target for the first 10-user cohort | How measured |
| --- | --- | --- |
| Completed core loop | 5 users complete two attempts in one Island | Island event log: created → attempt 1 → repair → attempt 2 |
| Prior-language retrieval | 5 users report using at least one saved phrase in attempt 2 | User-confirmed “used” event plus attempt transcript review |
| Search-to-speech value | 7 users find at least one search result relevant to their intended message | Search result selection/rejection + 1–5 relevance prompt; target ≥4 |
| Perceived relevance | 7 users say the recommended phrase fit what they meant | One-question post-session survey, 1–5 scale; target ≥4 |
| Return intent | 4 users create or request another rehearsal | Seven-day follow-up / direct feedback |
| Safety boundary | 0 public YouTube ingestion paths enabled | Route/UI/env review before invitation |

## Technology & Delivery Constraints

- **Time:** approximately two weeks, 3–4 focused hours per day (28–56 hours). The Must scope is the only launch gate.
- **Current stack:** Next.js 16 / React 19, Supabase Auth/Postgres, private Cloudflare R2, Vercel API routes, existing ASR providers and SRS utilities.
- **Mobile:** TestFlight is a distribution/proof-of-native-capability milestone, not evidence that an App Store-ready product has shipped. A native client must provide real native value—at minimum microphone capture and notification capability—rather than a thin web wrapper. Exact Expo/native architecture is TBD after the web loop works.
- **Google Cloud / hackathon:** If the XPRIZE submission proceeds, use a Google Cloud product in the real production loop and retain agent-execution evidence. The exact service and agent boundary are TBD; do not add cloud complexity before the core loop is demonstrably useful.

## Media, YouTube, and Third-Party Content Boundary

The public product accepts user-owned uploads and user-entered phrase text. A learner may manually save a short chunk they are entitled to use, with source attribution where available; the product should not promise bulk import from Duolingo, Speak, or any other learning service.

For an uploaded video/audio transcript inside the web player, the learner may
select a short chunk **within one subtitle in the first beta**, see an explanation
that uses its immediate transcript context, and save that chunk as a `Phrase
Bank` item. The saved item keeps its media, segment/timestamp, selected text, and
explanatory provenance. Multi-subtitle selection is a later refinement; it must
not weaken source/timestamp validation. This is a first-party in-app learning
flow—not a public browser-extension feature and not permission to select/copy
text from third-party services.

For YouTube, the official IFrame Player API supports controlled embeds, while official caption download can return a 403 without sufficient authorization. That means a public “paste any YouTube link and import captions” feature is not approved. A future compliant spike may consider (a) playback-only embeds, or (b) OAuth-connected access to a creator's own channel/content, with legal and policy review before shipment. It is not part of this MVP.

## Implementation Phases

| # | Phase | Delivers | Status | Depends |
| --- | --- | --- | --- | --- |
| 0 | Product baseline | This PRD approved; current public/private boundaries documented | completed | - |
| 1 | Island data and entry | One Island, rough-answer capture, editable Explain-what-I-do beats | pending | approved product scope |
| 2 | Personal language retrieval | Manual phrase entry plus scoped retrieval from Phrase Bank/bookmarks with provenance | pending | Phase 1 |
| 3 | Attempt and repair | Recording/transcription, one diagnosis, drill, retry, and SRS state update | pending | Phase 2 |
| 4 | Mobile beta and cohort | TestFlight proof, invite flow, 10-user cohort instrumentation and support | pending | Phase 3 |
| 5 | Evidence-led expansion | Decide on additional Islands, notifications, and native launch based on cohort evidence | pending | Phase 4 |

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Retrieval returns a grammatically plausible but personally irrelevant phrase | Limit to 1–3 options, show source/provenance, ask the learner to choose, and log rejection. |
| The product becomes a full generic tutor | Enforce one Island and one repair loop; reject broad role-play/curriculum work from MVP scope. |
| Learners do not have enough saved phrases | Manual entry creates a viable cold start; label new language clearly instead of pretending it was known. |
| Voice scoring expands into an expensive, unreliable feature | Transcribe and classify meaning/retrieval first; defer fine-grained pronunciation scoring. |
| Native-client work displaces core validation | TestFlight comes after the web core loop and must reuse its backend. |
| Copyright/ToS exposure through content imports | Private uploads only; no public third-party caption scraping, downloading, or bulk import. |
| F-1 work authorization constraints | Do not begin paid operations or sales until the founder has written guidance from their DSO/qualified immigration counsel. |

## Future Considerations

- **Speaking Readiness routines (post-core-loop):** During onboarding, learn the
  learner’s near-term speaking situation, available time, current routine, and
  desired confidence area. Recommend a small, adaptable preparation ritual—not a
  generic streak tracker—such as a 2-minute mouth warm-up (`입풀기`), targeted
  pronunciation time, one short speaking rehearsal, focused listening, or a
  retrieval review from the learner’s current Island. Ask for lightweight
  feedback (“helpful / not for me / too long”) and gradually adapt future
  recommendations. The north-star is **readiness to use English when it matters**,
  not minutes watched, cards completed, or arbitrary daily streaks. This begins
  only after the first Island loop validates; it must not delay the two-week beta.
- A separate free acquisition surface: **Your Ideal Role Model**. It may hand off an explicitly consented, derived communication-style profile, but is not a prerequisite for an Island and must remain a separate codebase until the core loop validates. See `docs/ver2.0 plan/2026-07-24-role-model-lead-funnel.md`.
- Additional Islands: career story, project pitch, research explanation, client objection.
- Native push/local notifications as Telegram replacement.
- A native mobile app beyond TestFlight after the core loop validates.
- Retrieval quality: embeddings, semantic search, and learner-specific proficiency scoring. Start with privacy-scoped, inspectable retrieval; do not build opaque infrastructure prematurely.
- Creator-owned YouTube OAuth integration or playback-only embeds, subject to policy/legal review.
- Paid plans and global payment processing only after F-1 authorization and product validation are clear.

## Open Questions

- [ ] What exact form should the first rough answer take on mobile: text, audio, or both?
- [ ] Which existing stored entities can safely support semantic retrieval without a data migration?
- [ ] What is the smallest native implementation that proves TestFlight value beyond the PWA?
- [ ] Which target language(s) and UI language(s) can the two-week MVP honestly support? The current pipeline defaults to English audio → Korean translation.
- [ ] Which Google Cloud service and observable agent action will be used if this becomes the XPRIZE submission?
- [ ] What consent, retention, and deletion UX is required for recorded attempts before inviting external testers?

---
*Status: DRAFT — needs validation and implementation planning. Created 2026-07-24 from the founder's product-direction discussion.*
