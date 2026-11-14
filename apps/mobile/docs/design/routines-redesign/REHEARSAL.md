# Rehearsal: home routine deck + New card sheet (stageshow mock)

A design mock for the home review routine: the carousel's add tile opens a
native sheet with a live card preview, the two card colors, the practice source
and the settings as a grouped list. Implemented in
`apps/mobile/src/screens/routines.tsx`. The runnable copy is in the stageshow
skill's playground (`examples/myne-routines`, `?capture=myne-routines`).

Gold: `phone-touch` (kept: phone pinned from the top with a bottom bleed, touch
cursor, UIKit-quick curves; changed: 360-wide phone, the app's tokens, a sheet
instead of a card expansion).

Beats: sheet open on Paper → Midnight tapped, the preview takes the color →
Add: the sheet falls, the card sits where the add tile stood and the tile moves
on → the tile is tapped, the sheet rises and covers the reset. About 9.5s.

Captured: wide 440 loop, 390 (compact 358) loop, reduced-motion poster. Light only.

Gate: `rehearsal passed` on the wide loop and the 390 loop.

Film:
- `uneven inset` (selection ring hanging past the column) → the chosen color is
  marked by a check badge inside the swatch instead of a ring.
- `loose stack`, `uneven padding` (settings group) → label gap 5px, group padded
  evenly.
- `lands on a transform` ×2 → the moving card and tile keep their own layer.
- `loop seam` (state differed at the end) → the loop opens with the sheet up, so
  the carousel is put back while the sheet covers it.
- `loose list` (sheet bar + fields read as one spread list) → the sheet body is
  its own form section.
- `small text` at 390 (card eyebrow 9.1px) → eyebrow set larger in the compact
  design.

Review: done inline against `verify.md`, not by a separate reviewer.

Not checked: dark mode, the `--states` sheet, edit mode (jiggle, minus badge,
hold-to-drag) and the My Sentences / practice screens, which were designed
directly in the app and checked on the simulator instead.
