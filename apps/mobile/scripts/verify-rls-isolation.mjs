import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

function readLocalPublicEnv() {
  const values = {};
  try {
    const source = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  } catch {
    // CI may supply the two public values directly instead of a local .env.
  }
  return values;
}

function client(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function requireValue(name, fallback) {
  const value = process.env[name]?.trim() || fallback?.trim();
  if (!value) throw new Error(`Missing required input: ${name}`);
  return value;
}

async function signIn(label, supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw new Error(`Authentication failed for test account ${label}`);
  return data.user.id;
}

async function insertOne(supabase, table, values) {
  const { data, error } = await supabase.from(table).insert(values).select("id").single();
  if (error || !data?.id) throw new Error(`Fixture setup failed for ${table}`);
  return data.id;
}

async function ownerRow(supabase, table, id, fields) {
  const { data, error } = await supabase.from(table).select(fields).eq("id", id).maybeSingle();
  if (error) return null;
  return data;
}

const localEnv = readLocalPublicEnv();
const url = requireValue("EXPO_PUBLIC_SUPABASE_URL", localEnv.EXPO_PUBLIC_SUPABASE_URL);
const anonKey = requireValue("EXPO_PUBLIC_SUPABASE_ANON_KEY", localEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const emailA = requireValue("RLS_TEST_A_EMAIL");
const passwordA = requireValue("RLS_TEST_A_PASSWORD");
const emailB = requireValue("RLS_TEST_B_EMAIL");
const passwordB = requireValue("RLS_TEST_B_PASSWORD");

const accountA = client(url, anonKey);
const accountB = client(url, anonKey);
const marker = `rls-${Date.now()}-${randomUUID().slice(0, 8)}`;
const cleanup = [];
const cleanupB = [];
const results = [];

function record(name, passed) {
  results.push({ name, passed });
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
}

async function checkSurface({
  label,
  table,
  ownerId,
  ownerField,
  ownerValue,
  unauthorizedPatch,
  unauthorizedInsert,
  insertedLookup,
}) {
  const readAttempt = await accountB.from(table).select("id").eq("id", ownerId);
  record(`${label} cross-account read denied`, !readAttempt.error && (readAttempt.data?.length ?? 0) === 0);

  const updateAttempt = await accountB.from(table).update(unauthorizedPatch).eq("id", ownerId).select("id");
  const afterUpdate = await ownerRow(accountA, table, ownerId, `id, ${ownerField}`);
  record(
    `${label} cross-account update denied`,
    !updateAttempt.error && (updateAttempt.data?.length ?? 0) === 0 && afterUpdate?.[ownerField] === ownerValue,
  );

  const deleteAttempt = await accountB.from(table).delete().eq("id", ownerId).select("id");
  const afterDelete = await ownerRow(accountA, table, ownerId, "id");
  record(
    `${label} cross-account delete denied`,
    !deleteAttempt.error && (deleteAttempt.data?.length ?? 0) === 0 && afterDelete?.id === ownerId,
  );

  const insertAttempt = await accountB.from(table).insert(unauthorizedInsert).select("id");
  const inserted = await accountA
    .from(table)
    .select("id")
    .eq(insertedLookup.field, insertedLookup.value);
  for (const row of inserted.data ?? []) cleanup.push({ table, id: row.id });
  record(
    `${label} owner-spoofed insert denied`,
    insertAttempt.error?.code === "42501" && !inserted.error && (inserted.data?.length ?? 0) === 0,
  );
}

let userA;
let userB;

try {
  userA = await signIn("A", accountA, emailA, passwordA);
  userB = await signIn("B", accountB, emailB, passwordB);
  record("authenticated sessions are distinct", userA !== userB);

  // Prove account B can write normally before interpreting its rejected writes
  // as RLS enforcement rather than a broken session or network.
  const bHealthId = await insertOne(accountB, "domains", { name: `${marker}-b-health` });
  cleanupB.push({ table: "domains", id: bHealthId });
  const bHealthDelete = await accountB.from("domains").delete().eq("id", bHealthId);
  record("account B owner write control", !bHealthDelete.error);

  const phraseText = `${marker} phrase`;
  const phraseId = await insertOne(accountA, "phrase_items", {
    user_id: userA,
    text: phraseText,
    normalized_text: phraseText,
    source_context: { source: "manual", test_marker: marker },
    status: "ready",
    learning_status: "new",
  });
  cleanup.push({ table: "phrase_items", id: phraseId });

  const domainId = await insertOne(accountA, "domains", { name: `${marker}-domain` });
  cleanup.push({ table: "domains", id: domainId });
  const storyTitle = `${marker} story`;
  const storyId = await insertOne(accountA, "stories", {
    domain_id: domainId,
    title: storyTitle,
    status: "draft",
  });
  cleanup.push({ table: "stories", id: storyId });

  const talkTranscript = `${marker} transcript`;
  const talkId = await insertOne(accountA, "talk_sessions", {
    story_id: storyId,
    transcript: talkTranscript,
    duration_seconds: 1,
  });
  cleanup.push({ table: "talk_sessions", id: talkId });

  await checkSurface({
    label: "Phrase",
    table: "phrase_items",
    ownerId: phraseId,
    ownerField: "text",
    ownerValue: phraseText,
    unauthorizedPatch: { text: `${marker} unauthorized phrase update` },
    unauthorizedInsert: {
      user_id: userA,
      text: `${marker} spoof phrase`,
      normalized_text: `${marker} spoof phrase`,
      source_context: { source: "manual", test_marker: marker },
      status: "ready",
      learning_status: "new",
    },
    insertedLookup: { field: "normalized_text", value: `${marker} spoof phrase` },
  });

  await checkSurface({
    label: "Story",
    table: "stories",
    ownerId: storyId,
    ownerField: "title",
    ownerValue: storyTitle,
    unauthorizedPatch: { title: `${marker} unauthorized story update` },
    unauthorizedInsert: {
      user_id: userA,
      domain_id: domainId,
      title: `${marker} spoof story`,
      status: "draft",
    },
    insertedLookup: { field: "title", value: `${marker} spoof story` },
  });

  await checkSurface({
    label: "Talk session",
    table: "talk_sessions",
    ownerId: talkId,
    ownerField: "transcript",
    ownerValue: talkTranscript,
    unauthorizedPatch: { transcript: `${marker} unauthorized transcript update` },
    unauthorizedInsert: {
      user_id: userA,
      transcript: `${marker} spoof transcript`,
      duration_seconds: 1,
    },
    insertedLookup: { field: "transcript", value: `${marker} spoof transcript` },
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "RLS harness failed before completion");
  process.exitCode = 1;
} finally {
  // Reverse dependency order. All rows use the explicit test marker and IDs.
  for (const item of cleanup.reverse()) {
    await accountA.from(item.table).delete().eq("id", item.id);
  }
  for (const item of cleanupB.reverse()) {
    await accountB.from(item.table).delete().eq("id", item.id);
  }
  await accountA.auth.signOut();
  await accountB.auth.signOut();
}

if (results.length === 14 && results.every((result) => result.passed)) {
  console.log("PASS: RLS isolation harness (14/14)");
} else {
  console.error(`FAIL: RLS isolation harness (${results.filter((result) => result.passed).length}/${results.length})`);
  process.exitCode = 1;
}
