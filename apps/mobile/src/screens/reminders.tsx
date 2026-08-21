// reminders.tsx — Profile → Reminders subpage. v1 is self-talking only:
// enable, daily/weekly, weekdays, local time. Banner copy preview + test ping
// are __DEV__-only (ship builds omit this; keep for internal copy refinement).
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Pressable, Switch, Text, View } from "react-native";

import { useTheme } from "@/design/theme";
import { BackBar, Card, Chip, Pill, Screen } from "@/design/ui";
import {
  formatReminderTime,
  formatWeekdays,
  getReminderPermission,
  reminderSettings,
  requestReminderPermission,
  saveReminderSettings,
  scheduleSelfTalkTest,
  SELF_TALK_COPY,
  WEEKDAY_OPTIONS,
  type ReminderFrequency,
  type ReminderPermission,
  type ReminderSettings,
} from "@/lib/reminders";
import type { Nav } from "./nav";

function labelStyle(color: string) {
  return { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6, color };
}

export function RemindersScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [settings, setSettings] = useState<ReminderSettings>(reminderSettings);
  const [permission, setPermission] = useState<ReminderPermission>("undetermined");
  const [busy, setBusy] = useState(false);
  const [testHint, setTestHint] = useState<string | null>(null);

  const refreshPermission = useCallback(async () => {
    const next = await getReminderPermission();
    setPermission(next);
    if (reminderSettings().enabled && (next === "granted" || next === "provisional")) {
      setSettings(await saveReminderSettings({}));
    }
  }, []);

  useEffect(() => {
    void refreshPermission();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPermission();
    });
    return () => sub.remove();
  }, [refreshPermission]);

  const patch = async (next: Partial<ReminderSettings>) => {
    setSettings(await saveReminderSettings(next));
  };

  const toggleEnabled = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    setTestHint(null);
    try {
      if (!on) {
        setSettings(await saveReminderSettings({ enabled: false }));
        return;
      }
      const nextPermission = await requestReminderPermission();
      setPermission(nextPermission);
      if (nextPermission === "granted" || nextPermission === "provisional") {
        setSettings(await saveReminderSettings({ enabled: true }));
      }
    } finally {
      setBusy(false);
    }
  };

  const setFrequency = (frequency: ReminderFrequency) => {
    void patch({ frequency });
  };

  const toggleWeekday = (value: number) => {
    const has = settings.weekdays.includes(value);
    const weekdays = has
      ? settings.weekdays.filter((day) => day !== value)
      : [...settings.weekdays, value];
    if (weekdays.length === 0) return;
    void patch({ weekdays });
  };

  const shiftHour = (delta: number) => {
    void patch({ hour: (settings.hour + delta + 24) % 24 });
  };

  const shiftMinute = (delta: number) => {
    void patch({ minute: (settings.minute + delta + 60) % 60 });
  };

  const sendTest = async () => {
    try {
      await scheduleSelfTalkTest();
      setTestHint("A test ping will arrive in about 5 seconds. Lock the phone or switch apps to see the banner.");
    } catch {
      setTestHint("Couldn’t schedule a test. A new iPhone build may be needed.");
    }
  };

  const blocked = permission === "denied" || permission === "unavailable";
  const dim = settings.enabled ? 1 : 0.55;

  return (
    <Screen bottomPad={40}>
      <BackBar title="Reminders" onBack={nav.pop} />

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={labelStyle(t.colors.accD)}>SELF-TALKING</Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Speak from your stories</Text>
            <Text style={{ fontSize: 13.5, lineHeight: 19, color: t.colors.ink2 }}>
              A local nudge at a time you choose, in this phone’s timezone.
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(on) => void toggleEnabled(on)}
            disabled={busy}
            trackColor={{ false: t.colors.soft, true: t.colors.acc }}
            thumbColor="#fff"
            ios_backgroundColor={t.colors.soft}
          />
        </View>
      </Card>

      {__DEV__ && permission === "unavailable" ? (
        <Card>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink }}>This build can’t send reminders yet</Text>
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: t.colors.ink2, marginTop: 6 }}>
            This simulator app is older than the reminders module. Reload is enough for the rest of Saylo. To test the actual ping here, the simulator app needs a native rebuild — or install TestFlight 13 on your iPhone.
          </Text>
        </Card>
      ) : null}

      {permission === "denied" ? (
        <Card>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink }}>Notifications are off for Saylo</Text>
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: t.colors.ink2, marginTop: 6 }}>
            iPhone won’t show a self-talk reminder until you allow notifications in Settings.
          </Text>
          <Pill tone="tint" onPress={() => void Linking.openSettings()} style={{ marginTop: 14 }}>
            Open Settings
          </Pill>
        </Card>
      ) : null}

      {permission === "provisional" ? (
        <Card>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink }}>Quiet delivery is on</Text>
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: t.colors.ink2, marginTop: 6 }}>
            iOS may send these without a sound or banner. Open Settings if you want an alert.
          </Text>
          <Pill tone="tint" onPress={() => void Linking.openSettings()} style={{ marginTop: 14 }}>
            Open Settings
          </Pill>
        </Card>
      ) : null}

      <View style={{ opacity: dim, gap: t.gap }} pointerEvents={blocked ? "none" : "auto"}>
        <Card>
          <Text style={labelStyle(t.colors.accD)}>FREQUENCY</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 12 }}>
            <Chip active={settings.frequency === "daily"} onPress={() => setFrequency("daily")}>
              Daily
            </Chip>
            <Chip active={settings.frequency === "weekly"} onPress={() => setFrequency("weekly")}>
              Weekly
            </Chip>
          </View>
          {settings.frequency === "weekly" ? (
            <>
              <Text style={[labelStyle(t.colors.accD), { marginTop: 18 }]}>DAYS</Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, marginTop: 6 }}>
                {formatWeekdays(settings.weekdays)}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 12 }}>
                {WEEKDAY_OPTIONS.map((day) => (
                  <Chip
                    key={day.value}
                    active={settings.weekdays.includes(day.value)}
                    onPress={() => toggleWeekday(day.value)}
                  >
                    {day.short}
                  </Chip>
                ))}
              </View>
            </>
          ) : null}
        </Card>

        <Card>
          <Text style={labelStyle(t.colors.accD)}>TIME OF DAY</Text>
          <Text style={{ fontSize: 28, fontWeight: "700", color: t.colors.ink, marginTop: 10 }}>
            {formatReminderTime(settings.hour, settings.minute)}
          </Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 4 }}>Local time on this phone</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Stepper label="Hour" onMinus={() => shiftHour(-1)} onPlus={() => shiftHour(1)} />
            <Stepper label="Min" onMinus={() => shiftMinute(-5)} onPlus={() => shiftMinute(5)} />
          </View>
        </Card>

        {/* Ship builds omit this; keep for internal copy refinement. */}
        {__DEV__ ? (
          <Card>
            <Text style={labelStyle(t.colors.accD)}>PREVIEW</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink, marginTop: 10 }}>
              {SELF_TALK_COPY.title}
            </Text>
            <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 6 }}>
              {SELF_TALK_COPY.body}
            </Text>
          </Card>
        ) : null}
      </View>

      {__DEV__ && settings.enabled && (permission === "granted" || permission === "provisional") ? (
        <Pill tone="tint" onPress={() => void sendTest()}>
          Send a test in 5 seconds
        </Pill>
      ) : null}
      {__DEV__ && testHint ? (
        <Text style={{ fontSize: 13.5, lineHeight: 20, color: t.colors.ink2, paddingHorizontal: 4 }}>
          {testHint}
        </Text>
      ) : null}
    </Screen>
  );
}

function Stepper({
  label,
  onMinus,
  onPlus,
}: {
  label: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.4, color: t.colors.ink3 }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <StepButton label="−" onPress={onMinus} />
        <StepButton label="+" onPress={onPlus} />
      </View>
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          height: 44,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.colors.soft,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: 20, fontWeight: "600", color: t.colors.ink }}>{label}</Text>
    </Pressable>
  );
}
