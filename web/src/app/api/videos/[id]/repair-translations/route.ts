import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { repairVideoTranslations } from "@/lib/pipeline/repair-translations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const updates = await repairVideoTranslations(supabaseAdmin(), userId, id);
    return NextResponse.json({ updates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Repair failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
