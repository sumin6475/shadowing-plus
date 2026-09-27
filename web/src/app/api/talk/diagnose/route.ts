import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase-server";
import { diagnoseTalk } from "@/lib/talk-diagnose-ai";

// Speak session AI diagnosis: the learner's real on-device transcript in, up to
// three improvable "moments" out. Stateless like /api/island/diagnose — the
// mobile app persists the talk_session itself through its RLS anon client; this
// route only runs the GPT call so the OpenAI key never leaves the server.
// Auth is the Bearer token every mobile request carries (getSessionUserId).

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { transcript?: unknown; topic?: unknown } | null;
  const transcript = typeof body?.transcript === "string" ? body.transcript : "";
  const topic = typeof body?.topic === "string" && body.topic.trim() ? body.topic.trim() : null;
  if (!transcript.trim()) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }

  try {
    const moments = await diagnoseTalk(transcript, topic, userId);
    return NextResponse.json({ moments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't diagnose your session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
