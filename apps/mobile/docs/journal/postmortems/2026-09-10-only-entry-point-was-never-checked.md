# "Its only entry point" was a guess, and it shipped a Guideline 2.1 hole

- **Date:** 2026-09-10
- **Status:** Fixed; the audit entry is corrected in place rather than rewritten
- **Component:** `src/screens/settings.tsx`, `src/screens/phrases.tsx`,
  `docs/release/app-store-submission-audit.md` §B6

## Symptom

The App Store build could still reach the unfinished Library clip-detail
screen — the exact Guideline 2.1 (App Completeness) exposure that blocker B6
was raised to close and that the audit recorded as **✅ Fixed**.

## Root cause

B6 was closed by gating one entry point:

```tsx
{/* Library is the personal/TestFlight surface only — this is its ONLY
    entry point, so the release build has no route to it at all. */}
{PREVIEW_FEATURES ? ( <Card onPress={() => nav.push("library")} … /> ) : null}
```

There was a second one, ungated, in a different screen:

```tsx
// phrases.tsx — the phrase-detail source row
nav.push("libItem", { id: p.videoId, title: p.source });
```

The gate was real. The **claim about its sufficiency** was not: "only entry
point" was inferred from the one call site that had been looked at, and never
checked against the others. One `grep -rn 'libItem' src/` would have found it.

## Why it survived three reviews

The comment. Two later passes read `settings.tsx`, saw a confident assertion
that the route was closed, and moved on — the comment did the job of evidence.
A fourth review caught it only because it was told to verify claims rather than
read them.

That makes this the second false-comment defect in the same file this week: the
header also still described a `comingSoon` prop that had been deleted in the
same change set.

## Fix

- `phrases.tsx`: `clipLinkId = PREVIEW_FEATURES ? p.videoId : null` — release
  renders a static attribution line instead of a tappable row, so there is no
  dead tap target either.
- `settings.tsx`: the comment now names the second entry point, and the stale
  header describing deleted code is gone.
- Repo-wide sweep of every `nav.push` target: only two routes reach
  `library`/`libItem`, both gated; `recs` has one entry, gated.
- `verify-release-config.mjs` already asserts `production` does not set
  `EXPO_PUBLIC_PREVIEW_FEATURES` while `development`/`preview` do.

## Regression coverage

```
grep -rn 'nav.push("library"\|nav.push("libItem"\|nav.push("recs"' src/
```

Every hit must sit under a `PREVIEW_FEATURES` guard. Run it before any release
build; it is the check that should have closed B6 in the first place.

## Lesson

**"The only X" is a claim about every call site in the repo, so it takes a grep,
not a memory.** And a comment asserting a safety property the code does not have
is worse than no comment — it converts an open hole into one that three
subsequent readers will skip. When an audit records a blocker as fixed, the
evidence has to be the search, not the sentence.
