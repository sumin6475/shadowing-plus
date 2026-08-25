# Quality snapshot — Self-talk Phrase Bank suggestion split

- Typecheck: PASS
- iOS export: PASS — 1,919 modules bundled
- `talk-diagnose` deploy: PASS — JSON 401 `UNAUTHORIZED_NO_AUTH_HEADER`
- `talk-phrase-suggest` deploy: PASS — JSON 401 `UNAUTHORIZED_NO_AUTH_HEADER`
- Authenticated match / reject / retry: pending in-app smoke test
- TestFlight: not built; UI changes need a new iOS production build

## Required smoke test

- Focus coaching still returns one generated moment without Phrase Bank language.
- A strong owned match shows `From your Phrase Bank` with Try this phrase / Doesn’t fit.
- No strong match hides the Phrase Bank area after loading.
- Coaching error still shows the Bank card, and a Bank error still shows coaching.
- Doesn’t fit closes the card and writes `rejected`.
- Try this phrase writes `accepted`; It came out writes `used` once.
