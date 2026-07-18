import { NextRequest, NextResponse } from "next/server";
import { reapStuckJobs } from "@/lib/pipeline/jobs";

// Vercel Cron hits this GET route on a schedule (see web/vercel.json). Vercel
// sends `Authorization: Bearer <CRON_SECRET>`; we reject anything else so the
// endpoint can't be triggered by the public.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reaped = await reapStuckJobs();
    return NextResponse.json({ ok: true, reaped: reaped.length, ids: reaped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
