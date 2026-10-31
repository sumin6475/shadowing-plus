# Ask — in-app English expression assistant (implementation plan)

Status: **In progress (PR 2 — sheet built on canned replies; function not deployed)** · started 2026-10-02, PR 2 on 2026-10-07 · scope: `apps/mobile` + `supabase/functions` · design settled in a grilling session (decisions below are final unless a revisit trigger fires).

## Goal

A chat sheet inside Myne that answers "how do I say this?" in a fixed, cheap, structured format and lets the learner save results to Phrases or Studio Notes with one tap. It replaces asking a general chatbot (Gemini) with long instructions every time.

## Settled decisions

| Area | Decision |
|---|---|
| Surface | Mobile only. One sheet component, opened from a global header "Ask" icon and from the NoteEditor toolbar. |
| Modes | `how_to_say` (default) and `note`. A mode chip next to the input picks the prompt + schema **per message**; the session (history) is shared across modes. |
| Default mode | Settings → "Ask default mode" (AsyncStorage), initial `how_to_say`. NoteEditor entry always opens in `note`. |
| Session | In memory only; closing the sheet discards it. The client sends the last **6 turns**. No DB table. |
| Reply types | `card` (full format, new question) · `answer` (short follow-up; in `note` mode only the changed sections) · `off_topic` (fixed one-liner, session continues). Ambiguous questions branch inline (≤3 expressions with a situation label) — never ask back. |
| Language | Expressions + examples in English; meaning / nuance / tip in `first_language` (client-sent, same as `phrase-capture`). |
| Save to Phrase | Per expression. `text`←expression, `meaning`←meaning, `usageNote`←nuance (+ situation label), `context`/`contextTranslation`←one example + its translation, `learnerNote`←the original question. Uses existing `createPhrase` (which already triggers `phrase-embed`). |
| Save to Note | From Studio/global entry → new note (title = question). From NoteEditor → append to the current note body; never overwrite. |
| Backend | New Edge Function `ask-assist`, OpenAI `gpt-4.1-mini` (switched from gpt-4o-mini after the golden A/B on 2026-10-05; override with the `ASK_MODEL` secret), **strict `json_schema`** (first in the codebase), non-streaming. Output cap: how_to_say ≈350 tokens, note ≈700. |
| Cost control | Function writes `usage_events` (kind `ask`). Limit: **50 turns / user / rolling 24h**, both modes combined → `429 {code:"ask_daily_limit"}`. App disables input with one line; existing save buttons keep working. |
| UI | No design pass; build with existing cobalt tokens and sheet/card patterns. New pieces: bubble, HowToSayCard, NoteCard, mode chip, follow-up chips. |
| Quality | 20 golden prompts (10 per mode). Schema validity auto-checked; naturalness eyeballed. Every real failure adds a case. |
| Names | UI "Ask"; modes "How to say" / "Note"; code `ask`; function `ask-assist`. `talk-stuck` is not reused. |

Note: the app has no UI localization layer (all UI strings are English), so mode names and the limit message stay **English** like the rest of the UI; only model-generated content is in L1.

## Output contract (strict json_schema)

Strict mode needs an object root and every property `required`, so the union sits under `reply` and optional data is expressed as empty strings/arrays.

```ts
// shared by function + client (copied into apps/mobile/src/lib/ask-model.ts)
type Expression = { en: string; meaning: string; when: string };       // when = situation label, "" if single
type Example    = { en: string; l1: string };

type HowToSayCard = {
  type: "card"; mode: "how_to_say";
  query: string;            // normalized search term
  expressions: Expression[];  // 1–3
  nuance: string;           // L1
  examples: Example[];      // exactly 3
  tip: string;              // L1, one line
  follow_ups: string[];     // 2 tappable questions, L1
};

type NoteCard = {
  type: "card"; mode: "note";
  situation: string;                                        // L1, one line
  draft: { opening: string; body: string; closing: string }; // English, 1–3 sentences each
  key_phrases: (Expression & { example: Example })[];       // 3–5
  terms: { en: string; meaning: string }[];                  // 0–6, domain questions only
  follow_ups: string[];
};

type Answer   = { type: "answer"; text: string;  // L1 explanation
                  expressions: (Expression & { example: Example })[];  // 0–2
                  draft_patch: { opening: string; body: string; closing: string }; // note mode; "" = unchanged
                  follow_ups: string[] };
type OffTopic = { type: "off_topic" };
type AskReply = HowToSayCard | NoteCard | Answer | OffTopic;
```

Each request sends one schema per mode (how_to_say: `HowToSayCard | Answer | OffTopic`; note: `NoteCard | Answer | OffTopic`) to keep the schema small.

## Phases

### Phase 1 — `ask-assist` Edge Function (PR 1)

`supabase/functions/ask-assist/index.ts`, following the `phrase-capture` skeleton (CORS, `getUser()` auth, `L1_NAMES`, `clean()`).

1. **Input:** `{ mode, messages: {role:"user"|"assistant", content}[], first_language }`. Validate: mode ∈ {how_to_say, note}; last message is `user`; keep the last 12 messages (6 turns); user content ≤ 800 chars; assistant turns are sent back as the prior JSON string (compact).
2. **Limit:** `select count(*) from usage_events where user_id = me and kind = 'ask' and created_at > now() - interval '24 hours'` (user client; the RLS owner policy already allows it). ≥ 50 → 429 `ask_daily_limit`. No migration needed: `provider='openai'` already passes the CHECK, `user_id` exists (008).
3. **Prompt:** a fixed system prompt per mode **first** (stable prefix → OpenAI automatic prompt caching), then a short second system message with the L1 name, then history. Rules: real native usage only (no textbook phrasing), register label, branch ambiguous inputs, off-topic → `off_topic`, follow-up → `answer`.
4. **Call:** `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`, `temperature: 0.3`, `max_tokens` 350/700. `finish_reason === "length"` → 502 `ask_truncated`.
5. **Usage:** insert `usage_events { user_id, provider:'openai', model, kind:'ask', label: mode, input/output/total_tokens, cost_usd }` using the per-model price table in `core.ts` (gpt-4.1-mini $0.40 / $1.60 per 1M, verified against the OpenAI model page 2026-10-05). Best-effort; a failed insert never fails the reply.
6. **Errors:** 400 bad input, 401, 429, 502 OpenAI / parse — all `{ error, code }`.

**Golden set:** `supabase/tests/ask-assist/golden.json` (20 cases: ambiguous, chunk meaning, domain, follow-up chains, a how_to_say→note mode switch, off-topic ×2, non-Korean L1 ×4) + `golden.mjs`, which calls OpenAI **directly** with the prompt/schema from `core.ts` (no local Supabase stack or JWT needed — the repo has no `supabase/config.toml`). It checks schema + reply type and writes a report to `docs/journal/quality/`. Prompts, schema, validation and parsing live in `supabase/functions/ask-assist/core.ts` (pure, erasable TS) so Deno and Node run the same code; unit tests in `supabase/tests/ask-assist/core.test.mjs`.

**Output caps** were raised to hard ceilings of 700 / 1100 (targets stay ≈350 / ≈700 means) — a ~3-example card with L1 text is ~450 tokens, and a capped reply is an error, not a short answer.

**Done when:** all 20 pass the schema, the expected reply type matches in ≥ 18/20, mean output ≤ 350 / 700 tokens, p50 latency ≤ 3s locally.

### Phase 2 — client model + sheet (PR 2)

- `apps/mobile/src/lib/ask-model.ts` (pure, `node --test`): `AskReply` types, `toPhraseInput(expr, example, question) → CreatePhraseInput` (`source: "ask"` — add it to the union; check during implementation where `source` is stored, since `phrase_items` has no CHECK on it), `toNoteBody(card) → string` (fills Opening / Body / Closing in the `NOTE_TEMPLATE` shape), `appendToNote(body, card)`, `trimHistory(messages, 6)`.
- `apps/mobile/src/lib/ask.ts`: `askAssist(mode, messages)` via `supabase.functions.invoke("ask-assist")`, guarded by `requireAiProcessingConsent()` (same gate as other AI calls); maps 429 to a typed `AskLimitError`.
- `apps/mobile/src/components/ask-sheet.tsx`: sheet with message list, input, mode chip, typing dots while waiting; `HowToSayCard` / `NoteCard` / `AnswerBubble` / off-topic line; follow-up chips send as a new user turn; per-expression "Save to Phrase" (saved/already state), card-level "Save to Note". Props: `{ initialMode, noteId? }`.
- Tests: `apps/mobile/tests/ask-model.test.mjs` added to `test:mvp`.

**Done when:** on the simulator, a how_to_say question → card → Save to Phrase shows up in Phrases with context filled; a note question → Save to Note creates a note whose body has the draft in the template.

**As built (2026-10-07, branch `feat/ask-sheet`):** the sheet, both card types, answers, follow-up chips and both save actions work end to end on the simulator, against `lib/ask-fixtures.ts` (`ASK_MOCK` in `release-flags.ts`; typing `/off`, `/limit` or `/error` shows those states). Differences from the list above:

- The draft is written to a note as one point per sentence, through `serializeOutline` / the editor's own `append` (the note editor became sections of points in PR #34, after this plan was written). `toNoteBody` / `appendToNote` became `draftSections` + `appendPoints` (`lib/outline-edit.ts`).
- An answer that rewrites part of a draft shows only the rewritten sections. Saving it as a new note stores the whole merged draft; adding it to an open note adds only the rewritten sections (nothing in a note is overwritten).
- Both entry points already exist behind `ASK_ENABLED = __DEV__`, so the sheet can be reviewed: a sparkle in the Phrases / Studio header capsule ("How to say"), and a round sparkle beside "Speak with this note" in the note editor ("Note", adds to that note).
- Sending a question puts the keyboard away so the answer card has the sheet.

### Phase 3 — entry points + setting (PR 3)

- Entry points: built in PR 2 behind `ASK_ENABLED` (see above). Left for PR 3: read the default mode from the setting, and decide where the note editor's entry lives while the keyboard is up (the bottom bar is hidden then).
- NoteEditor toolbar icon (`src/screens/mvp/index.tsx` ~1469) → sheet with `initialMode="note"`, `noteId`; save appends and refreshes the editor's body state (avoid fighting the debounced autosave: append through the editor's own setter, not a direct DB write).
- Settings row "Ask default mode" (`src/screens/settings.tsx`) backed by `src/lib/ask-pref.ts` (AsyncStorage, same pattern as `theme-pref.ts`).
- Limit state: input disabled + "You've used today's questions. More tomorrow."

**Done when:** device-verified on TestFlight build: both entries, mode switch mid-session keeps context, default-mode setting persists across restart, limit message (test by temporarily lowering the cap locally).

## Deploy

`supabase functions deploy ask-assist` (human-triggered), then a curl smoke test: no auth → JSON 401 (not an HTML 404). Mobile ships through the existing EAS → TestFlight pipeline; commit before building.

## Out of scope / revisit triggers

- Chat history persistence — when users ask to find past answers.
- Streaming — if p50 latency > 3s on device.
- Bigger model — if golden naturalness fails repeatedly on the same category.
- Web version — not planned.
- Paid tiers / per-plan limits — after launch.
