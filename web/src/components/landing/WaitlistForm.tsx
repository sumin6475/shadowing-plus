"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          goal: data.get("goal"),
          platform: data.get("platform"),
          wantsBeta: data.get("wantsBeta") === "on",
          privacyAccepted: data.get("privacyAccepted") === "on",
          company: data.get("company"),
          locale: navigator.language,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Something went wrong.");
      setStatus("success");
      setMessage("You are on the list. We will email you when your next step is ready.");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not save your place. Please try again.");
    }
  }

  return (
    <form className="waitlist-form" onSubmit={submit}>
      <div className="form-heading"><span>Reserve your place</span><small>About 30 seconds</small></div>
      <label htmlFor="waitlist-email">Email address</label>
      <input id="waitlist-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />

      <div className="form-two">
        <div>
          <label htmlFor="waitlist-goal">What would you practise?</label>
          <select id="waitlist-goal" name="goal" defaultValue="clear-speaking" required>
            <option value="clear-speaking">Clearer everyday speaking</option>
            <option value="networking">Meetups and networking</option>
            <option value="pitch">Startup or project pitch</option>
            <option value="interview">Interview or presentation</option>
            <option value="other">Something else</option>
          </select>
        </div>
        <div>
          <label htmlFor="waitlist-platform">Your phone</label>
          <select id="waitlist-platform" name="platform" defaultValue="ios" required>
            <option value="ios">iPhone</option>
            <option value="android">Android</option>
            <option value="either">Either</option>
          </select>
        </div>
      </div>

      <div className="honeypot" aria-hidden="true"><label htmlFor="company">Company</label><input id="company" name="company" tabIndex={-1} autoComplete="off" /></div>

      <label className="check-row beta-check">
        <input type="checkbox" name="wantsBeta" />
        <span className="check-box" aria-hidden="true" />
        <span><b>I want to help test the private beta.</b><small>I am open to early access and occasional feedback requests.</small></span>
      </label>
      <label className="check-row consent-check">
        <input type="checkbox" name="privacyAccepted" required />
        <span className="check-box" aria-hidden="true" />
        <span>I agree that Saylo may use my email to manage the waitlist and send launch or beta access updates. See the <Link href="/privacy">Privacy Policy</Link>.</span>
      </label>

      <button className="button form-submit" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Saving your place…" : "Join the waitlist"}
      </button>
      <p className={`form-status ${status}`} role="status" aria-live="polite">{message}</p>
    </form>
  );
}
