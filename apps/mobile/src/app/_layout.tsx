import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

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

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) return null;

  // SKELETON PREVIEW: while the app is a design skeleton running on mock data,
  // show the (app) group without a Supabase session so it opens straight into
  // the designed UI. Flip to `false` to restore the real auth gate.
  const SKELETON_PREVIEW = true;
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
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
