# Brand Kit — source of truth (v0)

Design & Brand owns this; everyone pulls visuals + voice from here. Starter values — refine before public launch.

## Palette — warm paper · ink · signal-red
| Token | Hex | Use |
|---|---|---|
| Paper | `F4F0E8` | backgrounds |
| Card | `FBF9F4` | panels |
| Ink | `1C1B18` | primary text · dark sections |
| Signal red | `D8402A` | the single sharp accent |
| Teal | `2C5F5A` | secondary accent (diagrams) |
| Muted | `8A8378` | captions |

## Type
- **Headlines:** serif (Georgia / Fraunces feel) — editorial.
- **Body:** clean sans (Calibri / Inter).
- **Tags & code:** mono (Consolas).

## Logo
- Current: placeholder **"S+"** PWA icon (`web/scripts/generate-icons.mjs`).
- TODO: real logo before public launch. iOS caches install icons — users must remove + re-add to refresh.

## Voice
- Follow Sumin's voice principles (`00_Resources/voice-principles.md`, referenced in the repo-root `CLAUDE.md`).
- Clear, concise, warm. Lead with the point.

## Non-negotiables
- One palette — no off-kit one-offs.
- **WCAG AA** contrast + tap targets, checked on **both** the mobile and desktop shells (the app renders both).
