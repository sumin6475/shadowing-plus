# App Store screenshots — design source

The store screenshots are **drawn, not captured**: each app screen is rebuilt in HTML from the app's own tokens, fonts and icons, filled with mock data, and placed in a marketing frame (headline + soft device frame). Nothing here shows a real account.

## Files

| File | What it is |
|---|---|
| `kit.css` | Tokens, React Native-like layout defaults, shared pieces (card, pill, chip, back bar, status bar, tab bar), the marketing frame |
| `kit.js` | `<i-c>` icons, `<status-bar>`, `<tab-bar>`, `<listen-btn>` |
| `icons.js` | Generated from `apps/mobile/src/design/icon.tsx` |
| `frames/NN-name.html` | One frame each. The screen inside is authored in iOS points (402 × 874) |
| `refs/` | Real screenshots to match against (simulator captures and device captures) |
| `render.sh` | Renders frames to `../1206x2622/NN-name.jpg` (1206 × 2622, no alpha) |
| `compare.py` | Renders a frame's screen alone and puts it beside a reference |

```
./render.sh                # all frames
./render.sh 03-practice    # one
./compare.py 03-practice refs/sim-02-phrase-detail.png   # → .png/03-practice-compare.jpg
```

Rendering needs Google Chrome and macOS (the system serif is loaded from `/System/Library/Fonts/NewYork.ttf`).

`assets/mirror.jpg` is the camera layer of the mirror frame: an AI-generated person (Higgsfield, 2026-10-06), not a real one.

The device references in `refs/talk-*.png` and `refs/result-*.png` come from a larger phone (440 × 956) with a smaller text size, so `compare.py` shows layout, not exact pixels, for those two.

## Rules

- **Only draw what the app really shows.** Every screen mirrors a real screen in `apps/mobile/src/screens/`. No invented features (App Store Guideline 2.3).
- Styles inside `.screen` behave like React Native (`display:flex; flex-direction:column`), so JSX styles copy over as inline styles: `fontSize: 16` → `font-size:16px`, `fontWeight: "600"` → `font-weight:600`, `fontFamily: FONT.bold` → `font-weight:700`, `FONT.display` / `<Serif>` → `class="serif"`.
- Digits inside serif text use the system serif, as in the app: wrap them in `<span class="fig">`.
- Colors: use the CSS variables in `kit.css` (`--ink`, `--ink2`, `--ink3`, `--acc`, `--accD`, `--accS`, `--soft`, `--card`, `--bg`, `--pill`, `--ring`, `--used`).

## Mock data (one persona across all frames)

**Mina** — a product designer who just joined a new team and uses English at work. First language: Korean. Avatar is the initial "M" (no photo).

Phrases (text · meaning · stage):

| Phrase | Meaning | Stage |
|---|---|---|
| get the hang of | 감을 잡다, 요령을 익히다 | Learning · 2 of 3 |
| I’m on the fence about it | 아직 마음을 못 정했어 | Collected |
| it slipped my mind | 깜빡했어 | Learning |
| let’s circle back to that | 그 얘기는 나중에 다시 하자 | Ready |
| off the top of my head | 지금 바로 떠오르는 대로는 | Collected |
| I couldn’t agree more | 전적으로 동의해 | Ready |
| play it by ear | 상황 봐서 정하자 | Learning |
| bear with me | 잠깐만 기다려 줘 | Ready |
| the bottom line is | 결론은 | Collected |

Featured phrase everywhere: **get the hang of** — context sentence "It took me a few weeks to get the hang of the new workflow.", her own sentence "I’m finally getting the hang of presenting in English."

Studio notes: **Team intro** (today), Weekly update (last 7 days), Explaining a design decision (last 30 days), Tell me about yourself (earlier).

Team intro note (the editor draws each section as a card and each line as a point; the stored body keeps the `Opening` / `- point` shape):

```
Opening
- Hi everyone, I’m Mina. I just joined as a product designer.

Body
- Five years designing mobile apps
- Still getting the hang of our process
- First project: the new onboarding

Closing
- Looking forward to working with you
- Feel free to say hi anytime
```

Mirror session: Free talk, 2m 14s, 212 words, 95 words per minute, 104 different words, 3 of 4 phrases used (get the hang of, bear with me, the bottom line is used; play it by ear not used). Phrases per day is 4, so the home card reads 2/4 and the mirror deck has 4 cards.

Profile: 24 min 10s spoken in the last 7 days; 3 h 12 min in total over 41 sessions; phrases 31 Collected · 12 Learning · 9 Ready.

## Frames and headlines

| # | File | Screen | Headline |
|---|---|---|---|
| 1 | `01-phrases` | Phrases home | Say the English / you save. |
| 2 | `02-mirror` | Talk (mirror), live | Say it out loud, / in the mirror. |
| 3 | `03-practice` | Phrase detail | Three small steps / for every phrase. |
| 4 | `04-save` | Add a phrase | Save the phrases / you want to use. |
| 5 | `05-studio` | Studio note | Write what you / want to say first. |
| 6 | `06-result` | Mirror result | See what you / actually said. |
| 7 | `07-profile` | Profile | Watch your speaking / add up. |
