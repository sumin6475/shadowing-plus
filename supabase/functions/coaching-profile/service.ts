import sanitizeHtml from "npm:sanitize-html@2.17.0";
import { parseDocument } from "npm:htmlparser2@10.0.0";
import { textContent } from "npm:domutils@3.2.2";
import { hash, LANGUAGES, LEVELS } from "../_shared/feedback-schema.ts";
import {
  checked,
  claim,
  completion,
  consent,
  type FeedbackRuntime,
  finish,
} from "../_shared/feedback-runtime.ts";
import {
  defaultProfile,
  MODEL,
  parseProfile,
  PROFILE_VERSION,
  profileRequest,
} from "./core.ts";
import type {
  CoachingPreferences,
  CoachingProfile,
} from "../_shared/feedback-types.ts";
export function sanitizeFocus(html: string) {
  if (new TextEncoder().encode(html).length > 60000) {
    throw new Error("feedback_focus_too_long");
  }
  let rich = sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "ul", "ol", "li"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
  // A real parser decodes entities; block boundaries survive in canonical text.
  const doc = parseDocument(
    rich.replace(/<\/(p|li)>/g, "</$1>\n").replace(/<br\s*\/?\s*>/g, "<br>\n"),
  );
  const plain = textContent(doc).replace(/\u00a0/g, " ").trim();
  if ([...plain].length > 12000) throw new Error("feedback_focus_too_long");
  if (!plain.replace(/[\u200B-\u200D\uFEFF\s]/g, "")) rich = "";
  return { rich_text: rich, plain_text: rich ? plain : "" };
}
export async function savePreferences(
  ctx: FeedbackRuntime,
  b: Record<string, unknown>,
) {
  if (
    !Number.isSafeInteger(b.revision) || Number(b.revision) < 0 ||
    typeof b.richText !== "string" || !LEVELS.includes(b.level as never) ||
    !LANGUAGES.includes(b.language as never)
  ) throw new Error("feedback_bad_request");
  const clean = sanitizeFocus(b.richText);
  const result = await ctx.admin.rpc("save_coaching_preferences", {
    p_user: ctx.user.id,
    p_revision: b.revision,
    p_html: clean.rich_text,
    p_text: clean.plain_text,
    p_level: b.level,
    p_language: b.language,
  });
  if (result.error) {
    if (result.error.message.includes("feedback_revision_conflict")) {
      throw new Error("feedback_revision_conflict");
    }
    throw new Error("feedback_storage");
  }
  return result.data as CoachingPreferences;
}
export async function ensureProfile(ctx: FeedbackRuntime, canCompile = true) {
  consent(ctx.user);
  let prefs = checked(
    await ctx.client.from("coaching_preferences").select("*").eq(
      "user_id",
      ctx.user.id,
    ).maybeSingle(),
  ) as CoachingPreferences | null;
  if (!prefs && !canCompile) throw new Error("feedback_profile_required");
  if (!prefs) {
    try {
      prefs = await savePreferences(ctx, {
        revision: 0,
        richText: "",
        level: LEVELS.includes(ctx.user.user_metadata.english_level)
          ? ctx.user.user_metadata.english_level
          : "b1",
        language: LANGUAGES.includes(ctx.user.user_metadata.first_language)
          ? ctx.user.user_metadata.first_language
          : "en",
      });
    } catch (e) {
      if (e instanceof Error && e.message === "feedback_revision_conflict") {
        prefs = checked(
          await ctx.client.from("coaching_preferences").select("*").eq(
            "user_id",
            ctx.user.id,
          ).single(),
        ) as CoachingPreferences;
      } else throw e;
    }
  }
  if (!prefs) throw new Error("feedback_storage");
  if (prefs.current_profile_version_id) {
    const row = checked(
      await ctx.client.from("coaching_profile_versions").select("*").eq(
        "id",
        prefs.current_profile_version_id,
      ).single(),
    );
    if (
      row.source_revision === prefs.source_revision &&
      row.compiler_version === PROFILE_VERSION
    ) return row as ProfileRow;
  }
  if (!canCompile) throw new Error("feedback_profile_required");
  const fingerprint = await hash({
    revision: prefs.source_revision,
    compiler: PROFILE_VERSION,
  });
  const attempt = await claim(ctx, "profile", fingerprint);
  if (attempt.cached) {
    return checked(
      await ctx.client.from("coaching_profile_versions").select("*").eq(
        "source_revision",
        prefs.source_revision,
      ).eq("compiler_version", PROFILE_VERSION).single(),
    ) as ProfileRow;
  }
  if (attempt.busy) throw new Error("feedback_profile_busy");
  try {
    const profile = prefs.plain_text
      ? parseProfile(
        await completion(
          ctx,
          profileRequest(
            prefs.plain_text,
            prefs.english_level,
            prefs.first_language,
          ),
          "coaching_profile",
        ),
        prefs.plain_text,
      )
      : defaultProfile();
    const id = crypto.randomUUID();
    if (
      !await finish(ctx, attempt, {
        id,
        profile,
        source_revision: prefs.source_revision,
        source_hash: await hash(prefs.plain_text),
        compiler_version: PROFILE_VERSION,
        model: prefs.plain_text ? MODEL : "code-owned-default",
      })
    ) throw new Error("feedback_profile_changed");
    return checked(
      await ctx.client.from("coaching_profile_versions").select("*").eq(
        "id",
        id,
      ).single(),
    ) as ProfileRow;
  } catch (e) {
    await finish(ctx, attempt, { error_code: "feedback_profile_failed" }).catch(
      () => {},
    );
    throw e;
  }
}
export interface ProfileRow {
  id: string;
  source_revision: number;
  source_text: string;
  profile: CoachingProfile;
  english_level: CoachingPreferences["english_level"];
  first_language: CoachingPreferences["first_language"];
}
