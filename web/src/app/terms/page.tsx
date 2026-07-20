import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Terms of Service · Shadowing+",
  description: "The terms for using the Shadowing+ beta.",
};

const CONTACT = "sumin002@gmail.com";
const UPDATED = "20 July 2026";

export default function TermsPage() {
  return (
    <main className="legal">
      <div className="legal-wrap">
        <Link href="/" className="legal-back">← Back to Shadowing+</Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: {UPDATED}</p>

        <p>
          By creating an account or using Shadowing+ (&ldquo;the app&rdquo;), you
          agree to these terms. If you don&rsquo;t agree, please don&rsquo;t use
          the app. This is a small beta project, so these terms are short and
          written in plain language.
        </p>

        <h2>Your account</h2>
        <p>
          You&rsquo;re responsible for keeping your login secure and for activity
          under your account. You must be old enough to consent to online
          services in your country (at least 13).
        </p>

        <h2>Your content and the rights you need</h2>
        <p>
          You keep ownership of everything you upload. You grant us only the
          limited permission needed to store and process your content — including
          sending its audio to the transcription and translation providers listed
          in our <Link href="/privacy">Privacy Policy</Link> — so we can provide
          the app to you.
        </p>
        <p>
          <strong>
            You must only upload content you own or have the right to use.
          </strong>{" "}
          Do not upload material that infringes anyone&rsquo;s copyright or other
          rights. You are solely responsible for the content you add and for
          using it lawfully for your own personal study.
        </p>

        <h2>Acceptable use</h2>
        <p>Please don&rsquo;t:</p>
        <ul>
          <li>use the app for anything illegal or infringing;</li>
          <li>upload others&rsquo; private or copyrighted material without permission;</li>
          <li>attempt to break, overload, scrape, or reverse-engineer the service;</li>
          <li>resell or redistribute the service or its output as your own.</li>
        </ul>

        <h2>Beta — provided &ldquo;as is&rdquo;</h2>
        <p>
          The app is offered free during beta, without warranties of any kind. It
          may change, break, lose data, or be discontinued at any time. We
          don&rsquo;t guarantee uptime, accuracy of transcripts or translations,
          or that your data will always be available. Keep your own copies of
          anything important.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent allowed by law, Shadowing+ and its operator
          aren&rsquo;t liable for any indirect or consequential loss arising from
          your use of the app, including lost data or lost practice progress.
        </p>

        <h2>Suspension and termination</h2>
        <p>
          We may suspend or remove accounts that abuse the service, break these
          terms, or create risk or excessive cost for the project. You can stop
          using the app and delete your account at any time.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms as the app develops; the date above reflects
          the latest version. Questions? Reach us at {CONTACT}.
        </p>

        <p className="legal-note">
          Shadowing+ is a personal beta project. These terms are written in good
          faith but aren&rsquo;t legal advice, and will be reviewed by a
          professional before any wider public launch.
        </p>
      </div>
    </main>
  );
}
