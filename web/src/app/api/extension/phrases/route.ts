import { NextRequest } from "next/server";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PHRASE_SELECT_COLUMNS, savePhrase } from "@/lib/phrases";

export const dynamic = "force-dynamic";

type PhraseInput = { segmentId?: unknown; text?: unknown };

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

export async function GET(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("phrase_items")
    .select(`${PHRASE_SELECT_COLUMNS}, video:videos(title, video_url)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return extensionJson(req, { error: error.message }, { status: 500 });
  return extensionJson(req, { items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as PhraseInput | null;
  const result = await savePhrase(supabaseAdmin(), userId, body?.segmentId, body?.text);
  if (!result.ok) return extensionJson(req, { error: result.error }, { status: result.status });
  return extensionJson(req, { item: result.item, alreadySaved: result.alreadySaved });
}
