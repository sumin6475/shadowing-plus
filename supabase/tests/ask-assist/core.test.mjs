// Unit tests for the Ask core. Run: node --test supabase/tests/ask-assist/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildOpenAIRequest,
  costUsd,
  learnerLanguage,
  MAX_TURNS,
  MAX_USER_CHARS,
  normalizeReply,
  noteHistoryContext,
  parseAskBody,
  phrasePickFor,
  POINT_TAG_TEXT,
  pointTrail,
  readPointTag,
  SCHEMAS,
} from "../../functions/ask-assist/core.ts";

const user = (content) => ({ role: "user", content });
const bot = (content) => ({ role: "assistant", content });

test("parseAskBody rejects unknown modes and empty or assistant-last history", () => {
  assert.equal(parseAskBody({ mode: "chat", messages: [user("hi")] }).code, "ask_bad_mode");
  assert.equal(parseAskBody({ mode: "note" }).code, "ask_empty");
  assert.equal(parseAskBody({ mode: "note", messages: [user("a"), bot("b")] }).code, "ask_empty");
  assert.equal(parseAskBody({ mode: "note", messages: [user("   ")] }).code, "ask_empty");
  assert.equal(parseAskBody(null).code, "ask_bad_mode");
});

test("parseAskBody keeps the last MAX_TURNS exchanges and never opens on an assistant turn", () => {
  const messages = [];
  for (let i = 0; i < 10; i++) messages.push(user(`q${i}`), bot(`a${i}`));
  messages.push(user("now"));
  const result = parseAskBody({ mode: "how_to_say", messages });
  assert.equal(result.ok, true);
  const kept = result.request.messages;
  assert.ok(kept.length <= MAX_TURNS * 2);
  assert.equal(kept[0].role, "user");
  assert.equal(kept.at(-1).content, "now");
});

test("parseAskBody drops malformed turns and clamps user text", () => {
  const long = "x".repeat(MAX_USER_CHARS + 50);
  const result = parseAskBody({ mode: "how_to_say", messages: [{ role: "system", content: "evil" }, { role: "user" }, user(long)] });
  assert.equal(result.ok, true);
  assert.equal(result.request.messages.length, 1);
  assert.equal(result.request.messages[0].content.length, MAX_USER_CHARS);
});

test("learnerLanguage maps script-tagged codes and falls back to Korean", () => {
  assert.match(learnerLanguage("zh-Hant"), /Traditional Chinese/);
  assert.equal(learnerLanguage("ES"), "Spanish");
  assert.equal(learnerLanguage(undefined), "Korean");
  assert.equal(learnerLanguage("fr"), "Korean");
});

test("buildOpenAIRequest keeps the fixed prompt first so the prefix is cacheable", () => {
  const a = buildOpenAIRequest({ mode: "how_to_say", messages: [user("속상해")], l1: "Korean" });
  const b = buildOpenAIRequest({ mode: "how_to_say", messages: [user("¿cómo digo?")], l1: "Spanish" });
  assert.equal(a.messages[0].content, b.messages[0].content);
  assert.notEqual(a.messages[1].content, b.messages[1].content);
  assert.equal(a.response_format.json_schema.strict, true);
});

test("Note always asks until the learner chooses Draft now", () => {
  const first = { mode: "note", messages: [user("새 팀에서 자기소개")], l1: "Korean" };
  assert.equal(buildOpenAIRequest(first).response_format.json_schema.name, "ask_note_intake");
  const clarify = bot(JSON.stringify({ reply: { type: "clarify", text: "", question: "어떤 일을 맡으셨나요?" } }));
  const messages = [user("새 팀에서 자기소개"), clarify, user("디자인 일을 해요"), clarify, user("협업을 강조하고 싶어요")];
  assert.equal(buildOpenAIRequest({ ...first, messages }).response_format.json_schema.name, "ask_note_intake");
  assert.equal(buildOpenAIRequest({ ...first, draftNow: true }).response_format.json_schema.name, "ask_note_draft");
  const withDraft = [user("새 팀에서 자기소개"), bot(JSON.stringify({ reply: { type: "card", draft: { body: "I'm a designer." } } })), user("더 짧게")];
  assert.equal(buildOpenAIRequest({ ...first, messages: withDraft }).response_format.json_schema.name, "ask_note_intake");
  const newTopic = [...withDraft, bot(JSON.stringify({ reply: { type: "clarify", text: "", question: "왜요?" } })), user("제 의견은 이래요")];
  assert.equal(buildOpenAIRequest({ ...first, messages: newTopic }).response_format.json_schema.name, "ask_note_intake");
  assert.equal(buildOpenAIRequest({ ...first, messages: newTopic, draftNow: true }).response_format.json_schema.name, "ask_note_draft");
  assert.deepEqual(SCHEMAS.note_intake.properties.reply.anyOf.map((option) => option.properties.type.enum[0]), ["clarify", "off_topic"]);
  assert.deepEqual(SCHEMAS.note_draft.properties.reply.anyOf.map((option) => option.properties.type.enum[0]), ["card", "off_topic"]);
  assert.equal(buildOpenAIRequest(first).messages[0].content, buildOpenAIRequest({ ...first, draftNow: true }).messages[0].content);
});

test("parseAskBody accepts only an explicit Draft now flag", () => {
  assert.equal(parseAskBody({ mode: "note", messages: [user("초안 보여줘")], draft_now: true }).request.draftNow, true);
  assert.equal(parseAskBody({ mode: "note", messages: [user("초안 보여줘")], draft_now: "true" }).request.draftNow, false);
});

test("Note context accepts a valid Note id but never client-supplied facts", () => {
  const id = "e59566b6-847d-4b24-b8b5-0cf73323c841";
  const parsed = parseAskBody({ mode: "note", messages: [user("Introduce my work")], note_id: id, confirmedFacts: ["I was CEO"] });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.request.noteId, id);
  assert.equal(parsed.request.confirmedFacts, undefined);
  assert.equal(parseAskBody({ mode: "note", messages: [user("x")], note_id: "not-a-uuid" }).request.noteId, null);
});

/** Every object in a strict schema must list all its properties as required
 *  and forbid extras; the root must be an object, not a union. */
function assertStrict(node, path = "$") {
  if (!node || typeof node !== "object") return;
  if (node.type === "object") {
    assert.equal(node.additionalProperties, false, `${path} additionalProperties`);
    assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), `${path} required`);
    for (const [key, child] of Object.entries(node.properties)) assertStrict(child, `${path}.${key}`);
  }
  if (node.items) assertStrict(node.items, `${path}[]`);
  if (node.anyOf) node.anyOf.forEach((child, i) => assertStrict(child, `${path}|${i}`));
}

test("schemas satisfy OpenAI strict-mode rules", () => {
  for (const schema of Object.values(SCHEMAS)) {
    assert.equal(schema.type, "object");
    assertStrict(schema);
  }
});

const card = {
  type: "card",
  query: "몸이 안 좋으면 속상해",
  expressions: [
    { en: "I feel down when I'm not feeling well.", meaning: "몸이 안 좋으면 기분이 가라앉아.", when: "내가 아플 때" },
    { en: "It makes me sad when you're not feeling well.", meaning: "네가 아프면 나도 속상해.", when: "상대가 아플 때" },
    { en: "a", meaning: "", when: "" },
    { en: "b", meaning: "", when: "" },
  ],
  nuance: "feel down은 기분이 가라앉는 느낌이에요.",
  examples: [1, 2, 3, 4].map((n) => ({ en: `Example ${n}.`, l1: `예문 ${n}` })),
  tip: "내 얘기라면 첫 번째.",
  follow_ups: ["더 캐주얼하게?", "회사에서는?", "extra"],
};

test("normalizeReply clamps counts the schema cannot express", () => {
  const reply = normalizeReply("how_to_say", JSON.stringify({ reply: card }));
  assert.equal(reply.type, "card");
  assert.equal(reply.expressions.length, 3);
  assert.equal(reply.examples.length, 3);
  assert.equal(reply.follow_ups.length, 2);
});

test("normalizeReply rejects unusable payloads instead of rendering them half-empty", () => {
  assert.equal(normalizeReply("how_to_say", "not json"), null);
  assert.equal(normalizeReply("how_to_say", JSON.stringify({})), null);
  assert.equal(normalizeReply("how_to_say", JSON.stringify({ reply: { ...card, expressions: [] } })), null);
  assert.equal(normalizeReply("note", JSON.stringify({ reply: { type: "card", draft: { opening: "", body: "", closing: "" } } })), null);
  assert.equal(normalizeReply("note", JSON.stringify({ reply: { type: "answer", text: "" } })), null);
});

test("normalizeReply shapes answers per mode and passes off_topic through", () => {
  assert.deepEqual(normalizeReply("note", JSON.stringify({ reply: { type: "off_topic" } })), { type: "off_topic" });
  const noteAnswer = normalizeReply(
    "note",
    JSON.stringify({ reply: { type: "answer", text: "Closing을 줄였어요.", draft_patch: { opening: "", body: "", closing: "See you!" }, expressions: [], follow_ups: [] } }),
  );
  assert.equal(noteAnswer.draft_patch.closing, "See you!");
  const howAnswer = normalizeReply("how_to_say", JSON.stringify({ reply: { type: "answer", text: "차이는…", draft_patch: { closing: "x" } } }));
  assert.equal("draft_patch" in howAnswer, false);
});

test("normalizeReply keeps one usable Note clarification question", () => {
  const raw = JSON.stringify({ reply: { type: "clarify", text: "자기소개를 준비하시네요.", question: "새 팀에서 맡은 역할이 무엇인가요?" } });
  assert.deepEqual(normalizeReply("note", raw), { type: "clarify", text: "자기소개를 준비하시네요.", question: "새 팀에서 맡은 역할이 무엇인가요?" });
  assert.equal(normalizeReply("how_to_say", raw), null);
  assert.equal(normalizeReply("note", JSON.stringify({ reply: { type: "clarify", text: "", question: " " } })), null);
});

test("costUsd prices per model and meters unknown models at zero", () => {
  assert.equal(costUsd(1_000_000, 0, "gpt-4o-mini"), 0.15);
  assert.equal(costUsd(0, 1_000_000, "gpt-4o-mini"), 0.6);
  assert.equal(costUsd(1500, 400, "gpt-4o-mini"), 0.000465);
  assert.equal(costUsd(1_000_000, 1_000_000, "gpt-4.1-mini"), 2);
  assert.equal(costUsd(1500, 400), costUsd(1500, 400, "gpt-4.1-mini"));
  assert.equal(costUsd(1500, 400, "some-future-model"), 0);
});

test("golden Note cases only expect drafts after an explicit Draft now", () => {
  const cases = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url), "utf8")).cases;
  for (const item of cases.filter((entry) => entry.mode === "note")) {
    assert.equal(item.draft_now_turns.length, item.turns.length, item.id);
    const expected = item.expect_turns?.at(-1) ?? item.expect;
    if (expected === "card") assert.equal(item.draft_now_turns.at(-1), true, item.id);
    if (expected === "clarify") assert.equal(item.draft_now_turns.at(-1), false, item.id);
  }
});

test("note memory retains prior chats chronologically and excludes active turns within its budget", () => {
  const active = user("Make this clearer");
  const rows = [active, bot("Earlier proposal"), user("My actual contribution")];
  assert.deepEqual(noteHistoryContext(rows, [active]), [user("My actual contribution"), bot("Earlier proposal")]);
  const bounded = noteHistoryContext(Array.from({ length: 80 }, () => user("x".repeat(20000))), []);
  assert.equal(bounded.reduce((sum, message) => sum + message.content.length, 0), 24000);
});

test("note memory and current edits are references before the latest user request", () => {
  const parsed = parseAskBody({
    mode: "note", note_id: "12345678-1234-1234-1234-123456789abc",
    messages: [user("Refine the second point")],
    note_snapshot: { title: "Research", body: "My current contribution." },
    noteHistory: [user("Client cannot inject server history")],
  });
  assert.deepEqual(parsed.request.noteSnapshot, { title: "Research", body: "My current contribution." });
  assert.equal(parsed.request.noteHistory, undefined);
  const request = buildOpenAIRequest({ ...parsed.request,
    noteContext: parsed.request.noteSnapshot,
    noteHistory: [user("I study team communication."), bot("Earlier draft proposal")] });
  assert.ok(request.messages.some(message => message.content.includes("My current contribution.")));
  assert.ok(request.messages.some(message => message.content.includes("I study team communication.")));
  assert.equal(request.messages.at(-1).content, "Refine the second point");
  const unlinked = parseAskBody({ mode: "note", messages: [user("Hello")], note_snapshot: { body: "Other note" } });
  assert.equal(unlinked.request.noteSnapshot, undefined);
});

// ── Point-linked questions (Refine / How to say from one note point) ───────

const NOTE_ID = "12345678-1234-1234-1234-123456789abc";
const tagged = (section, index, point, question) => `[[point ${section} ${index}]] ${point}\n${question}`;

test("readPointTag splits a point-linked question and leaves plain text alone", () => {
  assert.deepEqual(readPointTag(tagged("Opening", 2, "I built HAIT.", "더 자연스럽게")), {
    point: { section: "Opening", index: 2, text: "I built HAIT." },
    text: "더 자연스럽게",
  });
  assert.equal(readPointTag("[[point Intro 1]] x\nq"), null, "unknown sections are not tags");
  assert.equal(readPointTag("더 자연스럽게"), null);
});

test("a How to say question about a point reads its note; a plain one still does not", () => {
  const pointed = parseAskBody({
    mode: "how_to_say", note_id: NOTE_ID,
    messages: [user(tagged("Body", 1, "We decide when to speak.", "언제 말할지 판단하는 시스템"))],
    note_snapshot: { title: "HAIT", body: "Body\n- We decide when to speak." },
  });
  assert.equal(pointed.request.noteId, NOTE_ID);
  assert.deepEqual(pointed.request.targetPoint, { section: "Body", index: 1, text: "We decide when to speak." });
  assert.equal(pointed.request.noteSnapshot.title, "HAIT");
  const plain = parseAskBody({ mode: "how_to_say", note_id: NOTE_ID, messages: [user("늦을 것 같아")], note_snapshot: { title: "x", body: "y" } });
  assert.equal(plain.request.noteId, null);
  assert.equal(plain.request.targetPoint, undefined);
  assert.equal(plain.request.noteSnapshot, undefined);
});

test("a point tag does not eat the question's length budget", () => {
  const question = "q".repeat(MAX_USER_CHARS);
  const parsed = parseAskBody({ mode: "how_to_say", note_id: NOTE_ID, messages: [user(tagged("Body", 1, "p".repeat(POINT_TAG_TEXT), question))] });
  assert.equal(readPointTag(parsed.request.messages[0].content).text, question);
});

test("a point request adds the point rules and the point with its earlier wordings", () => {
  const parsed = parseAskBody({ mode: "how_to_say", note_id: NOTE_ID, messages: [user(tagged("Opening", 1, "I built HAIT.", "refine"))] });
  const request = buildOpenAIRequest({ ...parsed.request, pointTrail: ["I made a system."] });
  const plain = buildOpenAIRequest({ mode: "how_to_say", messages: [user("늦을 것 같아")], l1: "Korean" });
  assert.equal(request.messages[0].content, plain.messages[0].content, "the shared How to say prompt stays the cached prefix");
  assert.match(request.messages[1].content, /Point focus/);
  assert.match(request.messages[1].content, /Do not undo the learner's progress/);
  const reference = request.messages.find((message) => message.content.includes("the point being edited"));
  assert.ok(reference.content.includes("I made a system."));
  assert.equal(request.response_format.json_schema.name, "ask_how_to_say");
  assert.ok(!plain.messages.some((message) => message.content.includes("Point focus")));
  assert.ok(!plain.messages[1].content.includes("Draft now"), "How to say is not told about Note drafting");
});

test("pointTrail follows one point through earlier versions, oldest first", () => {
  const versions = [
    "Opening\n- Robots are everywhere.\n\nBody\n- It listens.",
    "Opening\n- I made a system that decides when robots talk.\n\nBody\n- It listens.",
    "Opening\n- Hi everyone.\n- I made a system that decides when robots speak.\n\nBody\n- It listens.",
    "Opening\n- Hi everyone.\n- I made a system that decides when robots speak.\n  > HAIT\n\nBody\n- It listens.",
    "Opening\n- Hi everyone.\n- I built HAIT, a system that decides when robots speak.",
  ];
  const point = { section: "Opening", index: 2, text: "I built HAIT, a system that decides when a robot should speak." };
  assert.deepEqual(pointTrail(versions, point), [
    "I made a system that decides when robots talk.",
    "I made a system that decides when robots speak.",
    "I built HAIT, a system that decides when robots speak.",
  ]);
  // "Robots are everywhere." sat in the same slot once, but it is another thought.
  assert.deepEqual(pointTrail(versions, { ...point, text: "" }), [], "an empty point has no history to follow");
  assert.deepEqual(pointTrail(["Closing\n- Thanks."], point), [], "other sections are never matched");
});

// ── How to say phrase pick + the learner layer ─────────────────────────────

const sentence = "I feel like I'm walking on eggshells.";

test("a phrase pick survives only when it is inside the sentence and not already saved", () => {
  assert.deepEqual(phrasePickFor(sentence, { phrase: "walking on eggshells", phrase_meaning: "조심조심하다", phrase_kind: "idiom" }), {
    phrase: "walking on eggshells", phrase_meaning: "조심조심하다", phrase_kind: "idiom",
  });
  const none = { phrase: "", phrase_meaning: "", phrase_kind: "" };
  assert.deepEqual(phrasePickFor(sentence, { phrase: "walk on eggshells", phrase_kind: "idiom" }), none, "not a substring");
  assert.deepEqual(phrasePickFor(sentence, { phrase: "Walking on eggshells", phrase_kind: "idiom" }, ["walking on eggshells!"]), none, "already in the bank");
  assert.deepEqual(phrasePickFor(sentence, { phrase: "", phrase_meaning: "x" }), none);
  assert.equal(phrasePickFor(sentence, { phrase: "eggshells", phrase_kind: "slang" }).phrase_kind, "phrase", "unknown kinds fall back");
});

test("How to say replies carry a phrase pick per sentence; Note replies do not", () => {
  const card = normalizeReply("how_to_say", JSON.stringify({ reply: {
    type: "card", query: "눈치 보여", nuance: "", examples: [], tip: "", follow_ups: [],
    expressions: [
      { en: sentence, meaning: "눈치 보여", when: "", phrase: "walking on eggshells", phrase_meaning: "조심조심하다", phrase_kind: "idiom" },
      { en: "I feel awkward leaving early.", meaning: "먼저 가기 눈치 보여", when: "", phrase: "feel awkward", phrase_meaning: "", phrase_kind: "pattern" },
    ],
  } }), ["feel awkward"]);
  assert.equal(card.expressions[0].phrase, "walking on eggshells");
  assert.equal(card.expressions[1].phrase, "", "a saved phrase is never recommended again");
  const answer = normalizeReply("how_to_say", JSON.stringify({ reply: { type: "answer", text: "차이는…", follow_ups: [],
    expressions: [{ en: "Let's touch base later.", meaning: "나중에 얘기해요", when: "", example: { en: "x", l1: "y" }, phrase: "touch base", phrase_meaning: "연락하다", phrase_kind: "idiom" }] } }));
  assert.equal(answer.expressions[0].phrase, "touch base");
  const note = normalizeReply("note", JSON.stringify({ reply: { type: "answer", text: "t", follow_ups: [], draft_patch: {},
    expressions: [{ en: "touch base", meaning: "m", when: "", example: { en: "x", l1: "y" }, phrase: "touch base" }] } }));
  assert.equal(note.expressions[0].phrase, undefined);
  for (const option of SCHEMAS.how_to_say.properties.reply.anyOf) assertStrict(option);
  assert.deepEqual(SCHEMAS.how_to_say.properties.reply.anyOf[0].properties.expressions.items.required,
    ["en", "meaning", "when", "phrase", "phrase_meaning", "phrase_kind"]);
});

test("the learner profile rides as reference data and the prompt says how to use it", () => {
  const plain = buildOpenAIRequest({ mode: "how_to_say", messages: [user("눈치 보여")], l1: "Korean" });
  assert.ok(!plain.messages.some((m) => m.content.includes("learner profile (what they chose")));
  assert.match(plain.messages[0].content, /"phrase" \(on every expression\)/);
  assert.match(plain.messages[0].content, /fit the English to it/);
  const personal = buildOpenAIRequest({ mode: "how_to_say", messages: [user("눈치 보여")], l1: "Korean", learner: "English level: B2" });
  const reference = personal.messages.find((m) => m.content.includes("learner profile (what they chose"));
  assert.ok(reference.content.includes("English level: B2"));
  assert.equal(reference.role, "user", "profile text is data, never a system instruction");
  assert.equal(personal.messages.at(-1).content, "눈치 보여");
  assert.equal(parseAskBody({ mode: "how_to_say", messages: [user("x")], english_level: "b2" }).request.clientLevel, "b2");
});
