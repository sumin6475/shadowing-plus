import { appendClarification } from "../../functions/talk-advanced-feedback/core.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisRequest,
  FEEDBACK_SCHEMA,
  parseFeedback,
  parseRequest,
  requestFingerprint,
  validateTranscript,
} from "../../functions/talk-advanced-feedback/core.ts";
import { context, feedback } from "./fixtures.mjs";
const uuid = "11111111-1111-4111-8111-111111111111";
test("requests reject supplied transcripts/profiles and require bounded owned reference ids", () => {
  assert.equal(
    parseRequest({ sessionId: uuid, requestId: uuid }).operation,
    "analyze",
  );
  for (
    const extra of [{ transcript: "injected" }, { profile: {} }, {
      userId: uuid,
    }]
  ) {
    assert.throws(() =>
      parseRequest({ sessionId: uuid, requestId: uuid, ...extra })
    );
  }
  assert.throws(() =>
    parseRequest({
      sessionId: uuid,
      requestId: uuid,
      operation: "clarify",
      parentReportId: uuid,
      findingId: "a",
      answer: "😀".repeat(1201),
    })
  );
  assert.throws(() =>
    parseRequest({
      sessionId: uuid,
      requestId: uuid,
      operation: "compare",
      sourceReportId: uuid,
      targetFindingIds: ["a", "a"],
    })
  );
});
test("schema requires every key, disallows extra keys and caps findings", () => {
  function walk(s) {
    if (s.properties) {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual(s.required, Object.keys(s.properties));
      Object.values(s.properties).forEach(walk);
    }
    if (s.items) walk(s.items);
  }
  walk(FEEDBACK_SCHEMA);
  const r = feedback();
  r.extra = "no";
  assert.throws(() => parseFeedback(r, context()));
  const tooMany = feedback();
  tooMany.findings.push({ ...tooMany.findings[0], id: "b" }, {
    ...tooMany.findings[0],
    id: "c",
  });
  assert.throws(() => parseFeedback(tooMany, context()));
});
test("valid report preserves original evidence and repairs a uniquely misplaced offset", () => {
  const r = feedback();
  r.findings[0].evidence[0].start = 100;
  assert.equal(parseFeedback(r, context()).findings[0].evidence[0].start, 0);
  const fabricated = feedback();
  fabricated.findings[0].evidence[0].quote = "Not in the transcript";
  assert.throws(() => parseFeedback(fabricated, context()), /evidence/);
  const repeated = feedback("it");
  repeated.findings[0].evidence[0].start = 99;
  assert.throws(
    () => parseFeedback(repeated, context("it and it")),
    /evidence/,
  );
});
test("uncertain meaning and recognition errors withhold all subject-dependent repairs", () => {
  for (
    const certainty of ["needs_clarification", "possible_transcription_issue"]
  ) {
    const r = feedback();
    Object.assign(r.findings[0], {
      certainty,
      clarification_question: "Who asked whom?",
    });
    assert.throws(() => parseFeedback(r, context()), /unconfirmed/);
    for (const key of ["correction", "pattern", "practice_question", "hint"]) {
      r.findings[0][key] = null;
    }
    assert.equal(parseFeedback(r, context()).findings[0].correction, null);
    r.practice.hints = ["He promised to review it."];
    assert.throws(() => parseFeedback(r, context()), /unconfirmed/);
  }
});
test("zero genuine findings and insufficient speech are normal results", () => {
  for (const outcome of ["no_target_issue", "needs_more_speech"]) {
    const r = feedback();
    r.outcome = outcome;
    r.findings = [];
    r.practice.target_finding_ids = [];
    assert.equal(parseFeedback(r, context()).outcome, outcome);
  }
  assert.throws(() => validateTranscript("   "));
  validateTranscript("😀".repeat(40000));
  assert.throws(() => validateTranscript("😀".repeat(40001)));
});
test("learner text and generated free text never enter system messages", () => {
  const c = context("UNTRUSTED TRANSCRIPT");
  c.sourceText = "INJECTED FOCUS";
  c.profile.objective = "INJECTED GENERATED OBJECTIVE";
  const request = analysisRequest(c);
  const system = request.messages.filter((m) => m.role === "system").map((m) =>
    m.content
  ).join("");
  for (const value of [c.transcript, c.sourceText, c.profile.objective]) {
    assert.ok(!system.includes(value));
    assert.ok(request.messages.at(-1).content.includes(value));
  }
});
test("comparison validates both transcripts and cannot fabricate improvement", () => {
  const c = context();
  c.comparison = {
    reportId: uuid,
    transcript: "old wording",
    report: feedback(),
    targetIds: ["verb"],
  };
  const r = feedback();
  r.comparison = {
    source_report_id: uuid,
    targets: [{
      finding_id: "verb",
      outcome: "clearer",
      before: [],
      after: [],
      observation: "Clearer",
    }],
  };
  assert.throws(() => parseFeedback(r, c), /comparison/);
  r.comparison.targets[0].outcome = "not_comparable";
  assert.equal(
    parseFeedback(r, c).comparison.targets[0].outcome,
    "not_comparable",
  );
  assert.throws(() => parseFeedback(r, context()), /comparison/);
});
test("idempotency separates operations, comparison sources and target sets", async () => {
  const base = {
    operation: "analyze",
    sessionId: uuid,
    transcriptHash: "x",
    profileId: uuid,
    model: "m",
    clarifications: [],
  };
  assert.notEqual(
    await requestFingerprint(base),
    await requestFingerprint({ ...base, operation: "compare" }),
  );
  assert.notEqual(
    await requestFingerprint(base),
    await requestFingerprint({ ...base, sourceReportId: uuid }),
  );
  assert.equal(
    await requestFingerprint({ ...base, targetIds: ["a", "b"] }),
    await requestFingerprint({ ...base, targetIds: ["b", "a"] }),
  );
});

test("schema rejects prototype-named extra keys", () => {
  const value = JSON.parse(
    JSON.stringify(feedback()).slice(0, -1) + ',"__proto__":{}}',
  );
  assert.throws(
    () => parseFeedback(value, context()),
    /feedback_invalid_output/,
  );
});

test("negative comparisons need evidence too", () => {
  const before = "I explained about the design.",
    c = context(before),
    r = feedback(before);
  c.comparison = {
    reportId: "source",
    transcript: before,
    report: feedback(before),
    targetIds: ["verb"],
  };
  r.comparison = {
    source_report_id: "source",
    targets: [{
      finding_id: "verb",
      outcome: "still_unclear",
      before: [],
      after: [],
      observation: "The pattern is still unclear.",
    }],
  };
  assert.throws(() => parseFeedback(r, c), /feedback_invalid_comparison/);
});

test("clarification carries the exact parent question and evidence as user data", () => {
  const r = feedback();
  r.findings[0].certainty = "needs_clarification";
  r.findings[0].clarification_question = "Which design?";
  const c = context();
  c.clarifications = appendClarification(
    { id: "parent", result: r, clarifications: [] },
    "verb",
    "The study design.",
  );
  assert.equal(c.clarifications[0].question, "Which design?");
  assert.deepEqual(c.clarifications[0].evidence, r.findings[0].evidence);
  const request = analysisRequest(c);
  assert.equal(
    request.messages[0].content.includes("The study design."),
    false,
  );
  assert.ok(request.messages[1].content.includes("Which design?"));
});
