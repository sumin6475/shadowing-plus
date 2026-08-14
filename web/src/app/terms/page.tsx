import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Terms of Service",
  description: "The terms for the Saylo waitlist and private beta.",
};

const CONTACT = "sumin002@gmail.com";
const UPDATED = "14 August 2026";

export default function TermsPage() {
  return (
    <main className="legal">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Saylo</Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>

        <p>
          By creating an account or using Saylo (&ldquo;the app&rdquo;), you agree
          to these terms. If you do not agree, please do not use the service.
        </p>

        <h2>Waitlist and private beta</h2>
        <p>
          Joining the waitlist does not guarantee beta access or a particular launch
          date. Private beta places may be limited by device, region, or testing needs.
          Beta volunteers may be asked for feedback, but can stop participating at any time.
        </p>

        <h2>Your account</h2>
        <p>
          You are responsible for keeping your login secure and for activity under
          your account. You must be old enough to consent to online services in your country, and at least 13.
        </p>

        <h2>Your content and the rights you need</h2>
        <p>
          You keep ownership of everything you add. You grant us only the limited
          permission needed to store and process your content, including sending audio
          or text to the providers listed in our <Link href="/privacy">Privacy Policy</Link>,
          so we can provide the app to you.
        </p>
        <p>
          Voice recordings, topics, messages, and phrases you create remain your
          content. Mirror mode is intended to record audio only. If community feedback
          is introduced, private content will not be shared without your separate, explicit action.
        </p>
        <p><strong>You must only upload or share content you own or have the right to use.</strong> Do not add material that infringes copyright, privacy, confidentiality, or other rights.</p>

        <h2>Acceptable use</h2>
        <p>Please do not:</p>
        <ul>
          <li>use the app for anything illegal, harmful, deceptive, or infringing;</li>
          <li>upload another person&rsquo;s private or copyrighted material without permission;</li>
          <li>attempt to break, overload, scrape, or reverse-engineer the service;</li>
          <li>harass or unfairly judge another person if community feedback becomes available;</li>
          <li>resell or redistribute the service or its output as your own.</li>
        </ul>

        <h2>AI output</h2>
        <p>
          Suggestions, transcripts, translations, and feedback may be incomplete or
          inaccurate. Review important language yourself. The app does not provide
          legal, medical, financial, or professional advice.
        </p>

        <h2>Beta service</h2>
        <p>
          The app is offered during beta without warranties of any kind. It may change,
          break, lose data, or be discontinued. We do not guarantee uptime, access,
          accuracy, or permanent storage. Keep your own copy of anything important.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent allowed by law, Saylo and its operator are not
          liable for indirect or consequential loss arising from your use of the app,
          including lost data, opportunities, or practice progress. Nothing in these
          terms excludes rights or liability that cannot legally be excluded.
        </p>

        <h2>Suspension, deletion, and changes</h2>
        <p>
          We may suspend accounts that abuse the service, break these terms, or create
          risk or excessive cost. You can stop using the app and request deletion at any
          time. We may update these terms as the product develops; the date above reflects
          the latest version. Questions can be sent to {CONTACT}.
        </p>

        <p className="legal-note">
          These terms describe the current private beta and will be reviewed and updated
          before public App Store launch or any community-sharing feature.
        </p>
      </div>
    </main>
  );
}
