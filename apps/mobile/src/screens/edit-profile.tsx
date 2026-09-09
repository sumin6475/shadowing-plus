// edit-profile.tsx — Profile subpages. Edit profile is name + goal (Supabase
// user_metadata). First language and Feedback focus are their own screens and
// persist locally, like Reminders.
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { hairline, useTheme } from "@/design/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PHRASES_PER_DAY_OPTIONS, persistPhrasesPerDay, phrasesPerDay } from "@/lib/daily-phrases";
import { DAILY_SPEAKING_GOAL_OPTIONS, dailySpeakingGoalMinutes, formatDailySpeakingGoal } from "@/lib/practice-length";
import {
  ENGLISH_LEVEL_DETAIL,
  ENGLISH_LEVEL_OPTIONS,
  englishLevel,
  persistEnglishLevel,
  type EnglishLevel,
} from "@/lib/english-level";
import { persistThemePref, themePref, THEME_PREF_OPTIONS, type ThemePref } from "@/lib/theme-pref";
import { firstLanguage, persistFirstLanguage, L1_OPTIONS, type L1 } from "@/lib/first-language";
import {
  persistTalkFocus,
  talkFocus,
  TALK_FOCUS_DETAIL,
  TALK_FOCUS_EXAMPLE,
  TALK_FOCUS_LABEL,
  TALK_FOCUS_OPTIONS,
  type TalkFocus,
} from "@/lib/talk-focus";
import { Avatar, BackBar, Card, Chip, Icon, Pill, Screen } from "@/design/ui";
import { avatarUrlFromMetadata, clearUploadedAvatar, pickAndUploadAvatar } from "@/lib/profile-photo";
import type { Nav } from "./nav";

function fieldLabel(color: string) {
  return { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6, color };
}

export function EditProfileScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { session } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as { display_name?: string; goal?: string };

  const [name, setName] = useState(meta.display_name ?? "");
  const [goal, setGoal] = useState(meta.goal ?? "");
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCustomPhoto = Boolean(avatarUrlFromMetadata(meta as Record<string, unknown>) && (meta as { avatar_path?: string }).avatar_path);

  const changePhoto = () => {
    if (photoBusy || saving) return;
    Alert.alert("Profile photo", "This photo shows on Profile and in your studio.", [
      {
        text: "Choose photo",
        onPress: () => void savePhoto("library"),
      },
      {
        text: "Take photo",
        onPress: () => void savePhoto("camera"),
      },
      ...(hasCustomPhoto
        ? [
            {
              text: "Remove photo",
              style: "destructive" as const,
              onPress: () => void removePhoto(),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const savePhoto = async (origin: "library" | "camera") => {
    setPhotoBusy(true);
    setError(null);
    try {
      await pickAndUploadAvatar(origin);
    } catch (caught) {
      if (caught instanceof Error && (caught.message === "cancelled" || caught.message === "permission")) return;
      setError(caught instanceof Error ? caught.message : "Couldn’t save your photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setError(null);
    try {
      await clearUploadedAvatar();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t remove your photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const input = { fontSize: 16, color: t.colors.ink, marginTop: 8, padding: 0 };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: name.trim(), goal: goal.trim() },
      });
      if (updateError) throw updateError;
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
        <Pressable onPress={changePhoto} disabled={photoBusy} style={{ opacity: photoBusy ? 0.7 : 1 }}>
          <Avatar s={84} />
          <View
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: t.colors.acc,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: t.colors.bg,
            }}
          >
            {photoBusy ? <ActivityIndicator color="#fff" /> : <Icon name="camera" s={14} c="#fff" />}
          </View>
        </Pressable>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.accD, marginTop: 10 }}>Change photo</Text>
      </View>

      <Card>
        <Text style={fieldLabel(t.colors.accD)}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={t.colors.ink3}
          style={input}
        />
        <Text style={[fieldLabel(t.colors.accD), { marginTop: 18 }]}>GOAL</Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder="e.g. Explain what I do clearly"
          placeholderTextColor={t.colors.ink3}
          multiline
          style={[input, { minHeight: 44, lineHeight: 22 }]}
        />
      </Card>

      {error ? <Text style={{ fontSize: 13, color: "#E5484D", textAlign: "center" }}>{error}</Text> : null}
      <Pill full icon="check" onPress={saving ? undefined : save} style={{ opacity: saving ? 0.6 : 1 }}>
        {saving ? <ActivityIndicator color="#fff" /> : "Save"}
      </Pill>
    </Screen>
  );
}

export function FirstLanguageScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [l1, setL1] = useState<L1>(firstLanguage());

  const choose = (value: L1) => {
    setL1(value);
    void persistFirstLanguage(value);
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="First language" onBack={nav.pop} />
      <Card>
        <Text style={fieldLabel(t.colors.accD)}>FIRST LANGUAGE</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3, marginTop: 6 }}>
          We greet you in this language while you learn English.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 12 }}>
          {L1_OPTIONS.map((option) => (
            <Chip key={option.value} active={l1 === option.value} onPress={() => choose(option.value)}>
              {option.label}
            </Chip>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

export function FeedbackFocusScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [focus, setFocus] = useState<TalkFocus>(talkFocus());
  const example = TALK_FOCUS_EXAMPLE[focus];

  const choose = (value: TalkFocus) => {
    setFocus(value);
    void persistTalkFocus(value);
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Feedback focus" onBack={nav.pop} />

      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        <Text style={[fieldLabel(t.colors.accD), { paddingTop: 10, paddingBottom: 4 }]}>FEEDBACK FOCUS</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, paddingBottom: 8 }}>
          After you talk, we look first at this.
        </Text>
        {TALK_FOCUS_OPTIONS.map((option, index) => {
          const selected = focus === option.value;
          const last = index === TALK_FOCUS_OPTIONS.length - 1;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => choose(option.value)}
              style={{
                minHeight: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: last ? 0 : hairline,
                borderBottomColor: t.colors.sep,
              }}
            >
              <Text style={{ flex: 1, fontSize: 16.5, fontWeight: selected ? "700" : "500", color: t.colors.ink }}>
                {option.label}
              </Text>
              {selected ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" s={12} w={2.5} c="#fff" />
                </View>
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.colors.sep }} />
              )}
            </Pressable>
          );
        })}
      </Card>

      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>
          {TALK_FOCUS_LABEL[focus].toUpperCase()} FOCUS
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, marginTop: 6 }}>
          {TALK_FOCUS_DETAIL[focus]}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 18 }}>
          EXAMPLE
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink, marginTop: 12 }}>You said</Text>
        <View
          style={{
            marginTop: 8,
            borderRadius: t.r,
            backgroundColor: "#FFF7F7",
            borderWidth: 1,
            borderColor: "#FFEAEB",
            padding: 14,
          }}
        >
          <Text
            accessibilityLabel={example.saidParts.map((part) => part.text).join("")}
            style={{ fontSize: 15, lineHeight: 25, color: t.colors.ink }}
          >
            {example.saidParts.map((part, index) => (
              <Text
                key={`${focus}-${index}`}
                style={part.error ? { color: "#E54D4D", backgroundColor: "#FFEAEB", fontWeight: "600" } : undefined}
              >
                {part.text}
              </Text>
            ))}
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink, marginTop: 14 }}>You may have meant</Text>
        <LinearGradient
          colors={["#A9C7FF", "#D5E3FF", "#7BA7F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            marginTop: 8,
            borderRadius: t.r,
            padding: 1.5,
            shadowColor: "#3D6FE0",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 18,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={["#3D6FE0", "#6C9BF2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: t.r - 1.5, padding: t.padc, overflow: "hidden" }}
          >
            <View
              style={{
                position: "absolute",
                width: 120,
                height: 120,
                borderRadius: 60,
                top: -72,
                right: -32,
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Icon name="sparkle" s={15} w={2} c="#FFFFFF" />
              <Text style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, color: "rgba(255,255,255,0.86)" }}>NEW SUGGESTION</Text>
            </View>
            <Text style={{ fontSize: 16.5, fontWeight: "700", lineHeight: 23, color: "#FFFFFF", marginTop: 7 }}>{example.want}</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.82)", marginTop: 9 }}>{example.why}</Text>
          </LinearGradient>
        </LinearGradient>
      </Card>
    </Screen>
  );
}

export function EnglishLevelScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [level, setLevel] = useState<EnglishLevel>(englishLevel());

  const choose = (value: EnglishLevel) => {
    setLevel(value);
    void persistEnglishLevel(value);
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="English level" onBack={nav.pop} />
      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        <Text style={[fieldLabel(t.colors.accD), { paddingTop: 10, paddingBottom: 4 }]}>ENGLISH LEVEL</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, paddingBottom: 8 }}>
          Speaking feedback pitches its suggestions at this level.
        </Text>
        {ENGLISH_LEVEL_OPTIONS.map((option, index) => {
          const selected = level === option.value;
          const last = index === ENGLISH_LEVEL_OPTIONS.length - 1;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => choose(option.value)}
              style={{
                minHeight: 60,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: last ? 0 : hairline,
                borderBottomColor: t.colors.sep,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 16.5, fontWeight: selected ? "700" : "500", color: t.colors.ink }}>
                  {option.label}
                </Text>
                <Text style={{ fontSize: 12.5, lineHeight: 17, color: t.colors.ink3 }}>
                  {ENGLISH_LEVEL_DETAIL[option.value]}
                </Text>
              </View>
              {selected ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" s={12} w={2.5} c="#fff" />
                </View>
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.colors.sep }} />
              )}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

export function ThemeScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [pref, setPref] = useState<ThemePref>(themePref());

  const choose = (value: ThemePref) => {
    setPref(value);
    void persistThemePref(value);
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Theme" onBack={nav.pop} />
      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        <Text style={[fieldLabel(t.colors.accD), { paddingTop: 10, paddingBottom: 4 }]}>APPEARANCE</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, paddingBottom: 8 }}>
          System follows your device setting.
        </Text>
        {THEME_PREF_OPTIONS.map((option, index) => {
          const selected = pref === option.value;
          const last = index === THEME_PREF_OPTIONS.length - 1;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => choose(option.value)}
              style={{
                minHeight: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: last ? 0 : hairline,
                borderBottomColor: t.colors.sep,
              }}
            >
              <Text style={{ flex: 1, fontSize: 16.5, fontWeight: selected ? "700" : "500", color: t.colors.ink }}>
                {option.label}
              </Text>
              {selected ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" s={12} w={2.5} c="#fff" />
                </View>
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.colors.sep }} />
              )}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

export function DailySpeakingGoalScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { session } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const [goal, setGoal] = useState(dailySpeakingGoalMinutes(meta));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (value: number) => {
    if (saving || value === goal) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { daily_speaking_goal_minutes: value },
      });
      if (updateError) throw updateError;
      setGoal(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save your daily goal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Daily speaking goal" onBack={nav.pop} />
      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        <Text style={[fieldLabel(t.colors.accD), { paddingTop: 10, paddingBottom: 4 }]}>DAILY GOAL</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, paddingBottom: 8 }}>
          The minutes of actual talking you aim for each day. Your studio rings fill toward this target.
        </Text>
        {DAILY_SPEAKING_GOAL_OPTIONS.map((value, index) => {
          const selected = goal === value;
          const last = index === DAILY_SPEAKING_GOAL_OPTIONS.length - 1;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              disabled={saving}
              onPress={() => void choose(value)}
              style={{
                minHeight: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: last ? 0 : hairline,
                borderBottomColor: t.colors.sep,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ flex: 1, fontSize: 16.5, fontWeight: selected ? "700" : "500", color: t.colors.ink }}>
                {formatDailySpeakingGoal(value)}
              </Text>
              {selected ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" s={12} w={2.5} c="#fff" />
                </View>
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.colors.sep }} />
              )}
            </Pressable>
          );
        })}
        {error ? <Text style={{ fontSize: 13, color: "#E5484D", paddingVertical: 10 }}>{error}</Text> : null}
      </Card>
    </Screen>
  );
}

export function PhrasesPerDayScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [count, setCount] = useState(phrasesPerDay());

  const choose = (value: number) => {
    setCount(value);
    void persistPhrasesPerDay(value);
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Phrases per day" onBack={nav.pop} />
      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        <Text style={[fieldLabel(t.colors.accD), { paddingTop: 10, paddingBottom: 4 }]}>DAILY REVIEW</Text>
        <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, paddingBottom: 8 }}>
          How many saved phrases to bring back each day. Today’s list stays put until tomorrow, unless you change this number.
        </Text>
        {PHRASES_PER_DAY_OPTIONS.map((value, index) => {
          const selected = count === value;
          const last = index === PHRASES_PER_DAY_OPTIONS.length - 1;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => choose(value)}
              style={{
                minHeight: 52,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: last ? 0 : hairline,
                borderBottomColor: t.colors.sep,
              }}
            >
              <Text style={{ flex: 1, fontSize: 16.5, fontWeight: selected ? "700" : "500", color: t.colors.ink }}>
                {value} phrases
              </Text>
              {selected ? (
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" s={12} w={2.5} c="#fff" />
                </View>
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.colors.sep }} />
              )}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
