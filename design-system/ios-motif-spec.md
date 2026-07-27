# iOS Motif Spec — measured reference

Every number here was parsed out of a source file, not recalled. Sources:

- **Figma → SVG exports** of the iOS 27 UI kit (2026-06-23 v13): `List`, `Empty States`, `Keyboard`,
  `Text styles`, `Dynamic Type`, `_Materials`, the 8 material swatches, the 4 Liquid Glass swatches,
  `Scroll Edge Effect - Hard/Soft`, `Button - *`, `Alert`, `Text Field`, `_Badge`, `_Icon Grid`.
  Geometry read from path/rect data; type sizes derived from glyph cap heights.
- **`expo/expo`** `packages/expo-blur/src/` — the web translation of iOS materials (one value only,
  noted inline; its tints are iOS 14-era and are *not* used here).

**This is a reference, not a token set.** `tokens.json` (Cobalt Editorial) stays the source of truth
for color and type. Take the geometry, the material ladder, and the glass recipe from here — keep
our accent.

Device basis: **402 × 874 pt** (iPhone 16 Pro), frame radius **44**.

---

## 0. Handoff block — paste this into Claude Design

The distilled version. Everything below §0 is the measured evidence behind it; this block is what
actually travels to a design tool or a build prompt. Glass and materials (§6–8) are deliberately
left out — pull them in only for screens that genuinely have translucent stacked surfaces
(floating nav, sheets, scroll edges), or they get sprayed everywhere.

```
iOS motif rules — apply to all mobile UI.

1. RADIUS
   Controls (button, chip, tag, segment, pill, toggle): border-radius 9999px. Always a full
   capsule, never a fixed px value. There is no 8/12/16px radius in this system.
   Containers: fixed radius, derived concentrically as (parent radius − inset), floored at 16.
   e.g. a card inset 20 inside a 44-radius frame gets 26.

2. SIZE
   Buttons come in three heights only: 28 / 34 / 50.
   Minimum tap target 44×44.
   Base row unit is 52 — list rows, form rows, table rows.
   Separators inset 16 from the container edge, 2px.

3. TYPE  (pt)
   LargeTitle 34 · Title1 28 · Title2 22 · Title3 20 · Headline 17 · Body 17
   Callout 16 · Subheadline 15 · Footnote 13 · Caption1 12 · Caption2 11
   Headline is Body's size at semibold — the difference is weight, not size.

4. ELEVATION
   box-shadow:
     0 8px 15px rgba(0,0,0,0.02),
     0 0 0 0.5px #E8E8E8,
     -1.25px 0 0 -0.75px #D0D0D0,
      1.25px 0 0 -0.75px #D0D0D0;
   Depth comes from the sub-pixel edge pair, not from blur. Never use a
   0 4px 12px rgba(0,0,0,0.1)-class shadow — that is the loudest "not iOS" signal.

5. COLOR
   Accent is our cobalt #3B6EE1. Never Apple's #0088FF.
   Neutrals may be borrowed: bg #F2F2F7 · fill #767680 @0.12 · separator #C6C6C8 ·
   label #3C3C43 @0.6 secondary / @0.3 tertiary.
   One accent hue only — no second color as decoration.
```

Rule 5 restates `tokens.json`'s own accent note ("Cobalt #3B6EE1 — the single brand color… Do not
introduce a second hue as decoration"), so it does not conflict with the existing system.

---

## 1. Controls are capsules. Always.

Across ~240 rounded rects in the kit, every interactive control satisfies `rx = height / 2`.
There is not a single fixed `border-radius: 12` anywhere in it.

| Control | Size | rx |
|---|---|---|
| Nav bar button | 44 × 44 | 22 |
| Nav bar button group | 160 × 44 | 22 |
| Segment / tag | 106 × 34, 86 × 34 | 17 |
| Toggle track / knob | 64 × 28 / 38 × 24 | 14 / 12 |
| Primary bottom button | 330 × 52 | 26 |
| Keyboard key | 44 × 44 | 22 |
| Keyboard wide key | 144 × 48, 228 × 50 | 24, 25 |
| Dynamic Island | 125 × 37 | 18.5 |

**Do:** `border-radius: 9999px` on every button, chip, tag, segment, pill, and toggle.

## 2. Button size ladder — three sizes, with content widths

| Size | height | rx | icon only | icon + text | wide text |
|---|---|---|---|---|---|
| Small | 28 | 14 | 28 | 49 | 66 |
| Medium | 34 | 17 | 34 | 57 | 75 |
| Large | 50 | 25 | 50 | 73 | 92 |

Default fill `#767680` @ `0.12`. Secondary variant `#747480` @ `0.08`.

## 3. Containers use concentric radii

| Container | Size | rx | Derivation |
|---|---|---|---|
| Device frame | 402 × 874 | 44 | — |
| Inset grouped card | 362 × 656 | 26 | 44 − 20pt inset |
| Alert | 300 × 307 / 419 | 34 | — |
| Keyboard tray | 378 × 101 | 27 | 44 − 12pt inset |
| App icon (squircle) | 256 | 66.56 | ratio **0.26** of the side |

**Rule:** a card inset `N` from a parent of radius `R` gets radius `R − N`, floored around 16.
Never repeat the parent's radius on a nested card — that reads as flat/web.

## 4. Layout metrics (device-relative, origin = frame top-left)

```
Dynamic Island      x 138.5   y 13.67    125 × 37
Nav button row                y 62       h 44      (left x 15.5–25, right edge x 395)
Content card top              y 183      side margin 20
List row height               52         (separators at y 182, 234, 286 … 786)
Row separator       x 36      w 330      h 2       (16pt inset inside the card)
Bottom CTA          x 36      y 786      330 × 52  (36pt from bottom)
Alert inner button            132 × 48   rx 24
Text field                    272 × 104  separators 240 × 2, rows 52 apart
Badge                         34 × 24    rx 12     fill #FF383C
```

**List row height is 52pt** — denser than the 56–64px most component libraries default to. The
52pt rhythm repeats in the text field, so treat it as the base row unit.

## 5. Type scale

Derived from glyph cap heights (SF cap ratio 0.7047); every value lands on an integer.

| Style | pt | Style | pt |
|---|---|---|---|
| LargeTitle | 34 | Callout | 16 |
| Title1 | 28 | Subheadline | 15 |
| Title2 | 22 | Footnote | 13 |
| Title3 | 20 | Caption1 | 12 |
| Headline / Body | 17 | Caption2 | 11 |

Dynamic Type range: LargeTitle runs 31pt at xSmall → 40pt at xxLarge. Headline is Body's size at
semibold weight — the distinction is weight, not size.

## 6. Glass — edge refraction, not a drop shadow

Decoded from the SVG filter stacks (`feDropShadow` / `feMorphology` / `feColorMatrix`):

```css
/* small / standard glass control */
backdrop-filter: blur(50px) saturate(180%);   /* saturate() from expo-blur's web impl */

box-shadow:
  0 8px 15px rgba(0, 0, 0, 0.02),   /* ambient — almost invisible */
  0 0 0 0.5px #E8E8E8,              /* rim highlight (dilate 0.5) */
 -1.25px 0 0 -0.75px #D0D0D0,       /* left refraction (erode 0.75) */
  1.25px 0 0 -0.75px #D0D0D0;       /* right refraction (erode 0.75) */
```

The ambient shadow is **2% black**. Depth comes from the sub-pixel rim pair, not from blur.
A `0 4px 12px rgba(0,0,0,0.1)`-class shadow is the loudest "not iOS" signal in a UI.

Larger glass surfaces raise only the ambient layer — `blur 24px`, alpha `0.25` (light) /
`0.45` (dark), rim shifts to `#A6A6A6` / `#DBDBDB`. Rim geometry (±1.25px, 0.5 dilate,
0.75 erode) never changes.

Glass fills, by variant:

| Variant | Fill stack |
|---|---|
| Clear | `#101010` plus-lighter + `white 0.04` luminosity |
| Regular · light | `white 0.7` lighten + `#BFBFBF 0.1` darken |
| Regular · dark | `#1A1A1A 0.7` + `0.9` luminosity + `#1A1A1A` lighten |

## 7. Material ladder (4 steps)

```
Light — two blended layers over content
  Ultrathin   white .07              + white .03  color-dodge
  Thin        white .05              + white .40  color-dodge
  Regular     white .25 plus-lighter + white .60  color-dodge
  Thick       white .34 plus-lighter + white .84  color-dodge
  Chrome      white .75 hard-light

Dark — single scrim
  Ultrathin   black .02
  Thin        black .26
  Regular     black .41
  Thick       black .60
```

Dark hairline separator: `#1A1A1A` at `plus-lighter`, 0.5px. Light: `black 0.12`, 0.5px.

> The Figma export bakes the blur into a raster, so these swatches all report `blur(0px)`.
> Pair the ladder above with the blur from §6. For reference, expo-blur's web layer computes
> `blur = intensity × 0.2px`, i.e. 10px at its default intensity of 50 — far lighter than
> iOS 26 Liquid Glass, which measures 50px.

## 8. Scroll edge effect

| Variant | Recipe |
|---|---|
| Hard | `blur(3px)` + scrim (`black 0.55` dark / `white 0.85` light) + a 1px hairline at the boundary |
| Soft | `blur(50px)`, `opacity 0.9`, `mix-blend-mode: screen`, masked by a vertical linear gradient (opaque → transparent) |

Figma's `data-figma-bg-blur-radius` is consistently **2× the CSS blur** — divide by two when
reading any other export from this kit.

## 9. Colors confirmed from the files

Only what actually appeared in parsed geometry. The full palette page (`Light.svg` / `Dark.svg`)
was never captured — see Gaps.

| Role | Value |
|---|---|
| systemGroupedBackground | `#F2F2F7` |
| secondarySystemFill | `#E5E5EA` |
| separator | `#C6C6C8` |
| systemGray3 | `#AEAEB2` |
| label base | `#3C3C43` @ `0.6` secondary / `0.3` tertiary |
| fill base | `#767680` @ `0.12`, `#747480` @ `0.08` |
| systemBlue | `#0088FF` — **do not use** |
| systemGreen | `#34C759` |
| systemRed (badge) | `#FF383C` |

`#0088FF` and `#FF383C` are iOS 26's updated blue and red (not `#007AFF` / `#FF3B30`).
**Retint every accent to our cobalt.** Borrow the neutrals, the radii, the material ladder, and
the glass recipe — not the blue. Apple's blue is what makes an app read as an Apple app.

## 10. Delta against `tokens.json`

| Current | Issue | Change |
|---|---|---|
| `radius.md: 12px` is the documented default | Controls inherit a non-iOS radius | Default controls to `radius.pill`; keep `md`/`lg` for containers only |
| No concentric rule | Nested cards repeat the parent radius | Add `R − N` to DESIGN.md |
| `shadow.card` has no refraction pair | Reads as a web card lift | Add the ±1.25px `#D0D0D0` edge pair |
| No glass or material tokens | — | Add §6 recipe + the §7 four-step ladder |
| No 52pt row unit | Rows drift to 56–64px | Add `space.row: 52px` |

## Gaps — not in any file received

1. **Full color palette hexes.** `Light.svg` / `Dark.svg` (1008 × 860) were replaced in the
   Downloads folder before they could be parsed. Structure is known from a screenshot — 12 system
   colors, 8 grays, and Backgrounds / Labels / Fills / Separators each split across
   light / dark-elevated / dark-base — but the values are not. **Biggest remaining hole.**
2. **Spacing scale.** No padding or gap tokens appeared in any export.
3. **Tab bar / nav bar component specs.** Only inferred from `List.svg` geometry.
4. **Dark-mode rim and shadow values.** Dark material fills are captured; the dark rim pair is not.

`_System Icons.svg` (20 MB) and `Untitled.svg` (2.5 MB) are icon artwork — no spec value, not parsed.

## Sources checked and rejected

- **`react-native-elements`** — radii are ad-hoc (`3, 5, 9, 10, 15, 28, 30, 50`), iOS primary is
  the stale `#007aff`, and it is React Native, not web. No capsule or concentric rule.
- **`expo-glass-effect`** — a thin wrapper over native `UIGlassEffect`; the non-iOS fallback is a
  bare `<View>`. Zero values for web.
- **`apple-ios-27-ui-kit_assets_*.zip`** — raster-only export (30 PNG + 1 SVG), no spec data.
