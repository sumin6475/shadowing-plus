# Design spec (DRAFT) — Profile menu & Settings modal

> Purpose: a hand-off spec so the profile menu + settings modal can be designed
> in isolation (Figma or CSS pass). This documents the CURRENT built structure,
> component/class names, states, and the tokens to design against. It is a
> **draft** — nothing here is locked; treat measurements as the current
> implementation, not a mandate.
>
> Built components (for reference while designing):
> - `web/src/components/settings/ProfileMenu.tsx` + `profile-menu.css`
> - `web/src/components/settings/SettingsModal.tsx` + `settings-modal.css`
> - Tabs: `ProfilePanel.tsx`, `UsagePanel.tsx` (+ `usage.css`), `LanguagePanel.tsx`
> - Shared field styles live in `settings-modal.css` (`.set-*`)

---

## 0. The pattern (what we're matching)

The Claude-desktop model: a **profile entry** at the bottom of the sidebar →
click opens a **dropdown menu** → "Settings" in that menu opens a **modal** with
a left-nav of tabs. Sign-out lives in the dropdown AND on the modal's Profile tab.

```
[ sidebar foot: (avatar) email  ⌄ ]   ← ProfileMenu trigger
          │  click
          ▼
   ┌─────────────────────┐
   │ user@email.com      │           ← dropdown (opens UPWARD)
   │ ─────────────────── │
   │ Settings            │──► opens ──► [ SETTINGS MODAL ]
   │ Sign out            │
   └─────────────────────┘
```

---

## 1. Profile menu (sidebar foot)

Lives in the desktop sidebar's `.sidebar-foot`. Renders inline (dropdown opens
**upward** because it's pinned to the bottom of the viewport).

### 1a. Trigger — `.pm-trigger`
A full-width button, three parts in a row:

| Part | class | current spec | notes |
| :-- | :-- | :-- | :-- |
| Avatar | `.pm-avatar` | 26×26 circle, dark fill `#2a2622`, white uppercase initial, 12px/600 | initial = first letter of email |
| Email | `.pm-email` | flex:1, 13px, `--text-2`, truncates with ellipsis | falls back to "Account" |
| Chevron | `.pm-chevron` | 12px, `--text-4` | `⌄` glyph — could become a rotating caret icon |

- **Hover:** background `--surface-2` (`#f3efe6`), radius 8px.
- **Height:** ~40px (7px padding + 26px avatar).

### 1b. Dropdown — `.pm-menu`
Opens upward: `position:absolute; bottom: calc(100% + 6px); left:0; right:0`.

| Element | class | spec |
| :-- | :-- | :-- |
| Container | `.pm-menu` | white, 1px `#ece7dd` border, radius 12px, shadow `0 12px 30px rgba(0,0,0,.14)`, 6px padding, z-index 40 |
| Email line | `.pm-menu-email` | 12.5px, muted `#9a927f`, truncates |
| Separator | `.pm-menu-sep` | 1px hairline `#f0ece3` |
| Item | `.pm-menu-item` | 14px, left-aligned, 8×10 padding, radius 8px; hover `#f3efe6` |
| Sign out | `.pm-menu-danger` | red `#b4462f`; hover `#fbf1ee` |

**States to design:** default, hover-per-item, `disabled` (sign-out shows
"Signing out…"). **Behavior:** closes on outside-click; "Settings" closes the
dropdown and opens the modal.

**Design opportunities (open):** avatar could use the Google profile photo
(available in session metadata) instead of an initial; add a subtle divider
above the foot; animate the dropdown (fade+rise).

---

## 2. Settings modal

Portaled to `<body>` (so no ancestor stacking context traps it). Full overlay
+ centered card on desktop, full-screen sheet on mobile (≤768px).

### 2a. Overlay — `.set-overlay`
- `position:fixed; inset:0; z-index:400` (above all page overlays).
- Backdrop: `rgba(30,26,20,0.38)` + `backdrop-filter: blur(2px)`.
- Click on backdrop → close. `Esc` → close.

### 2b. Modal shell — `.set-modal`
Two columns: left nav + right body.

```
┌──────────────┬───────────────────────────────────┐
│  Settings    │  Profile                       ✕  │   ← .set-body-head
│              │ ───────────────────────────────── │
│ ▸ Profile    │                                    │
│   Usage      │   [ active tab panel ]             │   ← .set-body-scroll
│   Language   │                                    │
│              │                                    │
└──────────────┴───────────────────────────────────┘
   .set-nav          .set-body
```

| Element | class | current spec |
| :-- | :-- | :-- |
| Card | `.set-modal` | max-width 860px, height `min(78vh, 640px)`, white, radius 16px, border `#ece7dd`, shadow `0 24px 60px rgba(0,0,0,.18)` |
| Left nav | `.set-nav` | width 200px, bg `#fbf9f4`, right border `#f0ece3`, 18/12 padding |
| Nav title | `.set-nav-title` | "Settings", 13px/600, muted `#9a927f` |
| Nav item | `.set-nav-item` | 14px, left-aligned, radius 8px; hover `#f3efe6`; **active** = bg `#ece5d7`, `#2a2622`, 500 |
| Body head | `.set-body-head` | title (17px/600) + close button, bottom border `#f2eee5` |
| Close | `.set-close` | `✕`, 15px, muted; hover bg `#f3efe6` |
| Body scroll | `.set-body-scroll` | scrolls vertically; 20/22 padding |

### 2c. Mobile (≤768px) — full-screen sheet
- `.set-overlay` padding → 0; `.set-modal` becomes 100dvh, no radius/border,
  **column** layout.
- `.set-nav` becomes a **horizontal scrolling tab strip** at the top; nav title
  hidden.

**Design opportunities (open):** entry/exit animation (scale+fade); the left
nav could carry small icons per tab; a sticky footer for account actions.

---

## 3. The three tabs

Each tab is an independent panel rendered in `.set-body-scroll`. Shared field
primitives (`.set-*`) are defined in `settings-modal.css`.

### 3a. Profile — `ProfilePanel`
- **Identity row** (`.set-profile-row`): 46×46 avatar (`.set-avatar-lg`) +
  email (15px/500) + sub-label ("Signed in with Google / email").
- **Account block**: label + help + **Sign out** button (`.set-danger-btn`:
  outlined red, `#b4462f`).
- *Future:* delete account, connected providers, display name.

### 3b. Usage — `UsagePanel`
The existing token/cost/storage dashboard, moved in verbatim. Self-contained
(fetches its own data). Styling is its own design system in `usage.css`
(`.usage-*` — stat cards, provider split, monthly bars, storage bars, recent
table). **Leave as-is unless redesigning the dashboard specifically.**
- Stat cards grid (`.usage-cards`): 4-col desktop → 2-col mobile.
- Has its own light/dark tokens (`--u-*`) — independent of the app theme.

### 3c. Language — `LanguagePanel`
Two labelled `<select>` fields (`.set-field` + `.set-select`):
- **Audio language** (what you shadow) — options: English, Spanish, French,
  German, Japanese, Korean, Chinese.
- **Translation language** (your native lang) — Korean, English, Japanese,
  Spanish, French, German, Chinese.
- Saves to `localStorage` (shows a transient "Saved").
- ⚠️ **Not yet wired to the pipeline** — a footnote states new clips still use
  the default pair (English → Korean) until per-clip language support ships
  (Phase 3). Design should reflect this "preference, not yet active" status
  (e.g. a subtle info note — already present as `.set-note`).

**Shared field primitives** (design these once, reused by Profile + Language):
`.set-field` (label + help + control stack), `.set-field-label` (14px/500),
`.set-field-help` (13px muted `#8a8272`), `.set-select` (9/11 padding, radius 9,
border `#ded8cc`, max 320px), `.set-saved` (green), `.set-note` (muted 12.5px).

---

## 4. Design tokens in play

The modal CSS currently uses **hardcoded warm-neutral hex** (it portals to
`<body>`, outside the app's `.home-app` token scope). If you want it to follow
the app's OKLCH theme + dark mode, that's a deliberate refactor (map these to
the `--surface/--text/--hairline` tokens and add a dark variant).

| Role | current value |
| :-- | :-- |
| Page bg (warm) | `#fbf9f4` |
| Surface / card | `#fff` |
| Border / hairline | `#ece7dd` / `#f0ece3` / `#f2eee5` |
| Text primary | `#2a2622` |
| Text secondary | `#4a453d` |
| Text muted | `#8a8272` / `#9a927f` |
| Active nav bg | `#ece5d7` |
| Hover bg | `#f3efe6` |
| Danger (sign out) | `#b4462f` (bg tint `#fbf1ee`, border `#e3c7c0`) |
| Accent dark (avatar) | `#2a2622` |
| Backdrop | `rgba(30,26,20,0.38)` + blur 2px |

**Z-index map (for reference):** page toasts/backdrops peak at 250; the settings
overlay sits at **400**. The profile dropdown is 40 (inside the sidebar).

---

## 5. Open design questions (for you to decide)

1. **Dark mode** — the app has a full OKLCH dark theme; the modal is currently
   light-only (hardcoded hex). Bring it into the theme, or keep it light?
2. **Avatar** — initial letter vs. Google profile photo.
3. **Animation** — none currently. Dropdown rise? Modal scale-in? Tab crossfade?
4. **Mobile modal** — full-screen sheet (current) vs. a bottom sheet that slides
   up partway?
5. **Nav icons** — add a small icon per tab (Profile/Usage/Language), or keep
   text-only?
6. **Language tab framing** — how prominently to signal "saved as preference,
   not yet applied to new clips."
```
