// reminders.ts — local self-talk practice reminders.
//
// Settings live in AsyncStorage (no server). Scheduling uses expo-notifications
// Daily/Weekly triggers, which repeat on iOS. Identifiers are stable so we can
// cancel without storing OS-assigned ids.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import type { NotificationPermissionsStatus } from "expo-notifications";

const STORAGE_KEY = "self_talk_reminder";
const CHANNEL_ID = "practice-reminders";

/** Daily fire + one id per weekday (Sunday = 1, matching expo-notifications). */
export const SELF_TALK_DAILY_ID = "saylo.selftalk.daily";
export const SELF_TALK_WEEKLY_IDS = [1, 2, 3, 4, 5, 6, 7].map(
  (weekday) => `saylo.selftalk.weekly.${weekday}`,
);
const SELF_TALK_TEST_ID = "saylo.selftalk.test";

export const SELF_TALK_COPY = {
  title: "Time for a little self-talk",
  body: "One short round of Speak is enough. Pick a story beat and say it out loud.",
};

export type ReminderFrequency = "daily" | "weekly";

export interface ReminderSettings {
  enabled: boolean;
  frequency: ReminderFrequency;
  /** 1 = Sunday … 7 = Saturday, expo WeeklyTrigger weekday. */
  weekdays: number[];
  hour: number;
  minute: number;
}

const DEFAULTS: ReminderSettings = {
  enabled: false,
  frequency: "daily",
  weekdays: [2, 3, 4, 5, 6],
  hour: 20,
  minute: 0,
};

export const WEEKDAY_OPTIONS: { value: number; label: string; short: string }[] = [
  { value: 1, label: "Sunday", short: "Sun" },
  { value: 2, label: "Monday", short: "Mon" },
  { value: 3, label: "Tuesday", short: "Tue" },
  { value: 4, label: "Wednesday", short: "Wed" },
  { value: 5, label: "Thursday", short: "Thu" },
  { value: 6, label: "Friday", short: "Fri" },
  { value: 7, label: "Saturday", short: "Sat" },
];

let cached: ReminderSettings = { ...DEFAULTS };
let notificationsMod: typeof import("expo-notifications") | null | undefined;

function notificationsModule(): typeof import("expo-notifications") | null {
  if (notificationsMod !== undefined) return notificationsMod;
  if (!requireOptionalNativeModule("ExpoPushTokenManager")) {
    notificationsMod = null;
    return null;
  }
  try {
    // Top-level import crashes old simulator/dev clients that predate the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-notifications") as typeof import("expo-notifications");
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationsMod = mod;
    return mod;
  } catch {
    notificationsMod = null;
    return null;
  }
}

export function reminderSettings(): ReminderSettings {
  return cached;
}

export function formatReminderTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatWeekdays(weekdays: number[]): string {
  const unique = [...new Set(weekdays)].sort((a, b) => a - b);
  if (unique.length === 5 && unique.join() === "2,3,4,5,6") return "Weekdays";
  if (unique.length === 2 && unique.join() === "1,7") return "Weekends";
  if (unique.length === 7) return "Every day";
  const labels = WEEKDAY_OPTIONS.filter((d) => unique.includes(d.value)).map((d) => d.short);
  return labels.join(" · ") || "Pick days";
}

export function reminderSummary(): string {
  if (!cached.enabled) return "Off";
  const time = formatReminderTime(cached.hour, cached.minute);
  if (cached.frequency === "daily") return `Daily · ${time}`;
  return `${formatWeekdays(cached.weekdays)} · ${time}`;
}

function clampSettings(raw: Partial<ReminderSettings>): ReminderSettings {
  const hour = Number.isFinite(raw.hour) ? Math.min(23, Math.max(0, Math.round(raw.hour as number))) : DEFAULTS.hour;
  const minute = Number.isFinite(raw.minute)
    ? Math.min(59, Math.max(0, Math.round((raw.minute as number) / 5) * 5))
    : DEFAULTS.minute;
  const weekdays = Array.isArray(raw.weekdays)
    ? [...new Set(raw.weekdays.filter((d) => d >= 1 && d <= 7))].sort((a, b) => a - b)
    : DEFAULTS.weekdays;
  return {
    enabled: raw.enabled === true,
    frequency: raw.frequency === "weekly" ? "weekly" : "daily",
    weekdays: weekdays.length ? weekdays : [...DEFAULTS.weekdays],
    hour,
    minute,
  };
}

export async function loadReminders(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) cached = clampSettings(JSON.parse(raw) as Partial<ReminderSettings>);
  } catch {
    cached = { ...DEFAULTS };
  }
  await syncScheduledReminders();
}

export async function saveReminderSettings(patch: Partial<ReminderSettings>): Promise<ReminderSettings> {
  cached = clampSettings({ ...cached, ...patch });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // In-memory still applies for this session.
  }
  await syncScheduledReminders();
  return cached;
}

export type ReminderPermission = "undetermined" | "granted" | "provisional" | "denied" | "unavailable";

type NotificationsAPI = NonNullable<ReturnType<typeof notificationsModule>>;

export function canNotify(mod: NotificationsAPI, status: NotificationPermissionsStatus): boolean {
  if (Platform.OS === "ios") {
    const ios = status.ios?.status;
    return (
      ios === mod.IosAuthorizationStatus.AUTHORIZED ||
      ios === mod.IosAuthorizationStatus.PROVISIONAL ||
      ios === mod.IosAuthorizationStatus.EPHEMERAL
    );
  }
  return status.granted || status.status === "granted";
}

function classifyPermission(mod: NotificationsAPI, status: NotificationPermissionsStatus): ReminderPermission {
  if (Platform.OS === "ios") {
    const ios = status.ios?.status;
    if (ios === mod.IosAuthorizationStatus.AUTHORIZED) return "granted";
    if (ios === mod.IosAuthorizationStatus.PROVISIONAL) return "provisional";
    if (ios === mod.IosAuthorizationStatus.EPHEMERAL) return "granted";
    if (ios === mod.IosAuthorizationStatus.DENIED) return "denied";
    return "undetermined";
  }
  if (status.granted || status.status === "granted") return "granted";
  if (status.status === "denied") return "denied";
  return "undetermined";
}

function isNativeMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cannot find native module|native module.*expo.?notifications/i.test(message);
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  const Notifications = notificationsModule();
  if (!Notifications) return "unavailable";
  try {
    const status = await Notifications.getPermissionsAsync();
    return classifyPermission(Notifications, status);
  } catch (error) {
    return isNativeMissing(error) ? "unavailable" : "denied";
  }
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  const Notifications = notificationsModule();
  if (!Notifications) return "unavailable";
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (canNotify(Notifications, existing)) return classifyPermission(Notifications, existing);
    if (Platform.OS === "ios" && existing.ios?.status === Notifications.IosAuthorizationStatus.DENIED) {
      return "denied";
    }
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return classifyPermission(Notifications, asked);
  } catch (error) {
    return isNativeMissing(error) ? "unavailable" : "denied";
  }
}

async function ensureAndroidChannel(Notifications: NotificationsAPI): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Practice reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function cancelSelfTalkReminders(Notifications: NotificationsAPI): Promise<void> {
  const ids = [SELF_TALK_DAILY_ID, SELF_TALK_TEST_ID, ...SELF_TALK_WEEKLY_IDS];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function syncScheduledReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  const Notifications = notificationsModule();
  if (!Notifications) return;
  try {
    await cancelSelfTalkReminders(Notifications);
    if (!cached.enabled) return;
    const permission = await getReminderPermission();
    if (permission === "denied" || permission === "unavailable" || permission === "undetermined") return;

    await ensureAndroidChannel(Notifications);
    const content = {
      title: SELF_TALK_COPY.title,
      body: SELF_TALK_COPY.body,
      sound: "default" as const,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : null),
    };

    if (cached.frequency === "daily") {
      await Notifications.scheduleNotificationAsync({
        identifier: SELF_TALK_DAILY_ID,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: cached.hour,
          minute: cached.minute,
          ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : null),
        },
      });
      return;
    }

    for (const weekday of cached.weekdays) {
      await Notifications.scheduleNotificationAsync({
        identifier: `saylo.selftalk.weekly.${weekday}`,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: cached.hour,
          minute: cached.minute,
          ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : null),
        },
      });
    }
  } catch {
    // Native module missing until a rebuild; prefs still persist.
  }
}

export async function scheduleSelfTalkTest(): Promise<void> {
  const Notifications = notificationsModule();
  if (!Notifications) throw new Error("Notifications native module missing");
  await ensureAndroidChannel(Notifications);
  await Notifications.scheduleNotificationAsync({
    identifier: SELF_TALK_TEST_ID,
    content: {
      title: SELF_TALK_COPY.title,
      body: SELF_TALK_COPY.body,
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : null),
    },
  });
}
