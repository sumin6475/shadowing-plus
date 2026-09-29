import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Privacy Policy",
  description: "What Myne collects, what stays on your phone, and who processes your data.",
};

const CONTACT = "sumin002@gmail.com";
const UPDATED = "28 September 2026";

export default function PrivacyPage() {
  return (
    <main className="legal">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Myne</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>

        <p>
          Myne (&ldquo;the app&rdquo;) is an independently run speaking-practice app
          for iPhone, with a companion website. This policy explains what we collect,
          why, what stays on your phone, and who processes your data. We try not to
          collect more than the product needs. We do not sell your data, show ads, or
          track you across other companies&rsquo; apps or websites.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details.</strong> Your email address and a securely hashed password, handled by our authentication provider (Supabase). We never see or store your password in plain text.</li>
          <li><strong>Profile.</strong> The name, speaking goal, and optional profile photo you add, plus app preferences such as your first language, English level, and daily goal. Your profile photo is stored with Supabase and served from a web address that is hard to guess but not password-protected, so anyone who has that exact link can view it.</li>
          <li><strong>Learning content.</strong> The phrases, speaking notes, practice transcripts, and practice history you save. These are private to your account.</li>
          <li><strong>Usage analytics.</strong> Basic product interactions and crash diagnostics (see &ldquo;Usage analytics&rdquo; below).</li>
          <li><strong>Waitlist details.</strong> If you join the waitlist on our website: your email address, the kind of speaking you want to practise, your phone platform, language, and whether you volunteered to give feedback.</li>
        </ul>

        <h2>Your voice and Mirror mode</h2>
        <ul>
          <li>Practice recordings made in the iPhone app <strong>stay on your device</strong>. They are never uploaded to us.</li>
          <li>Speech is turned into text <strong>on your device</strong> by iOS speech recognition. The resulting transcript is saved to your account so you can review it.</li>
          <li>Mirror mode shows your camera image live on your screen only. Myne does not record or save video of your mirror practice.</li>
          <li>You can delete any recording from its practice screen.</li>
        </ul>

        <h2>AI features (only with your permission)</h2>
        <p>
          Some features use OpenAI: speaking feedback, phrase suggestions, help with a
          phrase, reading text from a photo you choose, phrase search, and spoken
          pronunciation of a phrase. <strong>Nothing is sent to OpenAI unless you allow
          it</strong> on the consent screen or in Settings &rarr; Privacy, and you can turn
          it off there at any time.
        </p>
        <ul>
          <li>Only the text or photo involved in the feature you use is sent. Recordings are never sent.</li>
          <li>A photo you use to capture a phrase is processed for that capture and is not stored.</li>
          <li>OpenAI processes this content under its API data policy and does not use API data to train its models by default.</li>
        </ul>

        <h2>Usage analytics</h2>
        <p>
          We use PostHog to understand how the app is used and to find crashes, so we
          can improve it. PostHog receives app events (for example, that a screen was
          opened or a practice session finished) and crash diagnostics, linked to an
          internal account ID. We do not send your email, recordings, transcripts,
          phrase text, photos, or advertising identifiers to PostHog.
        </p>

        <h2>Service providers</h2>
        <p>These companies process data on our behalf, only to run the service:</p>
        <ul>
          <li><strong>Supabase</strong> — sign-in, database, file storage (profile photos), and server functions.</li>
          <li><strong>OpenAI</strong> — the AI features above, only with your permission.</li>
          <li><strong>PostHog</strong> — usage analytics and crash diagnostics.</li>
          <li><strong>Cloudflare R2</strong> — storage for the spoken pronunciation of your phrases (so it plays instantly next time), and for files you upload on the website.</li>
          <li><strong>Vercel</strong> — hosting for our website.</li>
          <li><strong>ElevenLabs and Groq</strong> — only if you use the website&rsquo;s clip feature: speech-to-text for audio or video files you upload there.</li>
        </ul>

        <h2>Links to other sites</h2>
        <p>
          &ldquo;Open YouGlish&rdquo; on a phrase opens youglish.com inside the app so you
          can hear the phrase in real videos. Only the phrase you tapped is sent, as
          part of the web address, and only when you tap it. That site and the videos it
          plays have their own privacy policies.
        </p>

        <h2>Keeping and deleting your data</h2>
        <ul>
          <li><strong>Delete your account in the app:</strong> Settings &rarr; Delete account. Your account, profile and photo, phrases, notes, transcripts, and saved pronunciation audio are deleted right away and cannot be recovered.</li>
          <li>You can also remove individual phrases, notes, and recordings in the app at any time.</li>
          <li><strong>Take a copy:</strong> Settings &rarr; Export my phrases.</li>
          <li>Waitlist details are kept until you ask us to remove them or they are no longer needed for launch. Email {CONTACT} to be removed.</li>
          <li>Otherwise, we keep your data for as long as your account exists.</li>
        </ul>

        <h2>Security and international processing</h2>
        <p>
          Your learning content is protected by your account and is not public. We take
          reasonable measures to protect your data, but no online service can be
          perfectly secure. Our providers may process data in countries other than your
          own under their applicable safeguards. Please do not add highly sensitive or
          confidential information.
        </p>

        <h2>Children</h2>
        <p>The app is not directed at children under 13, or under the minimum age of digital consent in their country, and they should not use it.</p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, delete,
          export, restrict, or object to processing of your personal data, and to
          withdraw consent. Most of this can be done in the app; for anything else,
          contact {CONTACT}.
        </p>

        <h2>Changes</h2>
        <p>
          We will update this policy when the app changes how it handles data, and the
          date above will show the latest version. If we introduce a feature that shares
          your content with other people, it will be optional and will ask for your
          permission first.
        </p>

        <p className="legal-note">Questions about privacy: {CONTACT}</p>
      </div>
    </main>
  );
}
