# Studio Quick Capture sheet — 2026-09-07

## Scope

- Moved the Studio home Quick note control out of the page scroll and into the same fixed FAB layer/offset used by Today.
- Rebuilt Quick Capture as a full-screen overlay with a fixed bottom sheet, dim backdrop, keyboard avoidance, drag handle, and explicit close control.
- Applied the approved iOS/cobalt mockup structure: title and note fields, embedded Speak instead control, Situation and Linked Phrases rows, helper copy, primary practice CTA, and secondary save action.
- Added token-colored flask and link glyphs to the shared icon set.

## Validation

- `npm run typecheck` — PASS.
- `npm run lint:baseline` — PASS, 0 errors / existing 15 warnings.
- `npm run verify:release-config` — PASS.
- `npm run export:ios` — PASS, 2,111 modules bundled.
- `git diff --check` — PASS.

## Manual follow-up

- Confirm FAB position during Studio scrolling and keyboard/sheet behavior on an iOS Simulator or device.
