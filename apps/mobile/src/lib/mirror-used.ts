// mirror-used.ts — which phrases have been used in the mirror today.
//
// The next session's deck leads with phrases that have not had their turn
// (see `hintPicks`), so "used today" has to outlive a session. Two records
// are merged:
//
// - the day's saved transcripts — a phrase said in a saved session is found
//   again by the same matcher the mirror uses, on any device;
// - this device's own list for the day, which also holds what a transcript
//   cannot: a card ticked by hand, and a phrase said in a session that was
//   then discarded.
//
// The device list is one small entry that starts over when the date changes.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firstUseOrder, startOfDay } from "./mvp-model";
import { phrasesSaid } from "./phrase-use";
import { supabase } from "./supabase";

const KEY = "saylo.mirror-used.v1";
interface DayRecord {
  /** Local calendar day the entries belong to. */
  day: string;
  /** Phrase id → when it was first used, and by which mirror session. */
  uses: Record<string, { at: string; by: string }>;
}
const dayOf = (now: Date) => startOfDay(now).toDateString();

async function readToday(now: Date): Promise<DayRecord> {
  const fresh: DayRecord = { day: dayOf(now), uses: {} };
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null") as DayRecord | null;
    return stored?.day === fresh.day && stored.uses && typeof stored.uses === "object" ? stored : fresh;
  } catch {
    return fresh;
  }
}
// One write at a time, in the order asked for: a card can be ticked and
// unticked again before the first write has finished.
let queue: Promise<unknown> = Promise.resolve();
const update = (change: (record: DayRecord) => void, now: Date): Promise<void> => {
  const run = queue.then(async () => {
    const record = await readToday(now);
    change(record);
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  });
  queue = run.catch(() => {});
  return run;
};

/** Records phrases as used today by mirror session `by`. A phrase already on
 *  the day's list keeps its earlier entry. */
export const markMirrorUsed = (ids: string[], by: string, now = new Date()): Promise<void> =>
  update((record) => {
    for (const id of ids) record.uses[id] ??= { at: now.toISOString(), by };
  }, now);
/** Takes back uses that session `by` recorded (a hand tick that was undone).
 *  An entry from an earlier session stays: that use did happen. */
export const unmarkMirrorUsed = (ids: string[], by: string, now = new Date()): Promise<void> =>
  update((record) => {
    for (const id of ids) if (record.uses[id]?.by === by) delete record.uses[id];
  }, now);

/** Ids of the phrases used in the mirror today, earliest first. */
export async function usedInMirrorToday(
  phrases: { id: string; text: string }[],
  now = new Date(),
): Promise<string[]> {
  const [sessions, device] = await Promise.all([
    supabase
      .from("talk_sessions")
      .select("transcript,created_at")
      .gte("created_at", startOfDay(now).toISOString())
      .order("created_at"),
    readToday(now),
  ]);
  const said = (sessions.data ?? []).flatMap((session) =>
    phrasesSaid(session.transcript ?? "", phrases).map((phrase, i) => ({
      id: phrase.id,
      // Within one session, in the order said.
      at: new Date(Date.parse(session.created_at) + i).toISOString(),
    })),
  );
  const ticked = Object.entries(device.uses).map(([id, use]) => ({ id, at: use.at }));
  return firstUseOrder([...said, ...ticked]);
}
