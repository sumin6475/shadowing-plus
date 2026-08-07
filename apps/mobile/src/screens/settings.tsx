// settings.tsx — Profile & Settings, rebuilt to match the Saylo profile design:
// a centered identity header, the "Your speaking world" cobalt banner, Library
// (kept as a BETA entry, not a bottom-bar tab), then grouped preference rows.
// "Log out" stays wired to the real Supabase sign-out. Row values are still
// display-only placeholders — wiring each setting is a later pass.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme, type Theme } from "@/design/theme";
import { useAuth } from "@/lib/auth";
import { Avatar, Card, Icon, Screen } from "@/design/ui";
import type { IconName } from "@/design/icon";
import type { Nav } from "./nav";

function SettingsRow({
  t,
  icon,
  label,
  detail,
  last,
  danger,
  onPress,
}: {
  t: Theme;
  icon?: IconName;
  label: string;
  detail?: string;
  last?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  const fg = danger ? "#E5484D" : t.colors.ink;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 52,
        gap: 13,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: t.colors.sep,
      }}
    >
      {icon ? <Icon name={icon} s={21} w={1.8} c={danger ? "#E5484D" : t.colors.ink2} /> : null}
      <Text style={{ flex: 1, fontSize: 16.5, fontWeight: "500", color: fg }}>{label}</Text>
      {detail ? <Text style={{ fontSize: 15, color: t.colors.ink3 }}>{detail}</Text> : null}
      {danger ? null : <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />}
    </Pressable>
  );
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
  const { signOut } = useAuth();

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
      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <Avatar s={84} />
        <Text style={{ fontSize: 24, fontWeight: "800", color: t.colors.ink, marginTop: 14 }}>Sumin</Text>
        <Text style={{ fontSize: 15, color: t.colors.ink3, marginTop: 4 }}>Explain what I do clearly</Text>
        <Pressable style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>Edit profile</Text>
        </Pressable>
      </View>

      {/* Your speaking world banner */}
      <LinearGradient
        colors={["#3D6FE0", "#6C9BF2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderRadius: t.r, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="globe" s={24} c="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>Your speaking world</Text>
          <Text style={{ fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>6 stories · 9 phrases ready</Text>
        </View>
        <Pressable
          onPress={() => nav.go("topics")}
          style={{ backgroundColor: "#fff", borderRadius: 9999, paddingHorizontal: 16, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 14.5, fontWeight: "700", color: t.colors.acc }}>View world</Text>
        </Pressable>
      </LinearGradient>

      {/* Library — kept as a BETA entry (off the bottom bar for the first launch) */}
      <Card onPress={() => nav.push("library")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon name="book" s={22} w={1.8} c={t.colors.ink2} />
        <Text style={{ fontSize: 16.5, fontWeight: "600", color: t.colors.ink }}>Library</Text>
        <View style={{ backgroundColor: t.colors.accS, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: t.colors.accD, letterSpacing: 0.4 }}>BETA</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>

      <SettingsGroup t={t} title="Preferences">
        <SettingsRow t={t} icon="translate" label="English level" detail="Intermediate" />
        <SettingsRow t={t} icon="chat" label="First language" detail="Korean" />
        <SettingsRow t={t} icon="mic" label="My mirror" detail="mirror 01" />
        <SettingsRow t={t} icon="contrast" label="Theme" detail="Default" last />
      </SettingsGroup>

      <SettingsGroup t={t} title="Practice">
        <SettingsRow t={t} icon="clock" label="Practice length" detail="5 min" />
        <SettingsRow t={t} icon="bulb" label="Hints while speaking" detail="On" />
        <SettingsRow t={t} icon="text" label="Phrases per day" detail="5" />
        <SettingsRow t={t} icon="gauge" label="Playback speed" detail="0.9×" last />
      </SettingsGroup>

      <SettingsGroup t={t} title="Notifications">
        <SettingsRow t={t} icon="bell" label="Reminders" detail="Evening" />
        <SettingsRow t={t} icon="calendar" label="Weekly recap" detail="On" last />
      </SettingsGroup>

      <SettingsGroup t={t} title="Account">
        <SettingsRow t={t} icon="export" label="Export my phrases" />
        <SettingsRow t={t} icon="help" label="Help & feedback" />
        <SettingsRow t={t} icon="shield" label="Privacy" />
        <SettingsRow t={t} label="Log out" danger onPress={() => signOut()} last />
      </SettingsGroup>
    </Screen>
  );
}
