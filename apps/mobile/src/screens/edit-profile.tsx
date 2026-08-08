// edit-profile.tsx — the "Edit profile" surface behind the Profile header.
// Name + goal persist to Supabase auth user_metadata (no profiles table needed,
// synced across devices); first language persists locally and applies at once.
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { useTheme } from "@/design/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { firstLanguage, persistFirstLanguage, L1_OPTIONS, type L1 } from "@/lib/first-language";
import { Avatar, BackBar, Card, Chip, Pill, Screen } from "@/design/ui";
import type { Nav } from "./nav";

export function EditProfileScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { session } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as { display_name?: string; goal?: string };

  const [name, setName] = useState(meta.display_name ?? "");
  const [goal, setGoal] = useState(meta.goal ?? "");
  const [l1, setL1] = useState<L1>(firstLanguage());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6, color: t.colors.accD };
  const input = { fontSize: 16, color: t.colors.ink, marginTop: 8, padding: 0 };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: name.trim(), goal: goal.trim() },
      });
      if (updateError) throw updateError;
      await persistFirstLanguage(l1);
      nav.pop();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save your profile.");
      setSaving(false);
    }
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Edit profile" onBack={nav.pop} />

      <View style={{ alignItems: "center", paddingTop: 2, paddingBottom: 4 }}>
        <Avatar s={84} />
      </View>

      <Card>
        <Text style={label}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={t.colors.ink3}
          style={input}
        />
        <Text style={[label, { marginTop: 18 }]}>GOAL</Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder="e.g. Explain what I do clearly"
          placeholderTextColor={t.colors.ink3}
          multiline
          style={[input, { minHeight: 44, lineHeight: 22 }]}
        />
      </Card>

      <Card>
        <Text style={label}>FIRST LANGUAGE</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3, marginTop: 6 }}>
          We greet you in this language while you learn English.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 12 }}>
          {L1_OPTIONS.map((option) => (
            <Chip key={option.value} active={l1 === option.value} onPress={() => setL1(option.value)}>
              {option.label}
            </Chip>
          ))}
        </View>
      </Card>

      {error ? <Text style={{ fontSize: 13, color: "#E5484D", textAlign: "center" }}>{error}</Text> : null}
      <Pill full icon="check" onPress={saving ? undefined : save} style={{ opacity: saving ? 0.6 : 1 }}>
        {saving ? <ActivityIndicator color="#fff" /> : "Save"}
      </Pill>
    </Screen>
  );
}
