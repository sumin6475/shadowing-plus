import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

import { AuthProvider, useAuth } from "@/lib/auth";

SplashScreen.preventAutoHideAsync();

/**
 * Route guard. `(auth)` shows only when signed out, `(app)` only when signed
 * in — Expo Router's Stack.Protected swaps them automatically as the session
 * changes. The splash stays up until the initial session read resolves so the
 * app never flashes the wrong group.
 */
function RootNavigator() {
  const { session, loading } = useAuth();

  // Saylo design-system fonts, loaded at runtime (expo-font is already in the
  // dev client, so no native rebuild). Newsreader = editorial serif hero; Inter
  // (per weight — RN needs an explicit family per static weight) for UI text.
  const [fontsLoaded] = useFonts({
    Newsreader: require("../../assets/fonts/Newsreader36pt-Regular.ttf"),
    Inter: require("../../assets/fonts/Inter18pt-Regular.ttf"),
    "Inter-Medium": require("../../assets/fonts/Inter18pt-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter18pt-SemiBold.ttf"),
  });

  const ready = !loading && fontsLoaded;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  // SKELETON PREVIEW: while the app is a design skeleton running on mock data,
  // show the (app) group without a Supabase session so it opens straight into
  // the designed UI. Flip to `false` to restore the real auth gate.
  const SKELETON_PREVIEW = false;
  const signedIn = SKELETON_PREVIEW || !!session;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    // GestureHandlerRootView must sit at the very top for gesture-driven UI
    // (swipe-to-delete rows) to receive touches. flex:1 so it fills the screen.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
