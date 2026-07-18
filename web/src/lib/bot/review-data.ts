import { supabaseAdmin } from "@/lib/supabase-admin";
import { selectDue, type DueCard } from "./select-due";
import type { ReviewCard } from "./channel";

// Fetch a user's due bookmarks and resolve today's batch into ReviewCards.
// Service-key + explicit user_id scoping (RLS is bypassed by the service key).
// Reuses the bookmark→segment→video join shape proven in the practice page.

interface Row extends DueCard {
  segment: {
    text: string;
    translation: string | null;
    start_time: number;
    video: { id: string; title: string } | null;
  } | null;
}

const SELECT =
  "id, due_at, lapses, created_at, segment:segments(text, translation, start_time, video:videos!inner(id, title))";

export async function getDueReviewCards(
  userId: string,
  appBaseUrl: string,
  batchSize: number,
  channel: string,
  channelUserRef: string,
  now: Date = new Date(),
): Promise<ReviewCard[]> {
  const { data, error } = await supabaseAdmin()
    .from("bookmarks")
    .select(SELECT)
    .eq("user_id", userId)
    .lte("due_at", now.toISOString());
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  // selectDue orders + caps; it only needs the DueCard fields, which Row extends.
  const batch = selectDue(rows, now, batchSize);

  return batch.flatMap((r): ReviewCard[] => {
    const seg = r.segment;
    if (!seg?.video) return [];
    return [
      {
        bookmarkId: r.id,
        text: seg.text,
        translation: seg.translation,
        videoTitle: seg.video.title,
        // Lazy auth bridge: /api/bot/open resolves the tapping user from
        // (channel, channelUserRef) and mints a fresh session at tap time,
        // since a link embedded now could be tapped hours after this batch
        // is sent (see /api/bot/open/route.ts).
        deepLink: `${appBaseUrl}/api/bot/open?bookmarkId=${r.id}&channel=${channel}&ref=${encodeURIComponent(channelUserRef)}`,
      },
    ];
  });
}
