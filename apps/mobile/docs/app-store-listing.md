# App Store listing — Myne 1.0 (English, U.S.)

Copy-paste source for the App Store Connect version page. Every claim below was checked against the code of build 38 (main `b0c34e0`) on 2026-10-05. Do not add features that are not in the build (Guideline 2.3.1) — notably there is **no AI feedback/coaching** after a Talk session in this version.

## Promotional text (170 max)

```
Save the English you want to say, practice it out loud, then use it in front of the mirror. Your recordings stay on your phone.
```

## Description (4,000 max)

```
Myne is a pocket speaking studio for people learning English. Collect the phrases you actually want to use, practice them out loud, and then say them for real — to yourself, in the mirror.

SAVE PHRASES THAT ARE YOURS
• Type or paste a phrase, or take a photo of a page and pick the line you want.
• Optional AI fill adds the meaning and a short usage note in your own language: English, Korean, Japanese, Traditional Chinese, Spanish, or Russian.
• Keep the sentence it came from, your own note, and where you found it.

PRACTICE IN THREE SMALL STEPS
• Say it — listen at normal or slower speed, or loop it five times and repeat along.
• Hear it — see how people use the phrase in real videos.
• Make your own sentence — write sentences you would really say.
Each phrase moves from Collected to Learning to Ready as you go, and a short daily list brings back the ones that still need work. You choose how many per day.

WRITE WHAT YOU WANT TO SAY
Studio is a simple notebook for speaking. Outline an opening, a body and a closing for a meeting, an interview or a story, then tap “Speak with this note” to practice it out loud.

TALK TO THE MIRROR
• See yourself on screen while you speak. No video is recorded.
• Your words appear as you talk, transcribed on your device.
• Hint cards show today’s phrases and check themselves off when you use one.
• Afterwards, see how long you spoke, how many words and different words you used, your pace, and which phrases you worked in. Listen back, copy the transcript, or go again.

SEE YOUR SPEAKING ADD UP
Your profile shows speaking time for the last seven days, total time and sessions, and how many phrases are Collected, Learning and Ready.

PRIVATE BY DESIGN
• Speaking recordings stay on your phone.
• Speech recognition runs on your device.
• AI features are optional and off until you turn them on. Without them, you can still add phrases by hand and listen with your device’s voice.
• Export your phrases or delete your account any time in Settings.

ALSO INSIDE
• Daily or weekly reminders at the time you pick
• Light and dark themes
• English level setting from A2 to C1

Myne is free. An account is required so your phrases and notes are saved.

Terms of Service: https://getmyne.vercel.app/terms
Privacy Policy: https://getmyne.vercel.app/privacy
```

## Keywords (100 max, comma-separated, no spaces)

```
english,phrases,vocabulary,esl,fluency,idioms,expressions,self talk,mirror,notes,practice,learn
```

Words already in the app name ("Myne", "Pocket", "Speaking", "Studio") are left out on purpose — Apple indexes the name separately.

## URLs

| Field | Value |
|---|---|
| Support URL | `https://getmyne.vercel.app/support` |
| Marketing URL (optional) | `https://getmyne.vercel.app` |
| Privacy Policy URL (App Information page) | `https://getmyne.vercel.app/privacy` |

The site lives in `apps/myne-site` (Vercel project `myne`, deployed by hand). All three URLs answered 200 on 2026-10-05.

## Copyright

```
2026 Sumin Kim
```

## App Review Information

- **Sign-in required:** yes — keep the demo account already entered in App Store Connect. Before submitting, sign in with it once on a phone and make sure it has a few phrases and one note, so the reviewer does not land on empty screens.
- **Contact:** your name, phone number and email (the reviewer calls or emails this if they get stuck).

### Notes (4,000 max)

```
Myne is an English speaking-practice app. An account is required because phrases and notes are saved per user; a demo account is provided above. New accounts can also be created in the app (Create account on the sign-in screen).

How to try the main features
1. Phrases tab: tap + to add a phrase (type or paste text; the camera/photo option reads text from a picture). Tap a phrase to open its three practice steps: Say it, Hear it, Make your own sentence.
2. Studio tab: tap + to write a speaking note, then “Speak with this note”.
3. Talk tab: speak in front of the mirror, then end the session to see your speaking stats and transcript.
4. Profile (avatar, top right) → Settings & account: preferences, reminders, export, privacy, account.

Permissions
• Microphone and Speech Recognition: used only during a Talk session. Speech is transcribed on the device and the audio file stays on the device. Nothing is uploaded.
• Camera: used for the live mirror preview in Talk (no photo or video is recorded) and, only when the user chooses it, to photograph text for a phrase.
• Photos: only when the user picks an image to read a phrase from.
• Notifications: optional local reminders. No push notifications are sent from a server.

AI features and consent
AI is optional and off until the user agrees on an in-app consent screen (it can be changed any time in Settings → Privacy). With consent, the text or photo the user chooses for a phrase is sent to our server and processed by OpenAI to suggest a meaning and usage note, and to generate a natural voice for the phrase. Without consent the app still works: phrases can be added by hand and are read aloud with the device voice.

“Hear it” opens youglish.com in an in-app browser so the learner can hear the phrase in public videos.

Account deletion
Settings & account → Account → Delete account. This deletes the account and its data from our servers.

There are no in-app purchases, subscriptions or ads. The app does not track users.
```

## Version release

"수동으로 버전 출시" (manual release) — already selected; matches the plan to release by hand after approval.

## Screenshots

6.5-inch slot needs 1284 × 2778 px (or 1242 × 2688), no alpha channel. Ready files are in `apps/mobile/docs/app-store-screenshots/` (1284 × 2778 JPG; simulator originals in `raw/`). Captured 2026-10-05 from the iPhone 17 Pro simulator on main `b0c34e0`, signed in as Sumin's own account.

| File | Screen |
|---|---|
| `01-phrases.jpg` | Phrases home |
| `02-phrase-detail.jpg` | Phrase detail — three practice steps ("Buck up") |
| `03-studio.jpg` | Studio — notes list |
| `04-note.jpg` | Studio note with "Speak with this note" |
| `05-profile.jpg` | Profile — speaking time and phrase counts |

**Missing: Talk (mirror) and session stats.** The simulator has no camera and speech recognition fails there ("Failed to initialize recognizer"), so these must be captured on a real iPhone. A 6.9-inch phone (1320 × 2868) or 6.5/6.7-inch phone screenshot is accepted as is; other sizes need resizing to 1284 × 2778.

Suggested order — the first three show on the install sheet: Phrases home → Talk mirror → Phrase detail → Session stats → Studio note → Profile.

Before uploading, look at the content: the shots show the real account (name, profile photo, personal phrases and note titles, e.g. "I never would have though", "gibberish", "Question: about agent's context").

## Open items before pressing "심사에 추가"

- **Build 39 is needed** for the in-app wording fixes and the new legal links (PR #28); pick 39, not 38, when submitting.
- **Talk (mirror) and session-stats screenshots** must come from a real iPhone.
- **App Privacy labels** (separate page in App Store Connect) must match `expo.ios.privacyManifests` in `app.json`.
