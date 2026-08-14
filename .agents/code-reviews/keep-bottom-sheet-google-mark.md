# Code Review: Keep Story bottom sheet and Google mark

**Scope**: Uncommitted change in `apps/mobile/src/screens/onboarding.tsx`
**Requirement**: Match the approved Keep Story bottom-sheet presentation, allow the current Apple-disabled provider configuration, and replace the plain Google letter with the recognizable multicolor Google mark.
**Recommendation**: APPROVE

## Stats
- Files modified: 1 · added: 0 · deleted: 0
- Lines: +70 / -37

## Findings

Code review passed. No technical issues detected.

## What's Good
- The authentication handoff is now an edge-attached overlay with top-only rounding, a drag handle, shadow, and safe-area-aware bottom padding.
- Provider visibility remains driven by the existing backend configuration, so an Apple-disabled setup correctly presents only Google and email.
- The Google button uses a local four-color SVG mark and keeps the existing loading, disabled, and OAuth behavior intact.
- The story context remains visible behind the sheet and has enough bottom padding to stay scrollable rather than being permanently obscured.

## Verdict

The change satisfies the visual and provider requirements without changing authentication routing. Release config, TypeScript, ESLint, iOS Expo export, and diff checks passed. The web smoke test remains blocked by the pre-existing AsyncStorage/Supabase SSR `window is not defined` failure and is unrelated to this mobile-only change.
