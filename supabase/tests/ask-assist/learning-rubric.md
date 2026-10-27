# Ask language-learning QA rubric

Ask teaches reusable spoken English, so schema validity is only the first gate. This is our product rubric, informed by [ACTFL's 2024 FACT dimensions](https://www.actfl.org/proficiency-guidelines-overview) (function, accuracy, context, text type) and the [CEFR Companion Volume's communicative descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors). It is not an ACTFL or CEFR proficiency rating.

## Score each response

Score each axis **0 = misleading or unusable, 1 = usable after revision, 2 = ready to teach**. Read the user's full conversation and the intended listener before scoring.

| Axis | What to verify | Clear failure |
|---|---|---|
| Communicative intent and meaning | The learner could say this to achieve the requested purpose. Preserve who, action, time, certainty, and negation through rewrites. | “On my way” offered as a shorter way to warn “I may be late.” |
| Naturalness and register | A contemporary speaker would say it to that listener; politeness fits the situation. Distinguish casual, neutral, workplace, and formal uses. | “I regret to inform you” for ordinary lateness to a colleague; stand-alone “Late!” as a suggested message. |
| First-language explanation | Meaning, nuance, and situation labels are accurate and natural in the learner's first language. A gloss explains use, not only literal word parts. | Korean explanation implies an already-late state when the English only expresses a possibility. |
| Examples and transfer | Examples are complete, plausible spoken sentences; they show when to reuse the expression. Saved phrases are reusable chunks rather than a one-off script. | Three examples repeat one setting without clarifying when alternatives differ. |
| Requested length and learning load | Honor one-sentence, shorter, or 30-second requests. Give enough context to choose an expression without flooding the learner with near-duplicates. | A one-sentence Note contains Opening, Body, and Closing sentences. |

**Release gate:** every case must pass schema/type and configured deterministic checks. In human review, the first three axes must each score **2**; the total must be at least **8/10**, with no zero. A response that changes the learner's meaning or teaches an unnatural expression fails even when its JSON is valid. Record a specific better expression for every failure.

## Mode checks

- **How to say:** the first expression serves the most likely intent; alternatives are genuinely different readings or registers, with a useful `when` label. Each example means what its first-language line says. A follow-up keeps the conversation's referent and preserves meaning when changing length or tone.
- **Note:** the draft can be spoken aloud naturally to the named listener. Opening, Body, and Closing form one coherent message when the learner requests a script. Explicit length requests override that template; empty sections are acceptable. Key phrases come from the draft and can transfer to another conversation. Domain terms are relevant and absent for ordinary social talk.
- **Cross-language:** review each first-language output with someone fluent in that language. Passing Korean cases does not establish Spanish, Japanese, Russian, or Traditional Chinese quality.

## Review procedure

1. Run `node --test supabase/tests/ask-assist/core.test.mjs supabase/tests/ask-assist/learning-checks.test.mjs` for the parser and deterministic learning checks.
2. With an approved local OpenAI key, run `node supabase/tests/ask-assist/golden.mjs --out docs/journal/quality/<date>-ask-learning-golden.md`. It records each reply, automatic failures, and blank human scores. Review all cases against this rubric; do not treat the runner's PASS as learner approval.
3. Repeat the three previous failure cases (`hts-late-shorter`, `hts-late-polite-work`, `note-intro-one-sentence`) three times each after a prompt/model change, using `--only` and distinct `--out` files. A one-off good answer is not enough to establish consistency.
4. Confirm one representative How to say conversation and one Note save on the signed-in simulator before TestFlight. Keep the live 429 and exact-duplicate append checks open until they are verified without blocking the test account.

The current function receives the learner's first language but not their English level. This rubric therefore judges useful adult conversational English, not B1/B2 personalization. Add level-specific criteria only when the request contract and product behavior actually use the level.
