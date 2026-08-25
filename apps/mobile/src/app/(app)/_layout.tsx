// (app)/_layout.tsx — the native iOS tab bar (UITabBar via expo-router's
// NativeTabs). Three destinations + Talk as a separated `search`-role item,
// which iOS 26 renders as the detached circle beside the bar (Liquid Glass).
// The in-app detail stack lives in ShellProvider; while a detail view or the
// full-screen Talk mirror is open the bar hides, matching the old shell.
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { ThemeProvider, useTheme } from "@/design/theme";
import { ShellProvider, useShellBarHidden } from "@/shell";

function AppTabs() {
  const t = useTheme();
  const hidden = useShellBarHidden();
  return (
    <NativeTabs tintColor={t.colors.acc} minimizeBehavior="onScrollDown" hidden={hidden}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "sun.max", selected: "sun.max.fill" }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="phrases">
        <NativeTabs.Trigger.Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} />
        <NativeTabs.Trigger.Label>Phrases</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="studio">
        <NativeTabs.Trigger.Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <NativeTabs.Trigger.Label>Studio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="talk" role="search">
        <NativeTabs.Trigger.Icon sf="mic.fill" />
        <NativeTabs.Trigger.Label>Talk</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function AppLayout() {
  return (
    <ThemeProvider>
      <ShellProvider>
        <AppTabs />
      </ShellProvider>
    </ThemeProvider>
  );
}
