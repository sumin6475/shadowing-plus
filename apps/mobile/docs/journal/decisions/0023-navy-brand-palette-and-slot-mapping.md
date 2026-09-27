# 0023 — The navy brand palette, and why one color became four slots

- **Date:** 2026-09-10
- **Status:** Accepted

## Context

Sumin supplied three colors and one rule: main `#162555` (buttons, splash, the
home hero), darker `#0D1A3B`, lighter `#344E91`, and gradients passing through
all three. The app's accent was cobalt `#3B6EE1`.

Measuring before applying changed the shape of the job.

**The three colors are one hue family.** OKLCH hues 265.3 / 267.4 / 265.9 — a
2° spread. The token file already generates 12 derived tone slots from
`oklchToRgb(L, C, SP_H)` at `SP_H = 262`, so the new brand sits ~4° from the
machinery already in place. **`SP_H` was deliberately left at 262:** moving it
would retint the status chips (`statusColors`) and 36 `toneColor` call sites for
a shift no one can see.

**One color cannot fill every accent slot.** Measured against the app's own body
ink `#111114`: `#162555` is **1.28:1**. Small interactive text — "See all",
section eyebrows, action links — would have stopped reading as tappable and
started reading as body copy. `#344E91` measures 2.37:1 and stays visibly blue.

**Dark mode takes none of the three.** On the dark ground `#000000`: `#0D1A3B`
is 1.23:1, `#162555` is 1.43:1, `#344E91` is 2.64:1 — all below the 3:1 floor
for non-text UI. Concretely: the selected tab would have vanished, `Pill`
tone="acc" would have been black on black, and the record button would have
disappeared.

## Decision

Split the brand across four slots by ROLE, not by name.

| slot | light | dark | job |
|---|---|---|---|
| `acc` | `#162555` | `#6E8DD5` | large solid fills (82 refs) |
| `accD` | `#344E91` | `#8FACEF` *(unchanged)* | small interactive text (128 refs) |
| `accS` | `rgba(22,37,85,.11)` | `rgba(110,141,213,.28)` | tint wash (47 refs) |
| `onAcc` | `#FFFFFF` | `#0D1A3B` | **new slot** — foreground on `acc` |

`#6E8DD5` is the same hue family extended to L=0.65 (6.43:1 on black).
`#0D1A3B` is reserved for gradient stops and surfaces; it is not an accent.

**`onAcc` is the load-bearing addition.** Dark-mode `acc` is a LIGHT navy, so
the app's habit of writing `"#fff"` on an accent surface inverts from correct to
3.02:1. Every such site had to move to `onAcc`; the first review pass found ten
that had not, including the first-run tour's only advance button.

Gradients are centralized as three named ramps — `brand` (hero, 3 stops),
`brandLift` (secondary cards), `brandEdge` (the light lifted border).

## The hero card, specifically

Sumin asked for this one to be considered because it holds more than one color.
It is a 4-layer stack. The gradient became the full 3-stop ramp; the white bloom
dropped from 0.16 to 0.11 because it reads far stronger against `#0D1A3B` than
against mid-blue; and the bottom-left navy lobe `rgba(20,40,120,0.12)` was
**deleted** — `#142878` now sits between the two new darks and is invisible. In
dark mode the hero gets a hairline ring, because a navy card on `#000` has only
its shadow to separate it.

## Rejected alternatives

- **`#162555` in every accent slot**, as literally requested. Rejected on
  measurement: 1.28:1 against body ink kills the affordance, and dark mode is
  unusable. Raised before building; Sumin chose the split.
- **Moving `SP_H` to 266** to match the new hue. Rejected: invisible gain,
  12 slots of blast radius.
- **Keeping cobalt for dark mode.** Zero invention and lowest risk, but light
  and dark would read as two different brands.

## Revisit trigger

- A CJK or brand typeface change that alters how much navy area is on screen.
- Any new surface that puts `acc` on a photographic background — the camera
  screen already needed a scheme-independent pair (`CAMERA_ACC`) because
  `#162555` vanished against neutral frost circles over a live feed.
