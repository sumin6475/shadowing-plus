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
