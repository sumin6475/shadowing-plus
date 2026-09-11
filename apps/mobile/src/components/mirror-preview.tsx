// mirror-preview.tsx — shared preview-only front camera for Talk and Quick
// Rehearsal. The learner sees a mirrored live feed while speaking; no video is
// recorded or persisted (the speech recognizer owns the mic, so this camera
// never records audio). Falls back to a dark surface on denial and offers a
// Settings + retry path once iOS refuses to re-prompt.
import { useEffect } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

import { BRAND } from "@/design/mobile-tokens";

const FALLBACK = "#20222a";
// The fallback surface is permanently dark in both schemes, so the accent drawn
// on it must not track the color scheme either — same reasoning as CAMERA_ACC /
// CAMERA_ON_ACC in screens/talk.tsx, and the same values so the two camera
// surfaces match. Light-mode acc is #162555, which measures 1.08:1 against
// FALLBACK: the Open Settings pill stops existing as a shape and only its label
// reads. Pinned instead to the dark-scheme accent contract, built for a dark
// ground:
//   #6E8DD5 on #20222a = 4.86:1  (>= 3:1, non-text floor)
//   CAMERA_ON_ACC (#0D1A3B) on #6E8DD5 = 5.24:1  (white would be 3.26:1)
const CAMERA_ACC = "#6E8DD5";
const CAMERA_ON_ACC = BRAND.dark;

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
                  backgroundColor: CAMERA_ACC,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 13.5, fontWeight: "700", color: CAMERA_ON_ACC }}>Open Settings</Text>
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
