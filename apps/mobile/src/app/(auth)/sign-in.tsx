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
import { useAuth } from "@/lib/auth";
import { useCobalt } from "@/hooks/use-cobalt";

export default function SignInScreen() {
  const c = useCobalt();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function onSubmit() {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      // On success the auth listener flips the session and the root guard
      // swaps to the (app) group — no manual navigation needed.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.wordmark, { color: c.text }]}>Saylo</Text>
            <Text style={[styles.subtitle, { color: c.text3 }]}>
              Sign in to shadow your clips.
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
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />

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
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  input: {
    height: Motif.buttonHeight.large,
    borderRadius: Motif.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    fontSize: TypeScale.body,
  },
  error: { fontSize: TypeScale.footnote, paddingHorizontal: 4 },
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
});
