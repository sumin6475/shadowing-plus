# Feature: Mobile App Store v1 regression baseline

This plan covers only Phase 1 of the approved App Store v1 PRD. It protects the
real mobile app on `feat/mobile-skeleton`; it does not implement Profile/Settings,
Mirror customization, Self-talk sharing, or onboarding changes.

## Feature Description

Freeze the current feature-worktree build as the release contract, turn its
existing static checks into repeatable scripts, define a privacy-safe manual
regression matrix for the app's real journeys, and run that matrix on an iPhone
using a native development build. Existing release blockers are recorded as
known baseline limitations rather than silently fixed or mistaken for new
regressions.

## User Story

As the app owner,
I want every later release feature to be compared with the same known build and
journeys,
so that the app I already made does not regress while it becomes App Store ready.

## Problem Statement

The main worktree at `main@0f934f8` contains only the obsolete Phase 0 clips
scaffold. The actual app is the clean worktree at
`/Users/jadekim/Documents/shadowing-plus-mobile`, currently
`feat/mobile-skeleton@b557c25`, 29 commits ahead of its remote branch. It already
contains Today, Phrase Bank, Speaking World, Self-talk, capture, Library, Profile,
custom splash, and onboarding behavior, but no single release contract covers
them. Existing quality snapshots prove selected flows and startup, not the whole
current app in one fixed build.

## Solution Statement

Treat `b557c25` as the initial candidate identity, preserve its exact native
dependency pins, add only non-runtime validation/documentation changes, and run a
tiered device matrix. The quick gate is rerun after every feature phase; affected
deep paths are rerun when their data or native boundary changes; the full matrix
is mandatory before TestFlight. Any current failure is classified before feature
work begins.

## Metadata

**Feature Type**: Release safety / validation infrastructure / operational verification
**Complexity**: High — broad existing native/data surface, minimal code changes
**Target Worktree**: `/Users/jadekim/Documents/shadowing-plus-mobile`
**Baseline Candidate**: `feat/mobile-skeleton@b557c25651d77ff635ecf8a4ef32bb747373981a`
**Systems Affected**: npm scripts, release documentation, Expo/EAS build, Supabase Auth/RLS/Edge Functions, iOS camera/microphone/speech/audio/image modules
**Dependencies**: paid Apple Developer membership, Expo/EAS project access, one iPhone with Developer Mode, two private test accounts, deployed Supabase migrations/Edge Functions, safe test data
**Source PRD**: `.agents/PRDs/mobile-app-store-v1.md`
**PRD Phase**: 1 — Regression baseline

---

## OBSERVED PREFLIGHT — 2026-08-08

These are source/static facts observed while planning. They do not replace the
new full physical-device baseline.

- Target worktree is clean except for the newly approved PRD; branch is 29 local
  commits ahead of `origin/feat/mobile-skeleton`.
- `npx tsc --noEmit`: **PASS**.
- `npm run lint -- --no-cache`: **PASS with 15 warnings** and zero errors. The
  warnings are the existing React Compiler/effect/purity/exhaustive-deps budget.
- `npx expo export --platform ios` to a temporary directory: **PASS**, 1,851
  modules and four bundled brand fonts.
- `npx expo-doctor`: **19/20**. It reports 15 SDK patch mismatches.
- Several reported native versions are deliberate exact pins. Prior attempts to
  take newer `expo-file-system`, `expo-image-picker`, `expo-image-manipulator`,
  and `expo-asset` patches caused launch-blocking iOS ABI crashes. Do **not** run
  `expo install --fix` in this phase.
- Existing journals prove recent dev-client startup, local Self-talk audio, and
  subsequent STT on an iPhone, but newest complete end-to-end journeys still have
  pending taps/deployment dependencies.
- No automated test files or `test` script exist in `apps/mobile`.

Historical branch audit:

- Current refs contain `main`, `feat/mobile-skeleton`, and
  `feat/gate-language-island-admin-only`; only the first two have worktrees.
- Reflog preserves `codex/mobile-app-shell@633d1db`, the earlier seven-screen
  mobile shell. It is not an ancestor of `feat/mobile-skeleton`; its screen set
  appears to have been superseded by the later single-shell port, but this must be
  reconciled feature-by-feature before declaring the baseline complete.
- `main` has two commits absent from the mobile branch: web clip focus/icon work
  (`94211c6`) and a Vercel talk-diagnosis route (`0f934f8`). They are not safe
  candidates for an automatic merge because the current mobile app deliberately
  moved diagnosis to Supabase Edge Functions.
- `feat/gate-language-island-admin-only@4d0c2d1` is a separate web visibility
  change and is not part of the mobile runtime baseline.
- Reflog also preserves web-only fixes `da69478` and `4eb1aae` that are not
  ancestors of current refs. They belong to a separate web reconciliation, not
  this App Store branch.

| Ref | Observed relationship | Phase 1 treatment |
|---|---|---|
| `feat/mobile-skeleton@b557c25` | Actual current app; 44 commits beyond the shared merge-base and 29 ahead of its remote | Baseline source of truth |
| `main@0f934f8` | Two commits absent from mobile; both affect web/Vercel paths, not the current native UI | Keep separate; no automatic merge |
| `feat/gate-language-island-admin-only@4d0c2d1` | Separate web production visibility gate | Out of mobile runtime scope; retain as a separate branch |
| historical `codex/mobile-app-shell@633d1db` | Not an ancestor; route-per-screen prototype was replaced by `a45f866`'s stateful single shell | Treat as intentionally superseded only after the screen mapping below passes |
| historical `da69478`, `4eb1aae` | Web player fixes preserved in reflog, absent from current refs | Separate web follow-up; never cherry-pick as part of App Store work |

The earlier mobile shell maps to the current app as follows:

| `633d1db` surface | Current equivalent | Audit status |
|---|---|---|
| Today | `src/screens/today.tsx` | Present and connected to real phrase data |
| Onboarding | `src/screens/onboarding.tsx` through `src/shell.tsx` | Present; completion persistence is a known v1 blocker |
| Phrases/detail/review | `src/screens/phrases.tsx` | Present with real persistence/SRS and additional behavior |
| Speak/session | `src/screens/talk.tsx`, `src/screens/world.tsx` | Present with real STT, local audio, results, and sessions |
| Islands | `src/screens/islands.tsx`; creation is reachable from `world.tsx` | Present but subordinate to the newer Speaking World model |
| Library/detail/save phrase | `src/screens/library.tsx`; Profile provides the Library BETA entry | Present; processing jobs retain the known Vercel limitation |
| Settings | `src/screens/settings.tsx`, `src/screens/edit-profile.tsx` | Present; several release rows remain intentionally inert for later phases |
| Custom tab bar | `src/design/ui.tsx` with Today/Phrases/Speak/Topics/Sessions | Present with updated information architecture |
| SVG icon assets/components | `src/design/icon.tsx` | Replaced by the current vector icon system; do not restore both sets |

Known product/release limitations that the baseline must name rather than pass:

- branded splash requires a manual action on every launch;
- onboarding initializes open on every authenticated `AppShell` mount and does
  not persist completion;
- entering Speak requests camera permission immediately, before a primer;
- Speak copy says nothing is uploaded, but transcript/session data and AI inputs
  are sent to Supabase/Edge Functions; audio itself remains local;
- Settings includes inert Privacy, Help, Export, Mirror, reminders, theme, and
  account-deletion rows;
- Vercel-backed processing jobs can be silently absent on native iOS due the
  documented host/protocol incompatibility, while ready Library data uses
  Supabase successfully;
- `AuthProvider` has no rejected-`getSession` finalization path and can
  theoretically leave the native splash visible forever;
- EAS development environment variables and remote deployment state are not
  proven by repository files.

---

## CONTEXT REFERENCES

### Relevant codebase files — MUST READ BEFORE EXECUTING

- `.agents/PRDs/mobile-app-store-v1.md` — approved scope, release contract, and
  Phase 1 exit criteria.
- `apps/mobile/AGENTS.md` — Expo 57, product context, and Build Journal rules.
- `apps/mobile/docs/product/speaking-world.md:7-33,79-125` — current mobile
  product model. Baseline language must use Domain → Story → Message → Session.
- `apps/mobile/src/app/_layout.tsx:14-70` — native splash, font/language/session
  readiness, branded splash, and protected routing.
- `apps/mobile/src/screens/splash.tsx:43-69,197-217` — branded splash animation
  and required completion action.
- `apps/mobile/src/lib/auth.tsx:29-70` and `src/lib/supabase.ts:16-33` — persisted
  Supabase session, listener, sign-in, and sign-out.
- `apps/mobile/src/shell.tsx:31-112,145-195` — repeating onboarding gate,
  stateful tab/navigation shell, and current feature routes.
- `apps/mobile/src/screens/onboarding.tsx:40-208` — six-screen onboarding,
  skip/back, and current non-persistent local choices.
- `apps/mobile/src/screens/today.tsx:27-173` — phrase loading, refresh/retry,
  counts, review entry, and current hardcoded greeting/prompt.
- `apps/mobile/src/screens/phrases.tsx:85-269,747-892` and
  `src/lib/phrases.ts:172-478` — search/filter/stats, optimistic favorite/delete,
  detail/edit/speech, and SRS event persistence.
- `apps/mobile/src/screens/world.tsx:98-188,248-830` and
  `src/lib/speaking-world.ts:53-285` — seeded Speaking World, CRUD, sessions,
  replay, archive, beat ordering, and owner-scoped persistence.
- `apps/mobile/src/screens/talk.tsx:50-70,126-250,282-331,640-826`,
  `src/hooks/use-speech-session.ts:76-116`, `src/lib/talk.ts:19-51`, and
  `src/lib/talk-audio.ts:18-61` — camera/microphone/speech permissions, recording,
  transcript/session/AI results, phrase save, and local WAV persistence.
- `apps/mobile/src/screens/capture.tsx:40-824` and
  `src/lib/phrase-capture.ts:41-81` — text/Photos/camera capture, Edge Function
  assistance, Story linking, consecutive save, and discard guards.
- `apps/mobile/src/screens/library.tsx` and `src/lib/library.ts:49-159` — ready
  clips, best-effort jobs feed, playback, favorite, and delete.
- `apps/mobile/src/screens/edit-profile.tsx:14-89` and
  `src/screens/settings.tsx:132-156` — working display-name/goal/first-language
  fields, inert rows, and Profile sign-out.
- `apps/mobile/app.json:10-17,40-79` — permission strings, plugins, bundle ID, and
  EAS project identity.
- `apps/mobile/package.json:5-60`, `package-lock.json`, and
  `eslint.config.js:1-20` — exact native version pins and current warning policy.
- `apps/mobile/eas.json:1-20` and `.env.example` — build profiles and client-side
  variable names. `.env.example` comments are partly stale and must not be
  treated as architecture truth.

### Existing evidence and failure history — MUST READ BEFORE NATIVE CHANGES

- `apps/mobile/docs/journal/quality/2026-08-07-personal-phrase-capture-retrieval.md`
  — latest static and physical-startup evidence, with server E2E still pending.
- `apps/mobile/docs/journal/quality/2026-08-07-self-talk-speaker-routing.md`
  — physical speaker playback and next-session STT evidence.
- `apps/mobile/docs/journal/postmortems/2026-08-07-expo-file-system-abi-crash.md`
  — why `expo-file-system@57.0.1` must remain exact.
- `apps/mobile/docs/journal/postmortems/2026-08-07-image-capture-native-module-abi.md`
  — why image/asset package pins and a native rebuild matter.
- `apps/mobile/docs/journal/postmortems/2026-08-06-ios-native-fetch-vercel-protocol-error.md`
  and `docs/journal/decisions/0004-mobile-api-supabase-edge-functions.md` — why
  mobile uses Supabase/Edge Functions instead of enforcing a Vercel-only API
  boundary.

### Files to create or modify

- `apps/mobile/package.json` — add deterministic `typecheck`, `export:ios`,
  `lint:baseline`, and aggregate `validate` scripts; do not change dependency
  versions.
- `apps/mobile/docs/release/mobile-regression-baseline.md` — versioned tiered
  matrix with stable IDs, setup, expected result, evidence policy, and known
  limitations.
- `apps/mobile/README.md` — replace obsolete Phase 0/free-account content only
  after the current build path is verified.
- `apps/mobile/.env.example` — correct architecture comments without adding real
  values; distinguish Supabase/Edge Functions from legacy Vercel jobs access.
- `apps/mobile/docs/journal/quality/2026-08-08-mobile-regression-baseline.md` and
  `apps/mobile/docs/journal/JOURNAL.md` — local factual evidence after execution.
- `.agents/PRDs/mobile-app-store-v1.md` — mark Phase 1 done only after every
  acceptance criterion passes.

No runtime source file is expected to change in this plan. If a current journey
fails, stop and produce a separate narrowly scoped repair plan.

### Official documentation — READ BEFORE EXECUTING

- [Expo SDK 57 SplashScreen](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/)
  - Read “Delay hiding the splash screen” and the release-build fidelity note.
  - Why: native splash/session readiness and the branded React splash are
    separate layers and must be tested separately.
- [Expo SDK 57 Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/) and
  [Protected routes](https://docs.expo.dev/router/advanced/protected/)
  - Read route-group guards and guard-change behavior.
  - Why: login/logout/session restoration depend on automatic protected-route
    swaps rather than manual navigation.
- [Expo SDK 57 Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/),
  [Audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/), and
  [ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)
  - Read permission/config-plugin and physical-device notes.
  - Why: the matrix exercises native permissions and modules that an iOS JS
    export cannot validate.
- [Create an iOS physical-device development build](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/)
  - Read prerequisites, Create, and Run.
  - Why: the paid team can now register a device and create the existing internal
    development profile.
- [EAS internal distribution](https://docs.expo.dev/build/internal-distribution/)
  and [EAS CLI reference](https://docs.expo.dev/eas/cli/)
  - Read iOS provisioning, `device:create`, `device:list`, and environment
    commands.
  - Why: the selected iPhone and public build variables must be included without
    exposing credentials.
- [Expo development tools](https://docs.expo.dev/develop/tools/)
  - Read Expo Doctor and EAS CLI limitations.
  - Why: Doctor remains a recorded advisory deviation; it is not safe to auto-fix
    past proven ABI pins.

---

## IMPLEMENTATION PLAN

### Phase A: Freeze identity and validation semantics

Name the feature worktree commit, protect user-owned branches/worktrees, and add
scripts that reproduce the existing green static gate. Preserve the current 15
warning budget and exact package lock; new errors or a 16th warning fail. Record
Expo Doctor’s known mismatch set separately instead of running `--fix`.

### Phase B: Define the real-app regression contract

Create a tiered checklist. Tier 1 is a short core gate run after every product
phase. Tier 2 covers native permission/media and affected data mutations when
their boundary changes. Tier 3 is the complete release gate, including two-account
isolation, before external TestFlight/App Review. First execution runs all tiers
to classify the current app.

### Phase C: Build the frozen candidate on iPhone

Verify local and EAS public-variable presence without printing values, register
the device, create the internal development build from the frozen worktree, and
install it. A local `expo run:ios --device` build may be used first for diagnosis,
but the Phase 1 acceptance build is the EAS `development` artifact because it
exercises remote build/signing inputs used on the road to TestFlight.

### Phase D: Execute, classify, and gate the next phase

Run the full matrix against one build ID and controlled test accounts. Record
passes, existing limitations, release blockers, and external deployment gaps.
Phase 2 begins only after the baseline document and evidence clearly distinguish
working behavior from already-known blockers.

---

## STEP-BY-STEP TASKS

### 1. FREEZE the correct candidate and protect worktrees

- **IMPLEMENT**: Confirm the target is
  `/Users/jadekim/Documents/shadowing-plus-mobile` at full commit
  `b557c25651d77ff635ecf8a4ef32bb747373981a`. Record the separate main-worktree
  status and never run mobile validation against its obsolete scaffold. Record
  the 29-commit remote divergence as a durability risk; do not push, rebase,
  switch, reset, or stage broadly without separate user authorization.
- **IMPLEMENT**: Add a branch-reconciliation table to the baseline document for
  `main@0f934f8`, `feat/mobile-skeleton@b557c25`,
  `feat/gate-language-island-admin-only@4d0c2d1`, and historical
  `codex/mobile-app-shell@633d1db`. For each, record `included`, `superseded`,
  `out of mobile scope`, or `needs follow-up`, with the relevant screen/behavior.
  Compare the earlier shell's Today, onboarding, Phrase, Speak, Island, Library,
  Settings, tab-bar, and icon assets with their current equivalents; do not use
  ancestry alone as proof of feature parity.
- **PATTERN**: Existing clean `feat/mobile-skeleton` worktree; user-owned dirty
  paths in the main worktree remain untouched.
- **GOTCHA**: A build produced after local commits change is not evidence for
  `b557c25`; record the exact build commit. Untracked PRD/plan files are expected
  planning artifacts, not runtime changes.
- **VALIDATE**:
  - `git worktree list --porcelain`
  - `git -C /Users/jadekim/Documents/shadowing-plus-mobile status --short --branch`
  - `git -C /Users/jadekim/Documents/shadowing-plus-mobile rev-parse HEAD`
  - `git branch -a -vv --sort=-committerdate`
  - `git show --stat --oneline 633d1db`
  - The reconciliation table has no unexplained historical mobile behavior.

### 2. ADD deterministic validation scripts without dependency churn

- **IMPLEMENT**: In `apps/mobile/package.json`, add:
  - `typecheck`: `tsc --noEmit`
  - `lint:baseline`: lint with cache disabled and `--max-warnings 15`
  - `export:ios`: production iOS export to an ignored deterministic directory
  - `validate`: sequential typecheck, baseline lint, and iOS export
  Keep existing scripts and every dependency version unchanged.
- **PATTERN**: `eslint.config.js:1-20` intentionally demotes two experimental
  React Compiler rule families to warnings; the remaining exhaustive-deps warning
  stays visible.
- **GOTCHA**: Do not add `expo-doctor` to the green aggregate gate because it
  intentionally exits non-zero for the ABI-safe pins. Do not add those packages
  to Expo’s exclusion list merely to hide the report. Do not introduce a test
  framework with no meaningful tests.
- **VALIDATE**:
  - `npm ci`
  - `npm run validate`
  - `npx expo-doctor` returns the same one failed category and the expected 15
    patch mismatches; any additional category/mismatch is a new blocker.
  - `git diff -- package.json package-lock.json` shows scripts only and no lockfile
    change.

### 3. WRITE the tiered regression matrix

- **IMPLEMENT**: Create `docs/release/mobile-regression-baseline.md` with stable
  IDs, prerequisites, test-account mutation rules, expected results, and an
  evidence column. Define:
  - **Tier 1 / every phase**: `BOOT-01` native-to-brand splash; `AUTH-01` invalid
    login; `AUTH-02` valid login; `AUTH-03` kill/relaunch restore; `OB-01`
    onboarding skip/finish; `TODAY-01` load/refresh/retry; `PHRASE-01`
    search/detail/favorite rollback-safe mutation; `WORLD-01` Domain → Story →
    Message → beat; `TALK-01` short STT session/save/result; `CAPTURE-01` text
    capture/save; `PROFILE-01` edit/persist; `AUTH-04` sign-out/relaunch.
  - **Tier 2 / native or affected boundary**: `PERM-01` camera denied/retry;
    `PERM-02` microphone/speech denied/retry; `TALK-02` local audio replay and
    next-session STT; `CAPTURE-02` Photos/camera/discard/consecutive saves;
    `SESSION-01` list/replay/delete/retry; `LIB-01` ready playback/favorite/delete;
    `LIB-02` processing-job visibility recorded as a known Vercel limitation.
  - **Tier 3 / release and persistence boundary**: `RLS-01` two-account isolation
    across phrases, Speaking World, talk sessions, and profile metadata;
    `PRIV-01` user-facing copy versus observed data transfer; `COLD-01` failed or
    slow session restoration does not deadlock indefinitely; `ENV-01` build
    contains required public variables without exposing their values.
- **PATTERN**: Actual screens/libraries in the Context References; current product
  vocabulary in `docs/product/speaking-world.md`.
- **GOTCHA**: Baseline tests must use designated test accounts. Destructive cases
  operate only on records created for the test. Screenshots must not contain
  email, transcript, audio, Story text, job title, token, signed URL, or UDID.
  Every-launch splash/onboarding behavior may be recorded as current behavior but
  remains an App Store v1 blocker, not a desirable acceptance state.
- **VALIDATE**: A tester unfamiliar with source can execute each ID; every ID says
  which tier reruns after which kind of change; known limitations are visually
  distinct from passes.

### 4. VERIFY build inputs and server prerequisites

- **IMPLEMENT**: Resolve app config and confirm the local `.env` has all required
  names without printing values. Verify EAS account/project and list variables in
  the `development` environment with values hidden. Separately confirm migrations
  020–022 and required Edge Functions (`talk-diagnose`, `phrase-capture`, and any
  other invoked function in the frozen source) are deployed before claiming E2E
  success.
- **PATTERN**: `app.json:10-17,40-79`, `.env.example`, Supabase invocation sites,
  and the migration filenames in `supabase/migrations/`.
- **NEEDS-HUMAN**: Expo/EAS login and Supabase project access. The user enters or
  repairs remote environment values; Codex records presence/pass-fail only.
- **GOTCHA**: `EXPO_PUBLIC_*` values are not server secrets but can still identify
  the production project and must not be copied into evidence. Never put service
  role, OpenAI, R2, or Apple credentials in the mobile environment. Do not use the
  Vercel jobs path as proof that Supabase Edge Functions are deployed.
- **VALIDATE**:
  - `npx expo config --type public >/dev/null`
  - `eas whoami`
  - `eas project:info`
  - `eas env:list --environment development` with output inspected but not pasted
  - A dated deployment checklist marks each required migration/function
    `verified`, `missing`, or `unknown`; no item is inferred from source alone.

### 5. CREATE and install the EAS development build

- **IMPLEMENT**: List registered devices, register the intended iPhone if absent,
  and run the existing `development` profile from the frozen candidate. Let EAS
  update the ad hoc provisioning profile interactively. Install the IPA on that
  registered phone and connect it to Metro. If remote build diagnosis is needed,
  reproduce locally with `npx expo run:ios --device` without changing exact pins.
- **PATTERN**: `eas.json:6-10`, `app.json` bundle ID
  `com.shadowingplus.mobile`, and the existing successful local-device journals.
- **NEEDS-HUMAN**: Apple ID/2FA, correct Apple team, iPhone registration,
  Developer Mode, install confirmation, and direct device interaction.
- **GOTCHA**: A newly enrolled device/team can take time to become installable.
  Do not change bundle ID, loosen native package pins, delete Pods/lockfiles, or
  commit the IPA to work around provisioning. A JS export cannot replace this
  native ABI/startup check.
- **VALIDATE**:
  - `eas device:list`
  - `eas device:create` only if the target phone is absent
  - `eas build --platform ios --profile development`
  - Installed app survives native launch and JS evaluation for at least 30 seconds
  - `npx expo start --dev-client` connects and loads the frozen candidate
  - Record EAS build ID, Git commit, iPhone model, iOS version, and app version;
    omit UDID and install URL.

### 6. RUN all three tiers once on the frozen build

- **IMPLEMENT**: Execute the checklist in order using controlled test data. Run
  network denial/recovery, permission denial/recovery, force-quit/session restore,
  short Self-talk, capture, Speaking World, Phrase, Profile, Library, and
  two-account isolation. Classify each result as `pass`, `known limitation`,
  `release blocker`, `external dependency missing`, or `not reproducible`.
- **PATTERN**: The stable IDs in the new baseline document; do not improvise new
  expected behavior during the run.
- **NEEDS-HUMAN**: Credentials are typed directly on the phone; the user confirms
  visible/audio results and any destructive test action on designated test data.
- **GOTCHA**: “App stayed open” is not an E2E pass. AI/capture paths require their
  actual Edge Function result; local audio requires audible replay and subsequent
  STT; persistence requires kill/relaunch. Do not label false privacy copy or
  repeated onboarding as acceptable merely because they are pre-existing.
- **VALIDATE**: Every checklist ID has a result against the same EAS build ID; no
  personal data or credential is captured; all mutations are confined to test
  records and cleaned up through the product where safe.

### 7. RECORD the baseline and choose the only safe next action

- **IMPLEMENT**: Create the local quality snapshot with commit, tool versions,
  EAS build ID, device/iOS/app version, static results, warning/mismatch budgets,
  matrix results, known limitations, and release blockers. Link it from
  `docs/journal/JOURNAL.md`. Update README and `.env.example` to describe the real
  app, Supabase/Edge Function architecture, current dev/EAS build flow, and the
  canonical checklist. Mark PRD Phase 1 done only when the baseline is fully
  classified and no unexplained P0/P1 prevents later comparison.
- **PATTERN**: Existing `docs/journal/quality/` snapshot format and Build Journal
  rule in `AGENTS.md`.
- **GOTCHA**: The journal is local-only but still privacy-safe. Do not claim the
  app is App Store ready; repeated onboarding, inaccurate privacy copy, inactive
  legal/deletion rows, and any failed deployment checks remain assigned to later
  hardening or a narrow prerequisite repair.
- **VALIDATE**:
  - `npm run validate`
  - `npx expo-doctor` shows no new category or package mismatch beyond the
    documented baseline
  - `git diff --check`
  - `git status --short`
  - README points to the matrix, the quality snapshot contains observed facts
    only, and `JOURNAL.md` has a one-line pointer
  - If a current P0/P1 is unexplained, stop and create a repair plan; otherwise
    Phase 2 Profile/Settings planning is authorized.

---

## TESTING STRATEGY

### Static gate run after every phase

- clean npm install reproducibility;
- TypeScript;
- ESLint with zero errors and no increase above the frozen 15-warning budget;
- iOS production JS bundle;
- resolved Expo config;
- diff whitespace.

Expo Doctor is an advisory fingerprint, not a binary green gate, until the exact
native pins can be upgraded and retested together in a dedicated ABI plan.

### Tier 1 quick device gate

Run after every feature phase: boot, auth/restore/logout, onboarding exit,
Today/Phrase, one Speaking World path, one short Self-talk session, text capture,
and Profile persistence.

### Tier 2 affected-boundary gate

Run whenever a phase touches native modules, permissions, media, local storage,
session replay, capture, or Library. A new native package always requires a fresh
native build and physical startup test.

### Tier 3 release/data gate

Run before external TestFlight and after schema/RLS/Edge Function changes:
two-account isolation, deployment inventory, data-transfer/copy audit, cold-start
failure recovery, and complete full-matrix rerun.

### Failure policy

- New TypeScript/ESLint error, 16th warning, bundle failure, new Doctor category,
  launch crash, wrong-route flash, data loss, permission dead end, cross-account
  read/write, or unexplained server failure blocks the next phase.
- Known limitations stay visible and are never relabelled as passes.
- A failure in current behavior produces a separate repair plan; Phase 1 itself
  does not alter runtime code.

---

## VALIDATION COMMANDS

### Level 1: Worktree and reproducibility

```bash
git -C /Users/jadekim/Documents/shadowing-plus-mobile status --short --branch
git -C /Users/jadekim/Documents/shadowing-plus-mobile rev-parse HEAD
cd /Users/jadekim/Documents/shadowing-plus-mobile/apps/mobile
npm ci
```

### Level 2: Static gate

```bash
cd /Users/jadekim/Documents/shadowing-plus-mobile/apps/mobile
npm run validate
npx expo config --type public >/dev/null
npx expo-doctor
git diff --check
```

`expo-doctor` is expected to exit non-zero only for the documented package-version
category and exact 15-package baseline; the snapshot must compare rather than
hide it.

### Level 3: Native/EAS development build

```bash
cd /Users/jadekim/Documents/shadowing-plus-mobile/apps/mobile
eas device:list
eas build --platform ios --profile development
npx expo start --dev-client
```

### Level 4: Manual full matrix

Execute every ID in `docs/release/mobile-regression-baseline.md` on the installed
EAS build. Record only result category and safe environment/build identifiers.

---

## ACCEPTANCE CRITERIA

- [ ] The baseline targets `feat/mobile-skeleton@b557c25`, never the obsolete
      main-worktree scaffold.
- [ ] The earlier `codex/mobile-app-shell@633d1db` is reconciled feature-by-feature
      as included, intentionally superseded, or a named follow-up; nothing is
      merged solely because it existed on an older branch.
- [ ] Exact native dependency pins and `package-lock.json` are unchanged.
- [ ] `npm run validate` passes with zero errors and no more than the frozen 15
      warnings; iOS export succeeds.
- [ ] Expo Doctor has no new failed category or mismatch beyond the documented
      15-package advisory fingerprint.
- [ ] The versioned matrix defines stable Tier 1/2/3 journey IDs and privacy-safe
      evidence rules.
- [ ] EAS development environment prerequisites are verified without disclosing
      values; required migrations/Edge Functions are classified from the real
      project.
- [ ] One registered iPhone installs and opens the EAS development build for
      `com.shadowingplus.mobile` from the named commit.
- [ ] Every matrix ID has a result against the same build; current failures and
      known limitations are not hidden.
- [ ] Two test accounts cannot read or mutate each other's phrases, Speaking
      World, talk sessions, or profile data.
- [ ] README, `.env.example`, and the local quality journal reflect the real app
      and actual architecture without secrets or personal content.
- [ ] Phase 2 starts only after any unexplained P0/P1 has its own approved repair
      plan or has been resolved and re-baselined.

## RISKS AND MITIGATIONS

| Risk | Mitigation |
|---|---|
| Baseline is accidentally run on obsolete `main` | Pin absolute worktree path and full commit in every artifact/build record. |
| Expo patch “fix” recreates native ABI crash | Preserve exact pins/lockfile; Doctor is advisory; any upgrade gets a separate native-ABI plan. |
| 29 local commits are not on the remote | Record divergence prominently; do not rewrite history; obtain separate authorization before any push. |
| Full matrix mutates personal learning data | Use designated test accounts/records and clean up only those records through the product. |
| Server deployment state is assumed from source | Verify migrations/functions in the real Supabase project and record `verified/missing/unknown`. |
| Development build hides release splash differences | Validate runtime/native modules now; reserve visual splash certification for a release build. |
| Pre-existing privacy/legal gaps are normalized | Classify them as release blockers assigned to later PRD phases, never as passing behavior. |

## NOTES

The biggest regression risk was not a code defect; it was choosing the wrong
worktree as the baseline. This plan corrects that first. It also deliberately
keeps runtime code untouched: the outcome is an evidence-backed contract around
the app that already exists.

**Confidence**: 9/10 in the repository/static plan; 7/10 for one-pass full device
completion because Apple provisioning and Supabase deployment state are external
facts.
