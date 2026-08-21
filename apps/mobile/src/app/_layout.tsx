import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/design/theme";
import { loadFirstLanguage } from "@/lib/first-language";
import { loadReminders } from "@/lib/reminders";
import { loadTalkFocus } from "@/lib/talk-focus";
import {
  importOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  subscribeToOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/onboarding";
import { Onboarding } from "@/screens/onboarding";
import { SplashIntro } from "@/screens/splash";

SplashScreen.preventAutoHideAsync();

/**
 * Route guard. `(auth)` shows only when signed out, `(app)` only when signed
 * in — Expo Router's Stack.Protected swaps them automatically as the session
 * changes. The splash stays up until the initial session read resolves so the
 * app never flashes the wrong group.
 */
function RootNavigator() {
  const { session, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [importState, setImportState] = useState<"idle" | "importing" | "error">("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [importAttempt, setImportAttempt] = useState(0);

  // Saylo design-system fonts, loaded at runtime (expo-font is already in the
  // dev client, so no native rebuild). Newsreader = editorial serif hero; Inter
  // (per weight — RN needs an explicit family per static weight) for UI text.
  const [fontsLoaded] = useFonts({
    Newsreader: require("../../assets/fonts/Newsreader36pt-Regular.ttf"),
    Inter: require("../../assets/fonts/Inter18pt-Regular.ttf"),
    "Inter-Medium": require("../../assets/fonts/Inter18pt-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter18pt-SemiBold.ttf"),
  });

  // Load saved first language + talk-focus before first render so greetings
  // and Speak diagnosis use them.
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    Promise.all([loadFirstLanguage(), loadTalkFocus(), loadReminders()]).finally(() => setPrefsLoaded(true));
  }, []);

  useEffect(() => {
    let active = true;
    const applyDraft = (stored: OnboardingDraft) => {
      if (!active) return;
      setDraft(stored);
      setShowSignIn(stored.status === "awaiting_sign_in");
    };
    const unsubscribe = subscribeToOnboardingDraft(applyDraft);
    loadOnboardingDraft().then(applyDraft);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || draft?.status !== "not_started" || draft.step !== "welcome") return;
    const completed = { ...draft, status: "completed" as const };
    Promise.resolve().then(() => {
      setDraft(completed);
      return saveOnboardingDraft(completed);
    });
  }, [draft, session]);

  const ready = !loading && fontsLoaded && prefsLoaded && draft !== null;

  const effectiveShowSignIn = Boolean(
    showSignIn && !(session && draft?.status === "awaiting_sign_in"),
  );
  const returningSignedInUser = Boolean(
    session && draft?.status === "not_started" && draft.step === "welcome",
  );
  const onboardingComplete = draft?.status === "completed" || returningSignedInUser;

  const shouldImport = Boolean(
    session && draft && draft.status !== "completed" && draft.step === "keep" && !effectiveShowSignIn,
  );

  // The first story is created while signed out and imported only after auth.
  // Each remote id is checkpointed by importOnboardingDraft, so retrying after
  // a lost connection continues instead of duplicating the learner's work.
  useEffect(() => {
    if (!shouldImport || !session || !draft) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setImportState("importing");
        setImportError(null);
        return importOnboardingDraft(draft, session.user.id, (checkpoint) => {
          if (active) setDraft(checkpoint);
        });
      })
      .then((completed) => {
        if (!active || !completed) return;
        setDraft(completed);
        setImportState("idle");
      })
      .catch((error) => {
        if (!active) return;
        setImportState("error");
        setImportError(error instanceof Error ? error.message : "We couldn’t save your first story.");
      });
    return () => {
      active = false;
    };
    // draft changes at every checkpoint; importing the captured draft should
    // stay in one effect run. importAttempt is the explicit retry trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldImport, session?.user.id, importAttempt]);

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

  // Returning signed-in users skip the Get started splash and land in the app.
  // The native splash stays up until session is known, so this does not flash.
  if (!splashDone && !signedIn) {
    return <SplashIntro onDone={() => setSplashDone(true)} />;
  }

  if (shouldImport || importState === "error") {
    return (
      <ThemeProvider>
        <ImportingStory
          error={importState === "error" ? importError : null}
          onRetry={() => {
            setImportState("idle");
            setImportAttempt((value) => value + 1);
          }}
        />
      </ThemeProvider>
    );
  }

  if (!onboardingComplete && !effectiveShowSignIn) {
    return (
      <ThemeProvider>
        <Onboarding
          initialDraft={draft}
          signedIn={signedIn}
          onDraftChange={setDraft}
          onSignIn={(next) => {
            setDraft(next);
            setShowSignIn(true);
          }}
          onDirectSignIn={() => {
            setShowSignIn(true);
          }}
          onComplete={(next) => {
            setDraft(next);
            setShowSignIn(false);
          }}
        />
      </ThemeProvider>
    );
  }

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

function ImportingStory({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: t.colors.bg }}>
      {error ? null : <ActivityIndicator size="large" color={t.colors.acc} />}
      <Text style={{ marginTop: 22, fontFamily: "Newsreader", fontSize: 32, textAlign: "center", color: t.colors.ink }}>
        {error ? "Your story is still here." : "Adding your first story…"}
      </Text>
      <Text style={{ marginTop: 10, fontSize: 15, lineHeight: 22, textAlign: "center", color: t.colors.ink2 }}>
        {error ?? "We’re saving the beats, phrase, and your first Talk."}
      </Text>
      {error ? (
        <Pressable onPress={onRetry} style={{ marginTop: 22, minHeight: 50, minWidth: 160, paddingHorizontal: 24, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.acc }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
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
