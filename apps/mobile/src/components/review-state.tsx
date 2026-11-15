import { ActivityIndicator, Animated, Pressable, View } from "react-native";
import { Doodle, type DoodleKind } from "@/design/doodle";
import { Icon } from "@/design/icon";
import { Text } from "@/design/text";
import { hairline, useTheme } from "@/design/theme";
import { usePressFx } from "@/design/ui";

/**
 * A page-level state for content that loads on its own: one mark, a short
 * title, a line of quiet copy and at most one action, centered in the space
 * the content would fill. Loading, off and failed are mutually exclusive.
 *
 * The action is deliberately not a `Pill`. A page that already has pinned
 * capsules at the bottom should not grow a third and fourth one in the middle:
 *  - `retry` is a round ↻ button, for "run it again";
 *  - `link` is a text shortcut with a chevron, for "fix what blocks this".
 */
export function ReviewState({
  mark,
  title,
  body,
  action,
  compact = false,
}: {
  /** A drawing from the shared set, the loading spinner, or — for a failed
   *  state — nothing, because the ↻ button is the mark. */
  mark: DoodleKind | "spinner" | "retry";
  title: string;
  body?: string;
  action?:
    | { kind: "retry"; label: string; onPress: () => void; disabled?: boolean }
    | { kind: "link"; label: string; onPress: () => void };
  /** Inline under existing content rather than filling the page. */
  compact?: boolean;
}) {
  const t = useTheme();
  const fx = usePressFx(0.94);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flex: compact ? undefined : 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: compact ? 8 : 24,
      }}
    >
      {mark === "spinner" ? (
        <ActivityIndicator size="large" color={t.colors.accD} style={{ height: 64 }} />
      ) : mark === "retry" ? null : (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Doodle kind={mark} />
        </View>
      )}
      {action?.kind === "retry" ? (
        <Animated.View style={{ transform: [{ scale: fx.scale }], opacity: action.disabled ? 0.45 : 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            disabled={action.disabled}
            onPress={action.onPress}
            onPressIn={fx.pressIn}
            onPressOut={fx.pressOut}
            hitSlop={8}
            style={[
              {
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.colors.card,
                borderWidth: hairline,
                borderColor: t.ring,
              },
              t.shadowCard,
            ]}
          >
            <Icon name="retry" s={26} w={2} c={t.colors.accD} />
          </Pressable>
        </Animated.View>
      ) : null}
      <Text
        style={{
          marginTop: 20,
          fontSize: 20,
          lineHeight: 26,
          fontWeight: "600",
          textAlign: "center",
          color: t.colors.ink,
        }}
      >
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            marginTop: 6,
            maxWidth: 300,
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
            color: t.colors.ink2,
          }}
        >
          {body}
        </Text>
      ) : null}
      {action?.kind === "link" ? (
        <Pressable
          accessibilityRole="link"
          onPress={action.onPress}
          hitSlop={8}
          style={({ pressed }) => ({
            marginTop: 14,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.accD }}>{action.label}</Text>
          <Icon name="chev" s={16} w={2.2} c={t.colors.accD} />
        </Pressable>
      ) : null}
    </View>
  );
}
