// empty-state.tsx — the one way a screen says "nothing here yet".
//
// Shape follows the reference the product owner picked: a small doodle
// (design/doodle.tsx), a one-line serif title, two lines of quiet copy, and a single
// capsule action — all centered, with room to breathe. Every color comes from
// the Theme so the same drawing works on the dark card.
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { IconName } from "@/design/icon";
import { Text } from "@/design/text";
import { Doodle, type DoodleKind } from "@/design/doodle";
import { useTheme } from "@/design/theme";
import { Card, Pill, Serif } from "@/design/ui";

export type EmptyArtKind = DoodleKind;

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
          <Doodle kind={art} />
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
        // Pill defaults to alignSelf "flex-start"; the card centers everything else.
        <Pill icon={action.icon} onPress={action.onPress} style={{ marginTop: 24, alignSelf: "center" }}>
          {action.label}
        </Pill>
      ) : null}
    </Card>
  );
}
