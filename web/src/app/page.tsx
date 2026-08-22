import Link from "next/link";
import Image from "next/image";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import "./landing.css";

const situations = [
  {
    number: "01",
    title: "Word retrieval fails.",
    copy: "The phrase feels familiar on screen, then disappears the moment you need to say it.",
    example: "“I know this. Why can’t I say it?”",
  },
  {
    number: "02",
    title: "The main point gets buried.",
    copy: "You add sentence after sentence because the idea has not found a clear shape yet.",
    example: "Rambling → one clear message",
  },
  {
    number: "03",
    title: "Your first language leads.",
    copy: "You build the thought elsewhere, then carry that language’s structure into English.",
    example: "Translation-shaped → natural English",
  },
  {
    number: "04",
    title: "Correction becomes exhausting.",
    copy: "A long grammar report hides the one change that would actually improve your next attempt.",
    example: "One high-value repair, then retry",
  },
];

const trustItems = [
  ["No video recording", "Mirror mode uses your screen as a mirror. It saves audio, not video."],
  ["Private by default", "Your drafts, recordings, and Speaking World belong to your account."],
  ["Nothing is public by default", "A practice session stays in your account unless you explicitly choose otherwise."],
  ["Delete when you want", "Remove individual recordings or request full account deletion."],
];

export default function LandingPage() {
  return (
    <main className="landing" id="top">
      <nav className="landing-nav" aria-label="Main navigation">
        <div className="nav-shell">
          <a className="wordmark" href="#top" aria-label="Saylo home">
            <Image className="wordmark-mark" src="/brand/saylo-mark.png" width={36} height={36} alt="" preload />
            <span>Saylo</span>
          </a>
          <div className="nav-links">
            <a href="#how">The practice loop</a>
            <a href="#mirror">Mirror mode</a>
            <a href="#privacy">Privacy</a>
          </div>
          <div className="nav-cta">
            <a className="button button-small" href="#waitlist">Join the waitlist</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-shell">
          <div className="hero-copy">
            <p className="beta-status"><span aria-hidden="true" />Personal Speaking Studio · B1–C1 English</p>
            <h1>Speak the English you save.</h1>
            <p className="hero-lede">
              Save a useful phrase, connect it to a Topic from your life, speak for
              one minute, then get one clear repair before you try again.
            </p>
            <div className="hero-actions">
              <a className="button button-large" href="#waitlist">Join the waitlist</a>
              <a className="button button-large button-ghost" href="#how">See the practice loop</a>
            </div>
            <p className="hero-fine">Not a beginner course or an AI partner — the activation layer between English you understand and English you can use.</p>
          </div>
          <ProductDemo />
        </div>
        <div className="moment-row" aria-label="The Saylo practice loop">
          <span>Save useful English</span>
          <span>Connect it to your life</span>
          <span>Speak from meaning</span>
          <span>Repair one gap</span>
          <span>Speak again</span>
        </div>
      </header>

      <section className="problem-section">
        <div className="narrow intro-block">
          <p className="world-label">Built for the intermediate plateau</p>
          <h2>You know the English. The problem is reaching it clearly under pressure.</h2>
          <p>
            More passive vocabulary does not fix the moment when you default to easy
            words, translate too literally, or lose your point halfway through.
          </p>
        </div>
        <div className="wide situation-grid">
          {situations.map((item) => (
            <article className="situation-card" key={item.number}>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <div className="example-row">
                <span className="topic-dot" aria-hidden="true" />
                <span>{item.example}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="wide">
          <div className="section-heading split-heading">
            <div>
              <p className="world-label">The save-to-speech loop</p>
              <h2>A repeatable mechanism, not another open-ended conversation.</h2>
            </div>
            <p>
              Each cycle has one job: move a phrase from familiar on the page to
              available in a Topic you genuinely want to talk about.
            </p>
          </div>

          <div className="world-flow" aria-label="How Saylo works">
            <article className="flow-card flow-card-capture">
              <div className="flow-index">01</div>
              <div className="source-snippet" aria-hidden="true">
                <div><span>BBC interview</span><small>02:14</small></div>
                <q>What I&apos;m trying to do is make the first step feel obvious.</q>
                <b>Saved with context</b>
              </div>
              <div className="flow-copy">
                <h3>Save useful English in context.</h3>
                <p>Keep the source and meaning, not an isolated vocabulary card.</p>
              </div>
            </article>

            <article className="flow-card flow-card-topic">
              <div className="flow-index">02</div>
              <div className="topic-link-visual" aria-hidden="true">
                <span className="topic-link-phrase">Useful phrase</span>
                <i />
                <span className="topic-link-topic"><small>MY TOPIC</small>My current project</span>
              </div>
              <div className="flow-copy">
                <h3>Attach it to your own Topic.</h3>
                <p>Practice the phrase where you may actually need it: work, stories, ideas, or daily life.</p>
              </div>
            </article>

            <article className="flow-card flow-card-self-talk">
              <div className="flow-index">03</div>
              <div className="self-talk-visual" aria-hidden="true">
                <div className="self-talk-meta"><span>Mirror mode</span><b>01:00</b></div>
                <div className="wave-bars">
                  {[14, 23, 34, 18, 40, 50, 29, 56, 42, 64, 32, 47].map((height, index) => (
                    <i key={index} style={{ height }} />
                  ))}
                </div>
                <p>Speak from meaning. No script.</p>
              </div>
              <div className="flow-copy">
                <h3>Do one minute of self-talk.</h3>
                <p>Retrieve the idea in your own words without a bot filling the silence.</p>
              </div>
            </article>

            <article className="flow-card flow-card-repair">
              <div className="flow-index">04</div>
              <div className="repair-visual" aria-hidden="true">
                <small>ONE REPAIR</small>
                <strong>Lead with the main point.</strong>
                <p>You reached for the phrase, but the reason arrived three sentences later.</p>
                <span>Try again <b>→</b></span>
              </div>
              <div className="flow-copy">
                <h3>Fix one thing, then retry.</h3>
                <p>No correction dump. Apply the highest-value change while the attempt is still fresh.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="mirror-section" id="mirror">
        <div className="wide mirror-grid">
          <div className="mirror-visual">
            <div className="mirror-glow" />
            <div className="mirror-phone" aria-label="Mirror mode product preview">
              <div className="phone-sensor" />
              <div className="mirror-screen">
                <div className="mirror-top"><span>9:41</span><span>Mirror mode</span><span>•••</span></div>
                <div className="reflection-outline" aria-hidden="true">
                  <span className="head" /><span className="body" />
                </div>
                <div className="mirror-prompt">
                  <p>My startup · 30-second intro</p>
                  <strong>“What we are building is a calmer way to…”</strong>
                </div>
                <div className="record-control"><span /><b>01:18</b><small>Recording audio</small></div>
              </div>
            </div>
            <div className="privacy-pill pill-left"><span>●</span> Video is not recorded</div>
            <div className="privacy-pill pill-right"><span>⌁</span> Audio saved privately</div>
          </div>
          <div className="mirror-copy">
            <p className="world-label">Mirror mode</p>
            <h2>One minute of self-talk. One repair. Then say it again.</h2>
            <p className="mirror-lede">
              Speak from your intention without being interrupted. After you finish,
              AI identifies the single retrieval, structure, or phrasing gap worth fixing first.
            </p>
            <ul className="plain-list">
              <li><span>01</span><div><b>Speak from meaning, not a script</b><p>Build the message yourself instead of repeating a model answer.</p></div></li>
              <li><span>02</span><div><b>Get one high-value repair</b><p>Fix the main retrieval, rambling, or natural phrasing problem first.</p></div></li>
              <li><span>03</span><div><b>Retry while it is still fresh</b><p>Use the repair immediately so feedback becomes spoken evidence.</p></div></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mid-cta">
        <div className="wide mid-cta-card">
          <div>
            <p className="world-label">Private beta</p>
            <h2>Bring one phrase you want to use in your next conversation.</h2>
            <p>Test whether it comes back when you speak, not just when you review it.</p>
          </div>
          <a className="button button-large" href="#waitlist">Join the waitlist</a>
        </div>
      </section>

      <section className="archive-section">
        <div className="wide archive-grid">
          <div className="archive-copy">
            <p className="world-label">Retrieval evidence</p>
            <h2>See what became available, not just what you saved.</h2>
            <p>
              A flashcard review proves recognition. Saylo tracks the harder change:
              whether the phrase returned without being shown and worked inside your own message.
            </p>
            <div className="phrase-note">
              <span>Useful language · retrieved</span>
              <q>What I&apos;m trying to do is make the first step feel obvious.</q>
              <small>Used in “My startup” · Today</small>
            </div>
          </div>
          <div className="archive-card">
            <div className="archive-head"><div><small>TOPIC</small><h3>My startup</h3></div><span>5 sessions</span></div>
            <div className="timeline">
              <div className="timeline-row"><time>Today</time><div><b>Meetup intro</b><p>Clearer opening, 00:42</p></div><span className="play-dot">▶</span></div>
              <div className="timeline-row"><time>Aug 12</time><div><b>30-second version</b><p>New phrase captured, 00:51</p></div><span className="play-dot">▶</span></div>
              <div className="timeline-row muted"><time>Aug 07</time><div><b>First draft</b><p>Private archive, 01:34</p></div><span className="play-dot">▶</span></div>
            </div>
            <div className="evidence-track" aria-label="Phrase evidence">
              <span className="complete">Saved</span><i /><span className="complete">Recognised</span><i /><span className="complete">Retrieved</span><i /><span>Used</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-section" id="privacy">
        <div className="wide">
          <div className="section-heading split-heading">
            <div><h2>Your practice stays personal by default.</h2></div>
            <p>A quiet speaking studio needs clear boundaries, not vague promises.</p>
          </div>
          <div className="trust-grid">
            {trustItems.map(([title, copy]) => <article key={title}><span className="trust-check">✓</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
          <p className="legal-bridge">Read the current <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>. Policies will be reviewed again before public App Store release.</p>
        </div>
      </section>

      <section className="waitlist-section" id="waitlist">
        <div className="wide waitlist-grid">
          <div className="waitlist-copy">
            <p className="world-label">Mobile app waitlist</p>
            <h2>Test one phrase you want to use in your next meeting, story, or presentation.</h2>
            <p>
              Join the launch list and tell us where your English gets stuck.
              Private beta testers will try the full save-to-speech loop before release.
            </p>
            <div className="beta-details">
              <span><b>Waitlist</b><small>Launch news and App Store link</small></span>
              <span><b>Private beta</b><small>Early access and occasional feedback requests</small></span>
            </div>
          </div>
          <WaitlistForm />
        </div>
      </section>

      <footer className="landing-footer">
        <div className="wide footer-row">
          <div>
            <a className="wordmark" href="#top"><Image className="wordmark-mark" src="/brand/saylo-mark.png" width={36} height={36} alt="" /><span>Saylo</span></a>
            <p>Turn the English you collect into English you can use.</p>
          </div>
          <div className="footer-links"><a href="#how">The practice loop</a><a href="#mirror">Mirror mode</a><Link href="/app">Existing web app</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:sumin002@gmail.com">Contact</a></div>
          <p className="copyright">© 2026 Saylo. Independent private beta.</p>
        </div>
      </footer>
    </main>
  );
}
