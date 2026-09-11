# Saylo — App Store submission audit (2026-09-10)

Audit of `apps/mobile` @ `feat/studio-note-loop` against the App Store Review
Guidelines as they stand in September 2026. Every claim below is grounded in a
command that was run or a file that was read; nothing is inferred from the docs.

**Gauntlet run at audit time — all green:**

| Check | Result |
|---|---|
| `npm run verify:release-config` | PASS — now also asserts the privacy manifest shape, that Audio Data is *not* declared, and that `production` carries no `EXPO_PUBLIC_PREVIEW_FEATURES` |
| `npx tsc --noEmit` | 0 errors |
| `npm run lint:baseline` | 0 errors, **15 warnings — exactly at the `--max-warnings 15` ceiling** |
| `npm run export:ios` | bundles clean (6.1 MB hbc) |

---

## 1. Verified compliant (do not re-litigate these)

| Guideline | What satisfies it | Evidence |
|---|---|---|
| **5.1.1(v)** account deletion | In-app **Profile → Delete account**, server-side cascade + avatar bucket + R2 TTS cache wipe, then local recordings/reminders/draft/session cleanup | `src/lib/account.ts`, `supabase/functions/delete-account/index.ts` |
| **5.1.2(i)** third-party AI consent (added 2025-11-13) | One-time modal **naming OpenAI**, stating what is sent and that recordings are not; stored per-account in user metadata with a version stamp; revocable via **Profile → Privacy** toggle | `src/lib/ai-consent.tsx`, `src/screens/privacy.tsx` |
| **2.5.14** recording indicator | Red "Listening" pill + waveform on the self-talk screen | roadmap ☑, `src/screens/talk.tsx` |
| **4.8** Sign in with Apple | Google is hidden unless the Apple provider is actually enabled — the app can never ship Google-without-Apple | `getSocialProviderAvailability()` in `src/lib/supabase.ts` |
| **2.3 / 5.1.1** honest privacy claims | STT really is on-device (`requiresOnDeviceRecognition: true`), so "speech is turned into text on your device" is true | `src/hooks/use-speech-session.ts:110` |
| **Secrets** | Only `EXPO_PUBLIC_*` reach the bundle; grep for service-role / `sk-` / JWT literals in `src/` → none. Every AI call goes through a Supabase Edge Function that verifies the caller's JWT before touching a server secret | `src/lib/api.ts`, `supabase/functions/*/index.ts` |
| **Dev tooling** | The RN2Figma capture overlay is `__DEV__`-gated **and** refuses any non-localhost endpoint, so it cannot ship or exfiltrate a UI tree | `src/design-capture/provider.tsx:5,29` |
| **Export compliance** | `ITSAppUsesNonExemptEncryption: false` | `app.json` |
| **ATT / IDFA** | No `NSUserTrackingUsageDescription`, no ad SDK, no advertising identifier. PostHog is identified by opaque `user.id` only | `src/lib/posthog.tsx` |
| **Push entitlement** | `aps-environment` stripped so the local-only reminder build still signs against the existing App Store profile | `plugins/with-local-reminders-only.js` |

---

## 2. Blockers — status after the 2026-09-10 fix pass

All six are now either **fixed in code** or **reduced to a form to fill in**
(the two that can only be done inside App Store Connect).

| # | Blocker | Status |
|---|---|---|
| B1 | App-level privacy manifest | ✅ **Fixed** |
| B2 | Placeholder "Coming soon" surfaces | ✅ **Fixed** |
| B3 | Privacy policy didn't describe the app | ✅ **Fixed** |
| B4 | No demo account for App Review | 📋 **Handed off** — `app-review-submission-kit.md` §1 |
| B5 | Age-rating questionnaire | 📋 **Handed off** — `app-review-submission-kit.md` §2 |
| B6 | Library tab in the release build | ✅ **Fixed** |

### B1 — privacy manifest ✅

`expo.ios.privacyManifests` added to `app.json` and **verified end to end**:
`npx expo prebuild --platform ios` now emits `ios/Saylo/PrivacyInfo.xcprivacy`
with the declared contents.

- `NSPrivacyTracking: false`, `NSPrivacyTrackingDomains: []` — no ATT, no IDFA, no cross-app tracking.
- Seven collected types: Email Address, Name, Photos or Videos, Other User Content (all App Functionality); User ID, Product Interaction (Analytics); Crash Data (App Functionality).
- **Audio Data is deliberately absent** — recordings stay on device. `verify:release-config` now *fails* if anyone adds it, so the claim can't rot silently.
- Required-reason APIs: `FileTimestamp` C617.1 (local recordings) and `UserDefaults` CA92.1 (AsyncStorage prefs). `DiskSpace` is left to `expo-file-system`, which declares it for itself.
- Identifier strings were taken from Apple's docs JSON, not from memory — note `NSPrivacyCollectedDataTypePhotosorVideos` has a lowercase "or".

**Side effect to know about:** prebuild regenerated `ios/` from scratch. The
target directory is now `ios/Saylo` (it was `ios/Shadowing`, from before the
rename) and `Pods/`, `Podfile.lock` and `build/` are gone. `ios/` is gitignored
and EAS prebuilds fresh, so builds are unaffected — but a **local** native build
needs `npx pod-install` first.

### B2 — placeholder surfaces ✅

New `src/lib/release-flags.ts` exposes one flag, `PREVIEW_FEATURES`, driven by
`EXPO_PUBLIC_PREVIEW_FEATURES`. `eas.json` sets it for `development` and
`preview` **only**; `production` leaves it unset, so the App Store build always
evaluates false. `verify:release-config` asserts both halves.

- Deleted outright (nothing behind them): "My mirror", "Hints while speaking", "Playback speed", "Weekly recap", plus the now-unused `comingSoon` prop on `SettingsRow`.
- Gated behind `PREVIEW_FEATURES`: the **Recommendations** card in `world.tsx` and the **Library** entry points — the Settings card *and* the clip link in `phrases.tsx`. Verified by grepping every `nav.push` target, not by inspection (see B6).

### B3 — privacy policy ✅

`web/src/app/privacy/page.tsx` updated (dated 10 September 2026) and the build
prerenders it (`○ /privacy`). Added or rewritten:

- an opening line saying the policy covers the website **and** the iOS app;
- profile details + product analytics in *What we collect*;
- **recordings stay on the iPhone**, are never uploaded, transcribed on-device, deletable per session;
- a new **Camera and photos** section (mirror never recorded · text capture not stored · profile photo stored);
- a new **AI features and your permission** section naming OpenAI, listing what is and isn't sent, and where to revoke — the hosted counterpart to the in-app 5.1.2(i) prompt;
- a new **Usage analytics** section for PostHog (opaque id; no email/recordings/transcripts/photos/ad ids; no cross-app tracking);
- in-app **Delete account** written into *Retention and deletion*.

> **Where this change lives.** The web edit sits on
> `claude/studio-information-architecture-5d74cc`, which is based on `main`, so it
> deploys through a normal merge.
>
> *Correction to an earlier note in this file:* `feat/studio-note-loop` shows the
> old "Shadowing+" privacy text in its worktree, but that is **not** a revert and
> merging it is **not** dangerous. Verified with `git merge-tree`: the branch
> forked at `0a494a7` (2026-07-31) and has **never touched `web/`** in its 77
> commits, so a three-way merge keeps every one of main's 18 newer web commits
> untouched. The branch is simply behind, and the file on disk is the old
> snapshot. Nothing to fix before merging.

### B4 — demo account 📋

Cannot be done from the repo: it needs an account to be created and a password
typed. Everything else is prepared in **`app-review-submission-kit.md` §1** —
a 10-minute in-app seeding checklist (so Today isn't empty for the reviewer)
and the full App Review Notes text, including the on-device-STT and
AI-consent explanations reviewers ask about. The same account is the
screenshot account.

### B5 — age rating 📋

A form inside App Store Connect. **`app-review-submission-kit.md` §2** has
Saylo's honest answer for every topic, the reasoning for the two that aren't
obvious (**AI-generated content: yes**; **shared user-generated content: no**),
and the recommendation to set the minimum age to **13+** so the listing matches
what the privacy policy and terms already claim.

### B6 — Library ✅ (corrected 2026-09-10)

**The original entry here was wrong and is kept visible rather than rewritten,
because the error is the lesson.** It read: "The Settings card was Library's
only entry point, so gating it behind `PREVIEW_FEATURES` removes the route from
the release build entirely."

That claim was never verified — it was inferred from the one entry point that
had been looked at. A later review found a second, ungated one:
`phrases.tsx` pushed `libItem` from the phrase-detail source row, so the App
Store build still reached the unfinished Library clip detail. The Guideline 2.1
exposure this blocker existed to close stayed open, and the confident comment in
`settings.tsx` ("this is its ONLY entry point") is what let it ship past review.

Now actually fixed: the clip link is gated by the same flag
(`clipLinkId = PREVIEW_FEATURES ? p.videoId : null`), release renders a static
attribution line instead of a tappable row, and a repo-wide sweep of every
`nav.push` target confirmed only two routes reach `library`/`libItem` — both
gated. The `recs` screen has one entry, also gated.

**Rule for the rest of this audit: "the only entry point" is a claim about
every call site, so it requires a repo-wide grep, not a screen you happen to
remember.**

## 3. Should-fix before external TestFlight

| # | Finding | Why it matters |
|---|---|---|
| S1 | `expo-speech-recognition@^56.0.1` is the only dep on a different major from SDK 57, and it is a **caret** range while every Expo module is pinned/tilde | A transitive bump on a rebuild can break the single most important feature. Pin it exactly. |
| S2 | `lint:baseline` sits at **15/15 warnings** | Zero headroom: the next warning fails `npm run validate`. Either fix the `react-hooks/set-state-in-effect` cluster in `src/screens/world.tsx` or raise the ceiling deliberately. |
| S3 | `supabase/functions/phrase-capture/index.ts` hardcodes **"Give a short Korean meaning"** | Contradicts the N:1 product claim (learner L1 = ko/es/ru/en). A Spanish reviewer or tester gets Korean glosses. Thread the caller's L1 through the prompt. |
| S4 | `app.json` Android block requests `CAMERA`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Not an iOS blocker, but Play Console will demand a justification for each. Trim to what v1 uses. |
| S5 | TestFlight builds expire after **90 days** and testers lose local data with them | Recordings are local-only (`document/speak/*.wav`), so an expiring build silently destroys tester recordings. Say so in the beta test notes. |
| S6 | No `ios.supportsTablet` key → iPhone-only | Correct for v1, and it means **no iPad screenshots are required**. Just don't flip it accidentally. |

---

## 4. App Store Connect metadata checklist

- [ ] Age-rating questionnaire (B5) — **do this first, it gates submission** · answers in `app-review-submission-kit.md` §2
- [ ] App Privacy "nutrition label" — must match the shipped manifest exactly; the filled-in table is in `app-review-submission-kit.md` §3
- [ ] Privacy Policy URL → `https://shadowing-plus.vercel.app/privacy` (after B3)
- [ ] Support URL + marketing contact
- [ ] Demo account credentials + review notes (B4) — text ready in `app-review-submission-kit.md` §1.3
- [ ] Export compliance → already declared in `app.json`, confirm the ASC answer matches
- [ ] Screenshots — 6.9" iPhone, 1320 × 2868 px portrait (see `app-store-screenshots-plan.md`)
- [ ] Beta App Description + Beta App Review Information (required before any external tester)
- [ ] `ascAppId` is already wired for `eas submit` (`6799375053` in `eas.json`)

---

## Sources

- [Apple — Privacy requirement for app submissions](https://developer.apple.com/news/?id=pvszzano)
- [Apple — Updated App Review Guidelines (5.1.2(i), 2025-11-13)](https://developer.apple.com/news/?id=ey6d8onl)
- [Apple — Updated age ratings in App Store Connect](https://developer.apple.com/news/?id=ks775ehf)
- [Apple — Age Rating Updates, upcoming requirements](https://developer.apple.com/news/upcoming-requirements/?id=07242025a)
- [Apple — Provide test information (TestFlight)](https://developer.apple.com/help/app-store-connect/test-a-beta-version/provide-test-information/)
- [Implementing Apple's third-party AI consent rule](https://stora.sh/blog/2026-05-06-apple-ai-consent-rule-5-1-2-i-implementation-guide)
- [Privacy manifest for iOS apps](https://capgo.app/blog/privacy-manifest-for-ios-apps/)
- [App Store screenshot sizes 2026](https://screenhance.com/blog/app-store-screenshot-dimensions-2026)
