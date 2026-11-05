# Mobile buttons

User direction, 2026-11-04: buttons must feel balanced and deliberate, including failure states.

- A single primary form or recovery action fills its containing content width; center its label. With `Pill`, use `style={{ alignSelf: "stretch" }}`. Reserve `full` for equal-width siblings in a horizontal row because it adds `flex: 1`.
- Pair actions at equal widths, with a consistent 10–12pt gap and matching heights. Keep the existing pinned Mirror footer geometry.
- Keep error copy and its recovery action together. Use `RecoveryState` with 16pt copy/action spacing and concise centered copy; its button matches the parent width. Put loading, content and failure in mutually exclusive states.
- Use existing capsule geometry, native type and theme colors. Keep labels concise, avoid extra explanatory paragraphs, and use subtle shadows where elevation is needed.
- Check normal, disabled, loading and error states in the running app. Verify alignment against nearby content edges and touch targets of at least 44pt. A JSX preview alone is not visual verification.
