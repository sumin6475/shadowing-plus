import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPatch,
  assistantContent,
  draftAt,
  draftSections,
  exampleFor,
  noteTitle,
  patchesDraft,
  questionFor,
  sentences,
  toPhraseInput,
  trimHistory,
} from "../src/lib/ask-model.ts";

const card = {
  type: "card",
  query: "늦을 것 같아",
  expressions: [{ en: "I'm running late.", meaning: "늦을 것 같아", when: "" }],
  nuance: "지금 가는 중인데 늦는다는 뜻",
  examples: [{ en: "Sorry, I'm running late.", l1: "미안, 늦을 것 같아." }],
  tip: "",
  follow_ups: [],
};
const noteCard = {
  type: "card",
  situation: "연차 요청",
  draft: { opening: "I wanted to ask about Friday.", body: "I need the day off. It won't affect deadlines.", closing: "Thanks." },
  key_phrases: [],
  terms: [],
  follow_ups: [],
};
const user = (id, text, mode = "how_to_say") => ({ id, role: "user", text, mode });
const bot = (id, reply, mode = "how_to_say") => ({ id, role: "assistant", reply, mode });

test("history is the last turns, starts on a question, and replays replies as their JSON", () => {
  const turns = [
    user("1", "a"), bot("2", card), user("3", "b"), bot("4", card),
    user("5", "c"), bot("6", card), user("7", "d"),
  ];
  const sent = trimHistory(turns, 6);
  assert.deepEqual(sent.map((m) => m.role), ["user", "assistant", "user", "assistant", "user"]);
  assert.equal(sent[0].content, "b", "the orphaned answer at the head of the window is dropped");
  assert.equal(sent[1].content, assistantContent(card));
  assert.equal(JSON.parse(sent[1].content).reply.type, "card");
  assert.deepEqual(trimHistory([user("1", "only")]), [{ role: "user", content: "only" }]);
});

test("a draft follows the conversation: the latest card, then each answer's rewrite", () => {
  const softer = {
    type: "answer", text: "더 공손하게", expressions: [], follow_ups: [],
    draft_patch: { opening: "I was hoping to ask about Friday.", body: "", closing: "" },
  };
  const chat = { type: "answer", text: "설명만", expressions: [], follow_ups: [], draft_patch: { opening: "", body: "", closing: "" } };
  const turns = [user("1", "연차", "note"), bot("2", noteCard, "note"), user("3", "공손하게", "note"), bot("4", softer, "note"), bot("5", chat, "note")];
  assert.equal(draftAt(turns, 0), null, "no draft before the first card");
  assert.deepEqual(draftAt(turns, 1), noteCard.draft);
  assert.deepEqual(draftAt(turns, 3), { ...noteCard.draft, opening: "I was hoping to ask about Friday." });
  assert.equal(patchesDraft(softer), true);
  assert.equal(patchesDraft(chat), false, "an answer that only explains leaves the draft alone");
  assert.equal(patchesDraft(card), false);
  assert.deepEqual(applyPatch(noteCard.draft, undefined), noteCard.draft);
});

test("a draft becomes a note with one point per sentence", () => {
  assert.deepEqual(sentences("I need the day off. It won't affect deadlines!  Is that OK?"), [
    "I need the day off.",
    "It won't affect deadlines!",
    "Is that OK?",
  ]);
  assert.deepEqual(sentences("no full stop"), ["no full stop"]);
  assert.deepEqual(sentences("She said “yes.” Then left."), ["She said “yes.”", "Then left."]);
  assert.deepEqual(sentences("  "), []);
  assert.deepEqual(draftSections(noteCard.draft), [
    { heading: "Opening", points: ["I wanted to ask about Friday."] },
    { heading: "Body", points: ["I need the day off.", "It won't affect deadlines."] },
    { heading: "Closing", points: ["Thanks."] },
  ]);
});

test("Save to Phrase keeps the meaning, the nuance, an example and the learner's question", () => {
  const turns = [user("1", "늦을 것 같아"), bot("2", card)];
  const question = questionFor(turns, 1);
  assert.equal(question, "늦을 것 같아");
  const expression = { en: "I'm running late.", meaning: "늦을 것 같아", when: "가는 중" };
  assert.deepEqual(toPhraseInput(expression, card.examples[0], card.nuance, question), {
    text: "I'm running late.",
    meaning: "늦을 것 같아",
    usageNote: "가는 중 · 지금 가는 중인데 늦는다는 뜻",
    learnerNote: "늦을 것 같아",
    context: "Sorry, I'm running late.",
    contextTranslation: "미안, 늦을 것 같아.",
    source: "ask",
    sourceLabel: "Saved from Ask",
  });
  const bare = toPhraseInput({ en: " Got it ", meaning: "", when: "" }, null, "", "");
  assert.deepEqual([bare.text, bare.meaning, bare.usageNote, bare.context, bare.learnerNote], ["Got it", null, null, null, null]);
});

test("an expression is saved with the example that shows it", () => {
  const examples = [
    { en: "It hurts to see you unwell.", l1: "" },
    { en: "I feel down when I'm sick.", l1: "" },
  ];
  assert.equal(exampleFor({ en: "I feel down", meaning: "", when: "" }, 0, examples), examples[1]);
  assert.equal(exampleFor({ en: "Cheer up.", meaning: "", when: "" }, 1, examples), examples[1], "else the one in its position");
  assert.equal(exampleFor({ en: "Cheer up.", meaning: "", when: "" }, 5, examples), examples[0]);
  assert.equal(exampleFor({ en: "Cheer up.", meaning: "", when: "" }, 0, []), null);
});

test("a note made from a draft is titled with the question, cut to fit", () => {
  assert.equal(noteTitle("  팀장님께  연차 쓰고 싶다고 말하기 "), "팀장님께 연차 쓰고 싶다고 말하기");
  const long = noteTitle("a".repeat(80));
  assert.equal(long.length, 58);
  assert.ok(long.endsWith("…"));
});
