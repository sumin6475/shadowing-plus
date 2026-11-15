import { serveFeedback } from "../_shared/feedback-runtime.ts";
import { ensureProfile, savePreferences } from "./service.ts";
serveFeedback(async (body, ctx) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("feedback_bad_request");
  }
  const b = body as Record<string, unknown>;
  if (
    b.operation === "save" &&
    Object.keys(b).every((k) =>
      ["operation", "revision", "richText", "level", "language"].includes(k)
    )
  ) return { preferences: await savePreferences(ctx, b) };
  if (b.operation === "compile" && Object.keys(b).length === 1) {
    return { profile: await ensureProfile(ctx) };
  }
  throw new Error("feedback_bad_request");
});
