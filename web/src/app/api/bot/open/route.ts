import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Lazy auth bridge for the Review bot's "Shadow in app" deep link. Telegram's
// in-app browser carries none of the app's session cookies, so a bare
// /player/... link just bounces to /login. This route resolves the tapping
// user from the channel ref (never the bookmarkId alone), mints a fresh
// Supabase magic link at tap time (not at cron-send time, so it can't go
// stale before it's tapped), and hands off to the existing /auth/callback
// verifyOtp flow to set the real session cookies.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const bookmarkId = searchParams.get("bookmarkId");
  const channel = searchParams.get("channel");
  const ref = searchParams.get("ref");

  if (!bookmarkId || !channel || !ref) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const db = supabaseAdmin();

  const { data: settings } = await db
    .from("review_settings")
    .select("user_id")
    .eq("channel", channel)
    .eq("channel_user_ref", ref)
    .maybeSingle();
  if (!settings) {
    return NextResponse.redirect(`${origin}/login`);
  }
  const userId = settings.user_id as string;

  // Scoped by the resolved user_id so a tampered bookmarkId for someone
  // else's bookmark 404s instead of ever minting a session over it.
  const { data: bookmark } = await db
    .from("bookmarks")
    .select("id")
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!bookmark) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Land on the bookmarks list scrolled to this sentence. The list plays a
  // clip only on an explicit tap, so playback isn't blocked by mobile in-app
  // browsers' autoplay policy (a bare /player/... deep link auto-played and
  // was silently muted in Telegram's webview).
  const next = `/bookmarks?bookmarkId=${encodeURIComponent(bookmarkId)}`;

  const { data: userRes, error: userErr } = await db.auth.admin.getUserById(userId);
  if (userErr || !userRes.user?.email) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
    type: "magiclink",
    email: userRes.user.email,
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (linkErr) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const verifyUrl = new URL(`${origin}/auth/callback`);
  verifyUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
  verifyUrl.searchParams.set("type", linkData.properties.verification_type);
  verifyUrl.searchParams.set("next", next);
  return NextResponse.redirect(verifyUrl);
}
