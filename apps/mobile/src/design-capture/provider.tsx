import React, { useState, type ReactNode } from "react";
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CaptureActiveContext, snapshotCaptureNodes } from "./registry";

const endpoint = process.env.EXPO_PUBLIC_RN2FIGMA_ENDPOINT ?? "http://127.0.0.1:4318/capture";
const enabled = __DEV__ && process.env.EXPO_PUBLIC_RN2FIGMA_CAPTURE === "1";

function isLocalEndpoint(value: string): boolean {
  return /^http:\/\/(127\.0\.0\.1|localhost):\d+\/capture$/.test(value);
}

function inferScreenName(nodes: Awaited<ReturnType<typeof snapshotCaptureNodes>>): string {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const file = node.source?.file;
    if (!file || !/(^|\/)src\/screens\//.test(file)) continue;
    counts.set(file, (counts.get(file) ?? 0) + 1);
  }
  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return winner?.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "runtime-screen";
}

export function CaptureProvider({ children, screenName }: { children: ReactNode; screenName?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (!enabled) return children;

  const capture = async () => {
    try {
      if (!isLocalEndpoint(endpoint)) throw new Error("Capture endpoint must be localhost");
      setState("sending");
      await new Promise((resolve) => setTimeout(resolve, 180));
      const window = Dimensions.get("window");
      const nodes = await snapshotCaptureNodes();
      const payload = {
        schemaVersion: "capture-1",
        name: screenName ?? inferScreenName(nodes),
        capturedAt: new Date().toISOString(),
        platform: Platform.OS === "android" ? "android" : "ios",
        viewport: { width: window.width, height: window.height, scale: window.scale },
        nodes,
      };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      setState("sent");
      setTimeout(() => setState("idle"), 1400);
    } catch (error) {
      console.warn("RN2Figma capture failed", error);
      setState("error");
    }
  };

  return (
    <>
      {children}
      <View pointerEvents="box-none" style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Capture current screen for Figma" onPress={capture} style={[styles.button, state === "sent" && styles.sent, state === "error" && styles.error]}>
          <Text style={styles.label}>{state === "sending" ? "…" : state === "sent" ? "✓" : state === "error" ? "!" : "F"}</Text>
        </Pressable>
      </View>
    </>
  );
}

/** Excludes mounted-but-inactive navigation trees from a capture. */
export function CaptureScope({ active, children }: { active: boolean; children: ReactNode }) {
  if (!enabled) return children;
  return <CaptureActiveContext.Provider value={active}>{children}</CaptureActiveContext.Provider>;
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", right: 10, top: 58, zIndex: 100000 },
  button: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#111827", shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  sent: { backgroundColor: "#15803D" },
  error: { backgroundColor: "#B91C1C" },
  label: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
