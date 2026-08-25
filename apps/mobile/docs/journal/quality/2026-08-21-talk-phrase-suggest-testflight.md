# Quality snapshot — TestFlight build 17

- Release config: PASS
- Typecheck: PASS
- iOS export: PASS — 1,919 modules bundled
- `talk-diagnose` deploy: PASS — JSON 401
- `talk-phrase-suggest` deploy: PASS — JSON 401
- EAS iOS production build: PASS — build 17
- App Store Connect upload: PASS
- Authenticated match / reject / retry: pending after Apple processing

## Required smoke test

- Focus coaching still returns one generated moment without Phrase Bank language.
- A strong owned match shows `From your Phrase Bank` with Try this phrase / Doesn’t fit.
- No strong match hides the Phrase Bank area after loading.
- Coaching error still shows the Bank card, and a Bank error still shows coaching.
- Doesn’t fit closes the card and writes `rejected`.
- Try this phrase writes `accepted`; It came out writes `used` once.
