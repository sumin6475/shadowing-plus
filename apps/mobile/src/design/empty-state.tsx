// empty-state.tsx — the one way a screen says "nothing here yet".
//
// Shape follows the reference the product owner picked: a small line-art
// illustration, a one-line serif title, two lines of quiet copy, and a single
// capsule action — all centered, with room to breathe. Every color comes from
// the Theme so the same drawing works on the dark card.
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import type { IconName } from "@/design/icon";
import { Text } from "@/design/text";
import { useTheme, type Theme } from "@/design/theme";
import { Card, Pill, Serif } from "@/design/ui";

export type EmptyArtKind = "phrases" | "notes" | "sessions";

export function EmptyState({
  art,
  title,
  body,
  action,
  compact,
  style,
}: {
  /** Which line drawing to show above the title. Omit for a quiet, text-only state. */
  art?: EmptyArtKind;
  title: ReactNode;
  body?: ReactNode;
  action?: { label: string; icon?: IconName; onPress: () => void };
  /** Tighter padding for "no results" states that sit under a filter. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Card
      style={[
        {
          alignItems: "center",
          paddingVertical: compact ? 26 : 34,
          paddingHorizontal: 28,
        },
        style,
      ]}
    >
      {art ? (
        <View style={{ marginBottom: 20 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <EmptyArt kind={art} t={t} />
        </View>
      ) : null}
      <Serif
        style={{
          fontSize: compact ? 24 : 27,
          lineHeight: compact ? 30 : 33,
          textAlign: "center",
          color: t.colors.ink,
        }}
      >
        {title}
      </Serif>
      {body ? (
        <Text
          style={{
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
            color: t.colors.ink2,
            marginTop: 8,
            maxWidth: 290,
          }}
        >
          {body}
        </Text>
      ) : null}
      {action ? (
        <Pill icon={action.icon} onPress={action.onPress} style={{ marginTop: 24 }}>
          {action.label}
        </Pill>
      ) : null}
    </Card>
  );
}

// ── Line art ────────────────────────────────────────────────────────────────
// One stroke weight, one outline color, placeholder "text" in the separator
// gray, and a faded shape behind for depth. 140×112 viewBox, drawn at 150pt.

const ART_W = 150;
const ART_H = 120;

function EmptyArt({ kind, t }: { kind: EmptyArtKind; t: Theme }) {
  const line = t.colors.ink2;
  const faint = t.colors.ink3;
  const fill = t.colors.card;
  const back = t.colors.soft;
  const rule = t.colors.sep;
  const tint = t.colors.accS;
  const stroke = { stroke: line, strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const ghost = { stroke: faint, strokeWidth: 1.25, strokeLinejoin: "round" } as const;
  const text = { stroke: rule, strokeWidth: 2.5, strokeLinecap: "round" } as const;

  if (kind === "phrases") {
    return (
      <Svg width={ART_W} height={ART_H} viewBox="0 0 140 112">
        {/* a phrase card that slipped behind */}
        <Rect x="34" y="16" width="80" height="56" rx="9" fill={back} {...ghost} transform="rotate(-7 74 44)" />
        {/* the card in front, with a ribbon bookmark on its top edge */}
        <Rect x="26" y="36" width="88" height="60" rx="9" fill={fill} {...stroke} />
        <Path d="M40 56h44M40 67h30M40 79h20" fill="none" {...text} />
        <Path d="M96 36v23l-6.5-5-6.5 5V36" fill={tint} {...stroke} />
      </Svg>
    );
  }
  if (kind === "notes") {
    return (
      <Svg width={ART_W} height={ART_H} viewBox="0 0 140 112">
        {/* yesterday's page, half tucked away */}
        <Rect x="44" y="8" width="64" height="80" rx="7" fill={back} {...ghost} transform="rotate(6 76 48)" />
        {/* today's page with a folded corner */}
        <Path d="M30 24a7 7 0 0 1 7-7h42l20 20v56a7 7 0 0 1-7 7H37a7 7 0 0 1-7-7z" fill={fill} {...stroke} />
        <Path d="M79 17v13a7 7 0 0 0 7 7h13" fill={back} {...stroke} />
        <Path d="M42 52h30M42 63h42M42 74h24" fill="none" {...text} />
        {/* a pen resting on it */}
        <Path d="M114 58l9 9-33 33-12 3 3-12z" fill={fill} {...stroke} />
        <Path d="M81 91l9 9M109 63l9 9" fill="none" {...stroke} />
      </Svg>
    );
  }
  return (
    <Svg width={ART_W} height={ART_H} viewBox="0 0 140 112">
      {/* the room the voice fills */}
      <Circle cx="70" cy="54" r="42" fill={back} {...ghost} />
      {/* sound leaving both ways */}
      <Path d="M100 42a17 17 0 0 1 0 24M109 33a30 30 0 0 1 0 42M40 42a17 17 0 0 0 0 24M31 33a30 30 0 0 0 0 42" fill="none" {...text} strokeWidth={2} />
      {/* the microphone */}
      <Rect x="59" y="24" width="22" height="40" rx="11" fill={fill} {...stroke} />
      <Path d="M66 37h8M66 44h8M66 51h8" fill="none" {...text} strokeWidth={2} />
      <Path d="M50 54a20 20 0 0 0 40 0M70 74v12M59 86h22" fill="none" {...stroke} />
    </Svg>
  );
}
