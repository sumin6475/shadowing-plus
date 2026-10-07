// ai-consent.tsx — the full-screen AI processing consent, shown once per
// account (and again when AI_CONSENT_VERSION changes). Replaces a system
// Alert that read as a warning and buried the choice in three buttons.
//
// Shape follows the product owner's reference (a consent sheet: title,
// plain-language explanation, one card of items, a footer note, one button).
// Two deliberate differences from that reference:
// - The switch starts OFF. Consent to send content to a third party has to be
//   an action the learner takes (App Review 5.1.2, GDPR); a pre-switched
//   toggle isn't that.
// - AI is optional in Myne, so the button is never disabled — it reads
//   "Continue without AI" until the switch is on.
import { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Switch, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/design/text";
import { hairline, ThemeProvider, useTheme } from "@/design/theme";
import { Card, Icon, Pill, Serif } from "@/design/ui";
import { openLegalUrl, PRIVACY_POLICY_URL } from "@/lib/legal";

export function AiConsentScreen({
  visible,
  onDecide,
}: {
  visible: boolean;
  /** Resolves once the choice is saved; rejects to keep the screen open. */
  onDecide: (allowed: boolean) => Promise<void>;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      {/* A Modal is its own native root: the app's SafeAreaProvider doesn't
          reach it, so without this the insets read 0 and the title sits under
          the Dynamic Island. */}
      <SafeAreaProvider>
        <ThemeProvider>
          <ConsentBody onDecide={onDecide} />
        </ThemeProvider>
      </SafeAreaProvider>
    </Modal>
  );
}

function ConsentBody({ onDecide }: { onDecide: (allowed: boolean) => Promise<void> }) {
  const t = useTheme();
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);

  const decide = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onDecide(allowed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 24 }}>
        <Serif style={{ fontSize: 34, lineHeight: 40, color: t.colors.ink }}>Before Myne uses AI</Serif>
        <Text style={{ fontSize: 16, lineHeight: 23, color: t.colors.ink2, marginTop: 14 }}>
          Some features use AI. Here is exactly what leaves your phone, and it only happens if you allow it.
        </Text>

        <Card style={{ marginTop: 28, paddingVertical: 4, paddingHorizontal: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.ink }}>Send what you choose to OpenAI</Text>
              <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 4 }}>
                When you ask Myne to fill in a phrase, read text from a photo or play an AI voice, only that text or photo
                is sent. OpenAI doesn’t train on it by default.{" "}
                <Text
                  accessibilityRole="link"
                  onPress={() => void openLegalUrl(PRIVACY_POLICY_URL)}
                  style={{ color: t.colors.accD, fontWeight: "600" }}
                >
                  Learn more
                </Text>
              </Text>
            </View>
            <Switch
              value={allowed}
              onValueChange={setAllowed}
              disabled={saving}
              accessibilityLabel="Allow sending selected text and photos to OpenAI"
              trackColor={{ false: t.colors.soft, true: t.colors.acc }}
            />
          </View>

          <View style={{ height: hairline, backgroundColor: t.colors.sep, marginLeft: 18 }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.ink }}>Your recordings stay on this phone</Text>
              <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 4 }}>
                Speaking audio is never uploaded. iOS turns it into text on this device.
              </Text>
            </View>
            <View
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}
              accessibilityLabel="Always on"
            >
              <Icon name="check" s={14} w={2.4} c={t.colors.accD} />
            </View>
          </View>
        </Card>
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 10, borderTopWidth: hairline, borderTopColor: t.colors.sep }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: t.colors.ink3, marginBottom: 14 }}>
          {allowed
            ? "You can turn this off anytime in Settings → Privacy."
            : "AI features stay off until you allow this. You can change it anytime in Settings → Privacy."}
        </Text>
        {/* Not `full`: that sets flex 1, which collapses to 0 height in this auto-height footer. */}
        <Pill tone={allowed ? "acc" : "tint"} onPress={() => void decide()} style={{ alignSelf: "stretch", opacity: saving ? 0.7 : 1 }}>
          {saving ? (
            <ActivityIndicator color={allowed ? t.colors.onAcc : t.colors.ink} />
          ) : allowed ? (
            "Agree and continue"
          ) : (
            "Continue without AI"
          )}
        </Pill>
      </View>
    </SafeAreaView>
  );
}
