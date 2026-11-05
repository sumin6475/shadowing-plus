import {
  checked,
  claim,
  completion,
  consent,
  finish,
  serveFeedback,
} from "../_shared/feedback-runtime.ts";
import { ensureProfile } from "../coaching-profile/service.ts";
import { hash } from "../_shared/feedback-schema.ts";
import {
  type AnalysisContext,
  analysisRequest,
  appendClarification,
  MODEL,
  parseFeedback,
  parseRequest,
  PROMPT_VERSION,
  requestFingerprint,
  validateTranscript,
} from "./core.ts";
serveFeedback(async (body, ctx) => {
  consent(ctx.user);
  const request = parseRequest(body);
  const session = checked(
    await ctx.client.from("talk_sessions").select("id,transcript").eq(
      "id",
      request.sessionId,
    ).single(),
  );
  if (!session) throw new Error("feedback_session_missing");
  const transcript = String(session.transcript ?? "");
  validateTranscript(transcript);
  const profile = await ensureProfile(ctx, false);
  let clarifications: AnalysisContext["clarifications"] = [],
    comparison: AnalysisContext["comparison"] = null;
  let parentId: string | null = null;
  if (request.operation === "clarify") {
    const parent = checked(
      await ctx.client.from("talk_feedback_reports").select("*").eq(
        "id",
        request.parentReportId!,
      ).eq("session_id", request.sessionId).eq("status", "ready").single(),
    );
    if (parent.transcript_hash !== await hash(transcript)) {
      throw new Error("feedback_session_changed");
    }
    if (parent.profile_version_id !== profile.id) {
      throw new Error("feedback_profile_changed");
    }
    clarifications = appendClarification(
      parent,
      request.findingId!,
      request.answer!,
    );
    parentId = parent.id;
  }
  const savedRetry = checked(
    await ctx.client.from("talk_feedback_retries").select("*").eq(
      "session_id",
      request.sessionId,
    ).maybeSingle(),
  );
  if (request.operation === "compare" || savedRetry) {
    const sourceId = request.sourceReportId ?? savedRetry?.source_report_id;
    const targets: string[] = request.targetFindingIds ??
      savedRetry?.target_finding_ids;
    if (
      request.operation === "compare" && savedRetry &&
      (sourceId !== savedRetry.source_report_id ||
        JSON.stringify([...targets].sort()) !==
          JSON.stringify([...savedRetry.target_finding_ids].sort()))
    ) throw new Error("feedback_bad_comparison");
    const source = checked(
      await ctx.client.from("talk_feedback_reports").select("*").eq(
        "id",
        sourceId,
      ).eq("status", "ready").single(),
    );
    if (
      source.session_id === request.sessionId ||
      targets.some((id) =>
        !source.result?.findings.some((f: { id: string; certainty: string }) =>
          f.id === id && f.certainty === "supported"
        )
      )
    ) throw new Error("feedback_bad_comparison");
    comparison = {
      reportId: source.id,
      transcript: source.transcript_snapshot,
      report: source.result,
      targetIds: targets,
    };
  }
  const context: AnalysisContext = {
    transcript,
    profile: profile.profile,
    sourceText: profile.source_text,
    level: profile.english_level,
    language: profile.first_language,
    clarifications,
    comparison,
  };
  const transcriptHash = await hash(transcript);
  const fingerprint = await requestFingerprint({
    operation: request.operation,
    sessionId: session.id,
    transcriptHash,
    profileId: profile.id,
    model: MODEL,
    clarifications,
    sourceReportId: comparison?.reportId,
    targetIds: comparison?.targetIds,
  });
  const existing = checked(
    await ctx.client.from("talk_feedback_reports").select("*").eq(
      "fingerprint",
      fingerprint,
    ).maybeSingle(),
  );
  if (existing?.status === "ready") return { report: existing };
  const attempt = await claim(ctx, "report", fingerprint, request.requestId);
  if (attempt.cached) {
    return {
      report: checked(
        await ctx.client.from("talk_feedback_reports").select("*").eq(
          "fingerprint",
          fingerprint,
        ).eq("status", "ready").single(),
      ),
    };
  }
  if (attempt.busy) return { report: existing, pending: true };
  try {
    const id = existing?.id ?? crypto.randomUUID();
    if (
      !checked(
        await ctx.admin.rpc("prepare_feedback_report", {
          p_attempt: attempt.id,
          p_token: attempt.token,
          p_report: {
            id,
            session_id: session.id,
            profile_version_id: profile.id,
            parent_report_id: parentId,
            first_language: profile.first_language,
            english_level: profile.english_level,
            transcript_hash: transcriptHash,
            transcript_snapshot: transcript,
            model: MODEL,
            prompt_version: PROMPT_VERSION,
            clarifications,
          },
        }),
      )
    ) throw new Error("feedback_claim_expired");
    if (comparison) {
      const previous = checked(
        await ctx.client.from("talk_feedback_retries").select("*").eq(
          "session_id",
          session.id,
        ).maybeSingle(),
      );
      if (
        previous &&
        (previous.source_report_id !== comparison.reportId ||
          JSON.stringify([...previous.target_finding_ids].sort()) !==
            JSON.stringify([...comparison.targetIds].sort()))
      ) throw new Error("feedback_bad_comparison");
      if (!previous) {
        checked(
          await ctx.admin.from("talk_feedback_retries").insert({
            session_id: session.id,
            user_id: ctx.user.id,
            source_report_id: comparison.reportId,
            target_finding_ids: comparison.targetIds,
          }),
        );
      }
    }
    const result = parseFeedback(
      await completion(ctx, analysisRequest(context), "talk_advanced_feedback"),
      context,
    );
    if (
      !await finish(ctx, attempt, {
        result,
        source_revision: profile.source_revision,
      })
    ) throw new Error("feedback_profile_changed");
    return {
      report: checked(
        await ctx.client.from("talk_feedback_reports").select("*").eq("id", id)
          .single(),
      ),
    };
  } catch (e) {
    await finish(ctx, attempt, { error_code: "feedback_generation_failed" })
      .catch(() => {});
    throw e;
  }
});
