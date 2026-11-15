import { AiConsentSheet } from "./ai-consent-sheet";
import { FeedbackReview } from "./feedback-review";
import { ReviewState } from "./review-state";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/design/text";
import { useTheme } from "@/design/theme";
import { Pill } from "@/design/ui";
import {
  analyzeFeedback,
  type FeedbackReport,
  type FeedbackRetry,
  loadCoachingPreferences,
  loadFeedbackState,
} from "@/lib/advanced-feedback";
import { aiProcessingConsentFromMetadata } from "@/lib/ai-consent";
import { useAuth } from "@/lib/auth";
type ReportProps = {
  sessionId: string | null;
  /** The session is still being saved, so there is no id to review yet. */
  saving?: boolean;
  active?: boolean;
  /** Length of the session transcript, so the report can place each moment. */
  transcriptLength?: number;
  retry?: FeedbackRetry;
  onRetry: (retry: FeedbackRetry) => void;
};
/**
 * The Feedback page of a finished session. The review starts on its own the
 * first time the page is shown; the page then holds exactly one of: loading,
 * AI-processing-off (the switch opens in a sheet right here, so turning it on
 * never loses the page), failed (a round ↻), or the review itself.
 */
export function AdvancedFeedbackReport(props: ReportProps) {
  const { session } = useAuth();
  return (
    <FeedbackReportContent
      key={`${session?.user.id}:${props.sessionId}`}
      {...props}
    />
  );
}
function FeedbackReportContent(
  { sessionId, saving = false, active = true, transcriptLength, retry, onRetry }: ReportProps,
) {
  const t = useTheme(), { session } = useAuth(), userId = session?.user.id;
  const aiAllowed =
    aiProcessingConsentFromMetadata(session?.user.user_metadata) === "allowed";
  const [report, setReport] = useState<FeedbackReport | null>(null),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState<string | null>(null),
    // The server is still writing the review: "check again", not "it failed".
    [pending, setPending] = useState(false),
    [stale, setStale] = useState(false),
    [consentOpen, setConsentOpen] = useState(false);
  const [lastClarification, setLastClarification] = useState<
    { parentReportId: string; findingId: string; answer: string } | undefined
  >(undefined);
  const epoch = useRef(0);
  useEffect(() => () => {
    epoch.current++;
  }, []);
  useEffect(() => {
    if (!active || !sessionId || loaded) return;
    let alive = true;
    void Promise.all([loadFeedbackState(sessionId), loadCoachingPreferences()])
      .then(([state, p]) => {
        const r = state.report;
        if (alive) {
          setReport(r);
          // A failed attempt with nothing saved is simply retried by the
          // automatic run below, so it only needs words when a review exists.
          if (state.attempt?.status === "failed" && r?.status === "ready") {
            setError(
              "The last update couldn’t be completed. Your saved review is still available.",
            );
          }
          if (state.attempt?.status === "generating") {
            setPending(true);
            setError("Your review is still being written.");
          }
          setStale(
            !!r && p?.current_profile_version_id !== r.profile_version_id,
          );
          setLoaded(true);
        }
      }).catch(() => {
        if (alive) {
          setError("Couldn’t load the saved analysis.");
          setLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [active, sessionId, userId, loaded]);
  const run = async (
    clarification?: {
      parentReportId: string;
      findingId: string;
      answer: string;
    },
  ) => {
    if (!sessionId || busy || !userId) return;
    setLastClarification(clarification);
    const current = epoch.current;
    setBusy(true);
    setError(null);
    setPending(false);
    try {
      const result = await analyzeFeedback(sessionId, {
        retry,
        clarification,
        ownerId: userId,
      });
      if (current !== epoch.current) return;
      if (
        result.report &&
        (result.report.status === "ready" || report?.status !== "ready")
      ) {
        setReport(result.report);
        setStale(false);
      }
      if (result.pending) {
        setPending(true);
        setError("Your review is still being written.");
      } else if (result.report?.status !== "ready") {
        // Nothing usable came back and nothing is in flight: say so instead
        // of leaving the page on its spinner.
        setError("Couldn’t complete the analysis. Your session is safe.");
      }
    } catch (e) {
      if (current === epoch.current) {
        setError(
          e instanceof Error ? e.message : "Couldn’t analyze this session.",
        );
      }
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  };
  const refreshSaved = async () => {
    if (!sessionId || busy) return;
    const current = epoch.current;
    setBusy(true);
    setError(null);
    setPending(false);
    try {
      const state = await loadFeedbackState(sessionId);
      if (current !== epoch.current) return;
      setReport(state.report);
      setPending(state.attempt?.status === "generating");
      setError(
        state.attempt?.status === "ready"
          ? null
          : state.attempt?.status === "generating"
          ? "Your update is still being written."
          : "The last update couldn’t be completed. Your saved review is still available.",
      );
    } catch {
      if (current === epoch.current) {
        setError("Couldn’t check the saved review.");
      }
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  };
  const data = report?.status === "ready" ? report.result : null;
  // The review writes itself: the first time this page is shown for a session
  // with nothing saved (and nothing already in flight), start it. It also
  // starts when AI processing is switched on and the learner comes back.
  const autoStarted = useRef(false);
  const autoStart = useEffectEvent(() => void run());
  useEffect(() => {
    if (
      !active || !loaded || !aiAllowed || !userId || data || error ||
      autoStarted.current
    ) return;
    autoStarted.current = true;
    autoStart();
  }, [active, loaded, aiAllowed, userId, data, error]);
  const body = (text: string) => (
    <Text style={{ fontSize: 16, lineHeight: 25, color: t.colors.ink }}>
      {text}
    </Text>
  );
  if (!sessionId) {
    return saving
      ? <ReviewState mark="spinner" title="Saving your session…" />
      : (
        <ReviewState
          mark="sessions"
          title="Nothing to review yet"
          body="A saved session with speech gets a review here."
        />
      );
  }
  if (!loaded) return <ReviewState mark="spinner" title="Loading your review…" />;
  if (!data) {
    if (!aiAllowed) {
      return (
        <>
          <ReviewState
            mark="aiOff"
            title="AI processing is off"
            body="Speaking review is written by AI, and it stays off until you allow it."
            action={{
              kind: "link",
              label: "Turn on AI processing",
              onPress: () => setConsentOpen(true),
            }}
          />
          <AiConsentSheet
            open={consentOpen}
            onClose={() => setConsentOpen(false)}
            reason="Speaking review is written by AI."
          />
        </>
      );
    }
    if (error && !busy) {
      return (
        <ReviewState
          mark="retry"
          title={pending ? "Almost there" : "Something went wrong"}
          body={error}
          action={{
            kind: "retry",
            label: pending ? "Check again" : "Try again",
            onPress: () => void run(lastClarification),
          }}
        />
      );
    }
    return (
      <ReviewState
        mark="spinner"
        title="Reviewing your session…"
        body="This can take a moment."
      />
    );
  }
  return (
    <View style={{ gap: 24 }}>
      {stale && data
        ? (
          <View style={{ gap: 10 }}>
            {body(
              "Your speaking focus has changed. This is your saved review.",
            )}
            <Pill
              tone="soft"
              disabled={busy}
              style={{ alignSelf: "stretch" }}
              onPress={() => void run()}
            >
              Review with current focus
            </Pill>
          </View>
        )
        : null}
      <FeedbackReview
        key={report!.id}
        report={report!}
        busy={busy}
        transcriptLength={transcriptLength}
        onClarify={(value) => void run(value)}
        onRetry={onRetry}
      />
      {busy
        ? (
          <ActivityIndicator
            accessibilityLabel="Analyzing session"
            color={t.colors.accD}
          />
        )
        : null}
      {error
        ? (
          <ReviewState
            compact
            mark="retry"
            title={pending ? "Almost there" : "Something went wrong"}
            body={error}
            action={{
              kind: "retry",
              disabled: busy,
              label: lastClarification ? "Try again" : "Check saved review",
              onPress: () =>
                void (lastClarification ? run(lastClarification) : refreshSaved()),
            }}
          />
        )
        : null}
    </View>
  );
}
