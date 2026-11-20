# 2026-11-19 — Speaking review fails on a messy transcript

## Symptom
After a 6m32s self-talk session (629 words, Nov 19 7:58 PM), the Speaking review page showed:

> Something went wrong
> Couldn’t complete the analysis. Your session is safe. Please try again.

Reproduced on the simulator for the same session. A temporary log in `invoke()` (`src/lib/advanced-feedback.ts`) showed the function's answer:

```
[feedback-dbg] talk-advanced-feedback status 400 body {"code":"feedback_invalid_evidence"}
```

The client maps only seven codes to messages, so every other code, including this one, shows the generic text.

## Hypotheses
- Stale deployed function (the 2026-11-16 cause): no. The live `talk-advanced-feedback` was byte-identical to main.
- AI consent, daily limit, missing session: no. Those return their own codes.
- Evidence check too strict: yes. See below.

## Root cause
`verifyEvidence` (`supabase/functions/talk-advanced-feedback/core.ts`) rejected the **whole report** if any quoted evidence was not either (a) exact at the model's offsets, or (b) found verbatim exactly once. Speech transcripts break both:

- double spaces (`Have have  These defense`), curly vs straight apostrophes, odd casing, and the model tidies these when it quotes;
- repeats (`I'm I'm I`, `I'm gonna` several times), so a correct quote with a wrong offset was "ambiguous" and was rejected.

One tidied or repeated quote failed the entire analysis. The exact failing quote was not captured, because function logs are not readable from the CLI. The transcript has both features.

## Fix
`locateQuote()`: a quote is grounded when, with whitespace runs, quote marks, dashes and case folded and punctuation trimmed at its edges, it occurs in the transcript. If it occurs more than once, the occurrence nearest the claimed start wins. The stored quote becomes the transcript's own text at that span. Words that are not in the transcript are still rejected, so the anti-fabrication rule is unchanged. The same function serves comparison evidence.

## Regression cases
`supabase/tests/talk-advanced-feedback/core.test.mjs` (in `test:mvp` and `test:feedback`):
- double space, curly apostrophe, case, edge punctuation, and nearest repeat resolve to the real span;
- invented wording ("I am going to be free", "Have these defenses") still throws `feedback_invalid_evidence`;
- the old "repeated quote with wrong offset throws" case now resolves to the nearest occurrence.

## Before / after
- Before: `400 feedback_invalid_evidence` for this session, every retry.
- After: `talk-advanced-feedback` v3 deployed from this branch (live code matches, JWT on, unauthenticated 401). Retrying the same session on the simulator produced a full report: Big Picture at B2, 1 focus area (Clear references), 2 moments quoting "These defense" and "these apps".
