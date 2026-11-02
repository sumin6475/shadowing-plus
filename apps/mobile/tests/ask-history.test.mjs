import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/lib/ask-history.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function historyWithResponses(responses) {
  const writes = [];
  const exports = {};
  const supabase = {
    from(table) {
      const query = {
        select() { return query; },
        eq() { return query; },
        lt() { return query; },
        order() { return query; },
        limit() { return query; },
        range() { return query; },
        maybeSingle: async () => responses.shift(),
        single: async () => responses.shift(),
        upsert(value, options) { writes.push({ table, value, options }); return Promise.resolve({ error: null }); },
        then(resolve) { return Promise.resolve(responses.shift()).then(resolve); },
      };
      return query;
    },
  };
  runInNewContext(compiled, {
    exports,
    require: (id) => {
      if (id === "./supabase") return { supabase };
      if (id === "./ask-model") return { assistantContent: (reply) => JSON.stringify({ reply }) };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return { api: exports, writes };
}

test("Ask history saves a user question and structured answer under one conversation", async () => {
  const { api, writes } = historyWithResponses([]);
  await api.saveAskTurn("chat-1", { id: "u-1", role: "user", mode: "how_to_say", text: "조금 늦을 것 같아요" });
  await api.saveAskTurn("chat-1", { id: "a-1", role: "assistant", mode: "how_to_say", reply: { type: "off_topic" } });
  assert.equal(writes.length, 2);
  assert.equal(writes[0].value.conversation_id, "chat-1");
  assert.equal(writes[0].value.content, "조금 늦을 것 같아요");
  assert.equal(writes[1].value.content, '{"reply":{"type":"off_topic"}}');
  assert.equal(writes[1].options.onConflict, "conversation_id,client_turn_id");
  assert.equal(writes[1].options.ignoreDuplicates, true);
});

test("Ask history restores old and new turns in reading order", async () => {
  const { api } = historyWithResponses([{ data: [
    { client_turn_id: "a-1", role: "assistant", mode: "note", draft_now: false, content: '{"reply":{"type":"off_topic"}}', created_at: "2026-11-02T10:00:01Z" },
    { client_turn_id: "u-1", role: "user", mode: "note", draft_now: true, content: "Talk about work", created_at: "2026-11-02T10:00:00Z" },
  ], error: null }]);
  const page = await api.loadAskTurns("chat-1");
  assert.equal(page.turns.length, 2);
  assert.equal(page.turns[0].id, "u-1");
  assert.equal(page.turns[0].draftNow, true);
  assert.equal(page.turns[1].id, "a-1");
  assert.equal(page.turns[1].reply.type, "off_topic");
  assert.equal(page.before, null);
});
