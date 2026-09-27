import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { previewPhrase } from "@/lib/phrases";

// Lookup-only twin of POST /api/phrases: same ownership + containment checks,
// but it never inserts a `phrase_items` row. The player uses this so dragging
// a subtitle can show an explanation before the learner chooses Save or Cancel.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { segmentId?: unknown; text?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const result = await previewPhrase(supabaseAdmin(), userId, body.segmentId, body.text);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.alreadySaved) {
    return NextResponse.json({ alreadySaved: true, item: result.item });
  }
  return NextResponse.json({ alreadySaved: false, preview: result.preview });
}
