"use client";

import { useState } from "react";

const demos = {
  project: {
    tab: "Project",
    eyebrow: "MY CURRENT PROJECT",
    title: "Explain what I am building",
    prompt: "Explain the point in one minute. Start with why it matters.",
    phrase: "What I’m trying to do is…",
    duration: "00:38",
  },
  story: {
    tab: "Story",
    eyebrow: "ABOUT ME",
    title: "Why I moved abroad",
    prompt: "Keep one clear thread. Do not translate sentence by sentence.",
    phrase: "The short version is that I wanted to…",
    duration: "00:52",
  },
  idea: {
    tab: "Idea",
    eyebrow: "IDEAS / CULTURE",
    title: "A film I keep thinking about",
    prompt: "State the idea first, then support it with one detail.",
    phrase: "What stayed with me was…",
    duration: "01:06",
  },
} as const;

type DemoKey = keyof typeof demos;

export function ProductDemo() {
  const [active, setActive] = useState<DemoKey>("project");
  const demo = demos[active];

  return (
    <div className="product-stage">
      <div className="world-card world-card-left" aria-hidden="true">
        <small>SAVED FROM CONTENT</small>
        <b>Phrase plus original context</b>
        <div className="topic-list"><span>One thing I realised is…</span><span className="active">What I’m trying to do is…</span><span>The trade-off is…</span></div>
      </div>

      <div className="phone-wrap">
        <div className="phone-shell">
          <div className="phone-island" />
          <div className="phone-content">
              <div className="app-top"><span className="app-mark">Saylo</span><span>1-minute self-talk</span><span className="app-menu" aria-hidden="true">•••</span></div>
            <div className="demo-tabs" role="tablist" aria-label="Preview a speaking goal">
              {(Object.keys(demos) as DemoKey[]).map((key) => (
                  <button type="button" key={key} role="tab" aria-selected={active === key} className={active === key ? "active" : ""} onClick={() => setActive(key)}>{demos[key].tab}</button>
              ))}
            </div>
            <div className="demo-topic" aria-live="polite">
              <p>{demo.eyebrow}</p>
              <h2>{demo.title}</h2>
                <div className="prompt-card"><small>SPEAK FROM MEANING</small><span>{demo.prompt}</span></div>
                <div className="phrase-card"><small>PHRASE TO RETRIEVE</small><q>{demo.phrase}</q></div>
            </div>
            <div className="record-bar"><span className="record-button" aria-hidden="true"><span>●</span></span><div><b>Start speaking</b><small>Audio only · {demo.duration} target</small></div><span className="record-wave">⌁⌁⌁</span></div>
          </div>
        </div>
      </div>

      <div className="world-card world-card-right" aria-hidden="true">
        <small>ONE REPAIR</small>
        <div className="repair-point"><b>Lead with the main point.</b><p>Your reason arrived three sentences late.</p></div>
        <div className="repair-retry"><span>TRY AGAIN</span><q>What I&apos;m trying to do is…</q></div>
      </div>
    </div>
  );
}
