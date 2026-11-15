# Rehearsal: Speaking review report (stageshow mock)

A design mock for the redesigned Speaking review: headline, what a listener
hears, three counts, a strip of the talk with a mark per moment, focus areas
as cards that open to "you said → a clearer way → pattern to keep", a dark
Your turn block, takeaways, a second-try comparison and the next step.
Implemented in `apps/mobile/src/components/feedback-review.tsx`. The runnable
copy is in the stageshow skill's playground (`examples/myne-review`,
`?capture=myne-review`).

Started from: `myne-phrase` (kept: the 360 phone pinned from the top with a
bottom bleed, the app's faces and tokens, touch cursor; changed: two phones
side by side, top of the page and its end, white page, amber and green added).

Beats: the focus card is closed → tapped, it opens to You said / Try / Pattern
→ tapped again, it closes. About 9s. Poster: the card open.

Captured: wide (840) loop and still. Light only.

Gate: **not passed.** Two lines remain and were left on purpose:
- `loose stack` on the talk strip: the gap holds the numbered marks that sit
  above the track.
- `framing`: the gate reads the left phone as off-center; this is a two-phone
  row, not one centered device.
Fixed from the first film: a translucent chevron, the chevron's rotation jump.

Not checked: the 390 compact layout, dark mode, reduced motion, a separate
fresh-eye review. In the app the design was checked on the simulator with a
real saved review instead (see the journal entry of 2026-11-15).
