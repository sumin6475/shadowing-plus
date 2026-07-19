import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Next.js 16 renamed the `middleware` file convention to `proxy` (see
// node_modules/next/dist/docs/.../file-conventions/proxy.md). This runs on the
// Node.js runtime by default, which @supabase/ssr requires.
//
// Two jobs:
//  1. Refresh the Supabase auth session cookie on every request (mandatory for
//     @supabase/ssr — without it, server-side getUser() goes stale).
//  2. Optimistically gate the authenticated app: send logged-out users hitting
//     a protected route to /login. This is a redirect convenience, NOT the
//     security boundary — real enforcement is RLS + per-route user_id checks
//     (the proxy doc explicitly warns proxy alone is insufficient).

// Routes that require a session. Everything else (/, /login, /auth/*) is public
// — `/` is the marketing landing. Kept as a constant so it's statically
// analyzable.
const PROTECTED_PREFIXES = [
  "/app",
  "/bookmarks",
  "/practice",
  "/player",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  // Self-heal a misdirected magic link. Supabase falls back to the Site URL
  // (usually `/`) when emailRedirectTo isn't in its allow list, so the auth
  // params can land anywhere. If they're not already at /auth/callback, forward
  // them there (preserving all of them) so the session exchange still happens.
  // Handles both flows: ?code= (PKCE) and ?token_hash=&type= (OTP magic link).
  const { pathname, searchParams } = request.nextUrl;
  const hasAuthParams =
    searchParams.has("code") || searchParams.has("token_hash");
  if (hasAuthParams && pathname !== "/auth/callback") {
    const callback = new URL("/auth/callback", request.url);
    for (const key of ["code", "token_hash", "type", "next"]) {
      const v = searchParams.get(key);
      if (v) callback.searchParams.set(key, v);
    }
    return NextResponse.redirect(callback);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // @supabase/ssr's default cookie options omit `secure`, which some
      // in-app browsers (e.g. Telegram's) silently drop on an HTTPS origin.
      // Must match auth/callback's cookieOptions or the two disagree on the
      // cookie's attributes and the browser can end up with duplicates.
      // Only forced in production — a `secure` cookie is dropped outright on
      // http://localhost, which breaks local sign-in entirely.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies onto both the request (for any downstream
          // read this pass) and the response (so the browser gets them).
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: getUser() (not getSession()) revalidates the token with Supabase
  // and triggers the cookie refresh via setAll above. Do not run other logic
  // between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run on all paths except Next internals, static assets, and API routes.
  // API routes do their own session checks (service key bypasses RLS), and the
  // reaper/media routes must stay reachable, so they're excluded here.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)",
  ],
};
