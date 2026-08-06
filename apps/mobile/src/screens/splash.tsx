// splash.tsx — Saylo brand splash (ported from Claude Design "Saylo Splash").
// Three scenes on one persistent screen so boundaries frame-match:
//   Logo draw (2.6s) → Reveal (2.2s) → Idle (loops).
// A single requestAnimationFrame timeline drives `elapsed` (seconds); every
// element's phase is derived from it with the design's exact easing curves.
// Palette = COBALT (the design's default + the app accent). The design uses
// Figtree; we stand in with Inter (already loaded), keeping the cobalt retint.
import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// palette = [bg, pale ink, subtitle, button text, headline]
const C = { bg: "#2254D4", pale: "#D9EAFB", sub: "#A9C8F3", btnText: "#1B44BC", head: "#F2F7FE" };

// Cursive double-loop mark (viewBox 860×720). Length precomputed ≈ 2493.
const LOOP =
  "M 55 590 C 78 648, 140 664, 188 622 C 250 570, 330 470, 380 340 C 415 248, 420 170, 370 152 C 300 128, 218 210, 200 320 C 184 428, 232 540, 310 600 C 380 652, 470 668, 545 610 C 590 575, 615 520, 638 455 C 660 395, 668 330, 622 320 C 570 310, 520 372, 516 445 C 512 515, 552 580, 622 596 C 680 610, 740 600, 790 575 C 812 563, 826 556, 834 552";
const LOOP_LEN = 2493;
const LOOP_SCALE = 1.2;

const DUR_DRAW = 2.6;
const DUR_REVEAL = 2.2;
const T_REVEAL_END = DUR_DRAW + DUR_REVEAL; // 4.8
const IDLE_LOOP = 6.4;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const ph = (p: number, a: number, b: number, ease?: (t: number) => number) => {
  const t = clamp((p - a) / (b - a), 0, 1);
  return ease ? ease(t) : t;
};

export function SplashIntro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = Dimensions.get("window");
  const k = W / 1080; // the design canvas is 1080 wide

  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      setElapsed((ts - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Tapping the backdrop before the CTA lands fast-forwards to the idle end.
  const skip = () => {
    if (elapsed >= T_REVEAL_END || startRef.current == null) return;
    startRef.current -= (T_REVEAL_END - elapsed) * 1000;
    setElapsed(T_REVEAL_END);
  };

  // ── derive every element's phase from the timeline (mirrors the scenes) ──
  let wordP = 1;
  let drawP = 1;
  let l1 = 1;
  let l2 = 1;
  let subP = 1;
  let btnP = 1;
  let btnE = 1;
  let floatY = 0;
  let glossG = 0;
  if (elapsed < DUR_DRAW) {
    const p = elapsed / DUR_DRAW;
    wordP = ph(p, 0.02, 0.24, easeOutCubic);
    drawP = ph(p, 0.1, 0.97, easeInOutCubic);
    l1 = l2 = subP = btnP = btnE = 0;
  } else if (elapsed < T_REVEAL_END) {
    const p = (elapsed - DUR_DRAW) / DUR_REVEAL;
    l1 = ph(p, 0.0, 0.42, easeOutQuart);
    l2 = ph(p, 0.1, 0.52, easeOutQuart);
    subP = ph(p, 0.3, 0.66, easeOutCubic);
    btnP = ph(p, 0.44, 0.88);
    btnE = easeOutBack(clamp((p - 0.44) / (0.88 - 0.44), 0, 1));
  } else {
    const q = ((elapsed - T_REVEAL_END) % IDLE_LOOP) / IDLE_LOOP;
    floatY = Math.sin(q * Math.PI * 4) * 12;
    glossG = ph(q, 0.3, 0.62);
  }

  // ── scaled layout metrics ──
  const headSize = 112 * k;
  const headLH = Math.round(headSize * 1.14);
  const subSize = 46 * k;
  const btnH = 172 * k;
  const btnW = W - 48;
  const btnBottom = insets.bottom + 20;
  const headBottom = btnBottom + btnH + 44 * k;
  const loopW = 900 * k;
  const loopH = 760 * k;
  const loopTop = H * 0.34 - loopH / 2;
  const glossO = Math.sin(Math.PI * glossG) * 0.45;
  const glossLeft = btnW * ((-25 + glossG * 130) / 100);

  const headLine = (txt: string, p: number) => (
    <View style={{ overflow: "hidden" }}>
      <Text
        style={{
          fontFamily: "Inter-SemiBold",
          fontSize: headSize,
          lineHeight: headLH,
          letterSpacing: -2.5 * k,
          color: C.head,
          transform: [{ translateY: (1 - p) * headLH * 1.06 }],
        }}
      >
        {txt}
      </Text>
    </View>
  );

  return (
    <View style={{ position: "absolute", inset: 0, backgroundColor: C.bg, overflow: "hidden" }}>
      <StatusBar style="light" />
      <Pressable style={{ position: "absolute", inset: 0 }} onPress={skip} />

      {/* Saylo wordmark */}
      <Text
        style={{
          position: "absolute",
          left: 24,
          top: insets.top + 10,
          fontFamily: "Inter-SemiBold",
          fontSize: 68 * k,
          letterSpacing: -1 * k,
          color: C.pale,
          opacity: wordP,
          transform: [{ translateY: (1 - wordP) * 26 }],
        }}
      >
        Saylo
      </Text>

      {/* Cursive loop mark — draws on via strokeDashoffset */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: (W - loopW) / 2,
          top: loopTop,
          width: loopW,
          height: loopH,
          transform: [{ translateY: floatY * k }, { scale: LOOP_SCALE }],
          opacity: drawP > 0.001 ? 1 : 0,
        }}
      >
        <Svg width={loopW} height={loopH} viewBox="0 0 860 720" fill="none">
          <Path
            d={LOOP}
            stroke={C.pale}
            strokeWidth={56}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${LOOP_LEN} ${LOOP_LEN}`}
            strokeDashoffset={LOOP_LEN * (1 - drawP)}
          />
        </Svg>
      </View>

      {/* Headline + subtitle */}
      <View pointerEvents="none" style={{ position: "absolute", left: 24, right: 24, bottom: headBottom }}>
        {headLine("Find your flow", l1)}
        {headLine("in English.", l2)}
        <Text
          style={{
            fontFamily: "Inter-Medium",
            fontSize: subSize,
            fontWeight: "500",
            color: C.sub,
            marginTop: 28 * k,
            opacity: subP,
            transform: [{ translateY: (1 - subP) * 30 }],
          }}
        >
          Practice until it sounds like you.
        </Text>
      </View>

      {/* Get started */}
      <Pressable
        onPress={onDone}
        disabled={btnP <= 0}
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          bottom: btnBottom,
          height: btnH,
          borderRadius: 50 * k,
          backgroundColor: C.pale,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          opacity: clamp(btnP * 1.8, 0, 1),
          transform: [{ translateY: (1 - btnE) * 120 * k }],
        }}
      >
        <Text style={{ fontFamily: "Inter-SemiBold", fontSize: 52 * k, color: C.btnText }}>Get started</Text>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -20,
            bottom: -20,
            width: 200 * k,
            left: glossLeft,
            opacity: glossO,
            transform: [{ skewX: "-18deg" }],
          }}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </View>
      </Pressable>
    </View>
  );
}
