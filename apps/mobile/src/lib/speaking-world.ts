// speaking-world.ts — the Speaking World tree (migration 020), RLS-scoped via
// the anon+session client. Domain → Story → Message → beats. The initial world
// is seeded client-side on first use (a migration can't seed per-user).
import { supabase } from "./supabase";

export interface Domain {
  id: string;
  name: string;
  color: string | null;
  position: number;
  storyCount: number;
}
export interface Story {
  id: string;
  domainId: string | null;
  title: string;
  summary: string | null;
  status: string;
  position: number;
  messageCount: number;
}
export interface StoryMessage {
  id: string;
  storyId: string;
  label: string;
  audience: string | null;
  targetSeconds: number | null;
  position: number;
}
export interface Beat {
  id: string;
  messageId: string;
  position: number;
  text: string;
  source: string;
}

// Design tones (map to Cobalt tokens) cycled across seeded domains.
const SEED = [
  { name: "About me", color: "sage", stories: ["Background", "Strengths", "Future goals"] },
  { name: "Work / Study", color: "sky", stories: ["My startup", "Current project", "Interview", "My research"] },
  { name: "Experiences", color: "blush", stories: ["Moving abroad", "Biggest challenge", "Trip to Japan"] },
  { name: "Daily life", color: "butter", stories: ["Morning routine", "Gym", "Weekend"] },
  { name: "Ideas", color: "sky", stories: ["AI", "Education", "Design"] },
];

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** Domains (with story counts), ordered. Seeds the initial world if empty. */
export async function fetchDomains(): Promise<Domain[]> {
  const load = async () => {
    const { data, error } = await supabase
      .from("domains")
      .select("id, name, color, position, stories(count)")
      .eq("archived", false)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  };

  let rows = await load();
  if (rows.length === 0) {
    await seedInitialWorld();
    rows = await load();
  }
  return rows.map((d) => ({
    id: d.id as string,
    name: d.name as string,
    color: (d.color as string | null) ?? null,
    position: (d.position as number) ?? 0,
    storyCount: (one(d.stories as { count: number }[]) as { count: number } | null)?.count ?? 0,
  }));
}

/** Create the 5 starter domains + their suggested stories (drafts). */
export async function seedInitialWorld(): Promise<void> {
  for (let i = 0; i < SEED.length; i++) {
    const d = SEED[i];
    const { data: dom, error } = await supabase.from("domains").insert({ name: d.name, color: d.color, position: i }).select("id").single();
    if (error || !dom) continue;
    const rows = d.stories.map((title, j) => ({ domain_id: dom.id as string, title, status: "draft", position: j }));
    if (rows.length) await supabase.from("stories").insert(rows);
  }
}

/** Stories in a domain (with message counts), ordered. */
export async function fetchStories(domainId: string): Promise<Story[]> {
  const { data, error } = await supabase
    .from("stories")
    .select("id, domain_id, title, summary, status, position, messages(count)")
    .eq("domain_id", domainId)
    .neq("status", "archived")
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: s.id as string,
    domainId: (s.domain_id as string | null) ?? null,
    title: (s.title as string) || "Untitled story",
    summary: (s.summary as string | null) ?? null,
    status: (s.status as string) ?? "draft",
    position: (s.position as number) ?? 0,
    messageCount: (one(s.messages as { count: number }[]) as { count: number } | null)?.count ?? 0,
  }));
}

/** Messages for a story, ordered. */
export async function fetchMessages(storyId: string): Promise<StoryMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, story_id, label, audience, target_seconds, position")
    .eq("story_id", storyId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id as string,
    storyId: m.story_id as string,
    label: (m.label as string) || "Untitled",
    audience: (m.audience as string | null) ?? null,
    targetSeconds: (m.target_seconds as number | null) ?? null,
    position: (m.position as number) ?? 0,
  }));
}

/** Beats for a message, ordered. */
export async function fetchBeats(messageId: string): Promise<Beat[]> {
  const { data, error } = await supabase
    .from("message_beats")
    .select("id, message_id, position, text, source")
    .eq("message_id", messageId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    id: b.id as string,
    messageId: b.message_id as string,
    position: (b.position as number) ?? 0,
    text: (b.text as string) ?? "",
    source: (b.source as string) ?? "learner",
  }));
}

export async function createDomain(name: string): Promise<string | null> {
  const { data, error } = await supabase.from("domains").insert({ name: name.trim() }).select("id").single();
  if (error) throw new Error(error.message);
  return (data?.id as string) ?? null;
}

export async function createStory(domainId: string | null, title: string): Promise<string | null> {
  const { data, error } = await supabase.from("stories").insert({ domain_id: domainId, title: title.trim(), status: "draft" }).select("id").single();
  if (error) throw new Error(error.message);
  return (data?.id as string) ?? null;
}

export async function createMessage(storyId: string, label: string): Promise<string | null> {
  const { data, error } = await supabase.from("messages").insert({ story_id: storyId, label: label.trim() }).select("id").single();
  if (error) throw new Error(error.message);
  return (data?.id as string) ?? null;
}
