import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

// Magic-link / OTP landing. Supabase sends one of two shapes depending on the
// email template + auth flow:
//   • ?token_hash=...&type=magiclink  → verifyOtp (the default magic-link flow)
//   • ?code=...                       → exchangeCodeForSession (PKCE flow)
// We handle both, set the session cookies, then redirect into the app.
export const dynamic = "force-dynamic";

function safeNext(next: string | null): string {
  // Same-origin relative paths only, to avoid an open-redirect.
  return next && next.startsWith("/") ? next : "/";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // @supabase/ssr's default cookie options omit `secure`, which some
      // in-app browsers (e.g. Telegram's) silently drop on an HTTPS origin —
      // the session cookie never persists past the first redirect. Force it,
      // but only in production — on http://localhost a `secure` cookie is
      // dropped outright, which breaks local sign-in entirely.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  let error: { message: string } | null = null;

  if (tokenHash && type) {
    // Magic-link / OTP verify flow — no browser-side code verifier needed, so
    // this is the most robust path across devices/browsers.
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else if (code) {
    // PKCE flow — requires the code verifier cookie set at signInWithOtp time.
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
