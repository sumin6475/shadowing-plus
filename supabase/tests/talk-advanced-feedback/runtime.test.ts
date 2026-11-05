import assert from "node:assert/strict";
import {
  completion,
  consent,
  CONSENT_VERSION,
  type FeedbackRuntime,
} from "../../functions/_shared/feedback-runtime.ts";
Deno.test("consent checks the expanded processing scope on the server", () => {
  assert.throws(
    () =>
      consent({
        user_metadata: {
          ai_processing_consent: true,
          ai_processing_consent_version: "2026-09-01",
        },
      }),
    /feedback_consent_required/,
  );
  assert.throws(
    () =>
      consent({
        user_metadata: {
          ai_processing_consent: false,
          ai_processing_consent_version: CONSENT_VERSION,
        },
      }),
    /feedback_consent_required/,
  );
  consent({
    user_metadata: {
      ai_processing_consent: true,
      ai_processing_consent_version: CONSENT_VERSION,
    },
  });
});
Deno.test("billable refusals and truncation are metered without learner content", async () => {
  const original = globalThis.fetch, previous = Deno.env.get("OPENAI_API_KEY");
  Deno.env.set("OPENAI_API_KEY", "test-only");
  const rows: Record<string, unknown>[] = [];
  const ctx = {
    user: { id: "owner" },
    admin: {
      from: (table: string) => {
        assert.equal(table, "usage_events");
        return {
          insert: async (row: Record<string, unknown>) => {
            rows.push(row);
            return { error: null };
          },
        };
      },
    },
  } as unknown as FeedbackRuntime;
  try {
    for (
      const choice of [{
        finish_reason: "length",
        message: { content: "partial" },
      }, { finish_reason: "stop", message: { refusal: "no" } }]
    ) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            usage: { prompt_tokens: 10, completion_tokens: 5 },
            choices: [choice],
          }),
          { status: 200 },
        );
      await assert.rejects(
        completion(ctx, { model: "gpt-4.1-mini" }, "talk_advanced_feedback"),
        /feedback_incomplete/,
      );
    }
    assert.equal(rows.length, 2);
    assert.equal(rows[0].total_tokens, 15);
    assert.equal(rows[0].cost_usd, .000012);
    assert.equal(JSON.stringify(rows).includes("partial"), false);
    assert.equal(JSON.stringify(rows).includes("refusal"), false);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) Deno.env.delete("OPENAI_API_KEY");
    else Deno.env.set("OPENAI_API_KEY", previous);
  }
});
