// talk-feedback-detail.tsx — canonical typed presentation of one coaching
// feedback. The immediate post-talk result and the historical Session detail
// route both render this, so a future styling change updates both surfaces.
import type { ReactNode } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/design/ui";
import { useTheme } from "@/design/theme";

export interface TalkFeedbackDetailData {
  badge?: string | null;
  said: string;
  want: string;
  diagnosisTag?: string | null;
  action?: string | null;
  explanation?: string | null;
  /** Legacy fallback grounds shown when structured fields are absent. */
  why?: string | null;
}

export function TalkFeedbackDetail({
  badge,
  said,
  want,
  diagnosisTag,
  action,
  explanation,
  why,
  footer,
  style,
}: TalkFeedbackDetailData & {
  /** Rendered inside the accent card, after the improved sentence (e.g. rate row). */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[{ gap: t.gap }, style]}>
      {badge ? (
        <View style={{ alignSelf: "flex-start", marginTop: 2, marginBottom: 2, backgroundColor: t.colors.accS, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.colors.accD }}>{badge}</Text>
        </View>
      ) : null}
      <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink, paddingHorizontal: 2, paddingTop: 2 }}>You said</Text>
      <View
        style={{
          borderRadius: t.r,
          backgroundColor: "#FFF7F7",
          borderWidth: 1,
          borderColor: "#FFEAEB",
          padding: t.padc,
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 23, color: "#E54D4D", fontWeight: "500" }}>{said}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink, paddingHorizontal: 2, paddingTop: 4 }}>You may have meant</Text>
      <LinearGradient
        colors={["#A9C7FF", "#D5E3FF", "#7BA7F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: t.r,
          padding: 1.5,
          shadowColor: "#3D6FE0",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 18,
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={["#3D6FE0", "#6C9BF2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: t.r - 1.5, padding: t.padc, overflow: "hidden" }}
        >
          <View
            style={{
              position: "absolute",
              width: 140,
              height: 140,
              borderRadius: 70,
              top: -82,
              right: -36,
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Icon name="sparkle" s={15} w={2} c="#FFFFFF" />
            <Text style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, color: "rgba(255,255,255,0.86)" }}>
              NEW SUGGESTION
            </Text>
          </View>
          {diagnosisTag ? (
            <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.16)", marginTop: 11 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#FFFFFF" }}>{diagnosisTag}</Text>
            </View>
          ) : null}
          {action ? (
            <Text style={{ fontSize: 15, fontWeight: "700", lineHeight: 22, color: "#FFFFFF", marginTop: 11 }}>{action}</Text>
          ) : null}
          {explanation ? (
            <Text style={{ fontSize: 13.5, lineHeight: 20, color: "rgba(255,255,255,0.84)", marginTop: 9 }}>{explanation}</Text>
          ) : why?.trim() ? (
            <Text style={{ fontSize: 13.5, lineHeight: 20, color: "rgba(255,255,255,0.84)", marginTop: 9 }}>{why.trim()}</Text>
          ) : null}
          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 14 }} />
          <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6, color: "rgba(255,255,255,0.8)" }}>IMPROVED SENTENCE</Text>
          <Text style={{ fontSize: 16.5, fontWeight: "700", lineHeight: 23, color: "#FFFFFF", marginTop: 6 }}>“{want}”</Text>
          {footer}
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}
