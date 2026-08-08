# Mobile regression baseline

This is the release-safety contract for the current Shadowing+ iOS app. From the
repository root, first run `cd apps/mobile`, then verify `git branch
--show-current` and `git rev-parse HEAD` against the candidate identity below.
Do not run this matrix from a branch containing the obsolete Phase 0 scaffold.

## Candidate identity

- Source branch: `feat/mobile-skeleton`
- Initial runtime commit: `b557c25651d77ff635ecf8a4ef32bb747373981a`
- Bundle identifier: `com.shadowingplus.mobile`
- Static gate: `npm run validate`
- Full device evidence: pending one EAS development build and one registered
  iPhone; record the build ID and its exact Git commit before testing.

The initial commit is the runtime reference. Documentation and validation-script
changes do not authorize runtime changes. If a screen or journey fails, classify
it and create a separate repair plan instead of repairing it during this run.

## Branch reconciliation

| Ref | Classification | Current equivalent or follow-up |
|---|---|---|
| `feat/mobile-skeleton@b557c25` | included; source of truth | Current Today, Phrase, Speaking World, Self-talk, capture, Library, Profile, splash, and onboarding implementation. |
| `main@0f934f8` | out of mobile scope | Its two unique commits affect web focus/icon work and a Vercel diagnosis route. Do not merge them into the native baseline. |
| `feat/gate-language-island-admin-only@4d0c2d1` | out of mobile scope | Separate web visibility gate. Keep it on its own branch. |
| historical `codex/mobile-app-shell@633d1db` | superseded | Its route-per-screen prototype is replaced by the current stateful shell, subject to the surface mapping below. |
| historical `da69478`, `4eb1aae` | needs web follow-up | Web player fixes preserved only in reflog. Never cherry-pick them as App Store work. |

| Earlier shell surface | Current surface | Reconciliation |
|---|---|---|
| Today | `src/screens/today.tsx` | included with real phrase data |
| Onboarding | `src/screens/onboarding.tsx` via `src/shell.tsx` | included; completion persistence remains a blocker |
| Phrase detail/review | `src/screens/phrases.tsx` | included with persistence and SRS |
| Speak/session | `src/screens/talk.tsx`, `src/screens/world.tsx` | included with STT, local audio, results, and sessions |
| Islands | `src/screens/islands.tsx` and creation in `world.tsx` | superseded by the Domain → Story → Message → Session model |
| Library/detail/save | `src/screens/library.tsx` and Profile Library BETA entry | included; processing-job visibility is a known limitation |
| Settings | `src/screens/settings.tsx`, `src/screens/edit-profile.tsx` | included; inactive release rows remain blockers |
| Custom tab bar | `src/design/ui.tsx` | superseded by Today/Phrases/Speak/Topics/Sessions navigation |
| SVG icon assets | `src/design/icon.tsx` | superseded by the current vector icon system |

## Test rules

Use two designated private test accounts. Create records with an obvious test
marker and mutate or delete only those records. Type credentials directly on the
phone; never record them in this document, screenshots, terminal output, or the
Build Journal.

For `RLS-01`, enter both accounts locally through hidden terminal prompts and run
the controlled harness. The commands themselves contain no credentials and the
harness prints only named PASS/FAIL results:

```bash
read -rs "RLS_TEST_A_EMAIL?Account A email (hidden): "; export RLS_TEST_A_EMAIL; echo
read -rs "RLS_TEST_A_PASSWORD?Account A password (hidden): "; export RLS_TEST_A_PASSWORD; echo
read -rs "RLS_TEST_B_EMAIL?Account B email (hidden): "; export RLS_TEST_B_EMAIL; echo
read -rs "RLS_TEST_B_PASSWORD?Account B password (hidden): "; export RLS_TEST_B_PASSWORD; echo
npm run verify:rls
unset RLS_TEST_A_EMAIL RLS_TEST_A_PASSWORD RLS_TEST_B_EMAIL RLS_TEST_B_PASSWORD
```

The harness creates marked disposable rows, uses account B to target account A's
known Phrase, Story, and Talk Session IDs for read/update/delete and owner-spoofed
insert attempts, verifies results again as account A, and then removes only those
test rows. Never use personal records or service-role credentials.

Allowed evidence is limited to result category, date, safe build ID, Git commit,
app version, iPhone model, and iOS version. Redact email addresses, transcript or
audio content, Story/Message text, job titles, access tokens, signed URLs, Expo
install URLs, project identifiers, and device UDIDs.

Use exactly one result for every executed row:

- `pass`
- `known limitation`
- `release blocker`
- `external dependency missing`
- `not reproducible`

Every result must refer to the same EAS build ID during a full run. “App stayed
open” is not an end-to-end pass: persistence requires force-quit/relaunch, server
flows require their real response, and audio requires audible replay.

## Prerequisites

- Paid Apple Developer team and authenticated Expo/EAS account.
- One registered iPhone with Developer Mode enabled.
- The `development` EAS environment contains every required public variable.
- Supabase migrations and Edge Functions are verified against the real project,
  not inferred from repository files.
- Two test accounts and disposable test content are ready.
- Record native permission state before starting. Reset permissions only when a
  row requires a first-request or denied state.

## Tier 1 — run after every product phase

| ID | Journey and setup | Expected result | Evidence/result |
|---|---|---|---|
| `BOOT-01` | Cold-launch the installed build. Observe native launch through the branded splash and complete its visible action. | No native crash or wrong-route flash; brand assets render; completion reaches the correct auth state. Release splash fidelity is rechecked in a release build. | pending |
| `AUTH-01` | On signed-out state, submit a deliberately invalid test credential. | A readable error appears; app remains responsive and signed out. | pending |
| `AUTH-02` | Sign in with test account A. | Authentication succeeds and the protected app shell appears without exposing another account's data. | pending |
| `AUTH-03` | Force-quit after sign-in, then relaunch. | The persisted session restores to the authenticated route without an auth-screen flash or indefinite native splash. | pending |
| `OB-01` | Traverse onboarding once using Back/Next, then separately verify Skip or Finish. | Navigation works and reaches Today. Current every-mount repetition is recorded as a release blocker, not a pass for persistence. | pending |
| `TODAY-01` | Open Today, refresh once, then retry once after a temporary network failure. | Phrase/count data loads; loading, error, retry, and recovery states are usable. | pending |
| `PHRASE-01` | Create or identify a disposable phrase, search it, open detail, toggle favorite, and restore the original value. | Search/detail are correct; mutation persists or visibly rolls back on failure; unrelated phrases remain unchanged. | pending |
| `WORLD-01` | With disposable data, open a Domain, Story, Message, and one ordered beat. | The Domain → Story → Message → Session hierarchy and beat order are preserved across navigation. | pending |
| `TALK-01` | Start a short Self-talk session, say a neutral test sentence, finish, save, and inspect the result. | STT produces a result, the session saves, and result navigation remains usable. Do not capture transcript evidence. | pending |
| `CAPTURE-01` | Use text capture with neutral test text, select one expression, link it if offered, and save. | The phrase is saved once with its intended source/context and becomes retrievable. | pending |
| `PROFILE-01` | Change display name, goal, or first language to a test value; leave and reopen Profile. Restore the original value. | The test value persists for account A and the restored value persists afterward. | pending |
| `AUTH-04` | Sign out, force-quit, and relaunch. | Protected content is no longer accessible and the signed-out route is restored. | pending |

## Tier 2 — run after changes to native, media, storage, or affected data paths

| ID | Journey and setup | Expected result | Evidence/result |
|---|---|---|---|
| `PERM-01` | Deny camera access on first request, return to the feature, then enable it in Settings and retry. | Denial has usable guidance and no dead end; retry works without a crash. | pending |
| `PERM-02` | Deny microphone or speech recognition, retry, then enable both in Settings. | Denial is explained; the app remains navigable; a later Self-talk attempt can listen. | pending |
| `TALK-02` | Complete a short session, replay its local recording through the speaker, then start a second STT session. | Replay is audible; local audio is not uploaded as evidence; the next session still recognizes speech. | pending |
| `CAPTURE-02` | Exercise Photos selection, camera capture, discard confirmation, and two consecutive disposable saves. | Each permission/modal path returns safely; discard prevents save; consecutive saves do not reuse stale image/context state. | pending |
| `SESSION-01` | Open Sessions, replay a disposable session, delete it, then retry after a temporary network failure. | List/replay/delete are consistent; failure is visible and recovery succeeds without affecting other sessions. | pending |
| `LIB-01` | Open one ready disposable clip, play it, toggle favorite, restore the value, then delete only if created for this test. | Ready content plays and mutations affect only the selected test record. | pending |
| `LIB-02` | Observe a known processing job from native iOS when one exists. | Record visibility honestly. Missing Vercel-backed jobs is a known limitation, never proof that processing succeeded or that the job does not exist. | pending |

## Tier 3 — run before external TestFlight and after schema/RLS/Edge changes

| ID | Journey and setup | Expected result | Evidence/result |
|---|---|---|---|
| `RLS-01` | Run `npm run verify:rls` with two designated accounts using the hidden-input procedure above, then switch accounts in the app to confirm each profile value remains its owner's. | Harness reports 14/14: sessions differ, B's owner-write control works, and cross-account read/update/delete/owner-spoofed insert are denied for Phrase, Story, and Talk Session. Profile metadata remains scoped to the signed-in Auth user. Any failure or cross-account access is a release blocker. | pending |
| `PRIV-01` | Compare visible permission/privacy copy with observed network and persistence behavior during camera, audio, transcript, AI, capture, and sharing paths. For photo capture, verify that the selected image is base64-encoded, sent to the `phrase-capture` Edge Function, and forwarded to OpenAI for analysis even though the app does not intentionally retain the learning photo. | Copy must distinguish local audio from uploaded transcript/metadata/AI inputs and must describe remote photo processing. Provider retention/deletion is `unknown` until verified in the privacy data map; “not stored” must not be interpreted as on-device-only. Current inaccurate or missing copy is a release blocker. | pending |
| `COLD-01` | Launch with slow or unavailable network during session restoration; wait, recover network, and retry/relaunch. | The native splash cannot remain forever; the user eventually reaches a recoverable auth or app state. | pending |
| `ENV-01` | Resolve public Expo config and inspect EAS development-variable names without displaying values. Launch the EAS build through one real server-backed path. | Required public variables are present and functional; no server secret is bundled or written to evidence. | pending |

## Rerun map

- Every implementation phase: static gate plus all Tier 1 rows.
- Auth, splash, routing, onboarding, or persistence change: `BOOT-01`, all
  `AUTH-*`, `OB-01`, and `COLD-01`.
- Camera, microphone, speech, audio, image, or other native dependency change:
  create a fresh native build and run `PERM-01`, `PERM-02`, `TALK-01`, `TALK-02`,
  `CAPTURE-01`, and `CAPTURE-02`.
- Phrase, Speaking World, session, Profile, Library, schema, RLS, or Edge Function
  change: affected Tier 1/2 row plus `RLS-01` and `ENV-01`.
- Privacy copy, sharing, analytics, AI provider, or data-retention change:
  `PRIV-01` plus every journey that transfers the affected data.
- Before external TestFlight or App Review: static gate and all Tier 1–3 rows on
  one traceable release-candidate build.

## Deployment inventory

Do not mark an item verified from source files alone.

| Remote prerequisite | Status | Verification note |
|---|---|---|
| Required `EXPO_PUBLIC_*` names in local `.env` | verified 2026-08-08 | All three expected names are non-empty; values were not printed. |
| Required names in EAS `development` environment | verified 2026-08-08 | All three expected names are present in the accessible project environment; values were not displayed. Runtime use remains part of `ENV-01`. |
| Migration `020` | schema present; history missing | Live REST schema exposes Domain, Story, Message, beat, and talk-session tables. Remote CLI history is empty; owner isolation must be rechecked in `RLS-01`. |
| Migration `021` | schema present; history missing | Live REST schema exposes `is_favorite` on videos and bookmarks. Remote CLI history is empty. |
| Migration `022` | schema present; history missing | Live REST schema exposes phrase favorite, story links, and events. Trigger/policy behavior remains pending `RLS-01`. |
| Edge Function `talk-diagnose` | deployed 2026-08-08 | Listed by the real Supabase project; safe authenticated invocation remains part of `TALK-01`. |
| Edge Function `phrase-capture` | deployed 2026-08-08 | Listed by the real Supabase project; safe authenticated invocation remains part of `CAPTURE-01`. |
| Other Edge Functions invoked by this commit | deployed 2026-08-08 | `talk-stuck`, `media-url`, and `phrase-tts` are all present in the real project. |

## Known release blockers and limitations

- The branded splash requires a manual action on every launch.
- Onboarding opens on every authenticated shell mount and does not persist
  completion.
- Entering Speak requests camera permission before a dedicated primer.
- Current Speak copy understates that transcript/session data and AI inputs are
  sent to Supabase/Edge Functions; recorded audio remains local.
- Photo capture sends the selected image as base64 through the `phrase-capture`
  Edge Function to OpenAI for analysis. The app does not intentionally retain the
  learning photo, but provider retention/deletion is not yet verified and the
  current permission/privacy copy does not explain this remote processing.
- Privacy, Help, Export, Mirror, reminders, theme, and account-deletion rows are
  inactive or incomplete.
- Vercel-backed processing jobs may be absent on native iOS; ready Library data
  uses Supabase successfully.
- A rejected initial session lookup may leave the native splash visible
  indefinitely until the cold-start path is hardened.
- EAS development variable names and Supabase deployment surfaces are verified;
  their authenticated runtime behavior still requires the traceable device build.
- Expo Doctor's current SDK patch report is advisory because several exact pins
  prevent previously reproduced iOS ABI crashes. Never run `expo install --fix`
  as part of this baseline.

These items are not accepted product behavior. They remain visible so later App
Store phases can fix them without confusing an old failure with a regression.
