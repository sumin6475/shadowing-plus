// Unit tests for the Ask core. Run: node --test supabase/tests/ask-assist/core.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOpenAIRequest,
  costUsd,
  learnerLanguage,
  MAX_TURNS,
  MAX_USER_CHARS,
  noteClarificationCount,
  normalizeReply,
  parseAskBody,
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

test("Note clarification is allowed before the draft and closed after two questions or Draft now", () => {
  const first = { mode: "note", messages: [user("새 팀에서 자기소개")], l1: "Korean" };
  assert.equal(buildOpenAIRequest(first).response_format.json_schema.name, "ask_note_intake");
  const clarify = bot(JSON.stringify({ reply: { type: "clarify", text: "", question: "어떤 일을 맡으셨나요?" } }));
  const messages = [user("새 팀에서 자기소개"), clarify, user("디자인 일을 해요"), clarify, user("협업을 강조하고 싶어요")];
  assert.equal(noteClarificationCount(messages), 2);
  assert.equal(buildOpenAIRequest({ ...first, messages }).response_format.json_schema.name, "ask_note_draft");
  assert.equal(buildOpenAIRequest({ ...first, draftNow: true }).response_format.json_schema.name, "ask_note_draft");
  const withDraft = [user("새 팀에서 자기소개"), bot(JSON.stringify({ reply: { type: "card", draft: { body: "I'm a designer." } } })), user("더 짧게")];
  assert.equal(buildOpenAIRequest({ ...first, messages: withDraft }).response_format.json_schema.name, "ask_note");
  assert.deepEqual(SCHEMAS.note.properties.reply.anyOf.map((option) => option.properties.type.enum[0]), ["clarify", "card", "answer", "off_topic"]);
  const newTopic = [...withDraft, bot(JSON.stringify({ reply: { type: "clarify", text: "", question: "왜요?" } })), user("제 의견은 이래요")];
  assert.equal(buildOpenAIRequest({ ...first, messages: newTopic }).response_format.json_schema.name, "ask_note");
  assert.equal(buildOpenAIRequest({ ...first, messages: newTopic, draftNow: true }).response_format.json_schema.name, "ask_note_draft");
  assert.deepEqual(SCHEMAS.note_draft.properties.reply.anyOf.map((option) => option.properties.type.enum[0]), ["card", "off_topic"]);
  assert.equal(buildOpenAIRequest(first).messages[0].content, buildOpenAIRequest({ ...first, draftNow: true }).messages[0].content);
});

test("parseAskBody accepts only an explicit Draft now flag", () => {
  assert.equal(parseAskBody({ mode: "note", messages: [user("초안 보여줘")], draft_now: true }).request.draftNow, true);
  assert.equal(parseAskBody({ mode: "note", messages: [user("초안 보여줘")], draft_now: "true" }).request.draftNow, false);
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
