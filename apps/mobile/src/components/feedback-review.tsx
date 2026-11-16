// feedback-review.tsx — the Speaking review, laid out as a report you can scan.
//
// The data is the same as before (overview, findings with quoted evidence,
// one practice prompt, takeaways, an optional second-try comparison); what
// changed is that it reads as an analysis instead of one column of paragraphs:
//
//   headline → what a listener hears → three counts → a strip of the talk with
//   a mark where each moment happened → each focus area as a card that opens
//   to "you said → a clearer way → pattern to keep" → Your turn → takeaways.
//
// Color has a job here. On the report's white page, navy stays the app's
// accent and two colors are the report's own: amber marks what was said,
// green marks the clearer way. Nothing else is tinted.
//
// Nothing internal is shown: categories and outcomes arrive as codes
// ("reference_clarity", "still_unclear") and always go through the label maps
// below, including when the model echoes a code inside its own text.
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { LayoutAnimation, Pressable, View } from "react-native";

import { Icon } from "@/design/icon";
import { BRAND } from "@/design/mobile-tokens";
import { Text, TextInput } from "@/design/text";
import { hairline, useTheme, type Theme } from "@/design/theme";
import { Pill, Serif } from "@/design/ui";
import type { FeedbackReport, FeedbackRetry } from "@/lib/advanced-feedback";

type Finding = NonNullable<FeedbackReport["result"]>["findings"][number];
type Category = Finding["category"];

const CATEGORY_LABEL: Record<Category, string> = {
  reference_clarity: "Clear references",
  sentence_boundaries: "Sentence breaks",
  connections: "Connecting ideas",
  verb_patterns: "Verb patterns",
  lexical_choice: "Word choice",
  grammar: "Grammar",
  fluency: "Fluency",
  other: "Clarity",
};

const OUTCOME_LABEL = {
  clearer: "Clearer",
  still_unclear: "Still unclear",
  not_comparable: "Not comparable",
} as const;

/** A code the model echoed ("reference_clarity") becomes its label; anything
 *  else that still looks like a code is at least un-snake-cased. */
function humanize(text: string): string {
  const known = CATEGORY_LABEL[text.trim() as Category];
  if (known) return known;
  if (/^[a-z]+(_[a-z]+)+$/.test(text.trim())) {
    const words = text.trim().replaceAll("_", " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return text;
}

/** The report's own surface and its two added colors, per scheme. */
export function reviewPalette(t: Theme) {
  return t.dark
    ? {
        paper: t.colors.bg,
        tile: t.colors.card,
        raised: t.colors.card,
        navySoft: t.colors.accS,
        amber: "#F5B555",
        amberMark: "#F0A030",
        amberSoft: "rgba(240,160,48,0.16)",
        green: "#4CC79A",
        greenFill: "#1F9D72",
        greenSoft: "rgba(76,199,154,0.16)",
      }
    : {
        paper: "#FFFFFF",
        tile: "#F6F7FA",
        raised: "#FFFFFF",
        navySoft: "#EEF1F8",
        amber: "#B86A00",
        amberMark: "#F0A030",
        amberSoft: "#FFF5E3",
        green: "#0F7A55",
        greenFill: "#0F7A55",
        greenSoft: "#E8F6EF",
      };
}

function Eyebrow({ children, color }: { children: string; color?: string }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 0.9, color: color ?? t.colors.ink3 }}>
      {children.toUpperCase()}
    </Text>
  );
}

export function FeedbackReview({
  report,
  busy = false,
  transcriptLength,
  onClarify,
  onRetry,
}: {
  report: FeedbackReport;
  busy?: boolean;
  /** Length of the session transcript; places each moment on the talk strip. */
  transcriptLength?: number;
  onClarify: (value: { parentReportId: string; findingId: string; answer: string }) => void;
  onRetry: (value: FeedbackRetry) => void;
}) {
  const t = useTheme();
  const p = reviewPalette(t);
  const data = report.result;
  const [openId, setOpenId] = useState<string | null>(data?.findings[0]?.id ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shownHints, setShownHints] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0);
  if (!data) return null;

  const findings = data.findings;
  const moments = findings.flatMap((f, i) => f.evidence.map((e) => ({ at: e.start, n: i + 1 })));
  const patterns = findings.filter((f) => f.certainty === "supported" && f.pattern).length;
  const order = data.overview.suggested_order.map(humanize);
  const body = { fontSize: 15.5, lineHeight: 23, color: t.colors.ink } as const;
  const cardShadow = t.dark ? null : { shadowColor: BRAND.main, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } };

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  };

  // Your turn: hints open one at a time, then the possible answer.
  const turnSteps = [
    ...data.practice.hints.map((text, i) => ({ label: `Hint ${i + 1}`, text })),
    ...(data.practice.possible_answer ? [{ label: "Answer", text: data.practice.possible_answer }] : []),
  ];
  const canRetry =
    data.practice.target_finding_ids.length > 0 &&
    data.practice.target_finding_ids.every((id) => findings.find((f) => f.id === id)?.certainty === "supported");

  return (
    <View style={{ gap: 26 }}>
      {/* ── The big picture ── */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Eyebrow>The big picture</Eyebrow>
          <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: "center", backgroundColor: p.navySoft }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", color: t.colors.accD }}>{report.english_level.toUpperCase()}</Text>
          </View>
        </View>
        <Serif style={{ fontSize: 29, lineHeight: 35, fontWeight: "600", letterSpacing: -0.4, color: t.colors.ink }}>
          {data.overview.title}
        </Serif>
        <View style={{ flexDirection: "row", gap: 11, marginTop: 2 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: p.navySoft }}>
            <Icon name="ear" s={16} w={2} c={t.colors.accD} />
          </View>
          <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: t.colors.ink2 }}>{data.overview.listener_view}</Text>
        </View>
      </View>

      {/* ── At a glance ── */}
      {findings.length ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { n: findings.length, label: findings.length === 1 ? "Focus area" : "Focus areas", c: t.colors.acc },
              { n: moments.length, label: moments.length === 1 ? "Moment" : "Moments", c: p.amber },
              { n: patterns, label: patterns === 1 ? "Pattern to keep" : "Patterns to keep", c: p.green },
            ].map((s) => (
              <View
                key={s.label}
                accessible
                accessibilityLabel={`${s.n} ${s.label}`}
                style={{ flex: 1, gap: 2, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 11, borderRadius: 18, backgroundColor: p.tile }}
              >
                <Text style={{ fontSize: 26, lineHeight: 30, fontWeight: "700", letterSpacing: -0.5, color: s.c, fontVariant: ["tabular-nums"] }}>{s.n}</Text>
                <Text style={{ fontSize: 12, lineHeight: 15, fontWeight: "500", color: t.colors.ink2 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {transcriptLength && moments.length ? (
            <View accessible accessibilityLabel={`Where it showed up in your talk: ${moments.length} ${moments.length === 1 ? "moment" : "moments"}`}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink }}>Where it showed up</Text>
              <View style={{ height: 22, marginTop: 8, justifyContent: "center", marginHorizontal: 11 }}>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: p.navySoft, marginHorizontal: -11 }} />
                {moments.map((m, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      const id = findings[m.n - 1].id;
                      if (openId !== id) toggle(id);
                    }}
                    hitSlop={10}
                    style={{
                      position: "absolute",
                      left: `${Math.min(100, Math.max(0, (m.at / transcriptLength) * 100))}%`,
                      marginLeft: -11,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: p.amberMark,
                      borderWidth: 2,
                      borderColor: p.paper,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#fff" }}>{m.n}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{ fontSize: 11.5, color: t.colors.ink3 }}>Start of talk</Text>
                <Text style={{ fontSize: 11.5, color: t.colors.ink3 }}>End</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── Order to work in: only worth saying when there is more than one ── */}
      {order.length > 1 ? (
        <View style={{ gap: 10 }}>
          <Eyebrow>Work on, in this order</Eyebrow>
          {order.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 11, alignItems: "flex-start" }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: p.navySoft }}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.colors.accD }}>{i + 1}</Text>
              </View>
              <Text style={[body, { flex: 1 }]}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Focus areas ── */}
      {findings.length ? (
        <View style={{ gap: 10 }}>
          <Eyebrow>{findings.length === 1 ? "Focus area" : "Focus areas"}</Eyebrow>
          {findings.map((f, i) => {
            const open = openId === f.id;
            const supported = f.certainty === "supported";
            return (
              <View
                key={f.id}
                style={[
                  { borderRadius: 22, backgroundColor: p.raised, borderWidth: hairline, borderColor: t.colors.sep },
                  cardShadow,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => toggle(f.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: p.amberMark }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: supported ? t.colors.accD : p.amber }}>
                      {CATEGORY_LABEL[f.category] ?? humanize(f.category)}
                      {supported ? "" : " · Needs your answer"}
                    </Text>
                    <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: "600", color: t.colors.ink }}>{f.title}</Text>
                  </View>
                  <View style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}>
                    <Icon name="chev" s={16} w={2.2} c={t.colors.ink3} />
                  </View>
                </Pressable>

                {open ? (
                  <View style={{ gap: 12, paddingHorizontal: 14, paddingBottom: 16 }}>
                    <View style={{ gap: 6, padding: 12, borderRadius: 16, backgroundColor: p.amberSoft }}>
                      <Eyebrow color={p.amber}>You said</Eyebrow>
                      {f.evidence.map((e, n) => (
                        <Text key={n} selectable style={{ fontSize: 15.5, lineHeight: 22, color: t.colors.ink }}>
                          “{e.quote.replace(/\s+/g, " ").trim()}”
                        </Text>
                      ))}
                    </View>

                    <Text style={[body, { color: t.colors.ink2, fontSize: 15, lineHeight: 22 }]}>{f.explanation}</Text>

                    {supported ? (
                      <>
                        {f.correction ? (
                          <View style={{ gap: 6, padding: 12, borderRadius: 16, backgroundColor: p.greenSoft }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                              <Icon name="check" s={12} w={3} c={p.green} />
                              <Eyebrow color={p.green}>A clearer way</Eyebrow>
                            </View>
                            <Text selectable style={{ fontSize: 15.5, lineHeight: 22, color: t.colors.ink }}>{f.correction}</Text>
                          </View>
                        ) : null}
                        {f.pattern ? (
                          <View style={{ gap: 4, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: t.colors.acc }}>
                            <Eyebrow>Pattern to keep</Eyebrow>
                            <Text selectable style={{ fontSize: 17, lineHeight: 24, fontWeight: "600", color: t.colors.accD }}>{f.pattern}</Text>
                          </View>
                        ) : null}
                        {f.practice_question ? (
                          <View style={{ gap: 4 }}>
                            <Eyebrow>Ask yourself</Eyebrow>
                            <Text style={body}>{f.practice_question}</Text>
                            {f.hint ? (
                              shownHints[f.id] ? (
                                <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 2 }}>{f.hint}</Text>
                              ) : (
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setShownHints((h) => ({ ...h, [f.id]: true }))}
                                  style={{ minHeight: 36, justifyContent: "center", alignSelf: "flex-start" }}
                                >
                                  <Text style={{ fontSize: 14.5, fontWeight: "600", color: t.colors.accD }}>Show hint</Text>
                                </Pressable>
                              )
                            ) : null}
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <View style={{ gap: 12, padding: 12, borderRadius: 16, backgroundColor: p.navySoft }}>
                        <Text style={[body, { fontWeight: "600" }]}>{f.clarification_question ?? "What did you mean here?"}</Text>
                        <TextInput
                          multiline
                          maxLength={1200}
                          value={answers[f.id] ?? ""}
                          onChangeText={(value) => setAnswers((a) => ({ ...a, [f.id]: value }))}
                          placeholder="Say what you meant"
                          placeholderTextColor={t.colors.ink3}
                          accessibilityLabel="Clarification"
                          style={{
                            fontSize: 16,
                            lineHeight: 23,
                            minHeight: 76,
                            padding: 12,
                            borderRadius: 12,
                            color: t.colors.ink,
                            backgroundColor: p.raised,
                            textAlignVertical: "top",
                          }}
                        />
                        <Pill
                          disabled={busy || !answers[f.id]?.trim()}
                          style={{ alignSelf: "stretch" }}
                          onPress={() => onClarify({ parentReportId: report.id, findingId: f.id, answer: answers[f.id].trim() })}
                        >
                          {busy ? "Reviewing…" : "Update review"}
                        </Pill>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── Second try, when this session was a retry ── */}
      {data.comparison ? (
        <View style={{ gap: 10 }}>
          <Eyebrow>Your second try</Eyebrow>
          {data.comparison.targets.map((target) => {
            const good = target.outcome === "clearer";
            const tone = good ? p.greenFill : target.outcome === "still_unclear" ? p.amberMark : t.colors.ink3;
            return (
              <View key={target.finding_id} style={[{ gap: 10, padding: 14, borderRadius: 22, backgroundColor: p.raised, borderWidth: hairline, borderColor: t.colors.sep }, cardShadow]}>
                <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: "center", backgroundColor: tone }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>{OUTCOME_LABEL[target.outcome] ?? humanize(target.outcome)}</Text>
                </View>
                {[
                  { label: "Before", rows: target.before, c: p.amber, ink: t.colors.ink2 },
                  { label: "Now", rows: target.after, c: p.green, ink: t.colors.ink },
                ].map((side) =>
                  side.rows.length ? (
                    <View key={side.label} style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ width: 52, paddingTop: 3 }}>
                        <Eyebrow color={side.c}>{side.label}</Eyebrow>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        {side.rows.map((e, i) => (
                          <Text key={i} style={{ fontSize: 15, lineHeight: 22, color: side.ink }}>{e.quote.replace(/\s+/g, " ").trim()}</Text>
                        ))}
                      </View>
                    </View>
                  ) : null,
                )}
                <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2 }}>{target.observation}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── Your turn: the one dark block on the page ── */}
      <LinearGradient
        colors={[BRAND.dark, "#22346B", BRAND.light]}
        locations={[0, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 26, padding: 20, gap: 14 }}
      >
        <Eyebrow color="rgba(255,255,255,0.62)">Your turn</Eyebrow>
        <Serif style={{ fontSize: 23, lineHeight: 30, fontWeight: "600", letterSpacing: -0.2, color: "#fff", marginTop: -4 }}>
          {data.practice.question}
        </Serif>
        {turnSteps.length ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {turnSteps.map((s, i) => {
                const shown = i < step;
                const next = i === step;
                return (
                  <Pressable
                    key={s.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: shown, disabled: !shown && !next }}
                    disabled={!next}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setStep(i + 1);
                    }}
                    hitSlop={{ top: 8, bottom: 8 }}
                    style={{
                      paddingHorizontal: 13,
                      height: 30,
                      borderRadius: 15,
                      justifyContent: "center",
                      backgroundColor: shown ? "#fff" : "rgba(255,255,255,0.14)",
                      opacity: shown || next ? 1 : 0.5,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: shown ? BRAND.main : "#fff" }}>
                      {next ? `Show ${s.label.toLowerCase()}` : s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {turnSteps.slice(0, step).map((s) => (
              <Text key={s.label} style={{ fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.9)" }}>
                <Text style={{ fontWeight: "700", color: "#fff" }}>{s.label} · </Text>
                {s.text}
              </Text>
            ))}
          </View>
        ) : null}
        {canRetry ? (
          <Pill
            tone="white"
            icon="mic"
            disabled={busy}
            style={{ alignSelf: "stretch", marginTop: 2 }}
            onPress={() => onRetry({ sourceReportId: report.id, targetFindingIds: data.practice.target_finding_ids })}
          >
            Try it aloud
          </Pill>
        ) : null}
      </LinearGradient>

      {/* ── What to carry out of this session ── */}
      {data.takeaway.length ? (
        <View style={{ gap: 8 }}>
          <Eyebrow>Take with you</Eyebrow>
          {data.takeaway.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 11, padding: 13, borderRadius: 18, backgroundColor: p.greenSoft }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: p.greenFill }}>
                <Icon name="check" s={12} w={3} c="#fff" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: t.colors.ink }}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.overview.next_step ? (
        <View style={{ gap: 4, padding: 14, borderRadius: 18, backgroundColor: p.navySoft, marginBottom: 12 }}>
          <Eyebrow color={t.colors.accD}>Next step</Eyebrow>
          <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink }}>{data.overview.next_step}</Text>
        </View>
      ) : null}
    </View>
  );
}
