import { initialCoachingLevel } from "./coaching-level-migration";
import { supabase } from "./supabase";
import { requireAiProcessingConsent } from "./ai-consent";
import type {
  CoachingPreferences,
  FeedbackReport,
  FeedbackRetry,
} from "../../../../supabase/functions/_shared/feedback-types";
import type { EnglishLevel } from "./english-level";
import type { L1 } from "./first-language";
export type {
  AdvancedFeedback,
  CoachingPreferences,
  FeedbackReport,
  FeedbackRetry,
} from "../../../../supabase/functions/_shared/feedback-types";
export async function feedbackAccountId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Sign in to use speaking feedback.");
  return user.id;
}
export async function loadCoachingPreferences() {
  const userId = await feedbackAccountId();
  const { data, error } = await supabase.from("coaching_preferences").select(
    "*",
  ).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as CoachingPreferences | null;
}
async function invoke<T>(
  name: string,
  body: Record<string, unknown>,
  ownerId: string,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== ownerId) {
    throw new Error("Your account changed. Reopen this page.");
  }
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    let code = "";
    try {
      code = (await error.context?.json())?.code ?? "";
    } catch {}
    throw new Error(message(code));
  }
  return data as T;
}
function message(code: string) {
  const messages: Record<string, string> = {
    feedback_daily_limit:
      "Today’s analysis limit has been reached. Try again tomorrow.",
    feedback_profile_required:
      "Your speaking focus changed. Please analyze this session again.",
    feedback_profile_busy:
      "Your speaking focus is being prepared. Try again shortly.",
    feedback_revision_conflict:
      "Your focus changed on another device. Reopen this page before saving.",
    feedback_profile_changed:
      "Your speaking focus changed. Run the analysis again.",
    feedback_consent_required:
      "Enable AI processing in Settings → Privacy to analyze your speech.",
    feedback_empty_session: "There is no saved speech to analyze.",
  };
  return messages[code] ??
    "Couldn’t complete the analysis. Your session is safe. Please try again.";
}
export async function saveCoachingPreferences(
  input: {
    revision: number;
    richText: string;
    level: EnglishLevel;
    language: L1;
  },
  ownerId: string,
) {
  return (await invoke<{ preferences: CoachingPreferences }>(
    "coaching-profile",
    { operation: "save", ...input },
    ownerId,
  )).preferences;
}
export async function loadFeedbackState(sessionId: string) {
  const userId = await feedbackAccountId();
  const latest = await supabase.from("talk_feedback_reports").select("*").eq(
    "user_id",
    userId,
  ).eq("session_id", sessionId).order("created_at", { ascending: false }).limit(
    1,
  ).maybeSingle();
  if (latest.error) throw latest.error;
  const attempt = latest.data as FeedbackReport | null;
  if (!attempt || attempt.status === "ready") {
    return { report: attempt, attempt };
  }
  const ready = await supabase.from("talk_feedback_reports").select("*").eq(
    "user_id",
    userId,
  ).eq("session_id", sessionId).eq("status", "ready").order("created_at", {
    ascending: false,
  }).limit(1).maybeSingle();
  if (ready.error) throw ready.error;
  return { report: (ready.data ?? attempt) as FeedbackReport, attempt };
}
export async function analyzeFeedback(
  sessionId: string,
  options: {
    ownerId: string;
    retry?: FeedbackRetry;
    clarification?: {
      parentReportId: string;
      findingId: string;
      answer: string;
    };
  },
) {
  await requireAiProcessingConsent();
  const preferences = await loadCoachingPreferences();
  if (!preferences) {
    const { data: { session } } = await supabase.auth.getSession();
    const rawLanguage = session?.user.user_metadata.first_language;
    const language: L1 =
      ["en", "ko", "zh-Hant", "ja", "es", "ru"].includes(rawLanguage)
        ? rawLanguage
        : "en";
    try {
      await saveCoachingPreferences({
        revision: 0,
        richText: "",
        level: await initialCoachingLevel(options.ownerId),
        language,
      }, options.ownerId);
    } catch (error) {
      if (!(await loadCoachingPreferences())) throw error;
    }
  }
  // Separate requests keep profile compilation and report generation within
  // their own provider timeout/lease. The analysis function never compiles.
  await invoke("coaching-profile", { operation: "compile" }, options.ownerId);
  const body = {
    sessionId,
    requestId: globalThis.expo.uuidv4(),
    ...(options?.clarification
      ? { operation: "clarify", ...options.clarification }
      : options?.retry
      ? { operation: "compare", ...options.retry }
      : { operation: "analyze" }),
  };
  return invoke<{ report: FeedbackReport | null; pending?: boolean }>(
    "talk-advanced-feedback",
    body,
    options.ownerId,
  );
}

export async function linkFeedbackRetry(
  sessionId: string,
  retry: FeedbackRetry,
) {
  const { error } = await supabase.rpc("link_feedback_retry", {
    p_session: sessionId,
    p_source: retry.sourceReportId,
    p_targets: retry.targetFindingIds,
  });
  if (error) throw error;
}
