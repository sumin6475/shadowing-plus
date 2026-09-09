# Studio home mockup layout — quality snapshot

Date: 2026-09-07

## Scope

- Rebuilt only the Studio tab home page around the approved image mockup hierarchy.
- Preserved the current mobile font, iOS palette, 26pt card radius, capsule controls, and native bottom navigation.
- Kept the existing Studio data and navigation actions wired to practice, notes, situations, settings, and Quick Note.
- Left shared Studio detail rows unchanged by using home-only list and situation components.

## Automated checks

- `npm run typecheck`: PASS.
- `npm run lint:baseline`: PASS with the existing baseline of 15 warnings and 0 errors; no new warnings.
- `npm run verify:release-config`: PASS.
- `npm run export:ios`: PASS; 2,111 modules bundled and `tmp/export-ios` exported.
- `git diff --check`: PASS.
- Native bottom navigation file diff: none.

## Notes

- The shared phrase-capture FAB is suppressed on the Studio home only so it does not overlap the mockup's Quick Note action.
- Other tabs and Studio detail-page layouts are unchanged.
