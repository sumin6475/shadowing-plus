// Install @electric-sql/pglite in a scratch folder, then set MVP_PGLITE_MODULE.
const { PGlite } = await import(
  process.env.MVP_PGLITE_MODULE || "@electric-sql/pglite"
);
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public,auth TO authenticated;
CREATE TABLE messages(id uuid primary key,user_id uuid,label text,body text,created_at timestamptz default now(),updated_at timestamptz default now());
CREATE TABLE phrase_items(id uuid primary key DEFAULT gen_random_uuid(),user_id uuid NOT NULL DEFAULT auth.uid(),text text);
CREATE TABLE talk_sessions(id uuid primary key DEFAULT gen_random_uuid(),user_id uuid NOT NULL DEFAULT auth.uid(),message_id uuid,transcript text,duration_seconds float,created_at timestamptz DEFAULT now());
INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO messages(id,user_id,label,body) VALUES ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Keep me','Opening\n- A real point');
INSERT INTO talk_sessions(user_id,message_id,duration_seconds) VALUES ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',61.4);`);
await db.exec(
  readFileSync(
    new URL(
      "../../../supabase/migrations/031_mvp_notes_and_phrase_progress.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
assert.equal(
  (await db.query("select title from notes")).rows[0].title,
  "Keep me",
);
assert.equal(
  (await db.query("select seconds from talk_sessions")).rows[0].seconds,
  61,
);
await db.exec(
  `GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated; SET ROLE authenticated; SET test.uid='11111111-1111-4111-8111-111111111111';`,
);
const id = "44444444-4444-4444-8444-444444444444";
await db.exec(
  `INSERT INTO phrase_items(id,text) VALUES ('${id}','touch base');`,
);
await assert.rejects(
  db.exec(`UPDATE phrase_items SET own_example_at=now() WHERE id='${id}'`),
  /Save your own sentence/,
);
await db.exec(
  `INSERT INTO phrase_examples(phrase_id,text) VALUES ('${id}','Let’s touch base tomorrow.'); UPDATE phrase_items SET own_example_at=now() WHERE id='${id}'; DELETE FROM phrase_examples WHERE phrase_id='${id}';`,
);
assert.equal(
  (await db.query(`SELECT own_example_at FROM phrase_items WHERE id='${id}'`))
    .rows[0].own_example_at,
  null,
);
const sessionId = "55555555-5555-4555-8555-555555555555";
await db.exec(`UPDATE notes SET title='Meeting tomorrow',body='Opening\n- Introduce the project' WHERE id='33333333-3333-4333-8333-333333333333';
INSERT INTO talk_sessions(id,note_id,seconds,transcript) VALUES ('${sessionId}','33333333-3333-4333-8333-333333333333',63,'A saved transcript') ON CONFLICT(id) DO UPDATE SET seconds=excluded.seconds;
INSERT INTO talk_sessions(id,note_id,seconds,transcript) VALUES ('${sessionId}','33333333-3333-4333-8333-333333333333',63,'A saved transcript') ON CONFLICT(id) DO UPDATE SET seconds=excluded.seconds;`);
assert.equal(
  (await db.query(`SELECT count(*) FROM talk_sessions WHERE id='${sessionId}'`))
    .rows[0].count,
  1,
);
assert.equal(
  (await db.query(`SELECT title FROM notes`)).rows[0].title,
  "Meeting tomorrow",
);
await db.exec(
  `INSERT INTO phrase_examples(phrase_id,text) VALUES ('${id}','First sentence'),('${id}','Second sentence'); UPDATE phrase_items SET own_example_at=now() WHERE id='${id}'; DELETE FROM phrase_examples WHERE text='First sentence';`,
);
assert.notEqual(
  (await db.query(`SELECT own_example_at FROM phrase_items WHERE id='${id}'`))
    .rows[0].own_example_at,
  null,
);
await assert.rejects(
  db.exec(
    `UPDATE phrase_examples SET phrase_id=gen_random_uuid() WHERE phrase_id='${id}'`,
  ),
  /membership cannot/,
);
await db.exec(`SET test.uid='22222222-2222-4222-8222-222222222222';`);
assert.equal((await db.query("SELECT * FROM notes")).rows.length, 0);
await assert.rejects(
  db.exec(
    `INSERT INTO talk_sessions(note_id) VALUES ('33333333-3333-4333-8333-333333333333')`,
  ),
  /must belong/,
);
await assert.rejects(
  db.exec(
    `INSERT INTO phrase_examples(phrase_id,text) VALUES ('${id}','Not mine')`,
  ),
  /foreign key/,
);
await db.exec(
  `RESET ROLE; DELETE FROM notes WHERE id='33333333-3333-4333-8333-333333333333';`,
);
assert.equal(
  (await db.query("SELECT note_id FROM talk_sessions")).rows[0].note_id,
  null,
);
assert.equal(
  (await db.query("SELECT count(*) FROM messages")).rows[0].count,
  1,
);
console.log(
  "PASS: migration, legacy copy, time backfill, note editing, idempotent session retry, immutable example membership, completion guard, last-sentence reset, note RLS, cross-owner links, note deletion preserves sessions and legacy data",
);
await db.close();
