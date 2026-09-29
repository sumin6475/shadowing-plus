import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Terms of Service",
  description: "The terms for using Myne.",
};

const CONTACT = "sumin002@gmail.com";
const UPDATED = "28 September 2026";

export default function TermsPage() {
  return (
    <main className="legal">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Myne</Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>

        <p>
          By creating an account or using Myne (&ldquo;the app&rdquo;), you agree
          to these terms. If you do not agree, please do not use the app.
        </p>

        <h2>Your account</h2>
        <p>
          You are responsible for keeping your login secure and for activity under
          your account. You must be at least 13, and old enough to consent to online
          services in your country.
        </p>

        <h2>Your content and the rights you need</h2>
        <p>
          You keep ownership of everything you add: phrases, notes, recordings, and
          transcripts. You grant us only the limited permission needed to store and
          process your content so we can provide the app to you, including sending text
          or photos to the providers listed in our <Link href="/privacy">Privacy Policy</Link> when
          you use a feature that needs them and have allowed it.
        </p>
        <p>
          Practice recordings stay on your device. Mirror mode shows your camera image
          live and does not record video. Nothing you create is shared with other people.
        </p>
        <p><strong>Only add content you own or have the right to use.</strong> Do not add material that infringes copyright, privacy, confidentiality, or other rights.</p>

        <h2>Acceptable use</h2>
        <p>Please do not:</p>
        <ul>
          <li>use the app for anything illegal, harmful, deceptive, or infringing;</li>
          <li>add another person&rsquo;s private or copyrighted material without permission;</li>
          <li>attempt to break, overload, scrape, or reverse-engineer the service;</li>
          <li>resell or redistribute the service or its output as your own.</li>
        </ul>

        <h2>AI output</h2>
        <p>
          Suggestions, transcripts, and feedback may be incomplete or inaccurate. Review
          important language yourself. The app does not provide legal, medical,
          financial, or professional advice.
        </p>

        <h2>The service</h2>
        <p>
          Myne is provided &ldquo;as is&rdquo;, without warranties of any kind, to the
          extent the law allows. We work to keep it available and your data safe, but
          features may change and we cannot guarantee uninterrupted access. You can take
          a copy of your phrases at any time from Settings &rarr; Export my phrases.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent allowed by law, Myne and its operator are not
          liable for indirect or consequential loss arising from your use of the app,
          including lost data, opportunities, or practice progress. Nothing in these
          terms excludes rights or liability that cannot legally be excluded.
        </p>

        <h2>Waitlist</h2>
        <p>
          Joining the waitlist on our website does not guarantee early access or a
          particular date. You can leave it at any time by emailing {CONTACT}.
        </p>

        <h2>Ending your account, and changes</h2>
        <p>
          You can stop using the app at any time and delete your account in the app
          (Settings &rarr; Delete account). We may suspend accounts that abuse the
          service, break these terms, or create risk or excessive cost. We may update
          these terms as the app changes; the date above shows the latest version, and
          continuing to use the app after an update means you accept it.
        </p>
        <p>
          If you downloaded Myne from the Apple App Store, Apple&rsquo;s standard
          Licensed Application End User License Agreement also applies. Apple is not
          responsible for the app or its content.
        </p>

        <p className="legal-note">Questions about these terms: {CONTACT}</p>
      </div>
    </main>
  );
}
