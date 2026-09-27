import { supabase } from "@/lib/supabase";
import type { Folder } from "@/lib/types";

export async function persistFolderPositions(
  folders: Folder[],
): Promise<string | null> {
  const results = await Promise.all(
    folders.map((f, i) =>
      supabase.from("folders").update({ position: i }).eq("id", f.id),
    ),
  );
  return results.find((r) => r.error)?.error?.message ?? null;
}
