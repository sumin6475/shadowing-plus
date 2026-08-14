import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Privacy Policy",
  description: "How Saylo handles waitlist details, voice recordings, and account data.",
};

const CONTACT = "sumin002@gmail.com";
const UPDATED = "14 August 2026";

export default function PrivacyPage() {
  return (
    <main className="legal">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Saylo</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>

        <p>
          Saylo (&ldquo;the app&rdquo;) is an independently run speaking-practice
          tool preparing for a private beta. This policy explains what we collect,
          why, and who processes it. We try not to collect more than the product needs.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Waitlist details.</strong> Your email address, the kind of speaking you want to practise, your phone platform, language/locale, and whether you volunteered for private beta testing.</li>
          <li><strong>Account details.</strong> Your email address and a securely hashed password, handled by our authentication provider (Supabase). We never see or store your password in plain text.</li>
          <li><strong>Content you add.</strong> Audio or video files you choose to upload, voice recordings you create, generated transcripts and translations, and the topics, messages, phrases, and practice progress you save.</li>
          <li><strong>Basic usage records.</strong> Minimal processing and cost events, such as how much audio was transcribed, used to operate and budget the service. We do not sell your data or use third-party ad trackers.</li>
        </ul>

        <h2>Waitlist and beta communication</h2>
        <p>
          We use your waitlist details to manage access, understand which speaking
          needs and phone platforms to support, send the App Store launch link, and,
          if you volunteer, invite you to the private beta or ask for product feedback.
          You can leave the waitlist at any time by emailing {CONTACT}.
        </p>

        <h2>Mirror mode and voice recordings</h2>
        <p>
          Mirror mode is designed to show your live reflection on your own device
          while recording audio only. Saylo does not save a video of your mirror
          practice. Voice recordings and their transcripts are private to your account by default.
        </p>

        <h2>How your content is processed</h2>
        <p>
          To provide transcription, translation, and speaking support, relevant audio
          or text may be sent to service providers acting on our behalf. Current processors include:
        </p>
        <ul>
          <li><strong>Supabase</strong> for authentication and database services.</li>
          <li><strong>Cloudflare R2</strong> for storage of uploaded files and generated transcripts.</li>
          <li><strong>ElevenLabs, Groq, and OpenAI</strong> for speech-to-text, translation, and language support.</li>
          <li><strong>Vercel</strong> for application hosting.</li>
        </ul>
        <p>Your uploads are private to your account by default and are used only to provide the app to you.</p>

        <h2>Community features</h2>
        <p>
          We are exploring community feedback, but it is not part of the current
          private beta. If introduced, sharing will be optional and require a clear
          action from you for each item. We will explain what is shared, whether
          identifying details are included, who can access it, and how to withdraw
          it before you consent. Private practice will not be published automatically.
        </p>

        <h2>Retention and deletion</h2>
        <p>
          Waitlist details are kept until you ask us to remove them or until they are
          no longer needed for the beta and launch process. Clips, recordings, and
          transcripts are kept until you delete them or close your account. To request
          account deletion or a copy of your data, contact {CONTACT}.
        </p>

        <h2>Security and international processing</h2>
        <p>
          We take reasonable measures to protect your data, but no online service can
          be perfectly secure, especially during beta. Our providers may process data
          in countries other than your own under their applicable safeguards. Please
          do not upload highly sensitive or confidential material.
        </p>

        <h2>Children</h2>
        <p>The app is not directed at children under 13, or the minimum age of digital consent in their country, and they should not use it.</p>

        <h2>Your choices and changes</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, delete,
          restrict, or object to processing of your personal data. Contact {CONTACT}
          to make a request. We may update this policy as the app develops; the date
          above reflects the latest version.
        </p>

        <p className="legal-note">
          This plain-language policy describes the current private beta. It will be
          reviewed and updated before public App Store launch, especially before any
          community-sharing feature is introduced.
        </p>
      </div>
    </main>
  );
}
