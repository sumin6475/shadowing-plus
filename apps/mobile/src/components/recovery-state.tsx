import { View } from "react-native";
import { Text } from "@/design/text";
import { Pill } from "@/design/ui";
import { useTheme } from "@/design/theme";

/** Recovery copy and its single action share the same content width. */
export function RecoveryState(
  { message, onRetry, label = "Try again", disabled = false }: {
    message: string;
    onRetry: () => void;
    label?: string;
    disabled?: boolean;
  },
) {
  const t = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ gap: 16, alignSelf: "stretch" }}
    >
      <Text
        style={{
          fontSize: 14.5,
          lineHeight: 21,
          color: t.colors.ink2,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
      <Pill
        tone="soft"
        disabled={disabled}
        onPress={onRetry}
        style={{ alignSelf: "stretch" }}
      >
        {label}
      </Pill>
    </View>
  );
}
