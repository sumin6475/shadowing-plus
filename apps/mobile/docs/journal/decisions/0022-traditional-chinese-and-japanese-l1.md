# 0022 — Traditional Chinese and Japanese as the next two first languages

- **Date:** 2026-09-10
- **Status:** Accepted

## Context

The learner-facing L1 set was `en | ko | es | ru`. Russian was speculative; the
real next markets are East Asian. Sumin set the priority: **Taiwan first**, with
Hong Kong and Singapore listed on the App Store alongside it, then Japanese.

Two facts shaped the decision.

**Mainland China is a separate problem from the Chinese language.** Listing on
the mainland China storefront requires an MIIT/ICP filing number (enforced from
2023-09-30; apps without one blocked from publishing updates from 2024-04-01),
which requires a Chinese legal entity. Taiwan, Hong Kong and Singapore are
ordinary storefronts with no such requirement. So targeting Taiwan removes the
blocker entirely rather than deferring it.

**Traditional and Simplified are different written languages, and Singapore is
Simplified.** Taiwan and Hong Kong read Traditional (`zh-Hant`); Singapore and
Malaysia read Simplified (`zh-Hans`). "TW + HK + SG" therefore spans both
scripts. Singapore is also the weakest of the three as an English-learning
market — English is an official language and the medium of instruction.

Per-language implementation cost was measured, not guessed: every language costs
the same 14 translated strings plus 5 registry lines. What differs is (a) whether
the locale parser survives it, (b) whether the bundled fonts cover the script,
and (c) storefront rules. Measured from the bundled TTF cmaps: Inter covers Latin
+ Cyrillic + Vietnamese/Turkish/Polish and no CJK; Newsreader (the serif used for
titles) covers Latin only. Korean already falls back to the iOS system face in
both, so CJK adds no new class of risk.

## Decision

Ship **`zh-Hant` (Taiwan-standard Traditional) and `ja`**. Do not ship
`zh-Hans` yet.

Make the locale parser script-aware now rather than later: `localeToL1()`
resolves the script subtag when iOS supplies one (`zh-Hant-TW`) and derives it
from the region when it doesn't (`zh-TW` → Hant; `zh-CN`/`zh-SG` → Hans). A
Simplified device resolves to `zh-Hans`, which has no copy, so it **falls back to
English** rather than being shown the wrong script.

Declare `CFBundleLocalizations` in `app.json` so iOS resolves Han glyph variants
from a declared app language rather than guessing.

## Rejected alternatives

- **Simplified only, or a flat `zh`.** Cheapest (`split("-")[0]` keeps working)
  but shows Taiwanese learners mainland script, and mainland is the one market
  that is blocked anyway.
- **Both scripts now.** Doubles the Chinese copy for a market (Singapore) whose
  learners largely don't need an English-learning app. Adding `zh-Hans` later is
  purely additive — 12 strings and one registry line — because the parser
  already emits the code.
- **Portuguese as the second language instead of Japanese.** Identical marginal
  cost (14 strings) and it would have kept the Newsreader serif intact, which
  CJK cannot. Rejected because Chinese already forces the CJK typography
  decision, and Japanese then reuses it for free rather than opening a second
  front.

## Revisit trigger

- A Chinese legal entity or an ICP filing becomes available → add `zh-Hans` and
  the mainland storefront.
- Singapore or Malaysia shows real signup volume → add `zh-Hans` regardless.
- A CJK brand face gets bundled → revisit the serif fallback, which currently
  makes CJK titles render in the system sans while Latin titles render in
  Newsreader.
