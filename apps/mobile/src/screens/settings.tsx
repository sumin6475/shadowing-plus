// settings.tsx — Profile & Settings: a centered identity header, Library
// (kept as a BETA entry, not a bottom-bar tab), then grouped preference rows.
// Speaking-world metrics live on My Studio now. "Log out" stays wired to
// the real Supabase sign-out. Unshipped rows hide their fake right-side
// value and show a Coming soon chip (same as Library BETA).
import { useState, type ReactNode } from "react";
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { usePostHog } from "posthog-react-native";

import { useTheme, type Theme } from "@/design/theme";
import { deleteAccount } from "@/lib/account";
import { useAuth } from "@/lib/auth";
import { firstLanguage, L1_LABEL } from "@/lib/first-language";
import { phrasesPerDay } from "@/lib/daily-phrases";
import { englishLevel, ENGLISH_LEVEL_LABEL } from "@/lib/english-level";
import { fetchPhrases } from "@/lib/phrases";
import { reminderSummary } from "@/lib/reminders";
import { talkFocus, TALK_FOCUS_LABEL } from "@/lib/talk-focus";
import { themePref, THEME_PREF_LABEL } from "@/lib/theme-pref";
import { Avatar, Card, Icon, Screen, Stagger } from "@/design/ui";
import type { IconName } from "@/design/icon";
import type { Nav } from "./nav";

function StatusChip({ t, label }: { t: Theme; label: string }) {
  return (
    <View style={{ backgroundColor: t.colors.accS, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", color: t.colors.accD, letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  t,
  icon,
  label,
  detail,
  last,
  danger,
  comingSoon,
  onPress,
}: {
  t: Theme;
  icon?: IconName;
  label: string;
  detail?: string;
  last?: boolean;
  danger?: boolean;
  comingSoon?: boolean;
  onPress?: () => void;
}) {
  const fg = danger ? "#E5484D" : t.colors.ink;
  const row = (
    <>
      {icon ? <Icon name={icon} s={21} w={1.8} c={danger ? "#E5484D" : t.colors.ink2} /> : null}
      <Text style={{ flex: 1, fontSize: 16.5, fontWeight: "500", color: fg }}>{label}</Text>
      {comingSoon ? (
        <StatusChip t={t} label="Coming soon" />
      ) : (
        <>
          {detail ? <Text style={{ fontSize: 15, color: t.colors.ink3 }}>{detail}</Text> : null}
          {danger ? null : <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />}
        </>
      )}
    </>
  );
  const style = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 52,
    gap: 13,
    borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.sep,
  };
  if (onPress && !comingSoon) {
    return (
      <Pressable onPress={onPress} style={style}>
        {row}
      </Pressable>
    );
  }
  return <View style={style}>{row}</View>;
}

function SettingsGroup({ t, title, children }: { t: Theme; title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12.5, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3, paddingHorizontal: 14 }}>
        {title.toUpperCase()}
      </Text>
      <Card style={{ paddingVertical: 2, paddingHorizontal: 16 }}>{children}</Card>
    </View>
  );
}

export function SettingsScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { session, signOut } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as { display_name?: string; goal?: string };
  const name = meta.display_name?.trim() || session?.user?.email?.split("@")[0] || "You";
  const goal = meta.goal?.trim() || "Set your learning goal";
  const posthog = usePostHog();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(
      "Delete your account?",
      "Your phrases, stories, sessions, and profile will be permanently deleted. This can’t be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDeleting(true);
            posthog?.capture("account_delete_confirmed");
            deleteAccount()
              .then(() => {
                posthog?.reset();
              })
              .catch((e) => {
                setDeleting(false);
                Alert.alert(
                  "Couldn’t delete your account",
                  e instanceof Error ? e.message : "Check your connection and try again.",
                );
              });
          },
        },
      ],
    );
  };

  const exportPhrases = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const phrases = await fetchPhrases();
      if (!phrases.length) {
        Alert.alert("Nothing to export yet", "Save a phrase first, then export your collection here.");
        return;
      }
      const lines = phrases.map((p) => {
        const parts = [p.text];
        if (p.translation?.trim()) parts.push(`  ${p.translation.trim()}`);
        return parts.join("\n");
      });
      await Share.share({
        title: "My Saylo phrases",
        message: `My Saylo phrases (${phrases.length})\n\n${lines.join("\n\n")}`,
      });
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Couldn’t load your phrases.");
    } finally {
      setExporting(false);
    }
  };

  const openFeedbackMail = () => {
    const subject = encodeURIComponent("Saylo feedback");
    Linking.openURL(`mailto:sumin002@gmail.com?subject=${subject}`).catch(() => {
      Alert.alert("No mail app", "Send your thoughts to sumin002@gmail.com.");
    });
  };

  return (
    <Screen bottomPad={40}>
      {/* Top bar */}
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44 }}>
        <Pressable
          onPress={nav.pop}
          style={[
            { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: t.ring },
            t.shadowCard,
          ]}
        >
          <Icon name="back" s={18} w={2.2} c={t.colors.ink} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: t.colors.ink, marginRight: 44 }}>Profile</Text>
      </View>

      {/* Identity */}
      <Stagger>
      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <Avatar s={84} />
        <Text style={{ fontSize: 24, fontWeight: "800", color: t.colors.ink, marginTop: 14 }}>{name}</Text>
        <Text style={{ fontSize: 15, color: t.colors.ink3, marginTop: 4 }}>{goal}</Text>
        <Pressable style={{ marginTop: 12 }} onPress={() => nav.push("editProfile")}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>Edit profile</Text>
        </Pressable>
      </View>

      {/* Library — kept as a BETA entry (off the bottom bar for the first launch) */}
      <Card onPress={() => nav.push("library")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon name="book" s={22} w={1.8} c={t.colors.ink2} />
        <Text style={{ fontSize: 16.5, fontWeight: "600", color: t.colors.ink }}>Library</Text>
        <StatusChip t={t} label="BETA" />
        <View style={{ flex: 1 }} />
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>

      <SettingsGroup t={t} title="Preferences">
        <SettingsRow t={t} icon="translate" label="English level" detail={ENGLISH_LEVEL_LABEL[englishLevel()]} onPress={() => nav.push("englishLevel")} />
        <SettingsRow t={t} icon="chat" label="First language" detail={L1_LABEL[firstLanguage()]} onPress={() => nav.push("firstLanguage")} />
        <SettingsRow t={t} icon="sparkle" label="Feedback focus" detail={TALK_FOCUS_LABEL[talkFocus()]} onPress={() => nav.push("feedbackFocus")} />
        <SettingsRow t={t} icon="mic" label="My mirror" comingSoon />
        <SettingsRow t={t} icon="contrast" label="Theme" detail={THEME_PREF_LABEL[themePref()]} onPress={() => nav.push("themePref")} last />
      </SettingsGroup>

      <SettingsGroup t={t} title="Practice">
        <SettingsRow t={t} icon="clock" label="Practice length" comingSoon />
        <SettingsRow t={t} icon="bulb" label="Hints while speaking" comingSoon />
        <SettingsRow t={t} icon="text" label="Phrases per day" detail={String(phrasesPerDay())} onPress={() => nav.push("phrasesPerDay")} />
        <SettingsRow t={t} icon="gauge" label="Playback speed" comingSoon last />
      </SettingsGroup>

      <SettingsGroup t={t} title="Notifications">
        <SettingsRow t={t} icon="bell" label="Reminders" detail={reminderSummary()} onPress={() => nav.push("reminders")} />
        <SettingsRow t={t} icon="calendar" label="Weekly recap" comingSoon last />
      </SettingsGroup>

      <SettingsGroup t={t} title="Account">
        <SettingsRow t={t} icon="export" label="Export my phrases" detail={exporting ? "Preparing…" : undefined} onPress={() => void exportPhrases()} />
        <SettingsRow t={t} icon="help" label="Help & feedback" onPress={openFeedbackMail} />
        <SettingsRow t={t} icon="shield" label="Privacy" onPress={() => nav.push("privacy")} />
        <SettingsRow t={t} label="Log out" danger onPress={() => signOut()} />
        <SettingsRow
          t={t}
          label="Delete account"
          detail={deleting ? "Deleting…" : undefined}
          danger
          onPress={confirmDeleteAccount}
          last
        />
      </SettingsGroup>
      </Stagger>
    </Screen>
  );
}
