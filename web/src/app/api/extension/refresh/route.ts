import { NextRequest } from "next/server";
import { extensionCors, extensionJson } from "@/lib/extension-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

/** Exchange a Chrome-extension-held Supabase refresh token for a new session. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { refreshToken?: unknown } | null;
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : null;
  if (!refreshToken || refreshToken.length < 20) {
    return extensionJson(req, { error: "Reconnect your Shadowing Plus account." }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    return extensionJson(req, { error: "Reconnect your Shadowing Plus account." }, { status: 401 });
  }
  return extensionJson(req, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    email: data.user?.email ?? null,
  });
}
