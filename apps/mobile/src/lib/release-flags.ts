// release-flags.ts — what the App Store build is allowed to show.
//
// App Review reads a half-built surface as an incomplete app (Guideline 2.1,
// App Completeness), so anything that isn't finished must be absent from the
// production binary — not greyed out, not labelled "Coming soon". These
// surfaces still exist for personal/TestFlight use, gated behind one flag.
//
// `EXPO_PUBLIC_PREVIEW_FEATURES=1` is set in eas.json for the `development`
// and `preview` profiles ONLY. The `production` profile leaves it unset, so a
// release build always evaluates to false.

/** True in dev/preview builds; always false in the App Store build. */
export const PREVIEW_FEATURES = process.env.EXPO_PUBLIC_PREVIEW_FEATURES === "1";
