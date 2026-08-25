// privacy.tsx — in-app privacy overview (Profile → Privacy).
//
// This mirrors the app's actual data practices. Keep it in sync when a flow
// changes what leaves the device (e.g., recording cloud sync in Phase 2).
// App Store Connect also needs a hosted privacy policy URL; this screen is the
// in-app companion, not a replacement.
import { Alert, Linking, Text, View } from "react-native";

import { useTheme } from "@/design/theme";
import { BackBar, Card, Icon, Screen, Stagger } from "@/design/ui";
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

  const contact = () => {
    const subject = encodeURIComponent("Saylo privacy question");
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {
      Alert.alert("No mail app", `Write to ${SUPPORT_EMAIL}.`);
    });
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
            "Your account email and profile (name, goal, photo).",
            "Your saved phrases, stories, and practice history.",
            "Everything is stored on secure servers and visible only to your account.",
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
            "The text of your practice is sent to our AI provider to create your feedback.",
            "It is processed for your session only and is not used to train AI models.",
          ]}
        />

        <Section
          icon="gauge"
          title="Usage analytics"
          lines={[
            "We collect basic usage events, like which screens are used, to improve the app.",
            "Analytics are tied to your account, not to your identity across other apps.",
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
