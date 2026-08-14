"use client";

import { useState } from "react";

const demos = {
  pitch: {
    tab: "Pitch",
    eyebrow: "MY STARTUP",
    title: "A 30-second introduction",
    prompt: "What are you building, and why does it need to exist now?",
    phrase: "What we are trying to change is…",
    duration: "00:38",
  },
  meetup: {
    tab: "Meetup",
    eyebrow: "ABOUT ME",
    title: "What brought me here",
    prompt: "Tell the story without turning it into a résumé.",
    phrase: "The short version is that I wanted to…",
    duration: "00:52",
  },
  interview: {
    tab: "Interview",
    eyebrow: "WORK / STUDY",
    title: "A project I am proud of",
    prompt: "Make the outcome clear, then explain your part in it.",
    phrase: "The part I took ownership of was…",
    duration: "01:06",
  },
} as const;

type DemoKey = keyof typeof demos;

export function ProductDemo() {
  const [active, setActive] = useState<DemoKey>("pitch");
  const demo = demos[active];

  return (
    <div className="product-stage">
      <div className="world-card world-card-left" aria-hidden="true">
        <small>SPEAKING WORLD</small>
        <b>What do you want to be ready to say?</b>
        <div className="topic-list"><span>About me</span><span className="active">My startup</span><span>Moving abroad</span></div>
      </div>

      <div className="phone-wrap">
        <div className="phone-shell">
          <div className="phone-island" />
          <div className="phone-content">
            <div className="app-top"><span className="app-mark">saylo.</span><span>Today</span><span className="app-menu" aria-hidden="true">•••</span></div>
            <div className="demo-tabs" role="tablist" aria-label="Preview a speaking goal">
              {(Object.keys(demos) as DemoKey[]).map((key) => (
                <button key={key} role="tab" aria-selected={active === key} className={active === key ? "active" : ""} onClick={() => setActive(key)}>{demos[key].tab}</button>
              ))}
            </div>
            <div className="demo-topic" aria-live="polite">
              <p>{demo.eyebrow}</p>
              <h2>{demo.title}</h2>
              <div className="prompt-card"><small>YOUR PROMPT</small><span>{demo.prompt}</span></div>
              <div className="phrase-card"><small>USEFUL LANGUAGE</small><q>{demo.phrase}</q></div>
            </div>
            <div className="record-bar"><span className="record-button" aria-hidden="true"><span>●</span></span><div><b>Start speaking</b><small>Audio only · {demo.duration} target</small></div><span className="record-wave">⌁⌁⌁</span></div>
          </div>
        </div>
      </div>

      <div className="world-card world-card-right" aria-hidden="true">
        <small>RECENT PRACTICE</small>
        <div className="recent-row"><span className="audio-play">▶</span><div><b>Meetup version</b><small>Today · 00:42</small></div></div>
        <div className="tiny-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <p><b>Much clearer.</b> Your main point arrived 18 seconds earlier.</p>
      </div>
    </div>
  );
}
