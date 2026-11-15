import { AiConsentSheet } from "./ai-consent-sheet";
import { ReviewState } from "./review-state";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text, TextInput } from "@/design/text";
import { hairline, useTheme } from "@/design/theme";
import { Card, Pill } from "@/design/ui";
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
  { sessionId, saving = false, active = true, retry, onRetry }: ReportProps,
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
      {data
        ? (
          <Text style={{ fontSize: 12, lineHeight: 18, color: t.colors.ink3 }}>
            Saved review · {report!.english_level.toUpperCase()} ·{" "}
            {report!.first_language}
          </Text>
        )
        : null}
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

export function FeedbackReview({
  report,
  busy = false,
  onClarify,
  onRetry,
}: {
  report: FeedbackReport;
  busy?: boolean;
  onClarify: (
    value: { parentReportId: string; findingId: string; answer: string },
  ) => void;
  onRetry: (value: FeedbackRetry) => void;
}) {
  const t = useTheme(), data = report.result;
  const [answers, setAnswers] = useState<Record<string, string>>({}),
    [hints, setHints] = useState(0);
  const heading = (label: string) => (
    <Text
      style={{
        fontSize: 11.5,
        fontWeight: "700",
        letterSpacing: 1,
        color: t.colors.ink3,
      }}
    >
      {label}
    </Text>
  );
  const body = (text: string) => (
    <Text style={{ fontSize: 16, lineHeight: 25, color: t.colors.ink }}>
      {text}
    </Text>
  );
  if (!data) return null;
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 10 }}>
        {heading("THE BIG PICTURE")}
        <Text
          style={{
            fontSize: 28,
            lineHeight: 34,
            fontWeight: "600",
            color: t.colors.ink,
          }}
        >
          {data.overview.title}
        </Text>
        {body(data.overview.listener_view)}
        {data.overview.suggested_order.length
          ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {data.overview.suggested_order.map((s, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                  <Text style={{ fontSize: 14, color: t.colors.ink3 }}>
                    {i + 1}.
                  </Text>
                  <View style={{ flex: 1 }}>{body(s)}</View>
                </View>
              ))}
            </View>
          )
          : null}
        {body(data.overview.next_step)}
      </View>
      {data.findings.map((finding, i) => (
        <View
          key={finding.id}
          style={{
            gap: 14,
            borderTopWidth: hairline,
            borderColor: t.colors.sep,
            paddingTop: 24,
          }}
        >
          {heading(
            `0${i + 1} · ${
              finding.category.replaceAll("_", " ").toUpperCase()
            }`,
          )}
          <Text
            style={{
              fontSize: 22,
              lineHeight: 28,
              fontWeight: "600",
              color: t.colors.ink,
            }}
          >
            {finding.title}
          </Text>
          <View
            style={{
              borderLeftWidth: 2,
              borderColor: t.colors.sep,
              paddingLeft: 14,
              gap: 8,
            }}
          >
            {finding.evidence.map((e, n) => (
              <Text
                key={n}
                selectable
                style={{ fontSize: 16, lineHeight: 25, color: t.colors.ink2 }}
              >
                “{e.quote}”
              </Text>
            ))}
          </View>
          {body(finding.explanation)}
          {finding.certainty !== "supported"
            ? (
              <Card style={{ gap: 12 }}>
                {body(
                  finding.clarification_question ?? "What did you mean here?",
                )}
                <TextInput
                  multiline
                  maxLength={1200}
                  value={answers[finding.id] ?? ""}
                  onChangeText={(value) =>
                    setAnswers((a) => ({ ...a, [finding.id]: value }))}
                  placeholder="Clarify what you meant"
                  accessibilityLabel="Clarification"
                  style={{
                    fontSize: 16,
                    lineHeight: 24,
                    minHeight: 72,
                    color: t.colors.ink,
                  }}
                />
                <Pill
                  disabled={busy || !answers[finding.id]?.trim()}
                  onPress={() =>
                    onClarify({
                      parentReportId: report.id,
                      findingId: finding.id,
                      answer: answers[finding.id].trim(),
                    })}
                >
                  {busy ? "Reviewing…" : "Update review"}
                </Pill>
              </Card>
            )
            : (
              <>
                {heading("A CLEARER WAY")}
                {body(finding.correction!)}
                {heading("KEEP THIS PATTERN")}
                <Text
                  selectable
                  style={{
                    fontSize: 18,
                    lineHeight: 27,
                    fontWeight: "500",
                    color: t.colors.accD,
                  }}
                >
                  {finding.pattern}
                </Text>
                {body(finding.practice_question!)}
                {finding.hint
                  ? (
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        color: t.colors.ink2,
                      }}
                    >
                      {finding.hint}
                    </Text>
                  )
                  : null}
              </>
            )}
        </View>
      ))}
      {data.comparison
        ? (
          <View
            style={{
              gap: 14,
              borderTopWidth: hairline,
              borderColor: t.colors.sep,
              paddingTop: 24,
            }}
          >
            {heading("YOUR SECOND TRY")}
            {data.comparison.targets.map((target) => (
              <View key={target.finding_id} style={{ gap: 8 }}>
                {heading(target.outcome.replaceAll("_", " ").toUpperCase())}
                {body(target.observation)}
                {target.before.map((e, i) => (
                  <Text
                    key={`b${i}`}
                    style={{
                      color: t.colors.ink3,
                      fontSize: 15,
                      lineHeight: 23,
                    }}
                  >
                    Before · {e.quote}
                  </Text>
                ))}
                {target.after.map((e, i) => (
                  <Text
                    key={`a${i}`}
                    style={{
                      color: t.colors.ink,
                      fontSize: 15,
                      lineHeight: 23,
                    }}
                  >
                    Now · {e.quote}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )
        : null}
      <View
        style={{
          gap: 14,
          borderTopWidth: hairline,
          borderColor: t.colors.sep,
          paddingTop: 24,
        }}
      >
        {heading("YOUR TURN")}
        {body(data.practice.question)}
        {data.practice.hints.slice(0, hints).map((hint, i) => (
          <View key={i}>{body(hint)}</View>
        ))}
        {hints > data.practice.hints.length && data.practice.possible_answer
          ? body(data.practice.possible_answer)
          : null}
        {hints <
            data.practice.hints.length + (data.practice.possible_answer ? 1 : 0)
          ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setHints((n) => n + 1)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ fontSize: 15, color: t.colors.accD }}>
                {hints < data.practice.hints.length
                  ? "Show a hint"
                  : "See one possible answer"}
              </Text>
            </Pressable>
          )
          : null}
        {data.practice.target_finding_ids.length &&
            data.practice.target_finding_ids.every((id) =>
              data.findings.find((f) => f.id === id)?.certainty === "supported"
            )
          ? (
            <Pill
              icon="mic"
              disabled={busy}
              onPress={() =>
                onRetry({
                  sourceReportId: report.id,
                  targetFindingIds: data.practice.target_finding_ids,
                })}
            >
              Try it aloud
            </Pill>
          )
          : null}
      </View>
      {data.takeaway.length
        ? (
          <View style={{ gap: 10, paddingBottom: 12 }}>
            {heading("TAKE WITH YOU")}
            {data.takeaway.map((s, i) => <View key={i}>{body(s)}</View>)}
          </View>
        )
        : null}
    </View>
  );
}
