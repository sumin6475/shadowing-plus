import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// TEST_PGLITE_MODULE points to an isolated QA installation; not a production dependency.
const path = process.env.TEST_PGLITE_MODULE || "@electric-sql/pglite";
test(
  "owned preferences, CAS, durable quotas, job fencing and report cascades",
  async () => {
    const { PGlite } = await import(path);
    const db = new PGlite();
    try {
      await db.exec(
        `CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;CREATE TABLE public.talk_sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users,transcript text);`,
      );
      await db.exec(
        await readFile(
          new URL(
            "../../migrations/036_personalized_talk_feedback.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const u = "11111111-1111-4111-8111-111111111111",
        other = "22222222-2222-4222-8222-222222222222";
      await db.query("INSERT INTO auth.users VALUES($1),($2)", [u, other]);
      const save = (revision, text = "focus") =>
        db.query(
          `SELECT * FROM save_coaching_preferences($1,$2,$3,$3,'b2','ko')`,
          [u, revision, text],
        );
      assert.equal((await save(0)).rows[0].source_revision, 1);
      await assert.rejects(save(0), /feedback_revision_conflict/);
      assert.equal(
        (await save(1)).rows[0].source_revision,
        1,
        "unchanged save does not invalidate",
      );
      const claim = async (kind, key) =>
        (await db.query("SELECT claim_feedback_generation($1,$2,$3) AS job", [
          u,
          kind,
          key,
        ])).rows[0].job;
      const a = await claim("profile", "a");
      assert.equal((await claim("profile", "a")).busy, true);
      const finish = (job, payload) =>
        db.query("SELECT complete_feedback_generation($1,$2,$3) AS done", [
          job.id,
          job.token,
          payload,
        ]);
      assert.equal(
        (await finish({ ...a, token: other }, { error_code: "x" })).rows[0]
          .done,
        false,
      );
      await db.query(
        `UPDATE feedback_generation_attempts SET lease_expires_at=now()-interval '1 second' WHERE id=$1`,
        [a.id],
      );
      assert.equal(
        (await finish(a, { error_code: "x" })).rows[0].done,
        false,
        "expired workers fenced",
      );
      const b = await claim("profile", "a"),
        profileId = "33333333-3333-4333-8333-333333333333";
      assert.equal(
        (await finish(b, {
          id: profileId,
          source_revision: 1,
          source_hash: "hash",
          profile: {},
          compiler_version: "v1",
          model: "default",
        })).rows[0].done,
        true,
      );
      assert.equal(
        (await db.query(
          "SELECT current_profile_version_id FROM coaching_preferences WHERE user_id=$1",
          [u],
        )).rows[0].current_profile_version_id,
        profileId,
      );
      assert.equal((await claim("profile", "a")).cached, true, "completed concurrent job is reused without a second reservation");
      await save(1, "changed");
      assert.equal(
        (await db.query(
          "SELECT current_profile_version_id FROM coaching_preferences WHERE user_id=$1",
          [u],
        )).rows[0].current_profile_version_id,
        null,
      );
      for (let i = 0; i < 3; i++) await claim("profile", `quota${i}`);
      await assert.rejects(claim("profile", "over"), /feedback_daily_limit/);
      await db.exec(
        `SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${other}',false);`,
      );
      assert.equal(
        (await db.query("SELECT * FROM coaching_preferences")).rows.length,
        0,
      );
      await assert.rejects(
        db.query(`INSERT INTO coaching_profile_versions(user_id) VALUES($1)`, [
          other,
        ]),
        /permission denied/,
      );
      await assert.rejects(save(2), /permission denied/);
      await db.exec("RESET ROLE;");
      const session = "44444444-4444-4444-8444-444444444444";
      await db.query("INSERT INTO talk_sessions VALUES($1,$2,$3)", [
        session,
        u,
        "speech",
      ]);
      const job = await claim("report", "report1"),
        reportId = "55555555-5555-4555-8555-555555555555";
      const payload = {
        id: reportId,
        session_id: session,
        profile_version_id: profileId,
        parent_report_id: null,
        first_language: "ko",
        english_level: "b2",
        transcript_hash: "h",
        transcript_snapshot: "speech",
        model: "m",
        prompt_version: "v",
        clarifications: [],
      };
      await db.query("SELECT prepare_feedback_report($1,$2,$3)", [
        job.id,
        job.token,
        payload,
      ]);
      assert.equal(
        (await finish(job, {
          source_revision: 2,
          result: { outcome: "feedback" },
        })).rows[0].done,
        true,
      );
      assert.equal(
        (await finish(job, { error_code: "stale" })).rows[0].done,
        false,
        "ready report immutable",
      );
      await db.query("DELETE FROM talk_sessions WHERE id=$1", [session]);
      assert.equal(
        (await db.query("SELECT * FROM talk_feedback_reports")).rows.length,
        0,
      );
    } finally {
      await db.close();
    }
  },
);
