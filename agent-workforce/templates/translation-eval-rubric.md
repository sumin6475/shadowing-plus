# Translation-QA Rubric — Content & Learning (Metric ②)

Makes QA a *score*, not a vibe. Sample, don't read everything. *(plan §3.3)*

## Sampling
- Pull recent `segments_translated.json` output (**read-only**).
- Sample N lines per **top user language** (start with the 2–3 most common; cover the rest with user reports + automated checks).
- Certify only languages we can actually verify; flag the rest.

## Score each sampled line 1–3
| Dimension | 3 (good) | 2 | 1 (flag) |
|---|---|---|---|
| **Accuracy** | meaning preserved | minor slip | wrong / missing meaning |
| **Naturalness** | reads native | slightly off | awkward / literal |
| **Segmentation** | clean sentence units | minor split | broken / merged lines |

## Thresholds
- Any line scoring **1** → add to the Notion **"Fix me"** list (clip · line # · language · issue).
- A clip with **>10% flagged** → hold from the starter set until fixed.
- The Builder fixes / re-runs the pipeline — **agents never edit `segments` directly** (RLS is off).

> Translation matches by **batch position (k)**, not GPT's returned index — flag ordering issues, don't "fix" them in place.
