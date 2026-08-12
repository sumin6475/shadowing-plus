# Execution Report: Restore Mobile Activation and Phrase Loop

## Meta
- Plan: `.agents/plans/restore-mobile-activation-and-phrase-loop.md`
- Files added: `apps/mobile/src/lib/onboarding.ts`
- Files modified: root routing, auth recovery, onboarding UI, app shell, sign-in, Today, TypeScript scope
- Lines changed: see final commit stats

## Validation Results
- Lint / types: PASS — TypeScript passed; changed-file ESLint passed with two pre-existing warnings in `today.tsx`.
- Tests: N/A — this app has no unit-test runner. Pure shaping/import boundaries were typechecked and the complete native bundle was built.
- Build / smoke: PASS — release configuration verifier and clean iOS Expo export passed. Physical-device camera, speech recognition, and authenticated Supabase writes still require TestFlight/device verification.

## What Went Well
- The confirmed design task contained an explicit nine-screen sequence and three visual boards, which made the intended journey concrete.
- Existing Speaking World, Phrase Bank, and Talk persistence APIs could be reused instead of introducing another data model.
- Import checkpoints preserve each remote id, so a network retry resumes without replaying completed writes.

## Challenges Encountered
- The recent plan file described a shorter activation flow than the latest confirmed design task. The user explicitly asked to follow the most recently confirmed plan, so the task history and visual boards were treated as authoritative.
- The workspace has no automated native UI harness for camera/speech/auth. Static verification cannot prove the full physical-device journey.
- Running the repository `validate` script through the bundled `pnpm` attempted to replace an npm-installed dependency tree and stopped at ignored build-script approval. Direct release-config, typecheck, lint, and export commands were run instead; generated pnpm files were removed from the workspace.

## Divergences from the Plan
**Kept the confirmed nine-screen journey**
- Planned: The local plan artifact described a shorter three-step activation.
- Actual: Implemented the latest confirmed task sequence including story shaping, first phrase, Talk, and Keep Story.
- Reason: The user pointed to the later design task and asked for the recently confirmed plan.
- Type: Plan assumption wrong

**Email authentication instead of Apple/Google buttons**
- Planned: The visual board showed Apple and Google authentication choices.
- Actual: The Keep Story sheet routes to the app's working Saylo email/password sign-in.
- Reason: Apple/Google providers and native dependencies are not implemented in this worktree; non-working buttons would be misleading.
- Type: Better approach found

**Local deterministic shaping instead of an AI edge call**
- Planned: The visual language implies that Saylo shapes the rough notes.
- Actual: Notes are split into editable beats locally, with story-specific fallback labels.
- Reason: The flow must work signed out and there is no public pre-auth shaping endpoint. The learner retains edit control and no answer is fabricated remotely.
- Type: Security concern

## Issues the Code Review Caught
- Returning users skipped the branded splash; routing now always begins with SplashIntro.
- Import checkpoints alone left a crash window; import now reconciles existing remote Messages, Beats, Phrase, and Talk before inserts.
- Today’s local first-story card was device-global; it now rehydrates the first Story from authenticated backend Story/Message/Beat data and only uses account-matched local ids as a fast path.
- Speech-start failure still enabled Finish; the Talk screen now gates completion on successful microphone/STT start and exposes retry.

## Skipped Items
- Physical iPhone verification of camera permission, on-device speech recognition, and authenticated import — requires a device/TestFlight session.
- Apple and Google authentication — providers are outside this feature's available auth surface.

## Friction Log
- The untracked local plan and the latest confirmed design task disagreed — the project needs a single canonical pointer from implementation plans to the accepted Codex design task/version.
- `validate` assumes a package manager but the workspace has npm artifacts while the available runtime exposed pnpm — the project needs a package-manager declaration and a non-installing validation entry point.
- No first-run reset/debug affordance exists — device QA must currently clear app storage to replay onboarding.

## Recommendations
- Record the accepted onboarding task id and board filenames in a tracked product spec.
- Add a developer-only “Reset onboarding” action and native first-run smoke checklist.
- Add pure unit tests for draft migration, beat shaping, and checkpointed import once the mobile test runner is chosen.
