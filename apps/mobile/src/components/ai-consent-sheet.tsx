// ai-consent-sheet.tsx — turn AI processing on without leaving the page.
//
// A feature that needs AI used to say "turn it on in Settings → Privacy" and
// leave the learner to find their way there and back. This sheet brings the
// same choice to them: it says what is sent, to whom and why, and holds the
// switch itself. When the switch goes on the choice is saved, the sheet
// closes, and the page underneath carries on.
//
// It has to stand on its own as the consent moment (App Review 5.1.1(i) and
// 5.1.2(i), GDPR), so it keeps everything the first-run consent screen
// (screens/ai-consent.tsx) says:
//  - which data leaves the phone and that it goes to a third-party AI provider,
//    named once in small print (AI_PROVIDER_NOTE) with the full policy linked;
//  - what it is used for, and that it is not used for training by default;
//  - what never leaves (recordings);
//  - that one switch covers every AI feature, not just this page;
//  - a link to the privacy policy, and how to turn it off again.
// The switch starts OFF and nothing is sent until the learner turns it on.
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/design/icon";
import { Text } from "@/design/text";
import { hairline, useTheme } from "@/design/theme";
import { Serif } from "@/design/ui";
import { setAiProcessingConsent } from "@/lib/ai-consent";
import { AI_PROVIDER_NOTE, openLegalUrl, PRIVACY_POLICY_URL } from "@/lib/legal";

export function AiConsentSheet({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  /** One line on why this page needs AI, e.g. "Speaking review is written by AI." */
  reason: string;
}) {
  // Read here, not inside the Modal: a Modal is its own native root and the
  // app's safe-area provider does not reach it.
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {open ? <SheetBody onClose={onClose} reason={reason} bottomInset={insets.bottom} /> : null}
    </Modal>
  );
}

function SheetBody({ onClose, reason, bottomInset }: { onClose: () => void; reason: string; bottomInset: number }) {
  const t = useTheme();
  const [on, setOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const turnOn = async () => {
    if (saving) return;
    setOn(true);
    setSaving(true);
    setFailed(false);
    try {
      await setAiProcessingConsent(true);
      onClose();
    } catch {
      setOn(false);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const row = { paddingHorizontal: 18, paddingVertical: 15 } as const;
  const rowTitle = { fontSize: 16, fontWeight: "600", color: t.colors.ink } as const;
  const rowBody = { fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 4 } as const;
  const rule = <View style={{ height: hairline, backgroundColor: t.colors.sep, marginLeft: 18 }} />;

  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={saving ? undefined : onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.38)" }]}
      />
      <View
        accessibilityViewIsModal
        style={{
          maxHeight: "88%",
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: bottomInset + 12,
        }}
      >
        <View style={{ alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: t.colors.sep, marginTop: 8 }} />
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}
        >
          <Serif style={{ fontSize: 28, lineHeight: 34, color: t.colors.ink }}>Turn on AI processing</Serif>
          <Text style={{ fontSize: 15.5, lineHeight: 22, color: t.colors.ink2, marginTop: 8 }}>
            {reason} Here is exactly what leaves your phone. Nothing is sent unless you turn this on.
          </Text>

          <View
            style={{
              marginTop: 20,
              borderRadius: 20,
              backgroundColor: t.colors.card,
              borderWidth: hairline,
              borderColor: t.ring,
            }}
          >
            <View style={[row, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={rowTitle}>Allow AI processing</Text>
                <Text style={rowBody}>
                  When you ask for AI help, what you chose is sent to our AI provider: a saved speaking transcript
                  with your speaking focus and level, a note or Ask message, or the text or photo you picked.
                </Text>
              </View>
              {saving ? (
                <ActivityIndicator color={t.colors.accD} style={{ width: 51 }} />
              ) : (
                <Switch
                  value={on}
                  onValueChange={(next) => (next ? void turnOn() : setOn(false))}
                  accessibilityLabel="Allow AI processing of the content you choose"
                  trackColor={{ false: t.colors.soft, true: t.colors.acc }}
                />
              )}
            </View>
            {rule}
            <View style={row}>
              <Text style={rowTitle}>One switch for every AI feature</Text>
              <Text style={rowBody}>
                It also turns on Ask, phrase meanings and usage, reading text from a photo, phrase search, and AI voice.
              </Text>
            </View>
            {rule}
            <View style={[row, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={rowTitle}>Your recordings stay on this phone</Text>
                <Text style={rowBody}>Speaking audio is never uploaded. iOS turns it into text on this device.</Text>
              </View>
              <View
                accessibilityLabel="Always on"
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="check" s={14} w={2.4} c={t.colors.accD} />
              </View>
            </View>
          </View>

          <Text
            accessibilityLiveRegion="polite"
            style={{ fontSize: 13.5, lineHeight: 19, color: failed ? t.colors.warn : t.colors.ink3, marginTop: 14, paddingHorizontal: 4 }}
          >
            {failed ? (
              "Couldn’t save your choice. Check your connection and try the switch again."
            ) : (
              <>
                {AI_PROVIDER_NOTE} You can turn this off anytime in Settings → Privacy.{" "}
                <Text
                  accessibilityRole="link"
                  onPress={() => void openLegalUrl(PRIVACY_POLICY_URL)}
                  style={{ color: t.colors.accD, fontWeight: "600" }}
                >
                  Full Privacy Policy
                </Text>
              </>
            )}
          </Text>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={onClose}
          style={({ pressed }) => ({
            alignSelf: "center",
            minHeight: 44,
            paddingHorizontal: 20,
            justifyContent: "center",
            opacity: saving ? 0.4 : pressed ? 0.55 : 1,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.accD }}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
