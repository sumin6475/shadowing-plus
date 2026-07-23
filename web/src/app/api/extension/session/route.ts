import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSessionTokens } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * One-time browser hand-off. The extension opens this while the user is
 * already signed into Shadowing Plus; the verified access token is sent to an
 * Chrome Identity redirect URL in the URL fragment (never to the app server
 * on a subsequent request).
 */
export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get("return_to");
  const allowedOrigin = process.env.EXTENSION_ALLOWED_ORIGIN;
  if (!returnTo || !allowedOrigin) {
    return NextResponse.json({ error: "Extension connection is not configured." }, { status: 400 });
  }

  let callback: URL;
  try {
    callback = new URL(returnTo);
  } catch {
    return NextResponse.json({ error: "Invalid extension callback." }, { status: 400 });
  }
  // Chrome blocks normal tab navigation to chrome-extension:// pages. Its
  // Identity API uses https://<extension-id>.chromiumapp.org/<path> instead.
  // EXTENSION_ALLOWED_ORIGIN remains chrome-extension://<extension-id> for
  // CORS, so derive and validate the permitted Identity redirect here.
  let allowed: URL;
  try {
    allowed = new URL(allowedOrigin);
  } catch {
    return NextResponse.json({ error: "Invalid extension origin configuration." }, { status: 500 });
  }
  if (
    callback.protocol !== "https:" ||
    callback.host !== `${allowed.host}.chromiumapp.org` ||
    allowed.protocol !== "chrome-extension:" ||
    callback.pathname !== "/shadowing-plus"
  ) {
    return NextResponse.json({ error: "Unapproved extension callback." }, { status: 400 });
  }

  const session = await getVerifiedSessionTokens();
  if (!session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", `${req.nextUrl.pathname}?return_to=${encodeURIComponent(returnTo)}`);
    return NextResponse.redirect(login);
  }

  // The redirect fragment is received only by Chrome Identity. Supplying the
  // refresh token lets the extension renew an expired access token without
  // making the learner repeat the browser sign-in every hour.
  callback.hash = new URLSearchParams({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    ...(session.email ? { email: session.email } : {}),
  }).toString();
  return NextResponse.redirect(callback);
}
