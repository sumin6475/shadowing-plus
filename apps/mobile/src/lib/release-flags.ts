// release-flags.ts — switches for surfaces that are built but not shown.
//
// App Review reads a half-built surface as an incomplete app (Guideline 2.1,
// App Completeness), so anything unfinished must be absent from the binary,
// not greyed out or labelled "Coming soon". Every build profile ships the same
// app since 2026-09-29: Library, the only preview-gated surface, is not part
// of Myne, so the EXPO_PUBLIC_PREVIEW_FEATURES split was removed.

/** Phrase/note search in the header filter menu. Hidden until its design is
 *  settled (2026-09-18) — flip to true to bring it back. */
export const SEARCH_ENABLED = false;

/** Ask, the expression assistant (sheet + its entry points). Development
 *  builds only until the `ask-assist` function is deployed and the flow is
 *  device-checked — `__DEV__` is false in every EAS build. */
export const ASK_ENABLED = __DEV__;
/** Ask answers from canned replies (lib/ask-fixtures) instead of calling the
 *  function. Turn off once `ask-assist` is deployed. */
export const ASK_MOCK = true;
