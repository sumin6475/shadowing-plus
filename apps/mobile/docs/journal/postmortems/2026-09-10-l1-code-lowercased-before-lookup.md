# `zh-Hant` learners would have been glossed in Korean

- **Date:** 2026-09-10
- **Status:** Fixed before it reached production
- **Component:** `supabase/functions/phrase-capture/index.ts`

## Symptom

Never observed by a user — caught while reading the diff immediately before
`supabase functions deploy`. The function would have returned **Korean** glosses
and context translations to every Traditional Chinese learner, silently, with no
error anywhere.

## Root cause

The L1 set gained its first non-two-letter code (`zh-Hant`, ADR 0022). The
lookup normalizes case, but the map keys had not been normalized with it:

```ts
const L1_NAMES: Record<string, string> = { ko: "Korean", "zh-Hant": "…", … };

function learnerLanguage(value: unknown): string {
  const code = typeof value === "string" ? value.trim().toLowerCase() : "";
  return L1_NAMES[code] ?? L1_NAMES[DEFAULT_L1];   // "zh-hant" ≠ "zh-Hant"
}
```

`"zh-Hant".toLowerCase()` is `"zh-hant"`, which misses the `"zh-Hant"` key, so
every Traditional Chinese request fell through to `DEFAULT_L1 = "ko"`.

The `??` fallback is what made it silent. It exists for a good reason — old
builds send no `first_language` at all — but it also swallows a *typo-shaped*
miss and turns it into plausible-looking output in the wrong language.

Nothing caught this: the fallback means there is no error, the client is not
type-checked against the server's map, and TypeScript is happy because
`Record<string, string>` accepts any key.

## Fix

Lowercase the keys so they match the lookup, and say why in a comment so the
next script-tagged code (`zh-Hans`, `pt-BR`) doesn't reintroduce it.

```ts
/** Keys are lowercased because the lookup lowercases: the client sends the L1
 *  code verbatim and one of them is script-tagged (`zh-Hant`), so a
 *  case-sensitive map would miss it and silently gloss in the fallback
 *  language. */
const L1_NAMES: Record<string, string> = { …, "zh-hant": "Traditional Chinese …" };
```

## Regression coverage

No test runner exists for the Deno edge functions, so the check ran as a
one-liner over the exact map and lookup before deploying:

```
"zh-Hant" -> Traditional Chinese (as written in Taiwan)
"ja" -> Japanese      "ko" -> Korean      "es" -> Spanish
"ru" -> Russian       "en" -> English
""  -> Korean         null -> Korean      "xx" -> Korean   (intended fallback)
```

**Follow-up worth doing:** the client's `L1` union and this map are two copies of
one list kept in sync by a comment. A shared constant, or a startup assertion
that every `SUPPORTED` code resolves to a name, would make the next drift loud.

## Lesson

A defensive default and a lookup bug are indistinguishable from the outside.
When a fallback exists precisely to absorb missing input, it will also absorb
*wrong* input — so the moment a key format changes (here: the first code with a
subtag and a capital letter), the fallback stops being a safety net and starts
being a disguise.
