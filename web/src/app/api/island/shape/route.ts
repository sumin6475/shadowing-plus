import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase-server";
import { canSeeIsland } from "@/lib/islandAccess";
import { shapeBeats } from "@/lib/island";

// AI shaping for the "Explain what I do" island: a rough answer in, editable
// message beats out. Stateless — the client persists the returned beats through
// the RLS client, so this route only needs the session for identity + usage.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Admin-only while the flow is unfinished — 404 for everyone else.
  if (!canSeeIsland(userId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { rawAnswer?: unknown } | null;
  const rawAnswer = typeof body?.rawAnswer === "string" ? body.rawAnswer : "";
  if (!rawAnswer.trim()) {
    return NextResponse.json({ error: "Write a rough explanation first." }, { status: 400 });
  }

  try {
    const beats = await shapeBeats(rawAnswer, userId);
    return NextResponse.json({ beats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't shape your answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
