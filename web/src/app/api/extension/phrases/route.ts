import OpenAI from "openai";
import { NextRequest } from "next/server";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recordUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

const MODEL = "gpt-4o-mini";

type PhraseInput = { segmentId?: unknown; text?: unknown };
type SegmentRow = {
  id: string;
  index: number;
  text: string;
  translation: string | null;
  start_time: number;
  end_time: number;
  video: { id: string; title: string; user_id: string } | null;
};

function normalize(value: string) {
  return value.toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

function asText(value: unknown, limit: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

async function explainPhrase(input: {
  phrase: string;
  current: SegmentRow;
  context: Pick<SegmentRow, "text" | "translation">[];
  userId: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");
  const transcript = input.context
    .map((segment, index) => `${index + 1}. ${segment.text}${segment.translation ? `\n   Korean: ${segment.translation}` : ""}`)
    .join("\n");
  const response = await new OpenAI({ apiKey }).chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{
      role: "user",
      content: `Explain one English expression for a Korean learner. The learner selected: "${input.phrase}"\n\nIt appears in this local video transcript:\n${transcript}\n\nReturn JSON only:\n{"kind":"word|phrasal_verb|pattern|idiom|phrase","meaning_ko":"natural Korean meaning in this context (one short sentence)","usage_note":"brief English explanation of the nuance or grammar in this context (max 24 words)"}\nDo not give a generic dictionary entry. Use the supplied surrounding context.`,
    }],
  });
  await recordUsage({
    userId: input.userId,
    label: `Phrase: ${input.phrase}`,
    provider: "openai",
    model: MODEL,
    kind: "phrase_explain",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  });
  const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const kind = asText(parsed.kind, 32);
  return {
    kind: ["word", "phrasal_verb", "pattern", "idiom", "phrase"].includes(kind) ? kind : "phrase",
    meaning: asText(parsed.meaning_ko, 500),
    note: asText(parsed.usage_note, 500),
  };
}

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

export async function GET(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin()
    .from("phrase_items")
    .select("id, text, kind, meaning_ko, usage_note, start_time, end_time, status, created_at, video:videos(title, video_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return extensionJson(req, { error: error.message }, { status: 500 });
  return extensionJson(req, { items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as PhraseInput | null;
  const segmentId = asText(body?.segmentId, 64);
  const text = asText(body?.text, 240);
  if (!/^[0-9a-f-]{36}$/i.test(segmentId) || !text) {
    return extensionJson(req, { error: "Select a phrase from one subtitle." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: rawSegment, error: segmentError } = await db
    .from("segments")
    .select("id, index, text, translation, start_time, end_time, video:videos!inner(id, title, user_id)")
    .eq("id", segmentId)
    .maybeSingle();
  const segment = rawSegment as SegmentRow | null;
  if (segmentError) return extensionJson(req, { error: segmentError.message }, { status: 500 });
  if (!segment || segment.video?.user_id !== userId) return extensionJson(req, { error: "Subtitle not found." }, { status: 404 });
  const normalized = normalize(text);
  if (!normalize(segment.text).includes(normalized)) {
    return extensionJson(req, { error: "The selected phrase must come from one subtitle." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await db
    .from("phrase_items")
    .select("id, text, kind, meaning_ko, usage_note, start_time, end_time, status, created_at")
    .eq("user_id", userId)
    .eq("segment_id", segment.id)
    .eq("normalized_text", normalized)
    .maybeSingle();
  if (existingError) return extensionJson(req, { error: existingError.message }, { status: 500 });
  if (existing) return extensionJson(req, { item: existing, alreadySaved: true });

  const { data: nearby, error: contextError } = await db
    .from("segments")
    .select("text, translation")
    .eq("video_id", segment.video.id)
    .gte("index", Math.max(0, segment.index - 2))
    .lte("index", segment.index + 2)
    .order("index");
  if (contextError) return extensionJson(req, { error: contextError.message }, { status: 500 });

  const { data: created, error: createError } = await db
    .from("phrase_items")
    .insert({
      user_id: userId,
      video_id: segment.video.id,
      segment_id: segment.id,
      text,
      normalized_text: normalized,
      start_time: segment.start_time,
      end_time: segment.end_time,
      source_context: { sentence: segment.text, translation: segment.translation, nearby: nearby ?? [] },
    })
    .select("id, text, kind, meaning_ko, usage_note, start_time, end_time, status, created_at")
    .single();
  if (createError) return extensionJson(req, { error: createError.message }, { status: 500 });

  try {
    const explanation = await explainPhrase({
      phrase: text,
      current: segment,
      context: (nearby ?? []) as Pick<SegmentRow, "text" | "translation">[],
      userId,
    });
    const { data: ready, error: updateError } = await db
      .from("phrase_items")
      .update({ kind: explanation.kind, meaning_ko: explanation.meaning, usage_note: explanation.note, status: "ready", updated_at: new Date().toISOString() })
      .eq("id", created.id)
      .select("id, text, kind, meaning_ko, usage_note, start_time, end_time, status, created_at")
      .single();
    if (updateError) throw updateError;
    return extensionJson(req, { item: ready, alreadySaved: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phrase explanation failed.";
    await db.from("phrase_items").update({ status: "failed", error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", created.id);
    return extensionJson(req, { item: { ...created, status: "failed" }, alreadySaved: false });
  }
}
