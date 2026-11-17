// doodle.tsx — the app's one illustration style.
//
// Every "nothing here yet / this is off" picture is drawn the same way so they
// read as a set: a loose ink outline with round ends, paper-white shapes, one
// soft tint blob sitting slightly off-register behind, and a spark or two.
// 160×120 viewBox. Colors come from the Theme, so each drawing works on the
// dark card too. To add one, draw with the five brushes below and nothing else.
import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/design/theme";

export type DoodleKind = "phrases" | "notes" | "sessions" | "aiOff";

type Brush = "line" | "paper" | "accent" | "blob" | "thin";

const ART: Record<DoodleKind, readonly (readonly [Brush, string])[]> = {
  phrases: [
    ["blob", "M50 34C66 20 122 22 138 42C150 60 142 92 116 98C88 104 54 100 46 80C40 64 42 44 50 34Z"],
    ["paper", "M34 34C33 26 39 21 47 21L112 20C121 20 126 25 126 33L127 70C127 79 122 84 113 84L72 85L55 99L58 85L47 85C39 85 34 80 34 71Z"],
    ["accent", "M99 20L99 45L106.500 39L114 45L114 20"],
    ["thin", "M48 41C54 38 60 44 66 41S78 38 86 41"],
    ["thin", "M48 55C60 53 76 57 100 54"],
    ["thin", "M48 68C56 67 64 69 76 67"],
    ["line", "M20 14L22 20L28 22L22 24L20 30L18 24L12 22L18 20Z"],
    ["thin", "M140 16L146 12M144 24L151 23"],
  ],
  notes: [
    ["blob", "M58 26C76 14 124 18 134 40C144 62 136 98 112 106C88 112 60 108 52 88C46 70 48 38 58 26Z"],
    ["paper", "M44 20L92 17L111 35L113 100C113 103 111 105 108 105L48 107C45 107 43 105 43 102Z"],
    ["paper", "M92 17L93 34L111 35"],
    ["thin", "M55 48C63 46 71 50 82 47"],
    ["thin", "M55 61C67 59 81 63 98 60"],
    ["thin", "M55 74C61 73 67 75 74 73"],
    ["accent", "M128 50L139 60L108 94L95 98L97 85Z"],
    ["line", "M97 85L108 94M121 58L132 68"],
    ["thin", "M58 92C62 88 66 96 70 92S78 96 82 92"],
    ["line", "M26 30L28 35L33 37L28 39L26 44L24 39L19 37L24 35Z"],
  ],
  sessions: [
    ["blob", "M52 28C70 12 118 16 130 38C140 58 132 88 108 94C84 100 56 96 48 76C42 60 44 40 52 28Z"],
    ["paper", "M67 26C67 12 93 12 93 26L93 54C93 68 67 68 67 54Z"],
    ["thin", "M74 28L86 28M74 37L86 37M74 46L86 46"],
    ["line", "M57 50C57 80 103 80 103 50M80 73L80 92M64 94C72 91 88 91 96 94"],
    ["line", "M44 34C38 44 38 56 44 66M33 26C23 42 23 60 33 74"],
    ["line", "M116 34C122 44 122 56 116 66M127 26C137 42 137 60 127 74"],
    ["line", "M136 92L138 97L143 99L138 101L136 106L134 101L129 99L134 97Z"],
  ],
  aiOff: [
    ["blob", "M56 48C72 36 116 40 126 56C134 72 126 92 106 96C84 100 60 96 52 80C48 68 50 54 56 48Z"],
    ["paper", "M44 64C44 50 54 44 68 44L94 43C108 43 118 51 118 63C118 76 108 82 94 82L68 83C54 83 44 77 44 64Z"],
    ["paper", "M53 63C53 46 79 46 79 63C79 80 53 80 53 63Z"],
    ["thin", "M61 62C63 64 65 64 67 62M70 62C71 63.500 72.500 63.500 73.500 62"],
    ["accent", "M118 6C120 17 124 21 136 24C124 27 120 31 118 42C116 31 112 27 100 24C112 21 116 17 118 6Z"],
    ["line", "M24 36L33 36L24 46L33 46M38 18L45 18L38 26L45 26"],
    ["thin", "M140 46L146 44M138 56L145 58"],
  ],
};

export function Doodle({ kind, width = 160 }: { kind: DoodleKind; width?: number }) {
  const t = useTheme();
  const ink = t.colors.ink;
  const round = { strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const brushes: Record<Brush, object> = {
    line: { fill: "none", stroke: ink, strokeWidth: 2.3, ...round },
    paper: { fill: t.colors.card, stroke: ink, strokeWidth: 2.3, ...round },
    accent: { fill: t.colors.accS, stroke: ink, strokeWidth: 2.3, ...round },
    blob: { fill: t.colors.accS },
    thin: { fill: "none", stroke: ink, strokeWidth: 1.8, ...round },
  };
  return (
    <Svg width={width} height={(width * 120) / 160} viewBox="0 0 160 120">
      {ART[kind].map(([brush, d], i) => (
        <Path key={i} d={d} {...brushes[brush]} />
      ))}
    </Svg>
  );
}

// ── Small doodles: the same hand at icon size ─────────────────────────────
// A control whose two states are a picture (the note in Talk: shut / open)
// uses these instead of a line icon. 32×32 viewBox, same brushes scaled down.
// Colors are passed in because Talk is always dark, whatever the theme.
const BOOK: Record<"shut" | "open", readonly (readonly [Brush, string])[]> = {
  shut: [
    ["blob", "M11 6C16 2.500 27 4 29 10.500C30.500 17 28 25.500 22 27.500C16 29 10 27 8.500 21C7.500 15.500 8 9 11 6Z"],
    // Cover, a little askew, with the page block showing along the bottom.
    ["paper", "M7.500 6.200C7.400 4.900 8.300 4.200 9.600 4.100L21.800 3.500C23.200 3.400 24 4.200 24.100 5.500L24.700 23.600C24.700 24.900 24 25.700 22.700 25.800L10.300 26.500C9 26.600 8.100 25.800 8 24.500Z"],
    ["thin", "M8.300 22.600C9.400 21.300 10.600 21.200 24.500 20.600"],
    ["line", "M11.300 4.200L11.800 21.200"],
    ["accent", "M17.800 3.700L18 11L19.900 9.500L21.700 10.900L21.500 3.500"],
    ["thin", "M14.300 14.600C16 14.100 18.200 14.900 20.800 14.300"],
  ],
  open: [
    ["blob", "M8 9C13 4.500 26 5.500 29 12C31 18.500 28 26 21.500 28C14.500 29.500 7.500 27.500 6 21C5 16 5.500 11.500 8 9Z"],
    // Two pages falling open from the spine.
    ["paper", "M16 9.300C13 7 8.200 6.700 3.800 8.200L4.200 23.800C8.400 22.500 13 22.800 16 25.200Z"],
    ["paper", "M16 9.300C19 7 23.800 6.700 28.200 8.200L27.800 23.800C23.600 22.500 19 22.800 16 25.200Z"],
    ["thin", "M7 12.200C9.200 11.500 11.200 11.700 13.200 12.700M7.200 16.200C9.300 15.500 11.300 15.700 13.200 16.700"],
    ["thin", "M18.800 12.700C20.800 11.700 22.800 11.500 25 12.200M18.800 16.700C20.700 15.700 22.700 15.500 24.800 16.200"],
    ["line", "M25.500 1.200L26.200 3L28 3.700L26.200 4.400L25.500 6.200L24.800 4.400L23 3.700L24.800 3Z"],
    ["thin", "M30 6.800L31.300 6.300M4.500 4.200L3.300 3.300"],
  ],
};

/** The speaking note as a book: shut while it is put away, open while it shows. */
export function BookDoodle({
  open,
  size = 28,
  ink = "#fff",
  tint = "rgba(187,208,255,0.30)",
  paper = "rgba(20,22,28,0.92)",
}: {
  open: boolean;
  size?: number;
  ink?: string;
  /** The soft blob behind, and the bookmark. */
  tint?: string;
  /** Fills the cover and pages so the blob doesn't show through the lines. */
  paper?: string;
}) {
  const round = { strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const brushes: Record<Brush, object> = {
    line: { fill: "none", stroke: ink, strokeWidth: 1.7, ...round },
    paper: { fill: paper, stroke: ink, strokeWidth: 1.7, ...round },
    accent: { fill: tint, stroke: ink, strokeWidth: 1.5, ...round },
    blob: { fill: tint },
    thin: { fill: "none", stroke: ink, strokeWidth: 1.3, ...round },
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {BOOK[open ? "open" : "shut"].map(([brush, d], i) => (
        <Path key={i} d={d} {...brushes[brush]} />
      ))}
    </Svg>
  );
}
