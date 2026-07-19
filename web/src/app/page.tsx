"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./landing.css";

// Public marketing landing (route: /). Ported from the Claude Design
// landing.html. The authenticated app lives at /app (see app/app/page.tsx);
// the proxy gates /app, so logged-out users who click through land on /login.
// CTAs adapt: signed-in visitors get "Open app", everyone else "Sign in".

const APP = "/app";
const LOGIN = "/login";

// Deterministic waveform bars for the practice mock (peak near the middle).
const WAVE = Array.from({ length: 44 }, (_, i) => {
  const dist = Math.abs(i - 16);
  const env = Math.max(0.35, 1 - dist / 18);
  const h = Math.round((5 + ((i * 37) % 17)) * env);
  return { h, on: i <= 16 };
});

function ThemeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="10" cy="10" r="4" />
      <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4M15.8 15.8l-1.4-1.4M5.6 5.6L4.2 4.2" />
    </svg>
  );
}
function PlaySquare() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <path d="M6.5 6l3 2-3 2z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8.5l3 3 7-8" />
    </svg>
  );
}

export default function LandingPage() {
  const [authed, setAuthed] = useState(false);

  // Apply the saved landing theme on mount (separate from the app's theme).
  // Managed via the DOM directly, not React state, so no re-render is needed.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sp-landing-theme");
      if (saved === "dark" || saved === "light") {
        document.documentElement.dataset.theme = saved;
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  // Scroll-reveal.
  useEffect(() => {
    const els = document.querySelectorAll(".landing .rv");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sp-landing-theme", next);
    } catch {
      /* ignore */
    }
  }

  const primaryHref = authed ? APP : LOGIN;
  const primaryLabel = authed ? "Open app" : "Start free";

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="#top" className="brand">
            Shadowing<span className="plus">+</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <Link href={APP}>Library</Link>
          </div>
          <div className="nav-right">
            <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              <ThemeIcon />
            </button>
            {authed ? (
              <Link href={APP} className="btn primary sm">Open app</Link>
            ) : (
              <>
                <Link href={LOGIN} className="btn sm">Sign in</Link>
                <Link href={LOGIN} className="btn primary sm">Start free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" id="top">
        <div className="wrap">
          <span className="kicker"><span className="bar" />Shadowing, anytime</span>
          <h1 className="serif">
            Shadow it.<br />
            <span className="em">Until you own it.</span>
            <span className="pm">+</span>
          </h1>
          <p className="lede">
            Turn any video into a sentence-by-sentence shadowing drill. Loop a line,
            hide the subtitle, and bring back only the ones that didn&rsquo;t quite
            click — <em>every day.</em>
          </p>
          <div className="hero-cta">
            <Link href={primaryHref} className="btn primary lg">{primaryLabel}</Link>
            <a href="#how" className="btn lg">See how it works</a>
          </div>
          <p className="hero-note">Free forever for solo practice · No card required</p>

          {/* product shot: library */}
          <div className="frame hero-frame rv">
            <div className="frame-chrome">
              <div className="frame-dots"><span /><span /><span /></div>
              <div className="frame-crumb"><b>Library</b><span className="sep">›</span><span className="cur">All clips</span></div>
            </div>
            <div className="appmock">
              <aside className="am-side">
                <div className="am-search">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" /></svg>
                  Search clips
                </div>
                <div className="am-navsec">
                  <div className="am-navhead">Library</div>
                  <div className="am-nav active"><PlaySquare />All clips<span className="ct">8</span></div>
                  <div className="am-nav">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2l1.8 3.7 4.1.6-3 2.9.7 4.1L8 11.9 4.4 13.3l.7-4.1-3-2.9 4.1-.6z" /></svg>
                    Bookmarks<span className="ct">24</span>
                  </div>
                </div>
                <div className="am-navsec">
                  <div className="am-navhead">Folders</div>
                  <div className="am-nav" style={{ color: "var(--accent)" }}><span className="d" />Favorites<span className="ct">4</span></div>
                  <div className="am-nav" style={{ color: "oklch(0.58 0.16 258)" }}><span className="d" />The Newsroom<span className="ct">7</span></div>
                  <div className="am-nav" style={{ color: "oklch(0.65 0.13 75)" }}><span className="d" />Friends · S1–S3<span className="ct">12</span></div>
                  <div className="am-nav" style={{ color: "var(--moss)" }}><span className="d" />TED Talks<span className="ct">5</span></div>
                </div>
              </aside>
              <div className="am-main">
                <div className="am-h">All clips</div>
                <div className="am-hsub">Everything in your library, newest first.</div>
                <div className="am-list">
                  <div className="am-item">
                    <span className="am-thumb"><PlaySquare /></span>
                    <div className="am-tbody"><div className="am-ttl">The Newsroom — America is not the greatest country…</div><div className="am-tmeta"><span className="d" style={{ background: "oklch(0.58 0.16 258)" }} />The Newsroom</div></div>
                    <span className="pill focus"><span className="dot" />Focusing</span>
                    <span className="am-dur">4:48</span>
                  </div>
                  <div className="am-item">
                    <span className="am-thumb"><PlaySquare /></span>
                    <div className="am-tbody"><div className="am-ttl">Phoebe Becomes Chandler&rsquo;s Secretary | Friends</div><div className="am-tmeta"><span className="d" style={{ background: "oklch(0.65 0.13 75)" }} />Friends · S1–S3</div></div>
                    <span className="pill done"><Check />Done</span>
                    <span className="am-dur">5:08</span>
                  </div>
                  <div className="am-item">
                    <span className="am-thumb"><PlaySquare /></span>
                    <div className="am-tbody"><div className="am-ttl">Steve Jobs — Stanford Commencement Address</div><div className="am-tmeta"><span className="d" style={{ background: "var(--moss)" }} />TED Talks</div></div>
                    <span className="pill focus"><span className="dot" />Focusing</span>
                    <span className="am-dur">15:04</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SOCIAL PROOF */}
      <div className="proof">
        <div className="wrap">
          <p className="proof-label">Practice from the shows, talks and clips you already love</p>
          <div className="proof-row">
            <span className="src-chip"><span className="g" style={{ background: "oklch(0.58 0.16 258)" }} />The Newsroom</span>
            <span className="src-chip"><span className="g" style={{ background: "oklch(0.65 0.13 75)" }} />Friends</span>
            <span className="src-chip"><span className="g" style={{ background: "var(--moss)" }} />TED Talks</span>
            <span className="src-chip"><span className="g" style={{ background: "var(--accent)" }} />YouTube</span>
            <span className="src-chip"><span className="g" style={{ background: "oklch(0.58 0.18 290)" }} />Podcasts</span>
            <span className="src-chip"><span className="g" style={{ background: "oklch(0.55 0.14 20)" }} />Films</span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="sec" id="how">
        <div className="wrap">
          <div className="sec-head center rv">
            <span className="kicker" style={{ justifyContent: "center" }}><span className="bar" />How it works</span>
            <h2 className="serif">From a link to fluent, one line at a time</h2>
            <p>No editing, no timelines. Drop a source and Shadowing+ breaks it into loopable sentences you can drill until they&rsquo;re yours.</p>
          </div>

          <div className="feat-row rv">
            <div className="feat-copy">
              <span className="kicker"><span className="bar" />Step 01 — Capture</span>
              <h3>Any video, one drop</h3>
              <p>Paste a YouTube link or drag in a file. Shadowing+ auto-aligns the captions and adds a translation, so a raw clip becomes a structured drill in seconds.</p>
              <div className="feat-tags">
                <span className="feat-tag">YouTube &amp; local files</span>
                <span className="feat-tag">Auto-aligned captions</span>
                <span className="feat-tag">Instant translation</span>
              </div>
            </div>
            <div className="feat-visual">
              <div className="frame">
                <div className="frame-chrome">
                  <div className="frame-dots"><span /><span /><span /></div>
                  <div className="frame-crumb"><span className="cur">New clip</span></div>
                </div>
                <div style={{ padding: "34px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ border: "1.25px dashed var(--hairline)", borderRadius: "var(--radius-lg)", background: "var(--bg-elev)", padding: "34px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
                    <span style={{ width: 52, height: 52, borderRadius: 15, background: "var(--accent-soft)", color: "var(--accent-text)", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid oklch(from var(--accent) 0.9 0.04 h)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4" /><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                    </span>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Drop a video, or paste a link</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>MP4 · MOV · YouTube URL</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", border: "1px solid var(--hairline)", borderRadius: "var(--radius)", background: "var(--surface)" }}>
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent-text)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.5v11l9-5.5z" /></svg>
                    </span>
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>youtube.com/watch?v=…nigel</span>
                    <span className="pill focus"><span className="dot" />Aligning</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feat-row flip rv">
            <div className="feat-copy">
              <span className="kicker"><span className="bar" />Step 02 — Drill</span>
              <h3>Sentence-level A–B loop</h3>
              <p>Slow any line to 0.5×–1.5× and loop it until the rhythm sticks. Hide the translation and peek only when you actually need it — just ears and mouth.</p>
              <div className="feat-tags">
                <span className="feat-tag">0.5×–1.5× speed</span>
                <span className="feat-tag">A–B loop</span>
                <span className="feat-tag">Hide subtitle</span>
                <span className="feat-tag">Shadow line</span>
              </div>
            </div>
            <div className="feat-visual">
              <div className="frame">
                <div className="frame-chrome">
                  <div className="frame-dots"><span /><span /><span /></div>
                  <div className="frame-crumb"><b>The Devil Wears Prada</b><span className="sep">›</span><span className="cur">Practice</span></div>
                </div>
                <div className="pmock">
                  <span className="pm-src"><span className="t"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5L8 5L2 8.5z" /></svg></span><b>Nigel&rsquo;s pep talk</b><span className="tm">1:18</span></span>
                  <p className="pm-en">You are not <span className="hl">trying</span>. You are whining.</p>
                  <p className="pm-ko">넌 노력하는 게 아니야. 그냥 징징대는 거지.</p>
                  <span className="pm-note"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 1v2M7 11v2M1 7h2M11 7h2" /><circle cx="7" cy="7" r="2.5" /></svg>Watch the cadence on &ldquo;whining&rdquo;</span>
                  <div className="pm-player">
                    <button className="pm-play" aria-label="Pause"><svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor"><rect x="3" y="2.5" width="2" height="7" rx=".5" /><rect x="7" y="2.5" width="2" height="7" rx=".5" /></svg></button>
                    <span className="pm-time">0:47</span>
                    <div className="pm-wave">
                      {WAVE.map((w, i) => (
                        <span key={i} className={w.on ? "on" : undefined} style={{ height: w.h }} />
                      ))}
                    </div>
                    <span className="pm-time" style={{ textAlign: "right" }}>0:55</span>
                    <span className="pm-speed">0.85×</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feat-row rv">
            <div className="feat-copy">
              <span className="kicker"><span className="bar" />Step 03 — Retain</span>
              <h3>Bookmarks become flashcards</h3>
              <p>The awkward lines come back tomorrow. Rate each one <em>Again · Good · Easy</em> and Shadowing+ schedules the next review — spaced repetition, built right into practice.</p>
              <div className="feat-tags">
                <span className="feat-tag">Spaced repetition</span>
                <span className="feat-tag">Daily review queue</span>
                <span className="feat-tag">Progress tracking</span>
              </div>
            </div>
            <div className="feat-visual">
              <div className="frame">
                <div className="frame-chrome">
                  <div className="frame-dots"><span /><span /><span /></div>
                  <div className="frame-crumb"><b>Bookmarks</b><span className="sep">›</span><span className="cur">Practice all · 3/24</span></div>
                </div>
                <div className="pmock">
                  <span className="pm-src"><span className="t"><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5L8 5L2 8.5z" /></svg></span><b>TED · Brené Brown</b><span className="tm">6:02</span></span>
                  <p className="pm-en">Vulnerability is the <span className="hl">birthplace</span> of innovation.</p>
                  <p className="pm-ko">취약성은 혁신이 태어나는 곳입니다.</p>
                  <div className="pm-srs">
                    <div className="pm-btn again"><span className="l">Again</span><span className="s">&lt; 1 min</span></div>
                    <div className="pm-btn good"><span className="l">Good</span><span className="s">2 days</span></div>
                    <div className="pm-btn easy"><span className="l">Easy</span><span className="s">1 week</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="sec" id="features" style={{ background: "var(--bg-elev)", borderBlock: "1px solid var(--hairline-soft)" }}>
        <div className="wrap">
          <div className="sec-head center rv">
            <span className="kicker" style={{ justifyContent: "center" }}><span className="bar" />Built for practice</span>
            <h2 className="serif">Everything a serious shadower needs</h2>
            <p>Small, sharp tools that stay out of your way — so you can spend your time speaking, not fiddling.</p>
          </div>
          <div className="grid">
            <div className="card rv">
              <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h13a4 4 0 010 8H8" /><path d="M8 5L4 8l4 3" /></svg></span>
              <h4>Precise A–B loop</h4>
              <p>Set in and out points to the exact word and repeat a phrase as many times as it takes.</p>
            </div>
            <div className="card rv">
              <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
              <h4>Speed without pitch shift</h4>
              <p>Slow a fast talker to 0.5× and the voice still sounds natural — no chipmunk artifacts.</p>
            </div>
            <div className="card rv">
              <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12c2.5-5 6-7.5 9-7.5S18.5 7 21 12c-2.5 5-6 7.5-9 7.5S5.5 17 3 12z" /><circle cx="12" cy="12" r="2.5" /></svg></span>
              <h4>Shadow line</h4>
              <p>Strip everything but the current sentence. No timeline, no folders — just the line in front of you.</p>
            </div>
            <div className="card rv">
              <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.5 5.5 6 .5-4.5 4 1.4 6L12 15.8 6.6 19l1.4-6-4.5-4 6-.5z" /></svg></span>
              <h4>One-tap bookmarks</h4>
              <p>Star a line mid-play and it lands in your daily review queue automatically.</p>
            </div>
            <div className="card rv">
              <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z" /></svg></span>
              <h4>Folders &amp; status</h4>
              <p>Group clips by show or theme and mark each as <em>Focusing</em> or <em>Done</em> at a glance.</p>
            </div>
            <div className="card rv">
              <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 000 18 5 5 0 010-10 4 4 0 004-4c0-2.2-1.8-4-4-4z" /></svg></span>
              <h4>Light &amp; dark, your fonts</h4>
              <p>Warm light or focused dark, with type and density tuned to how you like to read.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="quote">
        <div className="wrap rv">
          <blockquote>&ldquo;I stopped just <span className="em">watching</span> English and started <span className="em">saying</span> it. Three lines a day, and after a month my accent finally moved.&rdquo;</blockquote>
          <div className="quote-by">
            <span className="quote-av">M</span>
            <div style={{ textAlign: "left" }}>
              <div className="n">Mia Alvarez</div>
              <div className="r">Product designer · 4-month streak</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec" id="pricing" style={{ background: "var(--bg-elev)", borderBlock: "1px solid var(--hairline-soft)" }}>
        <div className="wrap">
          <div className="sec-head center rv">
            <span className="kicker" style={{ justifyContent: "center" }}><span className="bar" />Pricing</span>
            <h2 className="serif">Simple plans for serious practice</h2>
            <p>Start free and stay free for solo practice. Upgrade only when you want more clips and review power.</p>
          </div>
          <div className="price-grid">
            <div className="plan rv">
              <div className="plan-name">Solo</div>
              <div className="plan-desc">For daily personal shadowing.</div>
              <div className="plan-price">Free</div>
              <Link href={primaryHref} className="btn">{primaryLabel}</Link>
              <ul className="plan-feats">
                <li><Check />Up to 20 clips</li>
                <li><Check />Sentence A–B loop &amp; speed</li>
                <li><Check />Bookmarks &amp; daily review</li>
                <li><Check />Light &amp; dark themes</li>
              </ul>
            </div>
            <div className="plan feat-plan rv">
              <span className="plan-badge">Most popular</span>
              <div className="plan-name">Plus</div>
              <div className="plan-desc">For committed learners going deep.</div>
              <div className="plan-price">$8<span className="per">/mo</span></div>
              <Link href={primaryHref} className="btn primary">Get Plus</Link>
              <ul className="plan-feats">
                <li><Check />Unlimited clips &amp; folders</li>
                <li><Check />Advanced spaced repetition</li>
                <li><Check />Progress &amp; streak stats</li>
                <li><Check />Offline practice</li>
              </ul>
            </div>
            <div className="plan rv">
              <div className="plan-name">Teams</div>
              <div className="plan-desc">For tutors &amp; study groups.</div>
              <div className="plan-price">$20<span className="per">/mo</span></div>
              <Link href={LOGIN} className="btn">Contact us</Link>
              <ul className="plan-feats">
                <li><Check />Everything in Plus</li>
                <li><Check />Shared clip libraries</li>
                <li><Check />Assign drills to learners</li>
                <li><Check />Learner progress dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="wrap">
          <div className="cta-card rv">
            <div className="in">
              <h2 className="serif">Say it out loud.<br /><span className="em">Starting today.+</span></h2>
              <p>Drop your first clip and shadow three lines before your coffee&rsquo;s cold. Free forever for solo practice.</p>
              <div className="hero-cta">
                <Link href={primaryHref} className="btn primary lg">{primaryLabel}</Link>
                <a href="#how" className="btn lg">See how it works</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <span className="brand">Shadowing<span className="plus">+</span></span>
              <p>Shadow any video until you own it. A calmer way to practice the language you&rsquo;re actually watching.</p>
            </div>
            <div className="foot-col">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <Link href={APP}>Library</Link>
            </div>
            <div className="foot-col">
              <h5>Resources</h5>
              <a href="#">Shadowing guide</a>
              <a href="#">Blog</a>
              <a href="#">Changelog</a>
              <a href="#">Help center</a>
            </div>
            <div className="foot-col">
              <h5>Company</h5>
              <a href="#">About</a>
              <a href="#">Contact</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>© 2026 Shadowing+ · A personal project</span>
            <span className="mono">Built with care, one sentence at a time</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
