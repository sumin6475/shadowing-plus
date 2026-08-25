// Focus-specific coaching for a finished Speak session. MOBILE-ONLY.
// Phrase Bank retrieval intentionally lives in talk-phrase-suggest so it cannot
// dilute this coach's diagnosis or output contract.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";
const MAX_MOMENTS = 1;
const FOCUS_VALUES = ["grammar", "structure", "advanced", "pattern"] as const;
type TalkFocus = (typeof FOCUS_VALUES)[number];
const DIAGNOSIS_TAGS = [
  "[Circumlocution]",
  "[Rambling & Lack of Structure]",
  "[Casual-Business Mismatch]",
  "[Monotonous Pattern & Fillers]",
  "[Overuse of Filler Words]",
  "[Contextual Grammar Error]",
  "[Lack of Professional Nuance]",
  "[Direct Translation]",
  "[Impactless Opening/Closing]",
  "[Self-Correction Fatigue]",
] as const;
type DiagnosisTag = (typeof DIAGNOSIS_TAGS)[number];
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

interface TalkMoment {
  label: string;
  said: string;
  diagnosisTag: DiagnosisTag;
  action: string;
  explanation: string;
  /** Full polished sentence; kept as `want` for older mobile builds. */
  want: string;
  /** Combined action + explanation for older mobile builds. */
  why: string;
  /** Kept empty for backward compatibility. Exactly one suggestion is allowed. */
  example: string;
  exampleWhy: string;
  phraseItemId: string | null;
  source: "saved" | "generated";
  sourceLabel: string | null;
}

const clamp = (value: unknown, limit: number) =>
  (typeof value === "string" ? value : "").replace(/\s+/g, " ").trim().slice(0, limit);

const diagnosisTag = (value: unknown, focus: TalkFocus): DiagnosisTag => {
  const candidate = clamp(value, 80);
  if ((DIAGNOSIS_TAGS as readonly string[]).includes(candidate)) return candidate as DiagnosisTag;
  if (focus === "grammar") return "[Contextual Grammar Error]";
  if (focus === "structure") return "[Rambling & Lack of Structure]";
  if (focus === "advanced") return "[Lack of Professional Nuance]";
  return "[Monotonous Pattern & Fillers]";
};

function parseMoments(
  raw: string,
  focus: TalkFocus,
): { moments: TalkMoment[]; valid: boolean } {
  let obj: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { moments: [], valid: false };
    obj = parsed as Record<string, unknown>;
  } catch {
    return { moments: [], valid: false };
  }
  if (!Array.isArray(obj.moments)) return { moments: [], valid: false };
  const rows = obj.moments;
  const out: TalkMoment[] = [];
  for (const value of rows) {
    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const said = clamp(row.said, 400);
    if (!said) continue;
    const want = clamp(row.improvedSentence ?? row.improved_sentence ?? row.want, 420);
    if (!want) continue;
    const rawAction = clamp(row.action, 360);
    const explanation = clamp(row.explanation, 800);
    if (!/^I would suggest\b/i.test(rawAction) || !explanation) continue;
    const action = rawAction;
    out.push({
      label: clamp(row.label, 40) || "A moment",
      said,
      diagnosisTag: diagnosisTag(row.diagnosisTag ?? row.diagnosis_tag, focus),
      action,
      explanation,
      want,
      why: [action, explanation].filter(Boolean).join(" "),
      example: "",
      exampleWhy: "",
      phraseItemId: null,
      source: "generated",
      sourceLabel: null,
    });
    if (out.length >= MAX_MOMENTS) break;
  }
  // An explicit empty array means the coach found no genuine issue. Rows that
  // fail the contract are model-output errors and must not be shown as praise.
  return { moments: out, valid: rows.length === 0 || out.length > 0 };
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as {
    transcript?: unknown;
    topic?: unknown;
    focus?: unknown;
    level?: unknown;
  } | null;
  const transcript = clamp(body?.transcript, 4000);
  const topic = clamp(body?.topic, 200) || null;
  const rawFocus = typeof body?.focus === "string" ? body.focus : "";
  const focus: TalkFocus = (FOCUS_VALUES as readonly string[]).includes(rawFocus)
    ? (rawFocus as TalkFocus)
    : "grammar";
  // Self-reported CEFR level from Profile → English level. Optional so older
  // app builds (which omit it) keep working; unknown values fall back to b1.
  const LEVEL_VALUES = ["a2", "b1", "b2", "c1"] as const;
  type EnglishLevel = (typeof LEVEL_VALUES)[number];
  const rawLevel = typeof body?.level === "string" ? body.level : "";
  const level: EnglishLevel = (LEVEL_VALUES as readonly string[]).includes(rawLevel)
    ? (rawLevel as EnglishLevel)
    : "b1";
  if (!transcript) return json({ error: "Say something first." }, 400);
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OpenAI is not configured." }, 500);

  const focusGuide: Record<TalkFocus, string> = {
    grammar:
      "FOCUS = Grammar. Target a real contextual grammar slip that an intermediate speaker makes under pressure: tense, conditionals, prepositions, agreement, articles, or word order in a complex sentence. Do not rewrite merely awkward but correct English.",
    structure:
      "FOCUS = Structure. Find the highest-impact rambling or logic problem. Reorganize it with a professional framework such as core point → cause → consequence, problem → cause → solution, or PREP. Do not collapse this into sentence-level grammar.",
    advanced:
      "FOCUS = Advanced words. Find circumlocution, vague wording, or a casual-business mismatch that weakens professional delivery. Replace it with clean, natural, high-level business vocabulary actually used in tech and business. Preserve correct domain jargon and natural phrases; never manufacture an academic, hyper-complex, or clunkier synonym.",
    pattern:
      "FOCUS = Pattern. Find a hesitant, repetitive, filler-heavy, or monotonous framing pattern. Use one authoritative reusable frame, but return a fully improved sentence rather than an ellipsis or a second example.",
  };

  const levelGuide: Record<EnglishLevel, string> = {
    a2: "The speaker is A2 (basic). Suggest short, high-frequency everyday wording they can actually reproduce. Never introduce idioms, formal register, or vocabulary above B1.",
    b1: "The speaker is B1 (intermediate). Suggest natural, common phrasing one small step above their current sentence. Avoid rare vocabulary or heavily formal constructions.",
    b2: "The speaker is B2 (upper intermediate). Suggest fluent, precise phrasing including common professional collocations; light idiomatic usage is fine when it is genuinely common.",
    c1: "The speaker is C1 (advanced). Suggest polished professional-grade phrasing with sharp nuance; do not water suggestions down to textbook simplicity.",
  };

  const coachPrompt = `
You are an elite English Speech & Speaking Coach who elevates Intermediate ESL/EFL professionals, founders, and ambitious learners to Advanced and Professional proficiency.

Analyze the raw spoken transcript and return ONE precise, high-impact piece of feedback based only on the selected FOCUS.

CRITICAL SELECTION RULES
1. Do not fix correct English, natural domain jargon, or already effective professional phrasing. Never replace terms such as "subtle UX" or "phrase recommendation" with artificial wording.
2. In Advanced words, do not replace simple language with overly academic, unnatural, or hyper-complex jargon. Prefer clean business vocabulary that professionals actually use, such as "valuable", "structured outputs", or "core capabilities".
3. Target a genuine pain point only: hesitation, rambling logic, a contextual grammar slip, overly casual wording, weak professional nuance, or repetitive sentence framing.
4. The same critical transcript segment may be selected across different focus modes, but the diagnosis and improvement must strictly address the requested focus.
5. Return exactly ONE polished recommendation. Never return an alternative, "or", a second recommendation, or a second example.
6. Be authoritative, supportive, precise, and professional.
7. Copy "said" verbatim from the transcript. Never invent facts.
8. If no genuine issue matches the selected focus, return an empty moments array instead of correcting good English.

TARGET SELECTION LOGIC
1. Read the full transcript and identify natural industry terms such as UX, algorithm, feedback, or pilot test. Exclude them from correction.
2. Find where the speaker sounds unprofessional, redundant, ungrammatical, hesitant, or structurally lost.
3. Select the single mistake that damages the speaker's credibility most under the requested focus.

Choose exactly ONE diagnosisTag from this list:
${DIAGNOSIS_TAGS.join("\n")}

FEEDBACK CONTRACT
- action must begin with "I would suggest" and state one concrete change.
- explanation must provide 2–3 concise sentences of sufficient evidence: identify the issue, explain its impact on professional speaking, and justify the revision.
- improvedSentence must be the single polished result. Structure feedback may use two tightly connected sentences when that is necessary to repair the logic.
- Never produce a second recommendation.

FOCUS-SPECIFIC DIRECTION
${focusGuide[focus]}

LEARNER LEVEL
${levelGuide[level]}

REFERENCE EXAMPLES

Structure:
said: "Human participants feels like AI is useful when AI generate really AI like things for example summary yeah most of all summaries so when AI generate summaries, they feel like AI is useful"
diagnosisTag: "[Rambling & Lack of Structure]"
action: "I would suggest replacing the repeated phrases with a concise statement using “value” and “utility.”"
explanation: "Repeating similar phrases in a row signals hesitation and makes the key insight hard to follow during a presentation. Consolidating the point into a clear cause-and-effect structure projects authority and allows the audience to grasp the finding immediately."
improvedSentence: "Participants perceive AI as most valuable when it generates concise, structured outputs like summaries."

Advanced words:
said: "Human participants feels like AI is useful when AI generate really AI like things for example summary yeah most of all summaries"
diagnosisTag: "[Casual-Business Mismatch]"
action: "I would suggest replacing the vague phrase “AI-like things” with “structured outputs.”"
explanation: "The phrase “AI-like things” sounds informal and imprecise in a research or product context. “Structured outputs” communicates the specific value of the AI feature clearly without sounding conversational or overly academic."
improvedSentence: "Participants find AI most valuable when it delivers structured outputs, particularly text summaries."

Grammar:
said: "I am not sure the feedback I will have after a session will great or not"
diagnosisTag: "[Contextual Grammar Error]"
action: "I would suggest replacing “will great” with “will be effective.”"
explanation: "“Great” is an adjective that requires the linking verb “be.” In a professional product evaluation, “effective” also establishes a clearer standard than the generic word “great.”"
improvedSentence: "I’m not sure whether the feedback generated after a session will be effective."

Pattern:
said: "but the thing is the flow of users we expected it was not that useful so I changed"
diagnosisTag: "[Monotonous Pattern & Fillers]"
action: "I would suggest using the “Contrary to our expectations, [issue]” framing pattern."
explanation: "The filler phrase “the thing is” makes the statement sound hesitant. A deliberate contrast frame communicates an unexpected result and the resulting decision with confidence."
improvedSentence: "However, contrary to our expectations, the user flow proved unintuitive, so I revised it based on actual use cases."
`.trim();

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: coachPrompt + "\n\nReturn JSON only.",
        },
        {
          role: "user",
          content:
            (topic ? `Topic / Story: ${topic}\n\n` : "") +
            `Coach only for this focus: ${focus}.\n\n` +
            `My transcript (verbatim):\n"""${transcript}"""\n\n` +
            'Return exactly this JSON shape: {"moments":[{"label":"max 4 words","said":"verbatim span","diagnosisTag":"one exact bracketed tag","action":"I would suggest...","explanation":"2–3 concise evidence sentences","improvedSentence":"one polished recommendation"}]}. Return exactly one array item, or {"moments":[]} if no genuine issue matches.',
        },
      ],
    }),
  });
  if (!openaiRes.ok) return json({ error: `Couldn’t analyze this session (OpenAI ${openaiRes.status}).` }, 502);
  const data = await openaiRes.json();
  const parsed = parseMoments(data?.choices?.[0]?.message?.content ?? "{}", focus);
  if (!parsed.valid) return json({ error: "Couldn’t validate the coaching response." }, 502);
  const moments = parsed.moments;

  return json({ moments });
});
