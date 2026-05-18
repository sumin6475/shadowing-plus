import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/orchestrator";

export const maxDuration = 300; // Vercel Pro; ignored on Hobby (capped at 60s)

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await runPipeline(id, "extract");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
