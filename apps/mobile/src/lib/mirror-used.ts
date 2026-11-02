// Same-day Talk use survives the next session. Saved events and transcripts
// follow the account; a small device record also covers live and discarded
// attempts until the local calendar day changes.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firstUseOrder, startOfDay } from "./mvp-model";
import { phrasesSaid } from "./phrase-use";
import { supabase } from "./supabase";

const KEY = "saylo.mirror-used.v2";
const PAGE_SIZE = 1000;

type Use = { at: string; by: string };
type DayRecord = { day: string; userId: string; uses: Record<string, Use> };
type UseRow = { phrase_item_id: string; created_at: string };
type SessionRow = { transcript: string | null; created_at: string };

const dayOf = (now: Date) => startOfDay(now).toDateString();
const nextDay = (now: Date) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

async function userId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

async function readToday(now: Date, user: string): Promise<DayRecord> {
  const fresh: DayRecord = { day: dayOf(now), userId: user, uses: {} };
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null") as DayRecord | null;
    return stored?.day === fresh.day && stored.userId === user && stored.uses && typeof stored.uses === "object"
      ? stored : fresh;
  } catch {
    return fresh;
  }
}

// A tick and its undo can race across AsyncStorage reads. Serialize updates.
let queue: Promise<unknown> = Promise.resolve();
function update(change: (record: DayRecord) => void, now: Date): Promise<void> {
  const run = queue.then(async () => {
    const user = await userId();
    if (!user) return;
    const record = await readToday(now, user);
    change(record);
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  });
  queue = run.catch(() => {});
  return run;
}

/** Keep the first use today, whether heard by speech recognition or hand-ticked. */
export const markMirrorUsed = (ids: string[], by: string, now = new Date()): Promise<void> =>
  update((record) => {
    for (const id of ids) record.uses[id] ??= { at: now.toISOString(), by };
  }, now);

/** An undone tick only removes this attempt's device record. */
export const unmarkMirrorUsed = (ids: string[], by: string, now = new Date()): Promise<void> =>
  update((record) => {
    for (const id of ids) if (record.uses[id]?.by === by) delete record.uses[id];
  }, now);

async function eventUses(start: string, end: string): Promise<{ id: string; at: string }[]> {
  const rows: { id: string; at: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("phrase_events")
      .select("phrase_item_id,created_at")
      .eq("event", "used")
      .not("talk_session_id", "is", null)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as UseRow[];
    rows.push(...page.map((row) => ({ id: row.phrase_item_id, at: row.created_at })));
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function transcriptUses(
  phrases: { id: string; text: string }[], start: string, end: string,
): Promise<{ id: string; at: string }[]> {
  const rows: { id: string; at: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("talk_sessions")
      .select("transcript,created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as SessionRow[];
    for (const session of page) {
      const said = phrasesSaid(session.transcript ?? "", phrases);
      rows.push(...said.map((phrase, index) => ({
        id: phrase.id,
        at: new Date(Date.parse(session.created_at) + index).toISOString(),
      })));
    }
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Earlier uses in local-day order. Cloud failures retain device evidence. */
export async function usedInMirrorToday(
  phrases: { id: string; text: string }[], now = new Date(),
): Promise<string[]> {
  const user = await userId();
  if (!user) return [];
  const start = startOfDay(now).toISOString();
  const end = nextDay(now).toISOString();
  const [events, sessions, device] = await Promise.all([
    eventUses(start, end).catch(() => []),
    transcriptUses(phrases, start, end).catch(() => []),
    readToday(now, user),
  ]);
  const local = Object.entries(device.uses).map(([id, use]) => ({ id, at: use.at }));
  return firstUseOrder([...events, ...sessions, ...local]);
}
