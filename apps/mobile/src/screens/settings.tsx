// settings.tsx — Profile & Settings (sp-app.jsx SettingsScreen). "Log out"
// is wired to the real Supabase sign-out.
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme, type Theme } from "@/design/theme";
import { useAuth } from "@/lib/auth";
import { Avatar, BackBar, Block, Card, Icon, Pill, Screen } from "@/design/ui";
import type { Nav } from "./nav";

function SettingsRow({ t, label, detail, last, onPress }: { t: Theme; label: string; detail?: string; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", minHeight: 52, gap: 10, borderBottomWidth: last ? 0 : 2, borderBottomColor: t.colors.sep }}
    >
      <Text style={{ flex: 1, fontSize: 17, fontWeight: "500", color: t.colors.ink }}>{label}</Text>
      {detail ? <Text style={{ fontSize: 15, color: t.colors.ink3 }}>{detail}</Text> : null}
      <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
    </Pressable>
  );
}

function SettingsGroup({ t, title, children }: { t: Theme; title: string; children: ReactNode }) {
  return (
    <Card style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: t.colors.ink3, paddingTop: 10, paddingBottom: 2 }}>{title.toUpperCase()}</Text>
      {children}
    </Card>
  );
}

function StatBlock({ tone, value, label, t }: { tone: string; value: string; label: string; t: Theme }) {
  return (
    <Block tone={tone} style={{ flex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: t.colors.onB }}>{value}</Text>
      <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.onB2 }}>{label}</Text>
    </Block>
  );
}

export function SettingsScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { signOut } = useAuth();

  return (
    <Screen bottomPad={40}>
      <BackBar title="Profile & Settings" onBack={nav.pop} />
      <Card lg style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar s={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Sumin</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>Goal: explain what I do</Text>
        </View>
        <Pill tone="soft" small>
          Edit
        </Pill>
      </Card>

      <View style={{ flexDirection: "row", gap: t.gap }}>
        <StatBlock t={t} tone="butter" value="48" label="phrases saved" />
        <StatBlock t={t} tone="sage" value="9" label="ready to use" />
        <StatBlock t={t} tone="sky" value="6" label="topics" />
      </View>

      <SettingsGroup t={t} title="Practice">
        <SettingsRow t={t} label="Default practice length" detail="5 min" />
        <SettingsRow t={t} label="Hints while answering" detail="On" />
        <SettingsRow t={t} label="Korean explanations" detail="On" />
        <SettingsRow t={t} label="Playback speed" detail="0.9×" last />
      </SettingsGroup>
      <SettingsGroup t={t} title="Notifications">
        <SettingsRow t={t} label="Reminders" detail="Evening" />
        <SettingsRow t={t} label="Phrase review" detail="On" />
        <SettingsRow t={t} label="Weekly recap" detail="On" last />
      </SettingsGroup>
      <SettingsGroup t={t} title="Data & privacy">
        <SettingsRow t={t} label="My uploads" />
        <SettingsRow t={t} label="Export my phrases" />
        <SettingsRow t={t} label="Privacy policy" last />
      </SettingsGroup>
      <SettingsGroup t={t} title="Account">
        <SettingsRow t={t} label="Email" detail="sumin@…" />
        <SettingsRow t={t} label="Log out" onPress={() => signOut()} last />
      </SettingsGroup>
    </Screen>
  );
}
