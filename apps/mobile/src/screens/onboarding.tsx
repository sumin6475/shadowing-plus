// onboarding.tsx — the simple slide onboarding. One message per screen:
// the pain (words hide when you speak), the method (passive → active),
// then the three permissions woven into what each one unlocks (camera =
// collect, mic = speak, notifications = review), and sign-in last.
// The old record-your-first-story flow is gone; the draft state machine is
// kept only for status (in_progress / awaiting_sign_in / completed) so the
// root gate keeps working.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useCameraPermissions } from "expo-camera";
import * as Notifications from "expo-notifications";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import Svg, { Path } from "react-native-svg";
import Reanimated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/design/theme";
import { Icon, Pill, Serif, Wave, toneColor, type IconName } from "@/design/ui";
import { useAuth } from "@/lib/auth";
import { saveOnboardingDraft, type OnboardingDraft } from "@/lib/onboarding";

type SlidePermission = "camera" | "microphone" | "notifications" | null;

interface Slide {
  key: SlideKey;
  eyebrow: string;
  title: string;
  /** One short sentence per line. */
  lines: string[];
  cta: string;
  permission: SlidePermission;
}

type SlideKey = "pain" | "method" | "collect" | "speak" | "review" | "save";

const SLIDES: Slide[] = [
  {
    key: "pain",
    eyebrow: "THE PROBLEM",
    title: "You know English.",
    lines: ["The words are in your head.", "They hide when you speak."],
    cta: "Continue",
    permission: null,
  },
  {
    key: "method",
    eyebrow: "THE METHOD",
    title: "Make it active.",
    lines: ["Collect phrases you meet.", "Say them about your life.", "That is the whole method."],
    cta: "Continue",
    permission: null,
  },
  {
    key: "collect",
    eyebrow: "COLLECT",
    title: "Catch phrases anywhere.",
    lines: ["A subtitle. A caption. A sign.", "Snap it. Saylo keeps the phrase."],
    cta: "Allow camera",
    permission: "camera",
  },
  {
    key: "speak",
    eyebrow: "SPEAK",
    title: "Say them out loud.",
    lines: ["Talk to your mirror a minute a day.", "Saylo shows what came out."],
    cta: "Allow microphone",
    permission: "microphone",
  },
  {
    key: "review",
    eyebrow: "REVIEW",
    title: "Keep them ready.",
    lines: ["A tiny review at the right time.", "Your phrases stay active."],
    cta: "Allow notifications",
    permission: "notifications",
  },
  {
    key: "save",
    eyebrow: "SAVE",
    title: "Make it yours.",
    lines: ["Your phrases and stories, saved.", "Continue on any device."],
    cta: "",
    permission: null,
  },
];

const LAST = SLIDES.length - 1;

// Set when the learner leaves for the email sign-in screen, so coming back
// resumes on the save slide instead of replaying the deck.
let resumeAtAuthSlide = false;

export function Onboarding({
  initialDraft,
  signedIn,
  onDraftChange,
  onSignIn,
  onDirectSignIn,
  onComplete,
}: {
  initialDraft: OnboardingDraft;
  signedIn: boolean;
  onDraftChange: (draft: OnboardingDraft) => void;
  onSignIn: (draft: OnboardingDraft) => void;
  onDirectSignIn: () => void;
  onComplete: (draft: OnboardingDraft) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { signInWithSocial, socialProviders } = useAuth();
  // Always start at slide one; only an email sign-in round trip resumes at
  // the save slide.
  const [idx, setIdx] = useState(() => {
    const resume = resumeAtAuthSlide;
    resumeAtAuthSlide = false;
    return resume ? LAST : 0;
  });
  const [draft, setDraft] = useState(initialDraft);
  const [asking, setAsking] = useState(false);
  const [authBusy, setAuthBusy] = useState<"apple" | "google" | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const slide = SLIDES[idx];

  const persist = useCallback(
    (patch: Partial<OnboardingDraft>) => {
      const next: OnboardingDraft = {
        ...draft,
        ...patch,
        status: patch.status ?? (draft.status === "not_started" ? "in_progress" : draft.status),
        updatedAt: new Date().toISOString(),
      };
      setDraft(next);
      onDraftChange(next);
      void saveOnboardingDraft(next);
      return next;
    },
    [draft, onDraftChange],
  );

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  void cameraPermission;

  const next = () => setIdx((value) => Math.min(LAST, value + 1));
  const back = () => setIdx((value) => Math.max(0, value - 1));

  const completeAll = useCallback(() => {
    const done = persist({ status: "completed" });
    onComplete(done);
  }, [persist, onComplete]);

  // Social sign-in resolves outside this component (auth session arrives);
  // once it does, finish onboarding without another tap.
  useEffect(() => {
    if (signedIn && idx === LAST) completeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, idx]);

  const advance = async () => {
    if (idx === 0 && draft.status === "not_started") persist({});
    if (!slide.permission) {
      next();
      return;
    }
    if (asking) return;
    setAsking(true);
    try {
      if (slide.permission === "camera") await requestCameraPermission();
      else if (slide.permission === "microphone") await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      else await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    } catch {
      // Denied or unavailable is fine; the app asks again in context later.
    } finally {
      setAsking(false);
      next();
    }
  };

  const continueWithSocial = async (provider: "apple" | "google") => {
    if (authBusy) return;
    setAuthBusy(provider);
    setAuthError(null);
    try {
      await signInWithSocial(provider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Couldn’t sign in. Please try again.");
    } finally {
      setAuthBusy(null);
    }
  };

  const useEmail = () => {
    resumeAtAuthSlide = true;
    const nextDraft = persist({ status: "awaiting_sign_in" });
    onSignIn(nextDraft);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 10, paddingHorizontal: 24 }}>
      {/* Top bar: back on the left, sign-in escape on the right. */}
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {idx > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={back}
            style={[styles.roundButton, { backgroundColor: t.colors.card, borderColor: t.ring }, t.shadowCard]}
          >
            <Icon name="back" s={17} w={2.2} c={t.colors.ink} />
          </Pressable>
        ) : (
          <Text style={{ fontSize: 21, fontWeight: "700", color: t.colors.ink }}>saylo</Text>
        )}
        {idx < LAST ? (
          <Pressable onPress={onDirectSignIn} hitSlop={10}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.acc }}>Sign in</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Slide content — keyed so each slide replays its cascade. */}
      <View key={slide.key} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 26 }}>
        <Reanimated.View entering={FadeInRight.duration(260)}>
          <SlideArt slide={slide.key} />
        </Reanimated.View>
        <Reanimated.View entering={FadeInDown.delay(90).springify().damping(17)} style={{ alignItems: "center", gap: 12, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 1, color: t.colors.accD }}>{slide.eyebrow}</Text>
          <Serif style={{ fontSize: 32, lineHeight: 38, color: t.colors.ink, textAlign: "center" }}>{slide.title}</Serif>
          <View style={{ gap: 2 }}>
            {slide.lines.map((line) => (
              <Text key={line} style={{ fontSize: 16, lineHeight: 24, color: t.colors.ink2, textAlign: "center" }}>
                {line}
              </Text>
            ))}
          </View>
        </Reanimated.View>
      </View>

      {/* Bottom: dots + CTA (or the auth stack on the last slide). */}
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 7 }}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === idx ? t.colors.acc : t.colors.soft }} />
          ))}
        </View>
        {idx < LAST ? (
          <View style={{ gap: 4 }}>
            <Pill full onPress={() => void advance()} style={styles.flowButton}>
              {asking ? "…" : slide.cta}
            </Pill>
            {slide.permission ? (
              <Pressable accessibilityRole="button" onPress={next} disabled={asking} style={styles.skipButton}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.ink3 }}>Not now</Text>
              </Pressable>
            ) : null}
          </View>
        ) : signedIn ? (
          <Pill full onPress={completeAll} style={styles.flowButton}>
            Start speaking
          </Pill>
        ) : (
          <View style={{ gap: 11 }}>
            {socialProviders === null ? <ActivityIndicator color={t.colors.acc} /> : null}
            {socialProviders?.apple ? <AuthChoice kind="apple" busy={authBusy === "apple"} disabled={Boolean(authBusy)} onPress={() => void continueWithSocial("apple")} /> : null}
            {socialProviders?.google ? <AuthChoice kind="google" busy={authBusy === "google"} disabled={Boolean(authBusy)} onPress={() => void continueWithSocial("google")} /> : null}
            <Pressable accessibilityRole="button" onPress={useEmail} disabled={Boolean(authBusy)} style={styles.skipButton}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Use email instead</Text>
            </Pressable>
            {authError ? <Text style={{ fontSize: 12.5, lineHeight: 17, textAlign: "center", color: "#c74444" }}>{authError}</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Slide art ───────────────────────────────────────────────────────────────
// Every slide gets its own composition (the reference decks vary scene by
// scene) built from a shared kit — word chips, accent orbs, tinted tiles — so
// the deck stays one family while each screen tells its own picture.

function ArtChip({
  label,
  icon,
  style,
  muted,
  colors,
}: {
  label?: string;
  icon?: IconName;
  style?: object;
  muted?: boolean;
  /** Override the default white chip (e.g. the amber "active" accent). */
  colors?: { bg: string; fg: string };
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          position: "absolute",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: colors?.bg ?? t.colors.card,
          borderRadius: 999,
          paddingHorizontal: 13,
          paddingVertical: 8,
          opacity: muted ? 0.45 : 1,
        },
        t.shadowCard,
        style,
      ]}
    >
      {icon ? <Icon name={icon} s={13} c={colors?.fg ?? t.colors.accD} /> : null}
      {label ? <Text style={{ fontSize: 13, fontWeight: "700", color: colors?.fg ?? t.colors.ink }}>{label}</Text> : null}
    </View>
  );
}

// The one warm accent in the deck: "active" gets amber so the passive→active
// jump reads in color too (the app palette itself stays cobalt).
const AMBER = { bg: "#F6C445", fg: "#5C4300" };

function ArtOrb({ icon, size = 66, style }: { icon: IconName; size?: number; style?: object }) {
  const t = useTheme();
  return (
    <View
      style={[
        { position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center", zIndex: 2 },
        t.shadowCard,
        style,
      ]}
    >
      <Icon name={icon} s={size * 0.44} w={2} c="#fff" />
    </View>
  );
}

function ArtTile({ icon, tone, rotate = "0deg", style }: { icon: IconName; tone: string; rotate?: string; style?: object }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          position: "absolute",
          width: 84,
          height: 100,
          borderRadius: 20,
          backgroundColor: toneColor(t, tone),
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate }],
        },
        t.shadowCard,
        style,
      ]}
    >
      <Icon name={icon} s={26} c={t.colors.onB} />
    </View>
  );
}

export function SlideArt({ slide }: { slide: SlideKey }) {
  const t = useTheme();
  const frame = { width: 250, height: 240 } as const;

  if (slide === "pain") {
    // Words you know, drifting just out of reach of the speech bubble.
    return (
      <View style={frame}>
        <View style={[styles.artDisc, { backgroundColor: t.colors.accS, left: 25, top: 20 }]} />
        <ArtOrb icon="chat" size={70} style={{ left: 90, top: 82 }} />
        <ArtChip label="in hindsight" style={{ left: 4, top: 30, transform: [{ rotate: "-7deg" }] }} />
        <ArtChip label="end up" style={{ right: 0, top: 64, transform: [{ rotate: "6deg" }] }} />
        <ArtChip label="play it by ear" style={{ left: 22, bottom: 30, transform: [{ rotate: "4deg" }] }} muted />
        <ArtChip label="as to" style={{ right: 26, bottom: 8, transform: [{ rotate: "-5deg" }] }} muted />
      </View>
    );
  }

  if (slide === "method") {
    // Passive shelf → active voice: book tile flowing into the mic orb.
    return (
      <View style={frame}>
        <ArtTile icon="book" tone="soft" rotate="-8deg" style={{ left: 14, top: 56 }} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: "absolute", left: 110 + i * 18, top: 104 + (i - 1) * -6, width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.acc, opacity: 0.35 + i * 0.3 }} />
        ))}
        <ArtOrb icon="mic" size={78} style={{ right: 16, top: 66 }} />
        <ArtChip label="active" colors={AMBER} style={{ right: 20, bottom: 26 }} />
        <ArtChip label="passive" style={{ left: 20, top: 18 }} muted />
      </View>
    );
  }

  if (slide === "collect") {
    // Snapshots stacked behind the camera, one phrase already caught.
    return (
      <View style={frame}>
        <ArtTile icon="photo" tone="butter" rotate="-9deg" style={{ left: 34, top: 26 }} />
        <ArtTile icon="text" tone="sky" rotate="7deg" style={{ right: 40, top: 40 }} />
        <ArtOrb icon="camera" size={72} style={{ left: 89, top: 92 }} />
        <ArtChip icon="check" label="Phrase saved" style={{ alignSelf: "center", bottom: 12 }} />
      </View>
    );
  }

  if (slide === "speak") {
    // The mirror: a live wave inside the disc, caption chip below.
    return (
      <View style={frame}>
        <View style={[styles.artDisc, { backgroundColor: t.colors.accS, left: 35, top: 12 }]}>
          <View style={[styles.artOrbitWide, { borderColor: "rgba(64,112,226,0.18)" }]} />
          <Wave n={20} h={40} active color={t.colors.acc} />
        </View>
        <ArtOrb icon="mic" size={54} style={{ right: 44, top: 120 }} />
        <ArtChip label="“What I’m trying to do is…”" style={{ alignSelf: "center", bottom: 10 }} />
      </View>
    );
  }

  if (slide === "review") {
    // A little stack of reminders, the bell on top.
    return (
      <View style={frame}>
        <View style={[styles.artCard, { backgroundColor: t.colors.card, left: 46, top: 88, transform: [{ rotate: "-4deg" }] }, t.shadowCard]}>
          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bank" s={15} c={t.colors.accD} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.colors.soft, width: "82%" }} />
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.colors.soft, width: "56%" }} />
          </View>
        </View>
        <View style={[styles.artCard, { backgroundColor: t.colors.card, left: 58, top: 140, opacity: 0.55, transform: [{ rotate: "3deg" }] }, t.shadowCard]}>
          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: t.colors.sage, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" s={15} c={t.colors.onB} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.colors.soft, width: "68%" }} />
          </View>
        </View>
        <ArtOrb icon="bell" size={64} style={{ left: 96, top: 18 }} />
        <ArtChip icon="clock" label="9:00" style={{ right: 18, top: 42 }} />
      </View>
    );
  }

  // save — your world, kept: stacked story cards behind the check orb.
  return (
    <View style={frame}>
      <ArtTile icon="sparkle" tone="sky" rotate="-8deg" style={{ left: 40, top: 40 }} />
      <ArtTile icon="star" tone="sage" rotate="8deg" style={{ right: 46, top: 30 }} />
      <ArtOrb icon="check" size={74} style={{ left: 88, top: 96 }} />
      <ArtChip icon="globe" label="Any device" style={{ alignSelf: "center", bottom: 14 }} />
    </View>
  );
}

function AuthChoice({ kind, busy, disabled, onPress }: { kind: "apple" | "google"; busy: boolean; disabled: boolean; onPress: () => void }) {
  const t = useTheme();
  const apple = kind === "apple";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${apple ? "Apple" : "Google"}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.authChoice,
        {
          backgroundColor: apple ? "#111113" : t.colors.card,
          borderColor: apple ? "#111113" : t.colors.ink3,
          opacity: disabled && !busy ? 0.5 : pressed ? 0.86 : 1,
        },
      ]}
    >
      {busy ? <ActivityIndicator color={apple ? "#fff" : t.colors.ink} /> : apple ? <Text style={[styles.authMark, { color: "#fff" }]}></Text> : <GoogleMark />}
      <Text style={{ fontSize: 15.5, fontWeight: "700", color: apple ? "#fff" : t.colors.ink }}>Continue with {apple ? "Apple" : "Google"}</Text>
    </Pressable>
  );
}

export function GoogleMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.45a5.52 5.52 0 0 1-2.39 3.52v2.92h3.87c2.27-2.09 3.56-5.17 3.56-8.68Z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.29v3.05A12 12 0 0 0 12 24Z" />
      <Path fill="#FBBC05" d="M5.28 14.3A7.23 7.23 0 0 1 4.9 12c0-.8.14-1.57.38-2.3V6.65H1.29A12 12 0 0 0 0 12c0 1.94.46 3.78 1.29 5.35l3.99-3.05Z" />
      <Path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.29 6.65L5.28 9.7c.95-2.84 3.6-4.95 6.72-4.95Z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  roundButton: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  flowButton: { width: "100%", flex: 0, height: 56 },
  skipButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  authChoice: { width: "100%", minHeight: 56, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, paddingHorizontal: 18 },
  authMark: { width: 20, textAlign: "center", fontSize: 21, fontWeight: "800" },
  artDisc: { position: "absolute", width: 200, height: 200, borderRadius: 100, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  artOrbitWide: { position: "absolute", left: -18, right: -18, top: 62, height: 78, borderRadius: 80, borderWidth: 1.5, transform: [{ rotate: "-12deg" }] },
  artCard: { position: "absolute", width: 168, minHeight: 52, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
});
