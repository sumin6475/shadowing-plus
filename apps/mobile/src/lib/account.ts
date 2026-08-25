// account.ts — delete the signed-in account (App Store 5.1.1(v)).
//
// The `delete-account` Edge Function verifies the JWT, wipes the avatar bucket
// and R2 TTS cache, then service-role-deletes the auth user (all user tables
// cascade). After the server confirms, this clears what only the device holds:
// local recordings, scheduled reminders, the onboarding draft, and the session.
import { Directory, Paths } from "expo-file-system";

import { supabase } from "./supabase";
import { resetOnboardingDraft } from "./onboarding";
import { saveReminderSettings } from "./reminders";

// supabase-js reports every non-2xx invoke as the same generic message; the
// function's {error} body lives in error.context (same pattern as capture).
async function readFunctionError(error: { message?: string; context?: unknown }): Promise<string> {
  const ctx = error.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // Non-JSON body — fall through.
    }
  }
  return "We couldn’t delete your account. Check your connection and try again.";
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account", { body: {} });
  if (error) throw new Error(await readFunctionError(error));

  // Server side is gone. Local cleanup is best-effort — never surface a
  // failure here as "deletion failed".
  try {
    const dir = new Directory(Paths.document, "speak");
    if (dir.exists) dir.delete();
  } catch {
    // Recordings dir already gone or locked; nothing references it anymore.
  }
  try {
    await saveReminderSettings({ enabled: false });
  } catch {
    // Scheduled notifications will no-op against a signed-out app.
  }
  try {
    await resetOnboardingDraft();
  } catch {
    // Worst case the splash copy assumes a returning user.
  }
  try {
    // The server session is already invalid; only clear this device.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Auth listener still fires on cleared storage.
  }
}
