"use client";

import LogoutButton from "@/components/LogoutButton";

// Profile tab: identity + account actions. Email is passed in from the modal
// (which already resolved the session user), so this stays presentational.
export default function ProfilePanel({ email }: { email: string | null }) {
  const initial = (email?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div className="set-panel">
      <div className="set-profile-row">
        <span className="set-avatar set-avatar-lg">{initial}</span>
        <div className="set-profile-id">
          <div className="set-profile-email">{email ?? "Signed in"}</div>
          <div className="set-field-help">Signed in with Google / email</div>
        </div>
      </div>

      <div className="set-field">
        <div className="set-field-label">Account</div>
        <p className="set-field-help">Sign out of this device.</p>
        <LogoutButton className="set-danger-btn" label="Sign out" />
      </div>
    </div>
  );
}
