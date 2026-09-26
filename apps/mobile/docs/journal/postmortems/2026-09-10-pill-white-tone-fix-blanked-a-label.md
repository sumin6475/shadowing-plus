# Fixing a contrast bug made a button label invisible

- **Date:** 2026-09-10
- **Status:** Fixed, caught by the second review pass before shipping
- **Component:** `src/design/ui.tsx` `Pill`, `src/screens/practice.tsx`

## Symptom

On QuickRehearsalScreen in dark mode, the primary Record/Stop control rendered
as a **blank white capsule with a small red dot and no word in it.** The learner
could not tell whether recording was running, on the screen whose whole purpose
is recording.

Measured: `#ffffff` label on `#FFFFFF` fill = **1.00:1**.

## Root cause

Two things had to line up, and the fix supplied the second one.

**1. `Pill` colors only string children.**

```tsx
{typeof children === "string" ? (
  <Text style={[{ color: tv.fg, … }]}>{children}</Text>
) : (
  children          // ← rendered verbatim; RN does not cascade color across a View
)}
```

`practice.tsx` passes a custom `<View>` (a red dot plus a label) and hardcodes
`color: t.colors.ink` on its own text.

**2. The tone changed under it.** Fixing a real bug — `tone="white"` resolved to
`t.colors.card`, which is `#1C1C1E` in dark and measured 1.16:1 against the navy
Hero it sits on — pinned the tone to a fixed `#FFFFFF` fill. Correct on a Hero.
But `t.colors.ink` is `#ffffff` in dark, so the two whites met.

The bug was **invisible before the fix**: a white label on a `#1C1C1E` capsule
was perfectly legible. The fix did not introduce the hardcoded color; it removed
the accident that was hiding it.

## The deeper mistake

`tone="white"` was pinned on the premise that it always sits on the brand
gradient. Of 7 call sites, **2 do not** — `practice.tsx:508` and
`phrases.tsx:1198` sit on the plain page background. The tone's own doc comment
asserted an invariant its call sites did not satisfy.

## Fix

Split the tone rather than patching the call site:

- `white` — a fixed light capsule, for brand surfaces. Documented as such.
- `card` — what `white` used to be (`t.colors.card` / `t.colors.ink`), for a
  raised capsule on the ordinary page background.

The two off-brand call sites moved to `card`. `practice.tsx`'s hardcoded
`t.colors.ink` label is correct again, because that is exactly the tone's `fg`.

A comment now sits above the children branch saying `tv.fg` reaches a string
child only, and that a non-string child must be re-checked when a tone's
foreground changes.

## Regression coverage

There is no UI test harness here, so the check is the grep the fix should have
started with:

```
grep -rn 'tone="white"' src/     # 7 call sites — confirm each sits on a brand surface
```

Run it whenever `PILL_LIGHT_BG`/`PILL_LIGHT_FG` change.

## Lesson

A component that colors only *some* of its children has an invariant it cannot
enforce, and changing that component's palette silently reassigns the risk to
every call site that opted out. Before repainting a shared primitive, enumerate
its call sites and check the premise holds for **all** of them — the fix's own
justification named "the brand surface" as the reason, and two call sites had
never been on one.
