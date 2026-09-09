// mirror-preview.tsx — shared preview-only front camera for Talk and Quick
// Rehearsal. The learner sees a mirrored live feed while speaking; no video is
// recorded or persisted (the speech recognizer owns the mic, so this camera
// never records audio). Falls back to a dark surface on denial and offers a
// Settings + retry path once iOS refuses to re-prompt.
import { useEffect } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { useTheme } from "@/design/theme";

const FALLBACK = "#20222a";

export function MirrorPreview({
  focused = true,
  scrim = true,
}: {
  /** Pass the screen's focus state so only the focused surface keeps a live
   *  camera session (NativeTabs keeps multiple surfaces mounted). */
  focused?: boolean;
  /** Darken the feed slightly so light overlays stay legible. */
  scrim?: boolean;
}) {
  const t = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  // Ask once, exactly like the previous inline mirror, but only while focused.
  useEffect(() => {
    if (focused && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [focused, permission, requestPermission]);

  if (!permission?.granted) {
    const denied = permission != null && !permission.canAskAgain;
    return (
      <View style={[styles.fill, { backgroundColor: FALLBACK, alignItems: "center", justifyContent: "center", gap: 10 }]}>
        {denied ? (
          <>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.92)" }}>Camera is off</Text>
            <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", textAlign: "center", paddingHorizontal: 26, lineHeight: 18 }}>
              Allow camera access in iOS Settings to see yourself while you speak.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open camera settings"
                onPress={() => void Linking.openSettings()}
                style={({ pressed }) => ({
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  backgroundColor: t.colors.acc,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#fff" }}>Open Settings</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry camera access"
                onPress={() => void requestPermission()}
                style={({ pressed }) => ({
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#fff" }}>Retry</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: "#000" }]}>
      {/* Front camera, mirrored so it behaves like a real mirror. `active` ties
          the camera session to the focused surface. */}
      <CameraView style={StyleSheet.absoluteFill} facing="front" mirror active={focused} />
      {scrim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,22,28,0.28)" }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
