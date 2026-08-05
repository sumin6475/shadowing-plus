import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, createSupabaseServerClient } from "@/lib/supabase-server";
import { canSeeIsland } from "@/lib/islandAccess";
import { diagnoseGap } from "@/lib/island-speak-ai";
import { type PhraseRef } from "@/lib/island-speak";

// Speak Loop step 2: the learner's attempt 1 in, ONE diagnosed gap out. Loads
// the learner's real beats + saved phrases under RLS (so the gap reflects THEIR
// message and THEIR Phrase Bank), then asks the model to name a single gap.
// Stateless like /api/island/shape — the client persists attempts, the repair,
// and phrase events through the RLS anon client.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PHRASES = 60;

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Admin-only while the flow is unfinished — 404 for everyone else.
  if (!canSeeIsland(userId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { islandId?: unknown; attempt?: unknown } | null;
  const islandId = typeof body?.islandId === "string" ? body.islandId : "";
  const attempt = typeof body?.attempt === "string" ? body.attempt : "";
  if (!islandId || !attempt.trim()) {
    return NextResponse.json({ error: "Say your message first." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: beatRows }, { data: phraseRows }] = await Promise.all([
    supabase.from("island_beats").select("text").eq("island_id", islandId).order("position"),
    supabase
      .from("phrase_items")
      .select("id, text")
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(MAX_PHRASES),
  ]);

  const beats = ((beatRows as { text: string }[] | null) ?? []).map((b) => b.text).filter(Boolean);
  if (beats.length === 0) {
    return NextResponse.json({ error: "Build your message on the island first." }, { status: 400 });
  }
  const phrases = ((phraseRows as PhraseRef[] | null) ?? []).filter((p) => p.text);

  try {
    const diagnosis = await diagnoseGap(attempt, beats, phrases, userId);
    return NextResponse.json({ diagnosis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't diagnose your attempt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
