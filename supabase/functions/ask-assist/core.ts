// Pure core of the Ask assistant: prompts, the strict output schema, input
// validation and reply parsing. No Deno or Supabase imports, so the golden
// harness (scripts/ask-assist/golden.mjs) runs the exact same prompt under
// Node's type stripping. Keep it erasable-syntax TypeScript (no enums,
// namespaces or parameter properties) and import it with the `.ts` extension.

export const MODEL = "gpt-4o-mini";
export const MAX_TURNS = 6;
export const DAILY_LIMIT = 50;
export const MAX_USER_CHARS = 800;
const MAX_ASSISTANT_CHARS = 2400;

export type AskMode = "how_to_say" | "note";
export const MODES: readonly AskMode[] = ["how_to_say", "note"];

/** Hard ceilings, not targets: the prompts ask for far less. A reply cut off
 *  here is a bug (finish_reason "length"), so the cap sits well above the
 *  expected size (≈350 / ≈700) instead of on it. */
export const MAX_OUTPUT_TOKENS: Record<AskMode, number> = { how_to_say: 700, note: 1100 };

/** gpt-4o-mini list prices (mirror of web/src/lib/usage.ts). */
const PRICE_PER_MILLION = { input: 0.15, output: 0.6 };

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskRequest {
  mode: AskMode;
  messages: AskMessage[];
  l1: string;
}

/** Learner first languages (mirror of apps/mobile/src/lib/first-language.ts).
 *  Lowercased keys: the client sends `zh-Hant` verbatim. */
const L1_NAMES: Record<string, string> = {
  en: "English",
  ko: "Korean",
  "zh-hant": "Traditional Chinese (as written in Taiwan)",
  ja: "Japanese",
  es: "Spanish",
  ru: "Russian",
};
const DEFAULT_L1 = "ko";

export function learnerLanguage(value: unknown): string {
  const code = typeof value === "string" ? value.trim().toLowerCase() : "";
  return L1_NAMES[code] ?? L1_NAMES[DEFAULT_L1];
}

const text = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "").trim().slice(0, limit);

/** Validates the client body. Returns the request or a learner-facing error.
 *  History is trimmed to the last MAX_TURNS exchanges and must end on a user
 *  turn — that is the question being asked now. */
export function parseAskBody(body: unknown): { ok: true; request: AskRequest } | { ok: false; error: string; code: string } {
  const raw = (body ?? {}) as { mode?: unknown; messages?: unknown; first_language?: unknown };
  const mode = MODES.find((m) => m === raw.mode);
  if (!mode) return { ok: false, error: "Unknown Ask mode.", code: "ask_bad_mode" };
  if (!Array.isArray(raw.messages)) return { ok: false, error: "Ask something first.", code: "ask_empty" };

  const messages: AskMessage[] = [];
  for (const item of raw.messages as unknown[]) {
    const m = (item ?? {}) as { role?: unknown; content?: unknown };
    if (m.role !== "user" && m.role !== "assistant") continue;
    const content = text(m.content, m.role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS);
    if (content) messages.push({ role: m.role, content });
  }
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return { ok: false, error: "Ask something first.", code: "ask_empty" };

  let trimmed = messages.slice(-MAX_TURNS * 2);
  // A trimmed window must not open on an orphan assistant reply.
  while (trimmed.length && trimmed[0].role === "assistant") trimmed = trimmed.slice(1);
  return { ok: true, request: { mode, messages: trimmed, l1: learnerLanguage(raw.first_language) } };
}

// ── Prompts ────────────────────────────────────────────────────────────────
// The fixed per-mode prompt goes FIRST and never varies per learner, so the
// prefix stays identical across requests and OpenAI's automatic prompt caching
// can apply. Learner language arrives in a second, short system message.

const SHARED_RULES = `You are Ask, the expression coach inside Myne, an app for adult learners practicing spoken English.

Quality rules (most important):
- Give only English that a native speaker would actually say in that situation today. No textbook phrasing, no word-for-word translation of the learner's sentence, no rare idioms used to show off. If the literal translation is what a textbook would print (e.g. "Thank you for your hard work" for 수고하셨습니다), prefer what people really say and mention the textbook version only if it is also natural.
- Prefer short, high-frequency, reusable chunks.
- Mark register inside "when" when it matters (casual / neutral / work / formal).
- Every English example must be a complete, natural sentence.

Learner-language quality (equally important):
- Every learner-language field ("meaning", "l1", "nuance", "tip", "text", "situation", "follow_ups") must read like something a native speaker of that language would naturally say — never translationese. Translate the feeling, not the words.
- Drop pronouns and possessives where that language naturally drops them (Korean: no 당신/그들/나는 unless needed; Japanese: no あなたの).
- "meaning" glosses the real sense of the chunk, not its literal parts (e.g. "I can't seem to" = 아무리 해도 ~가 안 된다, not ~할 수 없는 것 같다).

Reply types — choose exactly one:
- "card": the learner asks about a NEW thing to say or a new expression to understand.
- "answer": a follow-up about something already discussed in this conversation (difference between two expressions, more casual version, why, can I say X instead). Keep it short.
- "off_topic": the message has nothing to do with English expression or speaking (coding, weather, math, general chat). Return only the type.

Ambiguity: never ask the learner a clarifying question. Before answering, check whether the meaning depends on WHO (who is sick, who is upset, whose fault), on the listener (friend / colleague / boss / stranger), or on the setting. If it does, branch inside the reply: give one expression per reading and say in "when" which reading it fits. Korean and Japanese often omit the subject — treat a missing subject as a reason to branch.

Language: every field named "en" and every English draft is English. All other text fields are in the learner's first language (given in the next system message). Keep explanations brief and concrete — one to three sentences. Never pad.

"follow_ups": exactly two short questions the learner would plausibly tap next, in the learner's first language, phrased as the learner speaking. They must fit THIS conversation: never suggest something the reply already covers (no "at work?" if the situation is already at work).`;

const HOW_TO_SAY_PROMPT = `${SHARED_RULES}

Mode: HOW TO SAY — fast lookup.
The learner either (a) writes something in their own language and wants to know how to say it in English, or (b) gives an English chunk, word or sentence and wants its meaning and usage.

For a "card":
- "query": the learner's search term, cleaned up, in the language they typed it.
- "expressions": 1 to 3 items. One item when the meaning is clear; one per reading when it branches. "meaning" is a short natural gloss in the learner's language; "when" names the reading/situation and register ("" only if there is a single item and nothing to add).
- "nuance": what the main expression feels like and how it differs from the obvious alternative. 1–3 sentences, specific (name the feeling), not generic ("used in daily life").
- "examples": exactly 3 everyday sentences using the main expression(s), each with a natural translation "l1".
- "tip": one line telling the learner which option to pick for the most likely situation.

For an "answer": "text" explains in 1–4 sentences; "expressions" holds 0–2 new expressions only if the follow-up introduced them, each with one example.

Example (Korean learner) — input "눈치 보여":
{"reply":{"type":"card","query":"눈치 보여","expressions":[{"en":"I feel like I'm walking on eggshells.","meaning":"조심조심, 계속 눈치 보는 중이야","when":"분위기가 살얼음판일 때"},{"en":"I feel awkward leaving before everyone else.","meaning":"먼저 가기가 눈치 보여","when":"특정 행동이 신경 쓰일 때 · 회사"}],"nuance":"walking on eggshells는 상대 기분을 건드릴까 봐 계속 조마조마한 느낌이에요. 특정 행동 하나가 신경 쓰이는 거라면 feel awkward + 동사ing가 더 자연스러워요.","examples":[{"en":"Everyone's been walking on eggshells since the meeting.","l1":"회의 끝나고 다들 눈치만 보고 있어."},{"en":"I feel awkward asking for another day off.","l1":"또 휴가 내기가 눈치 보여."},{"en":"You don't have to walk on eggshells around me.","l1":"나한테 그렇게 눈치 안 봐도 돼."}],"tip":"퇴근이나 휴가처럼 행동 하나가 신경 쓰이면 두 번째를 쓰세요.","follow_ups":["상사한테 말할 땐?","좀 더 가볍게 말하면?"]}}`;

const NOTE_PROMPT = `${SHARED_RULES}

Mode: NOTE — help write a short speaking note.
A note is a short script the learner will say out loud: Opening, Body, Closing. The learner describes a situation ("tell my manager I need a day off") or a domain ("explaining a bug in standup").

For a "card":
- "situation": one line in the learner's language — who they are talking to and the setting.
- "draft": "opening", "body", "closing" in natural SPOKEN English at a register that fits the listener. Opening 1–2 sentences, body 2–3 sentences with real substance (reason, detail, what happens next), closing 1–2 sentences. Sound like a person talking: no email greetings ("Hi [name],"), no letter sign-offs. Placeholders, if any, are short English in square brackets, e.g. [your name].
- "key_phrases": 3 to 5 reusable chunks taken from the draft that the learner can reuse in other situations (e.g. "I was wondering if…", "take next Friday off") — not whole content-specific sentences, not trivial words.
- "terms": 3 to 6 words or short terms people commonly say in this setting, whenever the setting has its own vocabulary — any workplace function (engineering, sales, design, HR…), medical, legal, finance, travel/airport, housing, school, customer service. Use an empty array only for purely social small talk.

For an "answer" (a small follow-up like "make the closing shorter", "what does X mean"):
- "text": 1–3 sentences explaining what changed or answering the question.
- "draft_patch": rewrite ONLY the sections the learner asked to change. Every other section MUST be "" — do not copy unchanged sections.
- "expressions": 0–2 new expressions if any, each with one example.
If the learner asks for a whole new version (different listener, different register, different situation), return a new "card" instead of an "answer".`;

const PROMPTS: Record<AskMode, string> = { how_to_say: HOW_TO_SAY_PROMPT, note: NOTE_PROMPT };

// ── Strict output schema ───────────────────────────────────────────────────
// Strict structured outputs need an object root, `additionalProperties: false`
// and every property listed in `required`. The reply union therefore sits under
// `reply`, and "absent" is expressed as "" or [] rather than optional keys.
// Count limits (1–3, exactly 3, …) are stated in the prompt and enforced again
// in normalizeReply, not in the schema.

const str = { type: "string" } as const;
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const arr = (items: unknown) => ({ type: "array", items });
const tag = (value: string) => ({ type: "string", enum: [value] });

const example = obj({ en: str, l1: str });
const expression = obj({ en: str, meaning: str, when: str });
const expressionWithExample = obj({ en: str, meaning: str, when: str, example });
const draft = obj({ opening: str, body: str, closing: str });
const offTopic = obj({ type: tag("off_topic") });

const howToSayCard = obj({
  type: tag("card"),
  query: str,
  expressions: arr(expression),
  nuance: str,
  examples: arr(example),
  tip: str,
  follow_ups: arr(str),
});
const howToSayAnswer = obj({ type: tag("answer"), text: str, expressions: arr(expressionWithExample), follow_ups: arr(str) });

const noteCard = obj({
  type: tag("card"),
  situation: str,
  draft,
  key_phrases: arr(expressionWithExample),
  terms: arr(obj({ en: str, meaning: str })),
  follow_ups: arr(str),
});
const noteAnswer = obj({
  type: tag("answer"),
  text: str,
  draft_patch: draft,
  expressions: arr(expressionWithExample),
  follow_ups: arr(str),
});

export const SCHEMAS: Record<AskMode, unknown> = {
  how_to_say: obj({ reply: { anyOf: [howToSayCard, howToSayAnswer, offTopic] } }),
  note: obj({ reply: { anyOf: [noteCard, noteAnswer, offTopic] } }),
};

/** Chat Completions body for one Ask turn. */
export function buildOpenAIRequest(request: AskRequest) {
  return {
    model: MODEL,
    temperature: 0.3,
    max_tokens: MAX_OUTPUT_TOKENS[request.mode],
    response_format: {
      type: "json_schema",
      json_schema: { name: `ask_${request.mode}`, strict: true, schema: SCHEMAS[request.mode] },
    },
    messages: [
      { role: "system", content: PROMPTS[request.mode] },
      { role: "system", content: `The learner's first language is ${request.l1}. Write every explanation field in ${request.l1}.` },
      ...request.messages,
    ],
  };
}

// ── Reply types + normalization ────────────────────────────────────────────

export interface Example { en: string; l1: string }
export interface Expression { en: string; meaning: string; when: string }
export interface ExpressionWithExample extends Expression { example: Example }
export interface Draft { opening: string; body: string; closing: string }

export interface HowToSayCard {
  type: "card"; query: string; expressions: Expression[]; nuance: string;
  examples: Example[]; tip: string; follow_ups: string[];
}
export interface HowToSayAnswer { type: "answer"; text: string; expressions: ExpressionWithExample[]; follow_ups: string[] }
export interface NoteCard {
  type: "card"; situation: string; draft: Draft; key_phrases: ExpressionWithExample[];
  terms: { en: string; meaning: string }[]; follow_ups: string[];
}
export interface NoteAnswer { type: "answer"; text: string; draft_patch: Draft; expressions: ExpressionWithExample[]; follow_ups: string[] }
export interface OffTopic { type: "off_topic" }

export type AskReply = HowToSayCard | HowToSayAnswer | NoteCard | NoteAnswer | OffTopic;

const list = <T>(value: unknown, max: number, map: (v: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(value) ? value : [])
    .map((v) => map((v ?? {}) as Record<string, unknown>))
    .filter((v): v is T => v !== null)
    .slice(0, max);

const ex = (v: unknown): Example => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { en: text(o.en, 300), l1: text(o.l1, 300) };
};
const expr = (o: Record<string, unknown>): Expression | null => {
  const en = text(o.en, 200);
  return en ? { en, meaning: text(o.meaning, 200), when: text(o.when, 160) } : null;
};
const exprEx = (o: Record<string, unknown>): ExpressionWithExample | null => {
  const base = expr(o);
  return base ? { ...base, example: ex(o.example) } : null;
};
const drf = (v: unknown): Draft => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { opening: text(o.opening, 600), body: text(o.body, 900), closing: text(o.closing, 600) };
};
const followUps = (v: unknown): string[] =>
  (Array.isArray(v) ? v : [])
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map((s) => s.trim().slice(0, 80))
    .slice(0, 2);

/** Parses the model's JSON and re-applies the count limits the schema can't
 *  express. Returns null when the payload is unusable. A card without its core
 *  content is treated as unusable rather than rendered half-empty. */
export function normalizeReply(mode: AskMode, raw: string): AskReply | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const r = ((parsed ?? {}) as { reply?: Record<string, unknown> }).reply;
  if (!r || typeof r !== "object") return null;

  if (r.type === "off_topic") return { type: "off_topic" };

  if (r.type === "answer") {
    const answerText = text(r.text, 1200);
    if (!answerText) return null;
    const expressions = list(r.expressions, 2, exprEx);
    const follow = followUps(r.follow_ups);
    return mode === "note"
      ? { type: "answer", text: answerText, draft_patch: drf(r.draft_patch), expressions, follow_ups: follow }
      : { type: "answer", text: answerText, expressions, follow_ups: follow };
  }

  if (r.type !== "card") return null;
  if (mode === "how_to_say") {
    const expressions = list(r.expressions, 3, expr);
    if (!expressions.length) return null;
    return {
      type: "card",
      query: text(r.query, 200),
      expressions,
      nuance: text(r.nuance, 800),
      examples: list(r.examples, 3, (o) => (text(o.en, 300) ? ex(o) : null)),
      tip: text(r.tip, 300),
      follow_ups: followUps(r.follow_ups),
    };
  }
  const d = drf(r.draft);
  if (!d.opening && !d.body && !d.closing) return null;
  return {
    type: "card",
    situation: text(r.situation, 300),
    draft: d,
    key_phrases: list(r.key_phrases, 5, exprEx),
    terms: list(r.terms, 6, (o) => {
      const en = text(o.en, 120);
      return en ? { en, meaning: text(o.meaning, 200) } : null;
    }),
    follow_ups: followUps(r.follow_ups),
  };
}

/** How a past reply is sent back as an assistant turn. The client and the
 *  golden harness must agree on this, so it lives here. Compact JSON keeps the
 *  history cheap and shows the model its own prior structure. */
export function assistantContent(reply: AskReply): string {
  return JSON.stringify({ reply });
}

export function costUsd(inputTokens: number, outputTokens: number): number {
  const cost = (inputTokens * PRICE_PER_MILLION.input + outputTokens * PRICE_PER_MILLION.output) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
