# Feature: Restore Mobile Activation and the Story–Phrase Loop

This plan should be complete, but validate documentation links, codebase patterns, and task sanity before implementing. Pay special attention to the naming of existing utils, types, and models — import from the right files.

## Feature Description

Turn the current TestFlight shell into a coherent first-use product journey without rebuilding the working backend features. A signed-in learner should see onboarding once, choose a real Story from their Speaking World, enter a Story-scoped Talk through an honest permission primer, save or reuse a Phrase from the resulting diagnosis, and find that Phrase attached to the same Story for the next Talk.

The current Phrase Bank, OCR/text capture, Story/Message persistence, talk-session persistence, TTS, SRS, and Edge Function diagnosis remain the foundation. This work activates and connects those capabilities, replaces misleading prototype interactions in the touched journey, and makes the first-run state durable across relaunches and devices.

## User Story

As an invited beta learner who freezes when speaking about my own life,
I want to choose one Story, talk about it, capture the expression I needed, and find it again in that Story,
So that Saylo immediately demonstrates how my passive English becomes language I can use.

## Problem Statement

The beta contains most of the required data paths, but they are disconnected at the product level:

- A manually dismissed branded splash and a six-screen onboarding both appear every authenticated mount.
- Onboarding answers are component-local, discarded at completion, and do not select a Story or prime a Talk.
- Today uses a hardcoded learner name, a static speaking moment, and two CTAs that do the same free-talk action.
- Phrase capture can link a Story and post-talk diagnosis can retrieve Story phrases, but Story detail never displays linked language and Phrase detail cannot manage links.
- Phrase review and Talk retry show recording-like UI without actually recording or transcribing.
- Talk requests camera permission automatically and claims nothing is uploaded even though transcript/session data is saved and AI-processed.
- Talk clears the initiating detail stack, so a Story-scoped learner cannot return directly to the Story and see the phrase they just saved.
- Initial auth restoration has no rejection/finally recovery and can hold the native splash forever.

The result is a collection of reachable features rather than one understandable learning loop.

## Solution Statement

Implement a versioned, account-scoped onboarding state in Supabase Auth `user_metadata`, following the existing profile metadata pattern. Remove the extra interactive splash, harden session bootstrap, and replace the current onboarding with a short Story-first flow. Ensure the starter Speaking World exists before showing Story choices, persist the chosen Story, and finish onboarding by entering a Story-scoped Talk primer or Today.

Make Today and capture default to the learner's preferred valid Story. Add Story-linked Phrase queries and management so Story detail shows “Useful language,” Phrase detail can link/unlink Stories, and Talk-generated or captured phrases become visible immediately. Replace fake Phrase review and retry affordances with existing on-device speech/TTS hooks and evidence writes. Add a Talk preparation phase that requests mic/speech only after explanation, treats camera as optional, tells the truth about local audio versus cloud transcript/AI processing, and returns to the initiating Story/Message.

Use the existing custom shell for this beta rather than migrating the whole app to route-per-screen Expo Router. Add focused automated tests around onboarding persistence, Story bootstrap/selection, Story–Phrase linkage, and the touched UI state machines; retain the existing release matrix for real-device proof.

## Metadata

**Feature Type**: Enhancement / Integration / Bug Fix  
**Complexity**: High  
**Systems Affected**: Expo app bootstrap, Supabase Auth metadata, custom app shell/navigation, onboarding, Today, Speaking World, Phrase Bank, Talk permissions/retry, release validation  
**Dependencies**: Expo SDK 57, Expo Router 57, Supabase JS 2.110.8, React Native AsyncStorage, expo-camera, expo-speech-recognition, expo-audio, existing Supabase migrations 020/022 and `talk-diagnose`/`talk-stuck` Edge Functions  
**Source PRD**: `.agents/PRDs/mobile-app-store-v1.md` (supporting product loop: `.agents/PRDs/speaking-memory-mvp.md`)  
**PRD Phase**: Phase 5 — First-run experience

---

## SCOPE CONTRACT

### Included in this plan

- Recoverable auth/session bootstrap and removal of the manual splash action on every launch.
- Versioned, account-scoped onboarding completion and preferred Story metadata.
- Short Story-first onboarding using real seeded Stories; skip remains available and persists.
- Story-aware Today hero, personalized learner name, and distinct/non-duplicated CTAs.
- Story defaulting in Phrase capture.
- Story detail “Useful language” and Phrase detail Story link management.
- Real TTS/listen and speech capture in Phrase review.
- Real focused speech capture/evidence in post-talk retry.
- Honest, just-in-time Talk permission/privacy primer and optional camera.
- Return from Talk to the initiating Story/Message and immediate refresh of new session/phrase data.
- Focused automated tests plus the existing TestFlight regression matrix.

### Explicitly deferred

- Public sign-up, password reset, OAuth, or changing the invite-only beta account model.
- Push/local reminders; remove the fake onboarding promise instead of installing notifications.
- Library ingestion, Recommendations, inactive Settings rows, Mirror customization, sharing, account deletion, and App Store legal package.
- A wholesale custom-shell-to-Expo-Router migration.
- Semantic/vector Phrase search, automatic pronunciation scoring, or claims of verified real-world “Use.”
- Dynamic non-Korean Phrase AI output; track separately because it changes the Edge Function contract and localization scope.

---

## CONTEXT REFERENCES

### Relevant codebase files — MUST READ BEFORE IMPLEMENTING

- `apps/mobile/AGENTS.md` — Expo 57 and product-context rules; read before any code.
- `apps/mobile/docs/product/speaking-world.md` — canonical `My life → Story → Talk` direction and “language belongs to the Story” principle.
- `.agents/PRDs/mobile-app-store-v1.md` (Splash and Onboarding section; Phase 5) — approved first-run contract.
- `.agents/PRDs/speaking-memory-mvp.md` (Core Loop and Success State) — retrieval/evidence semantics; do not equate display or self-rating with real use.
- `apps/mobile/docs/release/mobile-regression-baseline.md` (Tier 1–3 and rerun map) — mandatory device validation and known blockers.
- `apps/mobile/src/app/_layout.tsx` (lines 22–70) — current readiness gate, interactive SplashIntro, and protected route pattern.
- `apps/mobile/src/lib/auth.tsx` (lines 29–70) — current session bootstrap and existing auth provider contract.
- `apps/mobile/src/lib/supabase.ts` (lines 1–34) — persisted Supabase session configuration.
- `apps/mobile/src/shell.tsx` (lines 31–112, 145–193) — onboarding gate, custom stack, Talk context, and screen rendering seam.
- `apps/mobile/src/screens/nav.ts` (lines 6–45) — navigation and `TalkCtx` contracts to extend.
- `apps/mobile/src/screens/onboarding.tsx` (lines 40–207) — disconnected six-step state to replace.
- `apps/mobile/src/screens/edit-profile.tsx` (lines 14–42) — established `supabase.auth.updateUser({ data })` metadata persistence pattern.
- `apps/mobile/src/lib/speaking-world.ts` (lines 53–220) — lazy seeding, Story choices, and Story creation/query patterns.
- `apps/mobile/src/screens/today.tsx` (lines 27–170) — real Phrase statistics around a static/hardcoded hero.
- `apps/mobile/src/screens/world.tsx` (lines 513–618, 619–773) — Story/Message surfaces and Story-scoped Talk entry.
- `apps/mobile/src/lib/phrases.ts` (lines 171–480) — canonical Phrase mapper/CRUD, capture dedupe, Story link, events, and SRS.
- `apps/mobile/src/screens/capture.tsx` (lines 180–231, 489–525, 690–718) — Story picker and save path to default safely.
- `apps/mobile/src/screens/phrases.tsx` (lines 85–299, 303–744, 746–899) — Bank, detail, non-persistent stage selector, and decorative review recording.
- `apps/mobile/src/screens/talk.tsx` (lines 52–75, 80–125, 230–335, 380–590, 625–667) — automatic camera prompt, Story diagnosis/save, event writes, fake retry, and inaccurate privacy copy.
- `apps/mobile/src/hooks/use-speech-session.ts` (lines 35–130) — reusable on-device recognition and local WAV path; separate permission preparation from recognition start.
- `apps/mobile/src/hooks/use-phrase-speech.ts` — existing cloud-TTS/device fallback behavior for Review and Story Phrase rows.
- `supabase/migrations/020_speaking_world.sql` — owner-scoped Domain/Story/Message/Session schema.
- `supabase/migrations/022_phrase_story_memory.sql` — Story links, Phrase event vocabulary, RLS, and Story usage counters.
- `supabase/functions/talk-diagnose/index.ts` (lines 100–200) — existing Story-linked Phrase ranking and generated fallback.
- `apps/mobile/package.json` and `apps/mobile/scripts/verify-release-config.mjs` — existing validation commands and no current application-test runner.

### New files to create

- `apps/mobile/src/lib/onboarding.ts` — versioned metadata parsing, preferred-Story validation, and metadata persistence helpers.
- `apps/mobile/src/screens/talk-primer.tsx` — focused presentational component for required mic/speech, optional camera, and truthful data-handling copy.
- `apps/mobile/jest.config.js` — Expo 57 Jest configuration with the project alias and native mocks.
- `apps/mobile/src/lib/__tests__/onboarding.test.ts` — metadata version/parsing/fallback tests.
- `apps/mobile/src/lib/__tests__/speaking-world.test.ts` — starter-world single-flight and preferred-Story fallback tests with mocked Supabase.
- `apps/mobile/src/lib/__tests__/phrases.test.ts` — Story-link mapping/evidence/SRS regression tests.
- `apps/mobile/src/screens/__tests__/onboarding.test.tsx` — first-run step, skip, persistence failure, and Story-start component tests.
- `apps/mobile/src/screens/__tests__/phrase-review.test.tsx` — TTS, real speech attempt, evidence, and error-state tests.

No database migration or new Edge Function is expected for this beta pass. Onboarding metadata is small, learner-owned, and follows the existing Auth metadata pattern. Initial-world creation is hardened with an in-process single-flight helper and verified before Story pickers; a server-side transactional bootstrap is a later hardening task if multi-device concurrency becomes observable.

### Relevant documentation — READ BEFORE IMPLEMENTING

- [Expo SDK 57 SplashScreen — delay hiding and `finally`](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/#delay-hiding-the-splash-screen)
  - Specific section: global `preventAutoHideAsync`, readiness `try/catch/finally`, and hide-as-soon-as-ready guidance.
  - Why: remove the second interactive splash while guaranteeing auth/font/L1 failures cannot hold the native splash forever.
- [Expo Router authentication and protected routes](https://docs.expo.dev/router/advanced/authentication/#using-protected-routes)
  - Specific section: runtime auth guard and route-history behavior.
  - Why: retain the existing signed-in/signed-out guard while onboarding remains an authenticated product gate.
- [Expo SDK 57 Router API](https://docs.expo.dev/versions/v57.0.0/sdk/router/)
  - Specific section: SDK 56+ navigation import changes.
  - Why: do not introduce external `@react-navigation/*` imports while touching shell navigation.
- [Supabase JavaScript `updateUser`](https://supabase.com/docs/reference/javascript/auth-updateuser)
  - Specific section: updating authenticated-user metadata via `data`.
  - Why: persist the versioned onboarding record account-wide without a new table or service key.
- [Supabase Auth overview — custom session storage](https://supabase.com/docs/reference/javascript/auth)
  - Specific section: `persistSession` and custom storage.
  - Why: preserve the existing AsyncStorage-backed session architecture.
- [Expo SDK 57 SplashScreen release-build caveat](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/)
  - Specific section: Expo Go/development builds do not fully reproduce standalone splash behavior.
  - Why: require release/TestFlight validation after removing SplashIntro.
- [Expo unit testing with Jest](https://docs.expo.dev/develop/unit-testing/#installation-and-configuration)
  - Specific section: `jest-expo` and React Native Testing Library for React 19.
  - Why: the app currently has no test runner; avoid deprecated `react-test-renderer`.
- [Expo modules native-call mocking](https://docs.expo.dev/modules/mocking/)
  - Specific section: Jest mocks for native modules and hook testing.
  - Why: camera, speech recognition, and audio must be mocked deterministically in component tests.
- [`expo-speech-recognition` installed package README](../../apps/mobile/node_modules/expo-speech-recognition/README.md#requestpermissionsasync)
  - Specific section: request/get permissions before `start` and denial behavior.
  - Why: separate the Talk primer's explicit permission action from countdown/live recognition.

### Exact test dependencies to pin

Add as development dependencies and commit the updated `package-lock.json`:

- `jest@30.4.2`
- `jest-expo@57.0.4`
- `@types/jest@30.0.0`
- `@testing-library/react-native@14.0.1`

Do not install `@latest` and do not add deprecated `react-test-renderer`.

### Patterns to follow

**Account-scoped profile metadata:**

```ts
// SOURCE: apps/mobile/src/screens/edit-profile.tsx:28-37
const { error: updateError } = await supabase.auth.updateUser({
  data: { display_name: name.trim(), goal: goal.trim() },
});
if (updateError) throw updateError;
```

Store one top-level `saylo_onboarding` object:

```ts
interface SayloOnboardingMetadata {
  version: 1;
  completed_at: string;
  preferred_story_id: string | null;
  preferred_story_title: string | null;
}
```

`updateUser({ data: { saylo_onboarding: next, ...(onlyIfGoalEmpty) } })` must preserve unrelated metadata. Missing, malformed, or older-version metadata means onboarding is required. A completed record whose Story was later archived remains completed; preferred-Story resolution falls back without reopening onboarding.

**Owner-scoped Story choice query:**

```ts
// SOURCE: apps/mobile/src/lib/speaking-world.ts:148-160
const { data, error } = await supabase
  .from("stories")
  .select("id, title, domains(name)")
  .neq("status", "archived")
  .order("updated_at", { ascending: false });
```

Call a shared `ensureInitialWorld()` before every first-run/capture Story-choice query. Implement it as a module-level single-flight Promise so onboarding, Today, and capture cannot concurrently execute the existing non-transactional seed in one app process. Clear the Promise after success/failure so a network error can be retried.

**Story-linked Phrase upsert:**

```ts
// SOURCE: apps/mobile/src/lib/phrases.ts:430-440
await supabase.from("phrase_story_links").upsert(
  { phrase_item_id: phraseItemId, story_id: storyId, user_id: userId, source, updated_at: new Date().toISOString() },
  { onConflict: "phrase_item_id,story_id" },
);
```

Add owner-scoped read/unlink helpers next to this code. Keep `phrase_items` canonical; do not reintroduce `bookmarks` or prototype `SP` data.

**Talk context propagation:**

```ts
// SOURCE: apps/mobile/src/screens/world.tsx:562-565
nav.startTalk({ ctx: title ?? "This story", from: "topics", storyId: id });
```

Extend `TalkCtx` with a serializable return target (`story` or `message` plus IDs/titles). Never use a callback in navigation state. The shell owns returning to a reconstructed detail stack and forces those screens to remount/refetch after Talk.

**Optimistic mutation with rollback:**

```ts
// SOURCE: apps/mobile/src/screens/phrases.tsx:106-134
setItems(/* optimistic next state */);
try {
  await mutation();
} catch (error) {
  setItems(previous);
  Alert.alert(/* readable recovery */);
}
```

Use this for Story link/unlink. Do not silently swallow link or evidence failures when the UI claims the action succeeded.

**Phrase evidence boundary:**

```ts
// SOURCE: apps/mobile/src/lib/phrases.ts:443-457
await recordPhraseEvent({
  phraseItemId,
  event: "retrieved",
  storyId,
  talkSessionId,
  evidence,
});
```

Listening, revealing meaning, or merely displaying a Phrase never records `retrieved` or `used`. A focused retry may record `retrieved` only after a captured attempt and explicit learner confirmation; keep `used` for a Story Talk where the learner confirms it came out, with transcript/self-report evidence.

---

## IMPLEMENTATION PLAN

### Phase 1: Test foundation and durable first-run state

Add the Expo-compatible test runner and native mocks first. Extract onboarding metadata parsing/persistence into a pure helper with a version constant. Harden AuthProvider bootstrap with a terminal `finally` path and recoverable retry state. Remove the interactive `SplashIntro` gate so the configured native splash ends as soon as auth/fonts/L1 are ready.

### Phase 2: Story-first onboarding and activation context

Refactor Speaking World seeding behind `ensureInitialWorld()`, and call it before domain or all-Story reads. Replace the six-step local onboarding with a compact promise/mental-model screen, real Story selection, and completion/start screen. Persist completion on both Finish and Skip; block false success on metadata failure. Store the selected Story and use it as the first preference without overwriting an existing profile goal.

Hydrate the onboarding gate from the authenticated session rather than `useState(true)`. Existing beta accounts with no v1 metadata see the improved flow once after update; completed v1 accounts go directly to Today across relaunch and sign-out/sign-in.

### Phase 3: Story-aware Today, Capture, and Story language

Resolve a valid preferred Story from metadata, otherwise fall back to the most recent non-archived Story. Personalize Today from auth metadata, make the hero Story-specific, remove the duplicate Warm-up action, and handle no-network/no-Story states honestly. Default Phrase capture to that Story while leaving “Not linked yet” available.

Add query helpers for Story-linked Phrases and Phrase-linked Stories. Render Useful language on Story detail with real TTS/detail/practice actions. Add Story link/unlink controls to Phrase detail with optimistic rollback. Ensure newly saved captured or Talk-generated Phrases become visible after the initiating Story remounts.

### Phase 4: Real Phrase practice and Talk completion loop

Wire Phrase Review's Listen step to `usePhraseSpeech`; wire Say it to `useSpeechSession`, show the captured attempt, handle permission/error/empty transcript, and record `retrieved` only after learner confirmation. Convert the Phrase detail stage selector into a read-only evidence/status explanation until a persistence-backed transition exists.

Add a Talk `prepare` phase and presentational primer. Request mic/speech from an explicit start action, request camera only when the learner opts into mirror mode, and permit audio-only Talk after camera denial. Replace inaccurate copy with the actual data boundary. Prevent countdown/session save when required speech permission is denied.

Reuse speech capture for the focused retry instead of an animated fake waveform. Persist transcript-backed `retrieved`/`used` evidence according to the existing vocabulary. Make “Not yet” an explicit outcome without claiming success. Add Save as Phrase to stuck-help suggestions so all Talk-derived needed language can enter the current Story.

Preserve a serializable return target in `TalkCtx`; Done returns to and refreshes the initiating Story/Message, while free talk still returns to Today/Sessions. Ensure session creation finishes before events that require `talk_session_id`, or queue those events until the ID is available.

### Phase 5: Regression, device proof, and release handoff

Run focused tests, the existing static gate, two-account RLS harness, and the exact affected device rows. Create a fresh EAS/TestFlight build only after static/test gates pass and the user separately approves production submission. Record a Build Journal implementation entry and quality snapshot with real results; update the regression baseline's known blockers only for behavior actually verified.

---

## STEP-BY-STEP TASKS

IMPORTANT: execute every task in order, top to bottom. Each task is atomic and independently verifiable.

### 1. ADD `apps/mobile/package.json`, `apps/mobile/package-lock.json`, and `apps/mobile/jest.config.js`

- **IMPLEMENT**: Install the exact test dependencies above; add `test` (`jest --runInBand`) and `test:watch`; configure `jest-expo`, project alias resolution, and minimal deterministic mocks for camera, speech recognition, audio, safe-area, and animation modules.
- **PATTERN**: Existing validation scripts in `apps/mobile/package.json`; official Expo Jest guidance.
- **GOTCHA**: Keep React 19 compatibility; do not add `react-test-renderer`; do not loosen the existing lint warning ceiling.
- **VALIDATE**: `cd apps/mobile && npm test -- --passWithNoTests && npm run typecheck`

### 2. CREATE `apps/mobile/src/lib/onboarding.ts` and `apps/mobile/src/lib/__tests__/onboarding.test.ts`

- **IMPLEMENT**: Define `ONBOARDING_VERSION = 1`, strict metadata parsing, `needsOnboarding(session)`, preferred Story accessors, and `completeOnboarding(input)` using `supabase.auth.updateUser`. Include skip (`preferred_story_id=null`), malformed metadata, old versions, and preservation of existing profile goal.
- **PATTERN**: `src/screens/edit-profile.tsx:28-37` and `src/lib/auth.tsx` Session typing.
- **GOTCHA**: Use ISO UTC timestamps; never trust a stored Story ID without later validating it against owner-scoped non-archived results; do not store transcript/audio/AI content in Auth metadata.
- **VALIDATE**: `cd apps/mobile && npm test -- --runTestsByPath src/lib/__tests__/onboarding.test.ts && npm run typecheck`

### 3. UPDATE `apps/mobile/src/lib/auth.tsx`, `apps/mobile/src/app/_layout.tsx`, and REMOVE the live `SplashIntro` dependency

- **IMPLEMENT**: Add bootstrap error/retry to AuthState; settle `loading` in `finally` for success and rejection; ignore late async results after unmount; render a recoverable initialization state instead of an indefinite splash. Remove `splashDone` and the manual every-launch SplashIntro branch. Keep `SplashScreen.preventAutoHideAsync()` in module scope and hide only when auth/fonts/L1 reach a terminal ready state.
- **PATTERN**: Expo SDK 57 SplashScreen `try/catch/finally` documentation and existing `Stack.Protected` structure.
- **GOTCHA**: Do not flash authenticated content while bootstrap is unresolved; a retry must not create duplicate auth subscriptions; do not delete brand image/font assets that the native splash or onboarding still uses.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run typecheck && npm run export:ios`

### 4. REFACTOR `apps/mobile/src/lib/speaking-world.ts` and CREATE `apps/mobile/src/lib/__tests__/speaking-world.test.ts`

- **IMPLEMENT**: Introduce `ensureInitialWorld()` with a module-level single-flight Promise; make `fetchDomains()` and `fetchAllStories()` call it; ensure failed bootstrap clears the Promise for retry. Add `resolvePreferredStory(preferredId)` and any compact Story choice fields needed by Today/onboarding.
- **PATTERN**: Existing `load → seedInitialWorld → load` logic at `src/lib/speaking-world.ts:66-90` and owner-scoped Story choices at lines 148–160.
- **GOTCHA**: Preserve the accepted starter Domain/Story tree; do not reseed an account with any existing active Domains; test that two concurrent callers share one seed attempt and that an archived/missing preferred Story falls back.
- **VALIDATE**: `cd apps/mobile && npm test -- --runTestsByPath src/lib/__tests__/speaking-world.test.ts && npm run typecheck`

### 5. REFACTOR `apps/mobile/src/screens/onboarding.tsx` and CREATE `apps/mobile/src/screens/__tests__/onboarding.test.tsx`

- **IMPLEMENT**: Replace the current six-step survey with a compact three-part flow: Saylo/usable-English promise, real owner-scoped first Story selection, and ready-to-talk completion. Keep Back and Skip. Finish/Skip must await metadata persistence; show retryable inline failure; remove account/reminder/practice-length affordances that do nothing. Return a typed completion result (`browse` or `start_story` with Story context) to the shell.
- **PATTERN**: Existing Saylo visual language and accessible text in `src/screens/onboarding.tsx`; `Screen`, `Header`, `Card`, `Pill`, `Serif` design components.
- **GOTCHA**: The learner is already authenticated; do not show “I already have an account.” Story loading, empty, and network-failure states need explicit retry/browse handling. Do not request OS permissions inside onboarding.
- **VALIDATE**: `cd apps/mobile && npm test -- --runTestsByPath src/screens/__tests__/onboarding.test.tsx && npm run lint:baseline && npm run typecheck`

### 6. UPDATE `apps/mobile/src/shell.tsx` and `apps/mobile/src/screens/nav.ts`

- **IMPLEMENT**: Replace boolean `ob=true` with session-derived loading/required/complete state. Consume onboarding result: go to Today on browse or invoke a Story-scoped Talk with a serializable return target on start. Extend `TalkCtx`/Nav with `returnTo` and `finishTalk`; reconstruct Story/Message detail state after Talk and force remount/refetch.
- **PATTERN**: Current custom stack and `startTalk` implementation at `src/shell.tsx:53-74`; screen switch at lines 160–193.
- **GOTCHA**: Clear onboarding-derived state when auth user ID changes; do not leak one account's preferred Story into another; keep free-talk and Sessions entry behavior intact; avoid callbacks/functions inside stored navigation context.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run typecheck && npm run lint:baseline`

### 7. UPDATE `apps/mobile/src/screens/today.tsx`

- **IMPLEMENT**: Read display name from Auth metadata; resolve preferred/valid Story; replace the static hero with the selected Story title and `nav.startTalk` Story context; remove or implement a genuinely distinct secondary action (for this scope, remove Warm up). For zero Phrases, show the product loop with direct Talk and Capture actions rather than charts claiming progress. Prefer due phrases linked to the selected Story before global due phrases.
- **PATTERN**: Existing profile-name fallback at `src/screens/settings.tsx:69-71`, Phrase loading/retry in Today, Story Talk context from `src/screens/world.tsx:562-565`.
- **GOTCHA**: Never hardcode “Sumin”; archived/deleted preferred Story must fall back; if Story loading fails, keep global Phrase review usable; maintain pull-to-refresh.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run lint:baseline && npm run typecheck`

### 8. UPDATE `apps/mobile/src/lib/phrases.ts` and CREATE `apps/mobile/src/lib/__tests__/phrases.test.ts`

- **IMPLEMENT**: Add typed owner-scoped `fetchStoryPhrases(storyId)`, `fetchPhraseStoryLinks(phraseId)`, and `unlinkPhraseFromStory(phraseId, storyId)`. Reuse the canonical Phrase row mapper. Add a small evidence helper that validates when `retrieved`/`used` events may be written.
- **PATTERN**: Existing `fetchPhrases`, `linkPhraseToStory`, and `recordPhraseEvent` in the same file; migration 022 owner RLS.
- **GOTCHA**: Do not create a second Phrase model; empty link sets are valid; unlink deletes only the join row, never the Phrase; queries must remain owner-scoped through RLS and must not accept arbitrary `user_id` from UI.
- **VALIDATE**: `cd apps/mobile && npm test -- --runTestsByPath src/lib/__tests__/phrases.test.ts && npm run typecheck`

### 9. UPDATE `apps/mobile/src/screens/capture.tsx`

- **IMPLEMENT**: After ensured Story loading, default the picker to the valid preferred Story from onboarding metadata. Preserve explicit “Not linked yet”; never silently relink when the learner changes selection. Keep the existing one-by-one shared-context save flow and duplicate behavior.
- **PATTERN**: Current `loadStories` and Story chips at `src/screens/capture.tsx:217-231` and 690–712.
- **GOTCHA**: A saved/duplicate Phrase must link to the explicitly selected Story; capture remains usable if Story loading fails; do not regress photo/text/manual inputs.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run typecheck && npm run lint:baseline`

### 10. UPDATE `apps/mobile/src/screens/world.tsx`

- **IMPLEMENT**: Load Story-linked Phrases alongside messages/sessions; render “Useful language” with source/status, real TTS, detail, and practice. Surface its own loading/error/empty state so a Phrase query failure does not masquerade as no language. Refresh after returning from Talk. Use `returnTo` for Story and Message Talk entries. Rename the user-facing bottom label/header “Topics” to “World”/“Speaking World” without changing the internal `TabId` in this pass.
- **PATTERN**: Story's independent session load and Phrase cards/TTS in `src/screens/phrases.tsx`.
- **GOTCHA**: Do not silently coerce a network error to an empty list; never show sample phrases; keep messages/sessions usable if language load fails; do not expose Domain as jargon.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run typecheck && npm run lint:baseline`

### 11. UPDATE `apps/mobile/src/screens/phrases.tsx`

- **IMPLEMENT**: In Phrase detail, load linked Stories and offer link/unlink with optimistic rollback and error recovery. Replace the tappable local-only stage selector with read-only evidence/status copy. In ReviewFlow, play real TTS on Listen, use `useSpeechSession` for Say it, display captured text/error, require a non-empty attempt before grading, and write `retrieved` only after explicit confirmation under the evidence helper.
- **PATTERN**: Existing TTS hook, optimistic favorite/delete mutations, and `submitVerdict` flow.
- **GOTCHA**: Do not use `SAMPLE_PHRASE` for reachable real navigation; stop speech/recognition on unmount; permission denial must not advance to a success-looking grade; SRS verdict and evidence event failures need retryable UI and must not claim persistence.
- **VALIDATE**: `cd apps/mobile && npm test -- --runTestsByPath src/screens/__tests__/phrase-review.test.tsx && npm run typecheck && npm run lint:baseline`

### 12. CREATE `apps/mobile/src/screens/talk-primer.tsx` and UPDATE `apps/mobile/src/hooks/use-speech-session.ts`

- **IMPLEMENT**: Add permission status/request methods separate from `start()`. Build a primer that explains mic/speech requirement, optional mirror camera, local audio retention, account transcript/session persistence, and AI transcript/notes processing. Include explicit Start, “Continue without camera,” denial, Settings guidance, retry, and cancel states.
- **PATTERN**: Installed `expo-speech-recognition` permission APIs and `expo-camera` `useCameraPermissions`; existing Saylo cards/pills.
- **GOTCHA**: Required mic/speech denial cannot enter countdown; camera denial must not block audio Talk; do not claim the transcript stays on device; do not request notification or photo permission.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run typecheck && npm run lint:baseline`

### 13. UPDATE `apps/mobile/src/screens/talk.tsx`

- **IMPLEMENT**: Add `prepare` before countdown; lift camera permission control out of auto-requesting `CameraMirror`; start countdown only after required permission. Preserve Story IDs while removing/locking the hardcoded context dropdown for linked sessions. Make focused retry run real speech capture, show attempt text, and write `retrieved`/`used` only with captured/self-confirmed evidence. Add Save as Phrase to stuck-help suggestions with current Story. Sequence/queue event writes until `talk_session_id` is known. Use `nav.finishTalk` for Done/exit.
- **PATTERN**: Existing `finish`, `savePhrase`, `tryMoment`, `recordPhraseEvent`, and Story-aware `diagnoseTalk` paths.
- **GOTCHA**: Do not start two recognizers simultaneously; prevent empty session save after permission denial; diagnosis failure must not lose a successfully saved session; prevent double event writes on repeated taps; generated Phrase saves remain idempotent.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run typecheck && npm run lint:baseline && npm run export:ios`

### 14. UPDATE `apps/mobile/docs/release/mobile-regression-baseline.md`

- **IMPLEMENT**: Update BOOT-01/OB-01/TODAY-01/PHRASE-01/WORLD-01/TALK-01/PERM-02/COLD-01 expectations for the new flow. Add explicit `PHRASE-STORY-01`: select Story → Talk → save suggestion → return to Story → see Phrase → Review with real speech → relaunch and confirm onboarding does not repeat. Keep results pending until executed.
- **PATTERN**: Existing result vocabulary and rerun map in the same document.
- **GOTCHA**: Documentation is not evidence; do not mark a row pass from simulator/source review.
- **VALIDATE**: `git diff --check -- apps/mobile/docs/release/mobile-regression-baseline.md`

### 15. VALIDATE the integrated change locally

- **IMPLEMENT**: Run the complete test/static gate; inspect diff for prototype/mock fallbacks in reachable first-run and Phrase paths; verify no secrets or user content entered fixtures/snapshots.
- **VALIDATE**: `cd apps/mobile && npm test -- --runInBand && npm run validate && git diff --check`

### 16. VALIDATE owner isolation and remote prerequisites

- **IMPLEMENT**: Run the existing two-account RLS harness because Story/Phrase link reads and deletes are affected. Confirm migration 020/022 and `talk-diagnose`, `talk-stuck`, `phrase-capture`, and `phrase-tts` remain present without printing values/secrets.
- **NEEDS-HUMAN**: Two designated private test-account credentials entered through the existing hidden-input procedure; authenticated Supabase CLI context if remote inventory is repeated.
- **VALIDATE**: `cd apps/mobile && npm run verify:rls`

### 17. VALIDATE on physical iPhone and a fresh release candidate

- **IMPLEMENT**: On one traceable build, run `BOOT-01`, all `AUTH-*`, `OB-01`, `TODAY-01`, `PHRASE-01`, `PHRASE-STORY-01`, `WORLD-01`, `TALK-01`, `TALK-02`, `CAPTURE-01`, `PERM-02`, `COLD-01`, `RLS-01`, `PRIV-01`, and `ENV-01`. Test both a metadata-missing account and an already-completed account; force-quit/relaunch after completion; deny camera and mic separately; verify Story return and Phrase visibility.
- **NEEDS-HUMAN**: Registered physical iPhone, beta credentials, EAS/Apple accounts, and explicit approval before any production build submission or TestFlight distribution.
- **VALIDATE**: `cd apps/mobile && npx eas build:list --platform ios --limit 1 --json --non-interactive`

### 18. ADD local Build Journal artifacts

- **IMPLEMENT**: After verified implementation, append one factual pointer in `apps/mobile/docs/journal/JOURNAL.md`; add a concise quality snapshot under `apps/mobile/docs/journal/quality/` containing exact commands and device-row outcomes. If a diagnosed failure is fixed during execution, create a postmortem and link regression coverage. Keep these local/ignored as instructed.
- **PATTERN**: `apps/mobile/AGENTS.md` Build Journal section and existing `docs/journal/quality/` artifacts.
- **GOTCHA**: Do not invent passes, Apple processing status, user content, or identifiers; do not stage ignored journal files unless the user explicitly changes that policy.
- **VALIDATE**: `git status --short --ignored apps/mobile/docs/journal`

---

## TESTING STRATEGY

### Unit tests

- Metadata parser: missing/malformed/current/older versions, complete/skip, preservation of profile fields, invalid Story ID fallback.
- Starter-world single-flight: two concurrent callers produce one seed path; failure clears cache; non-empty world never reseeds.
- Phrase mapping/link helpers: empty/multiple links, unlink only join row, owner-scoped query shape, readable errors.
- Evidence rules: listen/reveal/display cannot write events; empty attempt cannot retrieve; captured attempt plus confirmation can retrieve; Story Talk plus captured/self-confirmed evidence can use.
- Existing normalization, context fingerprint, and SRS behavior get regression cases while the test runner is introduced.

### Component tests

- Onboarding: loads real choices, Back, Skip persistence, Finish persistence, save failure/retry, Start Story payload, no permission request.
- Today: profile name, preferred Story, invalid Story fallback, zero-Phrase activation state, Story-aware CTA.
- Phrase detail: link/unlink optimistic success and rollback.
- Phrase Review: TTS start/stop, permission denial, empty/captured transcript, event failure, SRS failure, cleanup on unmount.
- Talk primer/retry: mic required, camera optional, truthful copy, no countdown on denial, real retry attempt, no duplicate evidence.

### Integration tests

- Mocked Supabase contract: onboarding metadata update → session refresh → shell bypasses onboarding.
- Story capture: ensured Story list → default preferred Story → create/duplicate Phrase → link exists.
- Story Talk: `storyId` reaches session save and diagnosis → generated Phrase save/link → return target reconstructs Story → linked Phrase query sees item.
- Existing two-account `verify:rls` must still deny cross-account Phrase, Story, and Talk Session operations; add Story-link read/delete probes to the harness if it does not currently cover them.

### Edge cases

- Offline/rejected initial `getSession`, font or L1 load failure, auth user switching mid-hydration.
- Existing beta user with no metadata, completed current version, old version, malformed metadata.
- Preferred Story archived/deleted or owned by a different user.
- Empty account, concurrent Story callers, bootstrap network failure and retry.
- No Phrases, no due Phrases, Story link query failure while messages/sessions succeed.
- Duplicate Phrase saved into a new Story, explicit “Not linked yet,” unlinking the last Story.
- Camera denied/restricted, mic or speech denied/restricted, Settings return, empty transcript.
- Session saves but diagnosis fails; diagnosis returns no moments; event write waits for or lacks session ID.
- Double taps on save/complete/retry and force-quit immediately after onboarding completion.

---

## VALIDATION COMMANDS

### Level 1: Syntax and style

```bash
cd apps/mobile
npm run typecheck
npm run lint:baseline
git diff --check
```

### Level 2: Unit and component tests

```bash
cd apps/mobile
npm test -- --runInBand
```

### Level 3: Integration, security, and build

```bash
cd apps/mobile
npm run verify:release-config
npm run verify:rls
npm run export:ios
npm run validate
```

`npm run verify:rls` requires the two-account hidden-input setup already documented in `docs/release/mobile-regression-baseline.md`.

### Level 4: Manual physical-device validation

- Run affected Tier 1–3 rows on one traceable EAS release candidate.
- Use one account with no `saylo_onboarding` metadata and one with current v1 metadata.
- Confirm onboarding once, skip persistence, Story selection, camera-denied audio Talk, mic-denied recovery, Story return, saved Phrase visibility/link management, real Review speech, force-quit/relaunch, and sign-out/in.
- Confirm the displayed privacy copy matches observed local audio and remote transcript/AI requests.
- Never capture transcript, audio, email, token, project ID, device UDID, or signed URL as evidence.

### Level 5: Release handoff

```bash
cd apps/mobile
npx eas build:list --platform ios --limit 1 --json --non-interactive
npx eas submit:status --platform ios --non-interactive
```

Only build/submit after the user explicitly approves the production action. Record exact build ID, commit, version/build number, and App Store Connect/TestFlight state.

---

## ACCEPTANCE CRITERIA

- [ ] Native splash exits to a recoverable auth/app state without a manual branded-splash action or indefinite wait.
- [ ] A signed-in account missing current metadata sees the improved onboarding; current-version accounts do not.
- [ ] Finish and Skip persist account-scoped completion across force-quit and sign-out/in.
- [ ] Onboarding uses real owner-scoped Stories and can start a Talk with the selected `storyId`.
- [ ] Existing profile metadata is preserved and the preferred Story safely falls back if invalid/archived.
- [ ] Today uses the real learner name and a real preferred Story; no duplicate no-op CTA remains.
- [ ] Capture ensures Stories exist, defaults to the preferred Story, and still supports explicit no-link/error paths.
- [ ] Story detail displays its real linked Phrases; Phrase detail can link/unlink Stories with persistent rollback-safe behavior.
- [ ] A post-talk or captured Phrase linked to a Story appears after returning to that Story without app relaunch.
- [ ] Phrase Review Listen plays real TTS and Say it captures real speech; decorative recording behavior is gone.
- [ ] Stage/evidence UI never claims persisted readiness from local-only taps.
- [ ] Talk explains required mic/speech and optional camera before requesting; camera denial does not block audio Talk; mic denial does not enter countdown/save.
- [ ] Talk copy truthfully distinguishes local audio from account-stored transcript/session data and AI-processed transcript/notes.
- [ ] Focused retry captures an attempt and writes no success evidence without learner confirmation; double taps do not duplicate events.
- [ ] Story/Message Talk returns to its initiating context and refreshes sessions/Phrases.
- [ ] Existing OCR/text capture, Phrase CRUD/favorite/TTS/SRS, free talk, Sessions, Story/Message, and auth flows do not regress.
- [ ] Focused tests, `npm run validate`, and `npm run verify:rls` pass.
- [ ] The affected physical-device matrix passes on one traceable release candidate before external beta expansion.
- [ ] Build Journal and quality evidence contain only real, privacy-safe results.

---

## RISKS AND MITIGATIONS

| Risk | Mitigation |
|---|---|
| Auth metadata becomes stale in the current Session after completion | Use the `updateUser` result/auth-state callback as source, update shell state only after success, and test force-quit/sign-out/in. |
| Existing users are unexpectedly blocked by onboarding after update | Treat missing v1 metadata as a one-time improved onboarding, retain persistent Skip, keep it to three short parts, and never request permissions there. |
| Starter world duplicates under concurrent calls | Use an in-process single-flight helper across all app call sites; track server-transactional bootstrap separately if multi-device races are observed. |
| Preferred Story was archived/deleted or belongs to another account | Validate through owner-scoped non-archived Story results and fall back without reopening onboarding. |
| Phrase link UI creates cross-account access | Rely on migration 022 FORCE RLS, never accept UI `user_id`, and extend/run two-account RLS probes. |
| Talk event writes race session creation | Queue/await session-bound events until the ID exists; preserve retryable error state instead of swallowing writes. |
| Camera/mic hooks request twice or two recognizers overlap | Centralize permission state, make primer the only pre-count request surface, guard async actions/double taps, and stop on phase change/unmount. |
| “Retrieved” or “Used” overclaims learner ability | Require captured attempt plus explicit confirmation; keep listening/display/reveal separate; retain “Not yet” as valid evidence without success claim. |
| New tests become brittle around native modules/animations | Test behavior and accessible text, mock native boundaries, avoid broad snapshots, and use `jest-expo`/RNTL versions pinned for Expo 57/React 19. |
| Scope expands into all unfinished beta surfaces | Enforce the scope contract; reminders, Library ingestion, Settings, Recommendations, routing migration, and localization stay in separate plans. |

---

## NOTES

- This is activation/restoration, not a Phrase Bank rewrite. The existing `phrase_items`, `phrase_story_links`, `phrase_events`, SRS columns, TTS, capture Edge Function, and diagnosis retrieval remain authoritative.
- Onboarding selects an existing starter Story rather than requiring Message construction. A learner can Talk directly from Story; Message remains an optional later refinement.
- The internal `topics` TabId can stay stable while user-facing copy changes to “World”/“Speaking World.” Avoid a risky navigation-wide rename in this beta pass.
- The custom shell remains intentional for this plan. Route restoration is handled with serializable return context; deep-linkable detail routes remain future work.
- Do not mark the Mobile App Store PRD Phase 5 done until splash, persistent onboarding, permission primer, static/test gates, and required device rows have actually passed.

## Confidence

**8.5/10** for one-pass implementation. The existing persistence and UI primitives are strong and most server behavior already exists. The main uncertainty is coordinating speech-recognition lifecycle across full Talk and focused retry on a physical iPhone; the primer separation, native mocks, and mandatory device matrix contain that risk.
