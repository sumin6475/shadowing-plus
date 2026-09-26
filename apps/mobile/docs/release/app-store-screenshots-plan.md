# Saylo — App Store screenshot plan (2026-09-10)

Content plan + production pipeline for the App Store listing. Pairs with
`app-store-submission-audit.md`.

## 1. What Apple actually requires

Saylo has no `ios.supportsTablet` key, so it is **iPhone-only** and **no iPad
screenshots are needed**. Since 2026 you only upload the largest size in the
family and Apple downscales for every smaller device.

| Slot | Size | Notes |
|---|---|---|
| **6.9" iPhone (required)** | **1320 × 2868 px** portrait | The only set you have to produce |
| 6.5" iPhone | 1284 × 2778 px | Only if you skip 6.9"; don't |
| App Preview video | optional | Skip for v1 — a bad one hurts more than none |

Up to **10 per localization**; the first **3** are what most people see in
search results, so they carry the whole pitch.

**Capture device:** `iPhone 17 Pro Max` simulator (already installed,
`D861AB5D-E9D4-4B00-9898-209F90F79D47`) — 440 × 956 pt @3× = exactly 1320 × 2868 px,
so a raw `xcrun simctl io … screenshot` is already the right pixel size.

## 2. Localizations

Saylo is **N:1** — many first languages learning one English. The listing matches
the markets the app actually ships L1 copy for (ADR 0022):

1. **English (U.S.)** — primary, the fallback for every unlisted storefront.
2. **Korean** — your first real user base.
3. **Chinese (Traditional)** — the Taiwan-first target. Covers the **Taiwan and
   Hong Kong** storefronts. **Singapore reads Simplified**, which the app does not
   ship, so Singapore falls through to the English listing — that is deliberate,
   not an omission.
4. **Japanese** — shipped alongside Traditional Chinese (ADR 0022).

Spanish and Russian can follow once their copy is proven in the wild.

**No mainland China listing.** It requires an MIIT/ICP filing number and a
Chinese legal entity. Traditional Chinese as a *language* needs none of that.

## 3. The six frames

Each frame = one **promise**, one **screen**, one **caption**. The caption sits
above the device; the screen does the proving. Order is the pitch: hook →
mechanism → payoff.

| # | Promise | Screen to capture | Caption (EN) |
|---|---|---|---|
| **1** | You will actually speak, today | **Today** — hero with "Speaking", This week bars filled | **Speak first. Study second.** <br><sub>One minute of real talking, every day.</sub> |
| **2** | It listens without sending your voice anywhere | **Talk / Mirror** mid-session — red "Listening" pill + live waveform + interim transcript | **Your voice never leaves your phone.** <br><sub>Speech becomes text on-device.</sub> |
| **3** | You find out exactly what to fix | **Talk feedback detail** — one diagnosis tag + what you said vs the polished line | **Not "good job." What to fix.** <br><sub>One weak moment, named and rewritten.</sub> |
| **4** | The fix becomes a phrase you own | **Phrase detail** — the phrase, your usage note, the story it came from | **Turn your mistakes into your phrases.** <br><sub>Saved with the moment you needed it.</sub> |
| **5** | It comes back so it sticks | **Phrases** list with review chips + the Today card showing `3 / 7 left` | **Comes back before you forget it.** <br><sub>A short list a day. That's the whole system.</sub> |
| **6** | Your speaking has a shape | **Studio** — the speaking-world grid / topic bento | **See your speaking world grow.** <br><sub>Every story you can tell, in one place.</sub> |

### 3.1 Translated captions

Same six promises, one table per locale so a native reviewer can read a whole
set top to bottom without scrolling sideways.

**Korean**

| # | Headline | Subhead |
|---|---|---|
| **1** | 먼저 말하고, 그다음 공부합니다 | 매일 1분, 진짜로 말하는 연습. |
| **2** | 목소리는 기기 밖으로 나가지 않아요 | 음성 인식은 아이폰 안에서 처리됩니다. |
| **3** | "잘했어요" 말고, 뭘 고칠지 | 약한 순간 하나를 짚어 다시 씁니다. |
| **4** | 실수를 내 표현으로 바꿉니다 | 필요했던 그 순간과 함께 저장돼요. |
| **5** | 잊기 전에 다시 돌아옵니다 | 하루에 짧은 목록 하나. 그게 전부예요. |
| **6** | 내 스피킹 월드가 자라는 걸 봅니다 | 말할 수 있는 이야기가 한곳에. |

**Chinese (Traditional)** — Taiwan usage: 手機 / 語音辨識 / 裝置 / 清單 / 口說, 「」quotes

| # | Headline | Subhead |
|---|---|---|
| **1** | 先開口，再學習 | 每天一分鐘，真正開口說話。 |
| **2** | 你的聲音不會離開手機 | 語音辨識全部在這台裝置上完成。 |
| **3** | 不是「你很棒」，而是該改哪裡 | 找出一個卡住的瞬間，說清楚、再寫一次。 |
| **4** | 把說錯的地方變成你的句子 | 連同你需要它的那個瞬間一起存下來。 |
| **5** | 在你忘記之前，它會再出現 | 一天一份短清單，整套系統就這樣。 |
| **6** | 看著你的口說世界長大 | 你說得出來的每個故事，都在同一個地方。 |

**Japanese**

| # | Headline | Subhead |
|---|---|---|
| **1** | まず話す。勉強はその次。 | 毎日1分、本当に声に出す。 |
| **2** | あなたの声は端末から出ません | 音声はこの端末の中で文字になります。 |
| **3** | 「よくできました」ではなく、直すところを | 詰まった瞬間をひとつ、名指しして書き直す。 |
| **4** | 言えなかったことを、自分のフレーズに | 必要になったその場面ごと保存。 |
| **5** | 忘れる前に、もう一度出てくる | 1日1本の短いリスト。仕組みはそれだけ。 |
| **6** | 話せる世界が広がっていく | 語れる話のすべてが、ひとつの場所に。 |

**Deliberately excluded:** anything marked *Coming soon*, the Library tab (BETA,
possibly cut — see audit B6), and any screen showing another person's content.
A screenshot of a feature you cut is a 2.3.3 rejection.

## 4. Visual template

Pull every value from `src/design/mobile-tokens.ts` so the store page and the
app are visibly the same product.

- **Canvas:** 1320 × 2868, background `#F2F2F7` (the app's light `bg`); frames 2
  and 6 may use `#000000` (the dark `bg`) for rhythm — never a gradient that
  isn't in the app.
- **Caption block:** top ~620 px. Headline in **Newsreader** (the app's serif),
  ~104 px, colour `#111114`, max two lines. Subhead in **Inter**, ~46 px,
  `rgba(60,60,67,0.6)` (`ink2`), one line.
- **Accent:** cobalt `#3B6EE1` only, and only on one word or one underline per
  frame. Never terracotta — that palette is web-only and deprecated.
- **Device treatment:** screenshot inset ~90 px from each side, corner radius
  matching the device, soft shadow. No hand mockups, no floating emoji, no
  "As seen on" badges.
- **Consistency rule:** identical caption baseline and device position across all
  six, so swiping reads as one strip.

## 5. Production pipeline

### 5.1 Seed a screenshot account

Screenshots of an empty app look broken, and the same account doubles as the
**App Review demo account** (audit B4). Before capturing, seed it with:
3–4 stories, ~12 saved phrases spread over the last 10 days (so the This week
bars are uneven and honest), one finished Talk session with feedback, and a
review queue that is *partly* done (`3 / 7`, not `0 / 7`).

### 5.2 Capture at native size

```bash
xcrun simctl boot D861AB5D-E9D4-4B00-9898-209F90F79D47   # iPhone 17 Pro Max
xcrun simctl launch D861AB5D-E9D4-4B00-9898-209F90F79D47 com.shadowingplus.mobile
xcrun simctl io D861AB5D-E9D4-4B00-9898-209F90F79D47 screenshot docs/release/screenshots/raw/01-today.png
```

**The app chrome is English in every localization, on purpose.** Verified on the
simulator at `zh-Hant` and `ja`: the greeting, the date, *This week*, *Today* and
the tab labels stay English because the tour points at English labels (ADR 0021),
and setting a device language does not change them. Only three surfaces follow
the learner's L1 — the first-run tour (and only after an L1 is picked in
**Settings → First language**, not from the device locale), the Stuck note, and
phrase glosses from `phrase-capture`.

So you do **not** need a separate raw capture per locale. Capture the six frames
once, then swap only the captions — except **frame 4**, whose phrase detail shows
the gloss in the learner's language. Re-shoot frame 4 per locale with an account
whose saved phrases carry L1 glosses.

This is accurate representation, not a shortcut: an English-chrome app under a
Traditional Chinese listing is what the reviewer will install.

Two things to fix before each capture:
- **Status bar** — override it so every frame reads the same:
  `xcrun simctl status_bar <udid> override --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3`
- **Dev overlays** — the Expo dev-menu gear and any `__DEV__` capture button
  must be gone. Capture from a **release/preview** build, not the dev client.

### 5.3 Compose

The captions are the only synthetic part. Build one template, six instances:

1. Author a single HTML template at 1320 × 2868 (tokens above, Newsreader + Inter
   loaded from `assets/fonts/`), one `<img>` slot for the raw capture and two
   text slots.
2. Render each frame headlessly and export PNG — no design tool round-trip, and
   the copy stays diff-able in git.
3. Output to `docs/release/screenshots/{en,ko,zh-Hant,ja}/01…06.png`.

**Fonts in the caption template:** Newsreader has no CJK (measured — 564 glyphs,
Latin only), so a `ko`, `zh-Hant` or `ja` headline set in it renders tofu or
silently falls back. Keep Newsreader for the English set and pick the matching
system face for each CJK set — **PingFang TC** for `zh-Hant`, **Hiragino Sans**
for `ja`, **Apple SD Gothic Neo** for `ko`.

Do not let one CJK face serve two locales: `zh-Hant` and `ja` share code points
whose printed glyphs differ (Han unification), so PingFang drawing Japanese text
gives Chinese-looking kanji — the exact tell a Japanese reader notices first.

**Do not generate the phone screens with an image model.** A generated UI that
doesn't match the shipped app is a 2.3.3 "screenshots misrepresent the app"
rejection, and it is the single most common avoidable one. Generation is fine
for a background texture or an abstract shape behind the caption — nothing that
looks like app UI.

### 5.4 Check before upload

- [ ] All six are exactly 1320 × 2868, sRGB, no alpha
- [ ] Same status-bar time and battery in every frame
- [ ] No dev-menu gear, no Expo overlay, no debug text
- [ ] No "Coming soon" row visible in any frame
- [ ] Captions are translated; app chrome is English in every set (expected)
- [ ] Frame 4's gloss is in that locale's language
- [ ] `zh-Hant` captions use Traditional glyphs throughout — spot-check 個 / 裡 /
      這 / 會 / 說 rather than trusting the render
- [ ] `ja` captions render Japanese kanji forms, not Chinese ones — spot-check
      声 / 端末 / 直 / 場面 (声, not 聲; the giveaway is a face swap, not a typo)
- [ ] Nothing on screen that isn't in the submitted binary
- [ ] Frames 1–3 tell the whole story on their own (that's all search shows)

## 6. Order of work

1. Seed the demo/screenshot account (also unblocks audit B4)
2. Build a preview build with the placeholder rows removed (audit B2)
3. Capture 6 raw PNGs once, plus 3 extra frame-4 shots (ko, zh-Hant, ja) = 9 total
4. Build the caption template, render 24 frames (4 locales × 6), export
5. Upload with the rest of the metadata checklist in the audit doc
