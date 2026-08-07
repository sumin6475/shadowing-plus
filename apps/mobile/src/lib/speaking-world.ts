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
export interface StoryChoice {
  id: string;
  title: string;
  domainName: string | null;
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
export interface TalkSession {
  id: string;
  storyId: string | null;
  storyTitle: string | null;
  transcript: string | null;
  durationSeconds: number | null;
  createdAt: string;
  /** Relative key of the on-device recording (speak/{id}.wav), or null. */
  audioKey: string | null;
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

/**
 * All Speak sessions, newest first, with the linked story title (null = a
 * free-talk session not tied to a story). RLS scopes to the owner. Pass
 * `storyId` to list only the sessions recorded for one story.
 */
export async function fetchTalkSessions(limit = 100, storyId?: string): Promise<TalkSession[]> {
  let q = supabase
    .from("talk_sessions")
    .select("id, story_id, transcript, duration_seconds, created_at, audio_key, stories(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (storyId) q = q.eq("story_id", storyId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: s.id as string,
    storyId: (s.story_id as string | null) ?? null,
    storyTitle: (one(s.stories as { title: string }[]) as { title: string } | null)?.title ?? null,
    transcript: (s.transcript as string | null) ?? null,
    durationSeconds: (s.duration_seconds as number | null) ?? null,
    createdAt: s.created_at as string,
    audioKey: (s.audio_key as string | null) ?? null,
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

/** Compact owner-scoped Story list for capture/recommendation pickers. */
export async function fetchAllStories(): Promise<StoryChoice[]> {
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, domains(name)")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((story) => ({
    id: story.id as string,
    title: (story.title as string) || "Untitled story",
    domainName: (one(story.domains as { name: string }[]) as { name: string } | null)?.name ?? null,
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

/** Append a beat to a message. `source` defaults to learner-authored. */
export async function createBeat(messageId: string, text: string, position: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("message_beats")
    .insert({ message_id: messageId, text: text.trim(), position, source: "learner" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data?.id as string) ?? null;
}

export async function updateBeat(id: string, text: string): Promise<void> {
  const { error } = await supabase.from("message_beats").update({ text: text.trim() }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBeat(id: string): Promise<void> {
  const { error } = await supabase.from("message_beats").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Persist new positions for a set of beats (used by reorder). */
export async function setBeatPositions(updates: { id: string; position: number }[]): Promise<void> {
  for (const u of updates) {
    const { error } = await supabase.from("message_beats").update({ position: u.position }).eq("id", u.id);
    if (error) throw new Error(error.message);
  }
}

/** Permanently delete a Speak session (RLS-scoped to the owner). */
export async function deleteTalkSession(id: string): Promise<void> {
  const { error } = await supabase.from("talk_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Archive a story so it drops out of its domain's list. We soft-archive rather
 * than hard-delete because a real delete would cascade to the story's messages,
 * beats, and any talk_sessions linked to it (all FK ON DELETE CASCADE). The
 * story list already filters out status='archived', matching the domain
 * `archived` flag pattern. Reversible by flipping the status back.
 */
export async function archiveStory(id: string): Promise<void> {
  const { error } = await supabase.from("stories").update({ status: "archived" }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Persist one Speak session. Transcript comes from on-device recognition, so no
 * server/R2 round-trip; audio is not uploaded (audio_key stays null for now).
 * user_id is filled by the DB default (auth.uid()) under RLS.
 */
export async function createTalkSession(input: {
  storyId?: string | null;
  messageId?: string | null;
  transcript: string;
  durationSeconds: number;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("talk_sessions")
    .insert({
      story_id: input.storyId ?? null,
      message_id: input.messageId ?? null,
      transcript: input.transcript.trim() || null,
      duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data?.id as string) ?? null;
}
