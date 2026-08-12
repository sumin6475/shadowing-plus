import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Motif, TypeScale } from "@/constants/cobalt";
import { useAuth } from "@/lib/auth";
import { loadOnboardingDraft, resetOnboardingDraft } from "@/lib/onboarding";
import { useCobalt } from "@/hooks/use-cobalt";

type AuthMode = "sign_in" | "sign_up";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}

export default function SignInScreen() {
  const c = useCobalt();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  useEffect(() => {
    loadOnboardingDraft().then((draft) => {
      if (draft.status === "awaiting_sign_in") setStoryTitle(draft.storyTitle);
    });
  }, []);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordState = passwordChecks(password);
  const passwordValid = passwordState.length && passwordState.case && passwordState.number;
  const canSubmit = emailValid && password.length > 0 && !busy && (mode === "sign_in" || passwordValid);

  async function onSubmit() {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === "sign_up") {
        const result = await signUp(email, password);
        if (result === "confirmation_required") {
          setConfirmationEmail(email.trim());
        }
      } else {
        await signIn(email, password);
      }
      // When a session exists, the auth listener flips the root guard. An
      // awaiting onboarding draft is then imported into the new account.
    } catch (e) {
      setError(e instanceof Error ? e.message : `${mode === "sign_up" ? "Sign up" : "Sign in"} failed. Try again.`);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setConfirmationEmail(null);
  }

  function confirmRestartOnboarding() {
    Alert.alert(
      "Start onboarding again?",
      storyTitle
        ? `This will replace the unsaved onboarding story “${storyTitle}”.`
        : "This will restart the first-story experience on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start again",
          style: storyTitle ? "destructive" : "default",
          onPress: () => {
            setBusy(true);
            resetOnboardingDraft()
              .catch((restartError) => {
                setError(restartError instanceof Error ? restartError.message : "Couldn’t restart onboarding.");
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {confirmationEmail ? (
            <View style={styles.confirmation}>
              <Text style={[styles.wordmark, { color: c.text }]}>Check your email</Text>
              <Text style={[styles.subtitle, { color: c.text3 }]}>
                We sent a confirmation link to {confirmationEmail}. Your first story is saved on this device—come back and sign in after confirming.
              </Text>
              <Pressable onPress={() => switchMode("sign_in")} disabled={busy} style={styles.textButton}>
                <Text style={[styles.textButtonLabel, { color: c.accent }]}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={[styles.wordmark, { color: c.text }]}>Saylo</Text>
                <Text style={[styles.subtitle, { color: c.text3 }]}>
                  {mode === "sign_up"
                    ? storyTitle
                      ? `Create an account to keep “${storyTitle}” and continue.`
                      : "Create an account and start building your speaking world."
                    : storyTitle
                      ? `Sign in to keep “${storyTitle}” and continue.`
                      : "Sign in to keep building your speaking world."}
                </Text>
              </View>

              <View style={styles.form}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: c.surface, borderColor: c.hairline, color: c.text },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={c.text4}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                />
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: c.surface, borderColor: c.hairline, color: c.text },
                  ]}
                  placeholder="Password"
                  placeholderTextColor={c.text4}
                  autoCapitalize="none"
                  secureTextEntry
                  textContentType={mode === "sign_up" ? "newPassword" : "password"}
                  value={password}
                  onChangeText={setPassword}
                  editable={!busy}
                  onSubmitEditing={onSubmit}
                  returnKeyType="go"
                />

                {mode === "sign_up" ? (
                  <View style={styles.requirements} accessibilityLabel="Password requirements">
                    <Requirement met={passwordState.length}>At least 8 characters</Requirement>
                    <Requirement met={passwordState.case}>Upper & lowercase letters</Requirement>
                    <Requirement met={passwordState.number}>At least one number</Requirement>
                  </View>
                ) : null}

                {error ? (
                  <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={onSubmit}
                  disabled={!canSubmit}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: canSubmit ? c.accent : c.accentSoft,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>{mode === "sign_up" ? "Create account" : "Sign in"}</Text>
                  )}
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchText, { color: c.text3 }]}>
                    {mode === "sign_in" ? "New here?" : "Already have an account?"}
                  </Text>
                  <Pressable onPress={() => switchMode(mode === "sign_in" ? "sign_up" : "sign_in")} disabled={busy} hitSlop={8}>
                    <Text style={[styles.switchLink, { color: c.accent }]}>
                      {mode === "sign_in" ? "Create an account" : "Sign in"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          <Pressable onPress={confirmRestartOnboarding} disabled={busy} style={styles.onboardingLink} hitSlop={8}>
            <Text style={[styles.onboardingLinkLabel, { color: c.text3 }]}>Start onboarding again</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Requirement({ met, children }: { met: boolean; children: string }) {
  const c = useCobalt();
  return (
    <Text style={[styles.requirement, { color: met ? c.accent : c.text3 }]}>
      {met ? "✓" : "○"} {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 40,
  },
  header: { gap: 8 },
  wordmark: {
    // Instrument Serif is the wordmark face on web; system serif stands in on
    // native until the font is bundled (Phase 5 polish).
    fontSize: TypeScale.largeTitle,
    fontFamily: Platform.OS === "ios" ? "ui-serif" : "serif",
  },
  subtitle: { fontSize: TypeScale.callout },
  form: { gap: 12 },
  confirmation: { gap: 16 },
  input: {
    height: Motif.buttonHeight.large,
    borderRadius: Motif.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    fontSize: TypeScale.body,
  },
  error: { fontSize: TypeScale.footnote, paddingHorizontal: 4 },
  requirements: { gap: 5, paddingHorizontal: 8, paddingVertical: 2 },
  requirement: { fontSize: TypeScale.footnote },
  button: {
    height: Motif.buttonHeight.large,
    borderRadius: Motif.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: TypeScale.headline,
    fontWeight: "600",
  },
  switchRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  switchText: { fontSize: TypeScale.footnote },
  switchLink: { fontSize: TypeScale.footnote, fontWeight: "700" },
  textButton: { alignSelf: "flex-start", paddingVertical: 8 },
  textButtonLabel: { fontSize: TypeScale.body, fontWeight: "700" },
  onboardingLink: { position: "absolute", bottom: 28, alignSelf: "center", padding: 8 },
  onboardingLinkLabel: { fontSize: TypeScale.footnote, fontWeight: "600" },
});
