# Mobile buttons

User direction, 2026-11-04: buttons must feel balanced and deliberate, including failure states.

- A single primary form or recovery action fills its containing content width; center its label. With `Pill`, use `style={{ alignSelf: "stretch" }}`. Reserve `full` for equal-width siblings in a horizontal row because it adds `flex: 1`.
- Pair actions at equal widths, with a consistent 10–12pt gap and matching heights. Keep the existing pinned Mirror footer geometry.
- Keep error copy and its recovery action together. Use `RecoveryState` with 16pt copy/action spacing and concise centered copy; its button matches the parent width. Put loading, content and failure in mutually exclusive states.
- Use existing capsule geometry, native type and theme colors. Keep labels concise, avoid extra explanatory paragraphs, and use subtle shadows where elevation is needed.
- Check normal, disabled, loading and error states in the running app. Verify alignment against nearby content edges and touch targets of at least 44pt. A JSX preview alone is not visual verification.

## Page states for content that loads on its own

User direction, 2026-11-15: a page that already has pinned capsules should not grow more buttons in its body.

- Content that can start by itself starts by itself. Do not ask for a tap to begin (no "Analyze this session").
- The page holds exactly one of: loading, off, failed, content. Use `ReviewState` (`src/components/review-state.tsx`): one mark, a short title, one line of copy, centered in the space the content would fill.
- Failed: a round ↻ button, not a `Pill`. Off (a setting blocks it): a text shortcut with a chevron, never instructions alone. The shortcut opens the setting in a sheet on the same page (`AiConsentSheet` for AI processing) so turning it on never loses the page; do not send the learner to Settings from a page they cannot get back to.
- Illustrations come from `src/design/doodle.tsx` only: ink outline, paper fill, one tint blob, a spark. Add a new drawing there with the same five brushes.
- Pinned footer actions belong to the page they act on. On the Mirror result, Listen back is on the Session page only; the Feedback page keeps Speak again + Done.
- `RecoveryState` stays for inline form/list failures.
