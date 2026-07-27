# Shadowing Plus — Design System

**The rules. Read this every time you build or change UI.** `tokens.json` holds the values;
this file tells you *when to use what*. If this file and another instruction conflict, this
file wins for anything visual.

System name: **Cobalt Editorial**. Extracted 2026-07-20 from `web/src/app/home.css` and
`web/src/app/landing.css` — the newest, most deliberate surfaces in the app.

---

## 0. What this app feels like

Shadowing Plus is a focused practice tool for a learner who is a little tired and wants to
get better without friction. The design should feel **calm, editorial, and confident** — like
a well-set reading page, not a dashboard. Warm paper, one strong blue, a serif that gives the
product a human, literary voice. The payoff feeling is *"this is a quiet place made by someone
with taste,"* not *"this is another SaaS app."*

The central tension: it is a technical ML pipeline underneath, but it must feel warm and
unhurried on top. Resolve it with warm neutrals + generous space + a serif headline, and keep
the machinery (mono meta, status chips) small and quiet.

---

## 1. The one-paragraph identity

Warm paper background (never pure white as the page). One accent: **Cobalt `#3B6EE1`**.
Display headlines in **Instrument Serif** (weight 400 always). Everything else in **Pretendard**
(also carries Korean). Technical bits — kickers, durations, counts — in **JetBrains Mono**,
small and wide-tracked. Soft layered shadows with a 1px inner highlight. 12px default radius,
pills for chips and buttons.

> **Deprecated:** the orange `#e05d38` palette in `globals.css` is leftover shadcn starter code.
> Do not extend it. New work uses the tokens in `tokens.json`. (Migrating the app shell off orange
> is a separate task — until then, treat orange screens as legacy, not as a second brand.)

---

## 2. Color — what each token is for

Full values in `tokens.json`. Roles:

- **Backgrounds ladder:** `bg` (page, warm paper) → `bg-elev` (sidebar, sticky bars) →
  `surface` (cards, pure white) → `surface-2` (recessed wells). Never put a card the same
  color as the page; step up the ladder.
- **Text ladder:** `text` (headlines/primary) → `text-2` (body) → `text-3` (captions/meta) →
  `text-4` (timestamps, placeholder). **`text-4` is never body copy** — that's a contrast fail.
- **Accent (Cobalt):** `accent` for primary buttons, active nav, the brand mark, and key links.
  `accent-soft` as the tinted background of selected/active rows and chips. `accent-text` when
  you need accent-colored *text* on a light background (it's darkened for AA contrast — don't
  use raw `accent` for small text). `accent-hover` for hover/pressed.
- **One accent only.** Cobalt is the entire brand color. Don't add a second decorative hue.
  `moss` exists for the marketing landing's secondary chip and nothing else. `danger`/`success`
  are functional status colors for chips and toasts — not accents.

Dark mode tokens exist for every color; the app hasn't flipped it on yet (`[data-theme="dark"]`).
Build light-first, but pull from the same token names so dark works for free.

---

## 3. Type — the rules that keep it editorial

- **Serif = display only.** Instrument Serif, weight **400** always, letter-spacing `-0.015em`.
  Use it for hero/section/card headlines and the wordmark. **Never** for body, buttons, or labels.
  A bold serif or a serif button is off-brand.
- **Pretendard = everything else.** UI, body, Korean. Buttons/labels are weight 500.
- **Mono = technical meta, small.** Kickers (uppercase, `0.16em` tracking), durations, counts, code.
- **Body base 15px** in-app, 16px marketing. Global letter-spacing `-0.005em`.
- **Headlines are real sentences, not slogans.** "Turns out you can shadow any YouTube video."
  beats "Unlock your fluency journey." Write like a person.
- Pick sizes from the `type.scale` in `tokens.json` — don't invent in-between sizes.

---

## 4. Shape, shadow, space

- **Radius:** default `md` (12px). `pill` for chips, tags, buttons. `sm` (8px) for inputs/small
  controls. `xl` (24px) only for big marketing floating cards.
- **Shadow:** always the layered token (`shadow.card` / `card-hover` / `float`) — three stacked
  shadows plus a 1px top inset highlight. That inset is the signature "lift." Never a flat single
  `0 2px 4px` drop shadow; it reads generic.
- **Space:** 8px rhythm. Rows pad `14px / 20px`. **Section gaps stay generous (≥48px).** Crowding
  reads as templated. When unsure, add space.
- **Borders:** 1px `hairline`. Hairlines + soft shadow do the separating — avoid heavy borders.

---

## 5. Human-feel rules (anti-AI-smell)

1. **No em dashes (—) in UI copy.** Use commas, periods, or "then". (This is the #1 AI tell.)
2. **Real content in every mockup.** Real video titles ("BBC News — 3:12"), real match numbers,
   real Korean lines. Never "Lorem ipsum" or "[Title]".
3. **Headlines are sentences, not marketing slogans** (see §3).
4. **Generous spacing; strong hierarchy.** Big confident serif headline vs. distinctly smaller
   sans support text. Don't make everything medium-sized.
5. **One accent, used sparingly.** If half the screen is cobalt, it stops meaning "important."

---

## 6. AI-cliché guardrails (audit every screen against this)

- ❌ Tiny faint eyebrow labels → keep kickers ≥11px, weight 600, real color (not 30% opacity).
- ❌ Light-weight all-caps everywhere → only kickers/overlines are uppercase, and they're mono/600.
- ❌ Light grey (`text-4`) used as body text → contrast fail; body is `text-2` minimum.
- ❌ Flat generic drop shadow → use the layered token.
- ❌ Purple gradient hero / generic centered SaaS hero → warm paper, serif headline, no gradient.
- ❌ Pure white page background → the page is `bg` (warm paper); white is for cards.

Every new "AI smell" you or Sumin catches → append it here as a rule so it never comes back.

---

## 7. Task prompt template (reuse this when building a screen)

```
Build [screen name] for Shadowing Plus.

Use design-system/tokens.json for every color, font, size, radius, spacing, and shadow —
never hardcode a hex or px that isn't in there. Follow design-system/DESIGN.md.

Non-negotiables:
- Page background = `bg` (warm paper), cards = `surface` (white). Step the surface ladder.
- Exactly one accent: Cobalt. Primary action + active state only.
- Display headline in Instrument Serif weight 400; everything else Pretendard; meta in mono.
- Layered shadow token, 12px radius default, section gaps >= 48px.
- Real example content (real video titles, real Korean lines), no placeholders, no em dashes.

Before you finish, self-check against the §6 guardrails and list any you might be tripping.
```

---

## 8. Where the values live

- `tokens.json` — source of truth for all values (OKLCH canonical, hex fallback).
- `tailwind-theme.css` — Tailwind 4 `@theme` block; import to expose tokens as utilities.
- `ios-motif-spec.md` — measured iOS 27 geometry, type scale, and glass/material recipes, parsed
  from the Apple UI kit SVGs. Read it for any **mobile** surface that should feel native-iOS; §0 is
  a paste-ready handoff block. It supplies motif rules only — color and type authority stays here
  and in `tokens.json`, and the accent is always our cobalt, never Apple's blue.
- In the live app today, the same tokens already exist scoped under `.home-app` (home.css) and
  `.landing` (landing.css). When you build a *new* app surface, pull from `tokens.json` /
  `tailwind-theme.css` instead of re-declaring them per-file.
