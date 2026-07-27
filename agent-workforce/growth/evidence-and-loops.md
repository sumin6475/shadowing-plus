# Evidence & loops — house rules for Shadowing Plus

*Adapted from the three vendored references in `references/` (vibe-check, MIT, Amer Arab).
Those files are the general method; this file is how we apply it to **this** product.
Read the references for the full reasoning; read this for the rules that bind the Growth lane.*

---

## A. Evidence tagging — every claim wears a tag

The problem this solves: a research doc mixes things we actually saw with things we're
guessing, and after a week nobody remembers which was which. So a weak guess ends up
steering a real decision. The fix is a tag on every claim.

**The three tags** (`references/DISCOVERY-DEEP-DIVE.md`, "Sort the catch," names all three;
it defines `seen it` and `hunch` explicitly — our `guess` line is our own reading of its third tag):

- **`seen it`** — at least **three independent** sources back it (different people, different
  threads or reviews — not one loud thread quoted three times). *(reference's definition)*
- **`hunch`** — plausible, but under three sources. Could be true; not confirmed. *(reference's definition)*
- **`guess`** — our reading: inference from reasoning, with no source behind it at all.

**The rule.** Every claim in a research or brainstorm doc carries one of these tags.
A differentiator built on a `hunch` is a **bet, not a finding** — you can still make the
bet, but you name it as a bet so you size the risk honestly.

**The source-verification rule** (same reference, "Verify sources before they steer
anything"). A quote is only usable if its permalink **loads** and the **quoted words are
actually on the page** — text match, not gist match. Report the honest count (the
reference's words: "how many checked, how many failed, how many dropped" — e.g., in our
own phrasing, "pulled 12, 10 checked out, dropped 2"). A high fail rate condemns the whole
sweep — if several quotes fail, the pass was inventing, so throw the batch out rather than salvage it.

**The scoring formula.** The references describe ODI's satisfaction-gap logic in prose;
the algebraic form we use for it is the standard Ulwick opportunity algorithm:

> **Opportunity = Pain + max(0, Pain − Served)**

Read plainly: a need scores high only when it **hurts** *and* is **poorly served**. A need
that hurts but is already handled well (Pain high, Served high) collapses to just its Pain —
no room to win. That is the reference's core rule ("significantly better, or no
opportunity") written as arithmetic. Pain and Served are each rated on a simple scale
(say 1–10) from the tagged quotes; both are directional, not statistical.

### Worked example — tagging the ver2.0 brainstorm TL;DR

Applying the tags to all 9 rows of the "결정 요약 (TL;DR)" table in
`../../../docs/ver2.0 plan/2026-07-10-productization-research-brainstorm.md` **as it stands**.
This does **not** edit that doc — it's a read-and-tag pass to show the rule in action.
(The brainstorm cites 4 sub-agent research reports, but their permalinks aren't in the doc.
So the strict three-permalink bar for `seen it` can't be met *from this doc alone* — that
gap is itself a finding. Where a row is still tagged `seen it` below, it earns it on a
weaker but honest standard: the claim rests on **independently checkable public facts**
(a named price, a platform rule, a court case), not on three sourced quotes. Worth
flagging so the bar isn't quietly lowered elsewhere.)

| Claim (from the TL;DR) | Tag | Why that tag |
| :---- | :---- | :---- |
| 배포 모델: 데모 + 랜딩 + waitlist 먼저 → freemium | `guess` | A sequencing *decision*, not an observation — reasoning about cheapest validation, no market source behind it. |
| 무료 티어 = 업로드 분(minute) 쿼터 + SRS ~50문장 캡 | `hunch` | Backed by competitor-pattern reasoning (LingQ 20-word cap = worst reputation), but the "60 min / 50 sentence" numbers are un-sourced proposals. |
| 가격 앵커 $8–12/mo (~$79/yr) | `hunch` | Anchored to an observed competitor cluster ($12–15/mo), but "just below" is a judgment call, not a tested price point. |
| 유료 차별화 = 메신저 리뷰 배달 | `hunch` | The whitespace claim ("경쟁사 전무") is plausible and repeated, but rests on the competitor scan, not on users asking for it. **A differentiator on a hunch = a bet.** |
| ASR 하이브리드 (Groq v3 무료 / Scribe 유료·CJK) | `seen it` | Backed by a concrete per-hour cost table with named providers and a 50-user cost scenario — checkable numbers, multiple providers. |
| 메신저 채널: Telegram 무료·무승인·선제발송 | `seen it` | Specific, verifiable platform facts (free unlimited after /start, @BotFather, no approval) that hold across sources. |
| YouTube import 퍼블릭 제거 (§1201 리스크) | `seen it` | Named legal precedent (*Yout v. RIAA*), payment-processor bans, operational fragility — several independent legs. |
| Notion = 코어 DB ❌, 내보내기 대상 ⭕ | `guess` | An architecture judgment (API rate limits, non-relational), not a market observation. |
| 결제 전 필수 = DMCA agent 등록($6) + repeat-infringer ToS + "본인 권리 보유" 조항 | `seen it` | §512(c) safe-harbor requirements are checkable legal facts (statutory + the $6 DMCA-agent registration), same standard as the other legal row. |

The honest read: the **cost / channel / legal** rows are the sturdiest (`seen it`), because
they rest on checkable external facts. The **pricing and free-tier numbers** are `hunch`es —
fine as starting points, but they need a real signal before they harden. And the paid
differentiator (messenger review) is the biggest `hunch` of all: it's the whole wedge, and
it currently rests on "no competitor does it," not on "users told us they want it."
**That's the bet to validate first.**

---

## B. The growth-loop question — do we have a loop yet?

The reframe (from `references/GROWTH-LOOPS.md`): a **funnel** needs a constant push — you
pour money in the top to get customers out the bottom, and it gets *more* expensive as you
grow. A **loop** is a circle: each user's output (a thing they made, a person they pulled
in, a signal they left) becomes the input that recruits the next user. Growth compounds
instead of leaking.

**The three shapes a solo builder can actually build:**

- **Content loop** — a user's output becomes public, gets found or shared, pulls in a stranger.
- **Invite loop** — using the product naturally puts it in front of someone new.
- **Signal loop** — using it visibly marks the user, and others copy them.

**The diagnostic, in Shadowing Plus's own terms:**

1. **How does a new person discover us?** When someone uploads a clip, shadows it, builds an
   SRS deck, grows a language island, or gets a messenger review — does any of that action
   produce something a *stranger* sees? (Content = a public clip page. Invite = a shared
   deck or island. Signal = a visible "made with" mark.)
2. **Why does an existing user come back?** The SRS due-queue and the messenger review pull
   them back — but that's a **retention** engine, not an acquisition one. Coming back is not
   the same as bringing someone.
3. **Does one trip through bring in more than one new trip?** For a loop to spin, one user's
   activity has to cause **>1** new user's activity. Where in our flow does that happen today?

**The honest answer, for the product as currently designed:** **there is no growth loop yet.**

Everything in the current build and the ver2.0 plan is **private by default** — uploads are
private (it's the legal shield, per the workforce rules), SRS decks are personal, messenger
reviews go to the one learner who made the bookmark. None of it is public, so no user's
activity is visible to a stranger. The product is a strong **retention** machine (upload →
shadow → bookmark → SM-2 → messenger) with **no acquisition loop bolted on.** The Phase 1
plan's referral mechanic ("리퍼럴로 순번 상승") is a waitlist trick, not a product loop, and the
references are explicit that a referral scheme is the *weakest, last-resort* lever — never
the main engine.

The reference's own guidance for exactly this case: **don't fake a loop.** When there's no
honest loop, the **community channel is the growth engine** — "a real 'I show up in my
community every week' beats a fake loop every time." For Shadowing Plus right now, that means
Growth's job is niche-community distribution (r/languagelearning, HN Show, language Discords)
plus build-in-public — **not** a contrived invite wall. The seed of a *future* loop is the
Phase 1 D3 demo ("내 클립으로 해보기"): if a stranger can experience the product on their own
content before signing up, that's the raw material for a content or signal loop later. But
it isn't one yet, and the honest posture is to say so.

**The one cheap number that would prove a loop is spinning:** the **k-factor** — new users
brought in *per existing user through the product itself* (not paid, not a one-off share).
Concretely: of users who shadow a clip or complete a review, what fraction cause at least one
new signup via a shared clip/deck/island? If that number climbs above ~1 without ad spend, a
loop exists. Today it is effectively **0**, and naming that honestly is the point.

---

## C. The riskiest-assumption gate — write the number before the test

The rule: name the **single belief that sinks the project if it's wrong**, pick the
**cheapest test**, and **write the pass/fail number down before you run the test** — so a
disappointing result can't be rationalized after the fact into "well, it sort of worked."
(Attribution, kept honest: the "name a number and write it into the plan **before** you open
the doors" discipline is `references/COLD-START.md`'s — its liquidity threshold, "the one
metric a cold-start product lives by." The broader "isolate the *riskiest single assumption*
and test it cheapest" framing is vibe-check's Phase 6, which is **not** one of the three
vendored references, so treat it as cited-not-verifiable here.)

### Applied to the Phase 1 waitlist

`../../../docs/ver2.0 plan/2026-07-10-phase1-landing-demo-waitlist.md` has a subtle gap worth
being precise about. Its §3 table *does* set pre-committed thresholds — but only for the
**dedicated-native-app** decision (waitlist 500+, mobile-intent 60%+, "would install from app
store" 50%+). What it never sets a number for is the gate the whole ver2.0 direction actually
hinges on: **does Phase 2 (freemium beta) happen at all?** The phase1 doc's stated purpose is
"수요 검증 (freemium 진행 여부)" (its line 4), and the brainstorm doc is the one that calls the
waitlist conversion rate "Phase 2 진행 여부의 데이터" — yet the phase1 doc that operationalizes
the waitlist never writes down a conversion threshold anywhere. That's the riskiest-assumption
gate left open.

The riskiest assumption underneath it: **strangers who see the landing page want this enough
to give an email.** If they don't, the whole freemium bet is built on sand — and messenger
review (the paid differentiator, itself a `hunch` from section A) never gets a real test.

**Proposed pass/fail number — awaiting Sumin's decision, NOT settled:**

> **Landing → waitlist signup conversion of ≥ 8% from qualified traffic** (language-learning
> community + build-in-public, *not* cold paid ads), over a run of at least **200 qualified
> visitors**. Bands partition the range with no overlap: **≥ 8% → Phase 2 is greenlit.
> < 4% → stop and rethink the wedge. 4% ≤ rate < 8% → inconclusive** (extend the run or fix
> the funnel before deciding).

**What that number is based on** — and, to eat our own cooking from section A, its honest tag
is **`guess`**: it rests on general reasoning, not a cited source, so it can't even be a
`hunch` by our own definition. The reasoning: a warm, well-matched landing page with a working
demo commonly converts in the high single digits to low teens; 8% is a deliberately modest bar
for *qualified* (not cold) traffic carrying a live D3 demo, which the plan itself calls its
"승부수." The 200-visitor floor is the smallest count that keeps an 8% reading from being one or
two lucky clicks. (Pull a real benchmark source and it graduates to `hunch`.) **These numbers
are a starting proposal to make the gate concrete — Sumin sets the real ones.** The
discipline the reference insists on isn't the specific figure; it's that *some* number gets
nailed down **before** the traffic arrives, so the Phase 2 decision is read off data instead
of argued after the fact.
