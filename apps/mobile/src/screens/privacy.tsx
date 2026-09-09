// privacy.tsx — in-app privacy overview (Profile → Privacy).
//
// This mirrors the app's actual data practices. Keep it in sync when a flow
// changes what leaves the device (e.g., recording cloud sync in Phase 2).
// App Store Connect also needs a hosted privacy policy URL; this screen is the
// in-app companion, not a replacement.
import { useState } from "react";
import { Alert, Linking, Switch, Text, View } from "react-native";

import { useTheme } from "@/design/theme";
import { BackBar, Card, Icon, Screen, Stagger } from "@/design/ui";
import { aiProcessingConsentFromMetadata, setAiProcessingConsent } from "@/lib/ai-consent";
import { useAuth } from "@/lib/auth";
import { openLegalUrl, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/lib/legal";
import type { IconName } from "@/design/icon";
import type { Nav } from "./nav";

const SUPPORT_EMAIL = "sumin002@gmail.com";

function Section({
  icon,
  title,
  lines,
}: {
  icon: IconName;
  title: string;
  lines: string[];
}) {
  const t = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: t.colors.accS,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} s={17} w={1.9} c={t.colors.accD} />
        </View>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: t.colors.ink }}>{title}</Text>
      </View>
      <View style={{ gap: 7, marginTop: 12 }}>
        {lines.map((line) => (
          <Text key={line} style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink2 }}>
            {line}
          </Text>
        ))}
      </View>
    </Card>
  );
}

export function PrivacyScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { session } = useAuth();
  const [updatingAiConsent, setUpdatingAiConsent] = useState(false);
  const aiConsent = aiProcessingConsentFromMetadata(session?.user.user_metadata);

  const contact = () => {
    const subject = encodeURIComponent("Saylo privacy question");
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      Alert.alert("No mail app", `Write to ${SUPPORT_EMAIL}.`);
    });
  };

  const updateAiConsent = async (allowed: boolean) => {
    if (updatingAiConsent) return;
    setUpdatingAiConsent(true);
    try {
      await setAiProcessingConsent(allowed);
    } catch {
      Alert.alert("Couldn’t save your choice", "Check your connection and try again.");
    } finally {
      setUpdatingAiConsent(false);
    }
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Privacy" onBack={nav.pop} />
      <Stagger>
        <Text style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink2, paddingHorizontal: 4 }}>
          Saylo exists to help you speak. Your data is used for that and nothing else. No ads. No selling data. No
          cross-app tracking.
        </Text>

        <Section
          icon="shield"
          title="What we store"
          lines={[
            "Your account email and profile (name, goal, and optional photo).",
            "Your saved phrases, stories, session transcripts, and practice history.",
            "Learning content is protected by your account. Profile photos are stored with Supabase for display in the app.",
          ]}
        />

        <Section
          icon="mic"
          title="Your voice"
          lines={[
            "Practice recordings stay on this device. They are never uploaded.",
            "Speech is turned into text on your device by iOS speech recognition.",
            "You can delete any recording from its session screen.",
          ]}
        />

        <Section
          icon="sparkle"
          title="AI feedback"
          lines={[
            "Only with your permission, the text or photo you choose is sent to OpenAI for feedback, phrase suggestions, language help, embeddings, or AI pronunciation.",
            "Speaking recordings are not sent. OpenAI processes the selected content under its API data policy and does not use API data to train models by default.",
            "You can turn this processing off below at any time. AI features stay off until you allow it again.",
          ]}
        />

        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }}>Allow OpenAI processing</Text>
            <Text style={{ fontSize: 13, lineHeight: 18, color: t.colors.ink3, marginTop: 3 }}>
              {aiConsent === "allowed" ? "On · selected text and photos can be processed" : "Off · no content is sent to OpenAI"}
            </Text>
          </View>
          <Switch
            value={aiConsent === "allowed"}
            onValueChange={(allowed) => void updateAiConsent(allowed)}
            disabled={updatingAiConsent}
            trackColor={{ false: t.colors.soft, true: t.colors.accS }}
            thumbColor={aiConsent === "allowed" ? t.colors.acc : undefined}
          />
        </Card>

        <Section
          icon="gauge"
          title="Usage analytics"
          lines={[
            "PostHog receives basic product interactions and crash diagnostics so we can improve the app.",
            "Analytics use an internal account ID. We do not send your email, recordings, transcripts, phrase text, photos, or advertising identifiers.",
            "We do not track you across other companies’ apps or websites.",
          ]}
        />

        <Section
          icon="x"
          title="Deleting your data"
          lines={[
            "Recordings: delete in the app, from any session.",
            "Phrases and stories: delete in the app, anytime.",
            "Your whole account: Profile → Delete account. Everything is removed right away.",
          ]}
        />

        <Card onPress={() => void openLegalUrl(PRIVACY_POLICY_URL)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="shield" s={20} w={1.8} c={t.colors.ink2} />
          <Text style={{ flex: 1, fontSize: 15.5, fontWeight: "600", color: t.colors.ink }}>Full Privacy Policy</Text>
          <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
        </Card>

        <Card onPress={() => void openLegalUrl(TERMS_OF_SERVICE_URL)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="text" s={20} w={1.8} c={t.colors.ink2} />
          <Text style={{ flex: 1, fontSize: 15.5, fontWeight: "600", color: t.colors.ink }}>Terms of Service</Text>
          <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
        </Card>

        <Card onPress={contact} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="help" s={20} w={1.8} c={t.colors.ink2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: "600", color: t.colors.ink }}>Questions?</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>{SUPPORT_EMAIL}</Text>
          </View>
          <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
        </Card>
      </Stagger>
    </Screen>
  );
}
