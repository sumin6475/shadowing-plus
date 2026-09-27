import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";
import { deleteKey } from "@/lib/r2";
import { isUuid } from "@/lib/recordings";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("practice_recordings")
    .select("id, r2_key")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ ok: true });
  }

  try {
    await deleteKey(row.r2_key);
  } catch (err) {
    const message = err instanceof Error ? err.message : "R2 delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error } = await db
    .from("practice_recordings")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
