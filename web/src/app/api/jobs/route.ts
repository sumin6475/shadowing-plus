import { NextResponse } from "next/server";
import { listJobs } from "@/lib/pipeline/jobs";
import { getSessionUserId } from "@/lib/supabase-server";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const jobs = await listJobs(userId);
    return NextResponse.json({ jobs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
