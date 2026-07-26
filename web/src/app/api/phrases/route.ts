import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PHRASE_SELECT_COLUMNS, savePhrase, saveManualPhrase } from "@/lib/phrases";

// Authenticated web-player Phrase Bank route. This is the in-app twin of the
// founder-only extension route (api/extension/phrases): both persist an
// identical `phrase_items` row through the shared helpers in lib/phrases.ts and
// differ only in how the caller is authenticated. Here the caller is the
// signed-in browser session (cookie), not an extension bearer token.
//
// The service key bypasses RLS, so `getSessionUserId` + every helper scoping by
// this `userId` is the actual ownership boundary.

export const dynamic = "force-dynamic";

type PhraseInput = {
  // Selection from an own-media subtitle → context-aware AI explanation.
  segmentId?: unknown;
  text?: unknown;
  // Cold-start manual entry (no source media). Presence of `manual` routes here.
  manual?: unknown;
  meaning_ko?: unknown;
  usage_note?: unknown;
};

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("phrase_items")
    .select(`${PHRASE_SELECT_COLUMNS}, video:videos(title, video_url)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as PhraseInput | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = body.manual
    ? await saveManualPhrase(supabaseAdmin(), userId, body.text, body.meaning_ko, body.usage_note)
    : await savePhrase(supabaseAdmin(), userId, body.segmentId, body.text);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ item: result.item, alreadySaved: result.alreadySaved });
}
