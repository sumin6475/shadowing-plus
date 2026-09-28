import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, TextInput } from "@/design/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { Motif, TypeScale } from "@/constants/cobalt";
import { useAuthPalette } from "@/design/auth-palette";
import { SERIF } from "@/design/theme";
import { useAuth } from "@/lib/auth";
import { emailProblem, passwordChecks, submitProblem } from "@/lib/auth-form";
import { openLegalUrl, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/lib/legal";
import { resetOnboardingDraft } from "@/lib/onboarding";
import { GoogleMark } from "@/screens/onboarding";

type AuthMode = "sign_in" | "sign_up";

export default function SignInScreen() {
  const c = useAuthPalette();
  const posthog = usePostHog();
  const { signIn, signUp, signInWithSocial, resetPassword, socialProviders } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set once the learner leaves the email field or tries to submit, so the
  // inline hint doesn't nag while they are still typing the address.
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  const emailIssue = emailProblem(email);
  const emailValid = emailIssue === null;
  const passwordState = passwordChecks(password);
  const anyBusy = busy || socialBusy !== null;
  const formProblem = submitProblem(mode, email, password);
  const canSubmit = formProblem === null && !anyBusy;
  // Only a non-empty, touched address earns the inline hint; an empty field
  // says nothing until the learner actually taps Sign in.
  const showEmailIssue = emailTouched && email.trim().length > 0 && emailIssue !== null;
  const hasSocial = Boolean(socialProviders?.apple || socialProviders?.google);

  async function onSubmit() {
    if (anyBusy) return;
    if (formProblem) {
      // The button used to just sit disabled here, with no word about why
      // ("sumin002 @gmail.com" and nothing happens). Say it, in red.
      setEmailTouched(true);
      setError(formProblem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (mode === "sign_up") {
        const result = await signUp(email, password);
        if (result === "confirmation_required") {
          setConfirmationEmail(email.trim());
        } else {
          posthog?.capture("user_signed_up");
        }
      } else {
        await signIn(email, password);
        posthog?.capture("user_signed_in");
      }
      // When a session exists, the auth listener flips the root guard. An
      // awaiting onboarding draft is then imported into the new account.
    } catch (e) {
      setError(e instanceof Error ? e.message : `${mode === "sign_up" ? "Sign up" : "Sign in"} failed. Try again.`);
    } finally {
      setBusy(false);
    }
  }

  async function onSocial(provider: "apple" | "google") {
    if (anyBusy) return;
    setError(null);
    setSocialBusy(provider);
    try {
      const result = await signInWithSocial(provider);
      if (result === "signed_in") posthog?.capture("user_signed_in", { provider });
      // "cancelled" simply stays on this screen.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed. Try again.");
    } finally {
      setSocialBusy(null);
    }
  }

  async function onForgotPassword() {
    if (anyBusy) return;
    if (!emailValid) {
      setEmailTouched(true);
      setError(email.trim() ? emailIssue : "Enter your email above, then tap Forgot password.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await resetPassword(email);
      setResetEmail(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send the reset email. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setEmail("");
    setPassword("");
    setError(null);
    setEmailTouched(false);
    setConfirmationEmail(null);
    setResetEmail(null);
  }

  function confirmRestartOnboarding() {
    Alert.alert(
      "Start onboarding again?",
      "This will restart the intro on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start again",
          style: "default",
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

  const notice = confirmationEmail
    ? {
        title: "Check your email",
        body: `We sent a confirmation link to ${confirmationEmail}. Your first Speaking Note is saved on this device—come back and sign in after confirming.`,
      }
    : resetEmail
      ? {
          title: "Check your email",
          body: `We sent a password reset link to ${resetEmail}. Open it to set a new password, then come back and sign in.`,
        }
      : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {notice ? (
            <View style={styles.confirmation}>
              <Text style={[styles.wordmark, { color: c.text }]}>{notice.title}</Text>
              <Text style={[styles.subtitle, { color: c.text3 }]}>{notice.body}</Text>
              <Pressable onPress={() => switchMode("sign_in")} disabled={busy} style={styles.textButton}>
                <Text style={[styles.textButtonLabel, { color: c.accent }]}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={[styles.wordmark, { color: c.text }]}>Myne</Text>
                <Text style={[styles.subtitle, { color: c.text3 }]}>
                  {mode === "sign_up"
                    ? "Keep your phrases, notes, and speaking moments together."
                    : "Your phrases. Your notes. Your voice."}
                </Text>
              </View>

              {hasSocial ? (
                <View style={styles.socialBlock}>
                  {socialProviders?.apple ? (
                    <SocialButton
                      kind="apple"
                      busy={socialBusy === "apple"}
                      disabled={anyBusy}
                      onPress={() => void onSocial("apple")}
                    />
                  ) : null}
                  {socialProviders?.google ? (
                    <SocialButton
                      kind="google"
                      busy={socialBusy === "google"}
                      disabled={anyBusy}
                      onPress={() => void onSocial("google")}
                    />
                  ) : null}
                  <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: c.hairline }]} />
                    <Text style={[styles.dividerLabel, { color: c.text4 }]}>or use email</Text>
                    <View style={[styles.dividerLine, { backgroundColor: c.hairline }]} />
                  </View>
                </View>
              ) : null}

              <View style={styles.form}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: c.surface,
                      borderColor: showEmailIssue ? c.danger : c.hairline,
                      borderWidth: showEmailIssue ? 1 : StyleSheet.hairlineWidth,
                      color: c.text,
                    },
                  ]}
                  placeholder="Email"
                  placeholderTextColor={c.text4}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={(next) => {
                    setEmail(next);
                    // A stale submit error shouldn't outlive the correction.
                    if (error) setError(null);
                  }}
                  onBlur={() => setEmailTouched(true)}
                  editable={!anyBusy}
                />
                {showEmailIssue ? (
                  <Text style={[styles.fieldHint, { color: c.danger }]} accessibilityLiveRegion="polite">
                    {emailIssue}
                  </Text>
                ) : null}
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
                  onChangeText={(next) => {
                    setPassword(next);
                    if (error) setError(null);
                  }}
                  editable={!anyBusy}
                  onSubmitEditing={onSubmit}
                  returnKeyType="go"
                />

                {mode === "sign_in" ? (
                  <Pressable onPress={() => void onForgotPassword()} disabled={anyBusy} style={styles.forgot} hitSlop={8}>
                    <Text style={[styles.forgotLabel, { color: c.accent }]}>Forgot password?</Text>
                  </Pressable>
                ) : null}

                {mode === "sign_up" ? (
                  <View style={styles.requirements} accessibilityLabel="Password requirements">
                    <Requirement met={passwordState.length}>At least 8 characters</Requirement>
                    <Requirement met={passwordState.case}>Upper & lowercase letters</Requirement>
                    <Requirement met={passwordState.number}>At least one number</Requirement>
                  </View>
                ) : null}

                {error ? (
                  <View
                    style={[styles.errorBox, { backgroundColor: `${c.danger}14`, borderColor: `${c.danger}40` }]}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                  >
                    <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={onSubmit}
                  // Stays tappable while the form is incomplete so a tap can
                  // explain what is missing; only a request in flight locks it.
                  disabled={anyBusy}
                  accessibilityState={{ disabled: anyBusy, busy }}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: canSubmit ? c.accent : c.accentSoft,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {/* Foreground follows the fill: `canSubmit` goes false while
                      busy, so a fixed onAccent would hide the spinner for the
                      whole auth round trip. */}
                  {busy ? (
                    <ActivityIndicator color={canSubmit ? c.onAccent : c.onAccentSoft} />
                  ) : (
                    <Text style={[styles.buttonText, { color: canSubmit ? c.onAccent : c.onAccentSoft }]}>
                      {mode === "sign_up" ? "Create account" : "Sign in"}
                    </Text>
                  )}
                </Pressable>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchText, { color: c.text3 }]}>
                    {mode === "sign_in" ? "New here?" : "Already have an account?"}
                  </Text>
                  <Pressable onPress={() => switchMode(mode === "sign_in" ? "sign_up" : "sign_in")} disabled={anyBusy} hitSlop={8}>
                    <Text style={[styles.switchLink, { color: c.accent }]}>
                      {mode === "sign_in" ? "Create an account" : "Sign in"}
                    </Text>
                  </Pressable>
                </View>

                {mode === "sign_up" ? (
                  <Text style={[styles.legalNotice, { color: c.text3 }]}>
                    By creating an account, you agree to the{" "}
                    <Text style={{ color: c.accent, fontWeight: "700" }} onPress={() => void openLegalUrl(TERMS_OF_SERVICE_URL)}>
                      Terms
                    </Text>
                    {" and acknowledge the "}
                    <Text style={{ color: c.accent, fontWeight: "700" }} onPress={() => void openLegalUrl(PRIVACY_POLICY_URL)}>
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                ) : null}
              </View>
            </>
          )}

          <Pressable onPress={confirmRestartOnboarding} disabled={anyBusy} style={styles.onboardingLink} hitSlop={8}>
            <Text style={[styles.onboardingLinkLabel, { color: c.text3 }]}>Start onboarding again</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SocialButton({
  kind,
  busy,
  disabled,
  onPress,
}: {
  kind: "apple" | "google";
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useAuthPalette();
  const apple = kind === "apple";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${apple ? "Apple" : "Google"}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        {
          backgroundColor: apple ? "#111113" : c.surface,
          borderColor: apple ? "#111113" : c.text4,
          opacity: disabled && !busy ? 0.5 : pressed ? 0.86 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={apple ? "#fff" : c.text} />
      ) : apple ? (
        <Text style={[styles.appleMark, { color: "#fff" }]}></Text>
      ) : (
        <GoogleMark />
      )}
      <Text style={{ fontSize: 15.5, fontWeight: "700", color: apple ? "#fff" : c.text }}>
        Continue with {apple ? "Apple" : "Google"}
      </Text>
    </Pressable>
  );
}

function Requirement({ met, children }: { met: boolean; children: string }) {
  const c = useAuthPalette();
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 28,
  },
  header: { gap: 8 },
  wordmark: {
    fontSize: TypeScale.largeTitle,
    fontFamily: SERIF,
  },
  subtitle: { fontSize: TypeScale.callout, lineHeight: 22 },
  socialBlock: { gap: 10 },
  socialButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: Motif.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
    paddingHorizontal: 18,
  },
  appleMark: { width: 20, textAlign: "center", fontSize: 21, fontWeight: "800" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: TypeScale.footnote, fontWeight: "600" },
  form: { gap: 12 },
  confirmation: { gap: 16 },
  input: {
    height: Motif.buttonHeight.large,
    borderRadius: Motif.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    fontSize: TypeScale.body,
  },
  forgot: { alignSelf: "flex-end", paddingHorizontal: 4, paddingVertical: 2 },
  forgotLabel: { fontSize: TypeScale.footnote, fontWeight: "700" },
  fieldHint: { fontSize: TypeScale.footnote, lineHeight: 18, paddingHorizontal: 20, marginTop: -4 },
  errorBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  error: { fontSize: TypeScale.footnote, lineHeight: 18, fontWeight: "600" },
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
  legalNotice: { fontSize: 11.5, lineHeight: 17, textAlign: "center", paddingHorizontal: 12 },
  textButton: { alignSelf: "flex-start", paddingVertical: 8 },
  textButtonLabel: { fontSize: TypeScale.body, fontWeight: "700" },
  onboardingLink: { alignSelf: "center", padding: 8, marginTop: 12 },
  onboardingLinkLabel: { fontSize: TypeScale.footnote, fontWeight: "600" },
});
