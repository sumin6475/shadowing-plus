"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "../landing.css";
import "./island.css";

// Coming-soon page for Language island. Public route. Describes the feature and
// captures a demand signal ("I'd use this" → feature_interest, migration 015)
// so the feature can be validated before it's built. Logged-out visitors are
// sent to sign up first.
const FEATURE = "language-island";

export default function IslandPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setAuthed(!!user);
      if (user) {
        const { data: rows } = await supabase
          .from("feature_interest")
          .select("id")
          .eq("feature", FEATURE)
          .limit(1);
        if (!cancelled && rows && rows.length > 0) setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function register() {
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("feature_interest")
      .insert({ feature: FEATURE });
    setBusy(false);
    // 23505 = unique_violation = already registered → treat as success.
    if (error && error.code !== "23505") {
      setError("Something went wrong — please try again.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="landing">
      <div className="island-page">
        <Link href="/" className="island-back">
          ← Shadowing+
        </Link>

        <span className="kicker">
          <span className="bar" />
          Coming soon
        </span>
        <h1 className="serif island-title">Language island</h1>
        <p className="island-lede">
          Build your own scripts on the topics you actually talk about — then
          shadow them <em>in your own words</em>. Capture a thought, and
          Shadowing+ turns it into a script and a shadowing clip that&rsquo;s
          uniquely yours.
        </p>

        <ol className="island-steps">
          <li>
            <span className="island-num">1</span>
            <div className="island-step">
              <b>Capture</b>
              <span>
                Drop a thought on any topic, anytime. Your captures get grouped
                by theme into an &ldquo;island.&rdquo;
              </span>
            </div>
          </li>
          <li>
            <span className="island-num">2</span>
            <div className="island-step">
              <b>Draft</b>
              <span>
                When a topic builds up, Shadowing+ drafts a short script — key
                phrases and ~150 words — for you to make your own.
              </span>
            </div>
          </li>
          <li>
            <span className="island-num">3</span>
            <div className="island-step">
              <b>Shadow</b>
              <span>
                Your script becomes a shadowing clip in your library, with the
                key phrases in your daily review.
              </span>
            </div>
          </li>
        </ol>

        <div className="island-cta">
          {done ? (
            <span className="island-done">
              ✓ You&rsquo;re on the list — we&rsquo;ll let you know.
            </span>
          ) : authed === false ? (
            <>
              <Link href="/login?next=/island" className="btn primary lg">
                Sign in to save your spot
              </Link>
              <span className="island-note">
                Free to join · we&rsquo;ll only ping you when it&rsquo;s ready.
              </span>
            </>
          ) : (
            <button
              type="button"
              className="btn primary lg"
              onClick={register}
              disabled={busy || authed === null}
            >
              {busy ? "…" : "I'd use this"}
            </button>
          )}
          {error && <p className="island-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
