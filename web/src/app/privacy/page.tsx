import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Privacy Policy · Shadowing+",
  description: "How Shadowing+ handles your account and the media you upload.",
};

// Public route (/privacy) — not gated by proxy.ts. Plain-language policy for the
// beta.
const CONTACT = "sumin002@gmail.com";
const UPDATED = "20 July 2026";

export default function PrivacyPage() {
  return (
    <main className="legal">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Shadowing+</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>

        <p>
          Shadowing+ (&ldquo;the app&rdquo;) is a small, independently-run
          language-practice tool, currently in open beta. This policy explains
          what we collect, why, and who processes it. We keep it deliberately
          short and try not to collect more than the app needs to work.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details.</strong> Your email address and a securely
            hashed password, handled by our authentication provider (Supabase).
            We never see or store your password in plain text.
          </li>
          <li>
            <strong>Content you add.</strong> The audio and video files you
            upload, the transcripts and translations generated from them, and
            the bookmarks, folders, and practice progress you create.
          </li>
          <li>
            <strong>Basic usage records.</strong> Minimal processing/cost events
            (e.g. how much audio was transcribed) used to run and budget the
            service. We do not sell your data or use third-party ad trackers.
          </li>
        </ul>

        <h2>How your content is processed</h2>
        <p>
          To turn a clip into a shadowing drill, the audio is sent to
          speech-to-text and translation services, which process it on our
          behalf and return the transcript. We use these processors:
        </p>
        <ul>
          <li><strong>Supabase</strong> — authentication and database.</li>
          <li><strong>Cloudflare R2</strong> — storage of your uploaded files and generated transcripts.</li>
          <li><strong>ElevenLabs, Groq, and OpenAI</strong> — speech-to-text transcription and translation of your audio.</li>
          <li><strong>Vercel</strong> — application hosting.</li>
        </ul>
        <p>
          Your uploads are private to your account by default and are used only
          to provide the app to you.
        </p>

        <h2>Retention and deletion</h2>
        <p>
          Your clips and transcripts are kept until you delete them or close
          your account. You can delete any clip (and its transcript and
          bookmarks) from the app at any time. To delete your entire account and
          associated data, contact us at {CONTACT}.
        </p>

        <h2>Security</h2>
        <p>
          We take reasonable measures to protect your data, but no online
          service can be perfectly secure — especially a beta. Please don&rsquo;t
          upload anything you can&rsquo;t afford to lose or wouldn&rsquo;t want
          processed by the services listed above.
        </p>

        <h2>Children</h2>
        <p>
          The app isn&rsquo;t directed at children under 13 (or the minimum age
          of digital consent in your country), and they shouldn&rsquo;t use it.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy as the app grows; the date above reflects the
          latest version. Questions? Reach us at {CONTACT}.
        </p>

        <p className="legal-note">
          Shadowing+ is a personal beta project. This policy is written in good
          faith but isn&rsquo;t legal advice, and will be reviewed by a
          professional before any wider public launch.
        </p>
      </div>
    </main>
  );
}
