import Link from "next/link";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import "./landing.css";

const situations = [
  {
    number: "01",
    title: "When someone asks what you do",
    copy: "Turn a half-formed answer into an introduction that sounds like you.",
    example: "My work, in 30 seconds",
  },
  {
    number: "02",
    title: "When the room is listening",
    copy: "Shape a project update or pitch around the people who need to understand it.",
    example: "My startup, for a first meeting",
  },
  {
    number: "03",
    title: "When you want to connect",
    copy: "Prepare the stories you want to tell before the meetup, interview, or dinner.",
    example: "Why I moved abroad",
  },
];

const trustItems = [
  ["No video recording", "Mirror mode uses your screen as a mirror. It saves audio, not video."],
  ["Private by default", "Your drafts, recordings, and Speaking World belong to your account."],
  ["Sharing takes consent", "Community feedback will never publish a practice session automatically."],
  ["Delete when you want", "Remove individual recordings or request full account deletion."],
];

export default function LandingPage() {
  return (
    <main className="landing" id="top">
      <nav className="landing-nav" aria-label="Main navigation">
        <div className="nav-shell">
          <a className="wordmark" href="#top" aria-label="Saylo home">
            <span className="wordmark-loop" aria-hidden="true">s</span>
            <span>Saylo<span className="wordmark-plus">.</span></span>
          </a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#mirror">Mirror mode</a>
            <a href="#community">Community</a>
          </div>
          <a className="button button-small" href="#waitlist">Join the waitlist</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-shell">
          <div className="hero-copy">
            <p className="eyebrow"><span />Private beta opening soon</p>
            <h1>Have the words ready when the moment comes.</h1>
            <p className="hero-lede">
              Build the English you actually need for your life. Shape a clearer
              introduction, a persuasive pitch, or a story worth sharing, then
              practise it until it feels like yours.
            </p>
            <div className="hero-actions">
              <a className="button button-large" href="#waitlist">Join the waitlist</a>
              <a className="text-link" href="#how">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <p className="hero-fine">Built for international professionals, founders, and people making a life in a new language.</p>
          </div>
          <ProductDemo />
        </div>
        <div className="moment-row" aria-label="Common speaking moments">
          <span>First introductions</span>
          <span>Meetups</span>
          <span>Job interviews</span>
          <span>Startup pitches</span>
          <span>Everyday stories</span>
        </div>
      </header>

      <section className="problem-section">
        <div className="narrow intro-block">
          <p className="section-kicker">The real problem</p>
          <h2>You may know the English. You still need to find <em>your</em> words.</h2>
          <p>
            Generic lessons cannot prepare the story only you can tell. Saylo
            starts with the moments already waiting in your calendar and your life.
          </p>
        </div>
        <div className="wide situation-grid">
          {situations.map((item) => (
            <article className="situation-card" key={item.number}>
              <p className="card-number">{item.number}</p>
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
              <p className="section-kicker">Your Speaking World</p>
              <h2>Start with your life, not a curriculum.</h2>
            </div>
            <p>
              Each topic becomes a living piece of your voice. Make a version for
              the audience, purpose, and time you have, then improve it through real practice.
            </p>
          </div>

          <div className="world-flow" aria-label="How Saylo works">
            <article className="flow-card flow-card-world">
              <div className="flow-index">01</div>
              <div className="mini-world" aria-hidden="true">
                <span className="world-center">You</span>
                <span className="world-node node-work">Work</span>
                <span className="world-node node-story">Stories</span>
                <span className="world-node node-ideas">Ideas</span>
                <span className="world-node node-life">Life</span>
              </div>
              <div className="flow-copy">
                <h3>Choose what matters now.</h3>
                <p>Add a topic such as your startup, your research, or the story of moving abroad.</p>
              </div>
            </article>

            <article className="flow-card flow-card-message">
              <div className="flow-index">02</div>
              <div className="message-builder" aria-hidden="true">
                <div className="builder-head"><span>My startup</span><b>3 messages</b></div>
                <div className="message-row active"><span>30-second intro</span><small>Meetup</small></div>
                <div className="message-row"><span>Why now?</span><small>Investor</small></div>
                <div className="message-row"><span>What I learned</span><small>Friend</small></div>
              </div>
              <div className="flow-copy">
                <h3>Shape it for the room.</h3>
                <p>Make a short intro, a persuasive pitch, or a relaxed version for a new friend.</p>
              </div>
            </article>

            <article className="flow-card flow-card-practice">
              <div className="flow-index">03</div>
              <div className="practice-strip" aria-hidden="true">
                <div className="wave-bars">
                  {[14, 23, 34, 18, 40, 50, 29, 56, 42, 64, 32, 47, 25, 37, 19, 28].map((height, index) => (
                    <i key={index} style={{ height }} />
                  ))}
                </div>
                <div className="practice-meta"><span>02:14</span><b>Saved to My startup</b></div>
              </div>
              <div className="flow-copy">
                <h3>Say it, listen, return.</h3>
                <p>Your sessions become a private voice archive, so progress sounds real instead of looking like a score.</p>
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
            <p className="section-kicker">Mirror mode</p>
            <h2>Watch yourself speak. Keep only the voice.</h2>
            <p className="mirror-lede">
              A mirror is still one of the best ways to practise presence. See your
              expression and posture in real time without turning the session into a video performance.
            </p>
            <ul className="plain-list">
              <li><span>01</span><div><b>Nothing to perform for</b><p>The live camera view is not recorded or saved as video.</p></div></li>
              <li><span>02</span><div><b>A useful record remains</b><p>Your audio joins the topic it belongs to.</p></div></li>
              <li><span>03</span><div><b>Progress you can hear</b><p>Return to older versions and notice what became clearer.</p></div></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="archive-section">
        <div className="wide archive-grid">
          <div className="archive-copy">
            <p className="section-kicker">A private voice archive</p>
            <h2>Your stories get better because they stay connected.</h2>
            <p>
              Useful phrases are captured inside the story where you needed them.
              The next time you practise, the right language is already waiting.
            </p>
            <div className="phrase-note">
              <span>Useful language</span>
              <q>What I&apos;m trying to do is make the first step feel obvious.</q>
              <small>Captured from “My startup” · Aug 12</small>
            </div>
          </div>
          <div className="archive-card">
            <div className="archive-head"><div><small>TOPIC</small><h3>My startup</h3></div><span>5 sessions</span></div>
            <div className="timeline">
              <div className="timeline-row"><time>Today</time><div><b>Meetup intro</b><p>Clearer opening, 00:42</p></div><span className="play-dot">▶</span></div>
              <div className="timeline-row"><time>Aug 12</time><div><b>30-second version</b><p>New phrase captured, 00:51</p></div><span className="play-dot">▶</span></div>
              <div className="timeline-row muted"><time>Aug 07</time><div><b>First draft</b><p>Private archive, 01:34</p></div><span className="play-dot">▶</span></div>
            </div>
            <div className="growth-line"><span /><p><b>Your message is 24 seconds shorter.</b><br />The main idea now arrives in the first sentence.</p></div>
          </div>
        </div>
      </section>

      <section className="community-section" id="community">
        <div className="wide community-card">
          <div className="community-copy">
            <p className="section-kicker light">Exploring after private beta</p>
            <h2>Practice can become a generous exchange.</h2>
            <p>
              We are exploring an opt-in community where members can share an
              anonymised voice or script, learn whether it felt persuasive, and
              earn AI practice credits by giving thoughtful feedback in return.
            </p>
            <div className="community-principles">
              <span>Opt in every time</span><span>Remove personal details</span><span>People judge the message, not the accent</span>
            </div>
          </div>
          <div className="feedback-mock" aria-label="Community feedback concept preview">
            <div className="feedback-top"><div><small>COMMUNITY PRACTICE</small><b>A 45-second project pitch</b></div><span>Anonymous</span></div>
            <div className="feedback-wave">
              {[18, 28, 12, 35, 45, 24, 54, 38, 61, 31, 49, 22, 42, 28, 16, 32, 20, 14].map((height, index) => <i key={index} style={{ height }} />)}
            </div>
            <p className="feedback-question">Did the main idea feel convincing?</p>
            <div className="feedback-scale" aria-hidden="true"><span>Not yet</span><i className="score">1</i><i className="score">2</i><i className="score">3</i><i className="score selected">4</i><i className="score">5</i><span>Very</span></div>
            <div className="credit-row"><span>Thoughtful feedback</span><b>+1 AI credit</b></div>
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="wide">
          <div className="section-heading split-heading">
            <div><p className="section-kicker">Built with boundaries</p><h2>Your voice is personal. The product should act like it.</h2></div>
            <p>Clear defaults now, explicit choices if social features arrive later.</p>
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
            <p className="section-kicker">Join early</p>
            <h2>Bring the next conversation you care about.</h2>
            <p>
              Join the launch list, or volunteer for the private beta if you want
              to test the app before it reaches the App Store.
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
            <a className="wordmark" href="#top"><span className="wordmark-loop" aria-hidden="true">s</span><span>Saylo<span className="wordmark-plus">.</span></span></a>
            <p>Build the words for the life you are already living.</p>
          </div>
          <div className="footer-links"><a href="#how">How it works</a><a href="#mirror">Mirror mode</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:sumin002@gmail.com">Contact</a></div>
          <p className="copyright">© 2026 Saylo. Independent private beta.</p>
        </div>
      </footer>
    </main>
  );
}
