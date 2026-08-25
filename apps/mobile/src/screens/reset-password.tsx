// reset-password.tsx — shown when the app was opened from a password-reset
// email link (auth.passwordRecovery). The recovery link already signed the
// learner in; this screen sets the new password, or lets them skip and stay
// signed in.
import { useState } from "react";
import {
  ActivityIndicator,
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
import { useAuthPalette } from "@/design/auth-palette";
import { SERIF } from "@/design/theme";
import { useAuth } from "@/lib/auth";

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
}

export default function ResetPasswordScreen() {
  const c = useAuthPalette();
  const { updatePassword, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = passwordChecks(password);
  const valid = checks.length && checks.case && checks.number;
  const match = password.length > 0 && password === confirm;
  const canSubmit = valid && match && !busy;

  async function onSubmit() {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await updatePassword(password);
      // passwordRecovery flips off; the root guard shows the app.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t update your password. Try again.");
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>Set a new password</Text>
            <Text style={[styles.subtitle, { color: c.text3 }]}>
              You’re signed in from the reset link. Choose a new password for your account.
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.hairline, color: c.text }]}
              placeholder="New password"
              placeholderTextColor={c.text4}
              autoCapitalize="none"
              secureTextEntry
              textContentType="newPassword"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.hairline, color: c.text }]}
              placeholder="Repeat new password"
              placeholderTextColor={c.text4}
              autoCapitalize="none"
              secureTextEntry
              textContentType="newPassword"
              value={confirm}
              onChangeText={setConfirm}
              editable={!busy}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

            <View style={styles.requirements} accessibilityLabel="Password requirements">
              <Requirement met={checks.length}>At least 8 characters</Requirement>
              <Requirement met={checks.case}>Upper & lowercase letters</Requirement>
              <Requirement met={checks.number}>At least one number</Requirement>
              <Requirement met={match}>Both passwords match</Requirement>
            </View>

            {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: canSubmit ? c.accent : c.accentSoft, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Save new password</Text>}
            </Pressable>

            <Pressable onPress={cancelPasswordRecovery} disabled={busy} style={styles.skip} hitSlop={8}>
              <Text style={[styles.skipLabel, { color: c.text3 }]}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 40 },
  header: { gap: 8 },
  title: { fontSize: TypeScale.largeTitle, fontFamily: SERIF },
  subtitle: { fontSize: TypeScale.callout, lineHeight: 22 },
  form: { gap: 12 },
  input: {
    height: Motif.buttonHeight.large,
    borderRadius: Motif.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    fontSize: TypeScale.body,
  },
  requirements: { gap: 5, paddingHorizontal: 8, paddingVertical: 2 },
  requirement: { fontSize: TypeScale.footnote },
  error: { fontSize: TypeScale.footnote, paddingHorizontal: 4 },
  button: {
    height: Motif.buttonHeight.large,
    borderRadius: Motif.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: { color: "#ffffff", fontSize: TypeScale.headline, fontWeight: "600" },
  skip: { alignSelf: "center", padding: 10 },
  skipLabel: { fontSize: TypeScale.footnote, fontWeight: "600" },
});
