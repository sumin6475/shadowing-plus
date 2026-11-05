import { Pressable, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { Text } from "@/design/text";
import { hairline, useTheme } from "@/design/theme";
export type FocusCommand = "bold" | "bullet" | "number" | "clear" | "blur";
export function FocusFormatToolbar(
  { onCommand, selected = {}, disabled = false }: {
    onCommand: (command: FocusCommand) => void;
    selected?: Partial<Record<FocusCommand, boolean>>;
    disabled?: boolean;
  },
) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: hairline,
        borderColor: t.colors.sep,
        paddingHorizontal: 18,
        paddingVertical: 5,
        backgroundColor: t.colors.bg,
      }}
    >
      {(["bold", "bullet", "number", "clear", "blur"] as const).map((id) => {
        const color = selected[id] ? t.colors.accD : t.colors.ink2;
        return (
          <Pressable
            key={id}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={{
              bold: "Bold",
              bullet: "Bulleted list",
              number: "Numbered list",
              clear: "Clear speaking focus",
              blur: "Dismiss keyboard",
            }[id]}
            accessibilityState={{ selected: !!selected[id], disabled }}
            onPress={() => onCommand(id)}
            style={{
              minHeight: 44,
              minWidth: 44,
              justifyContent: "center",
              alignItems: "center",
              flex: 1,
              borderRadius: 9,
              backgroundColor: selected[id] ? t.colors.accS : "transparent",
            }}
          >
            {id === "bold"
              ? (
                <Text style={{ fontSize: 21, fontWeight: "500", color }}>
                  B
                </Text>
              )
              : id === "bullet" || id === "number"
              ? (
                <Svg width={23} height={23} viewBox="0 0 24 24">
                  <Path
                    d="M9 5h13M9 12h13M9 19h13"
                    stroke={color}
                    strokeWidth={1.35}
                    strokeLinecap="round"
                  />
                  {id === "bullet"
                    ? [5, 12, 19].map((y) => (
                      <Circle key={y} cx={3} cy={y} r={1.1} fill={color} />
                    ))
                    : [1, 2, 3].map((n) => (
                      <SvgText
                        key={n}
                        x={1}
                        y={n * 7 + 1}
                        fontSize={7}
                        fill={color}
                      >
                        {n}
                      </SvgText>
                    ))}
                </Svg>
              )
              : (
                <Text style={{ fontSize: 14, color }}>
                  {id === "clear" ? "Clear" : "Done"}
                </Text>
              )}
          </Pressable>
        );
      })}
    </View>
  );
}
