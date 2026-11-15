import { RecoveryState } from "./recovery-state";
import { initialCoachingLevel } from "@/lib/coaching-level-migration";
import { FocusFormatToolbar } from "./focus-format-toolbar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/design/text";
import { hairline, useTheme } from "@/design/theme";
import { BackBar, Card, Pill, Screen } from "@/design/ui";
import { useAuth } from "@/lib/auth";
import {
  ENGLISH_LEVEL_DETAIL,
  ENGLISH_LEVEL_OPTIONS,
  type EnglishLevel,
  persistEnglishLevel,
} from "@/lib/english-level";
import { type L1, L1_OPTIONS } from "@/lib/first-language";
import {
  type CoachingPreferences,
  loadCoachingPreferences,
  saveCoachingPreferences,
} from "@/lib/advanced-feedback";
import { focusWithinLimit } from "@/lib/speaking-focus-copy";
import {
  type FocusEditorHandle,
  SpeakingFocusEditor,
} from "./speaking-focus-editor";
export function CoachingPreferencesForm(props: { onBack: () => void }) {
  const { session } = useAuth();
  return (
    <PreferencesContent key={session?.user.id ?? "signed-out"} {...props} />
  );
}
function PreferencesContent({ onBack }: { onBack: () => void }) {
  const t = useTheme(), insets = useSafeAreaInsets(), { session } = useAuth();
  const [preferences, setPreferences] = useState<CoachingPreferences | null>(
      null,
    ),
    [loaded, setLoaded] = useState(false),
    [level, setLevel] = useState<EnglishLevel>("b1"),
    [language, setLanguage] = useState<L1>("en"),
    [plain, setPlain] = useState(""),
    [dirty, setDirty] = useState(false),
    [focused, setFocused] = useState(false),
    [format, setFormat] = useState({
      bold: false,
      bullet: false,
      number: false,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  const initialLanguage = useRef<L1>(
    L1_OPTIONS.find((option) =>
      option.value === session?.user.user_metadata.first_language
    )?.value ?? "en",
  );
  const editor = useRef<FocusEditorHandle>(null), userId = session?.user.id;
  useEffect(() => {
    let active = true;
    void loadCoachingPreferences().then(async (p) => {
      const initial = p?.english_level ?? await initialCoachingLevel(userId!);
      if (!active) return;
      setPreferences(p);
      setLanguage(p?.first_language ?? initialLanguage.current);
      setLevel(initial);
      setPlain(p?.plain_text ?? "");
      setLoaded(true);
    }).catch(() => {
      if (active) setError("Couldn’t load your speaking focus.");
    });
    return () => {
      active = false;
    };
  }, [userId, reload]);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);
  const save = async () => {
    if (!loaded || busy || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const html = await editor.current?.html() ?? "";
      if (!focusWithinLimit(plain, html)) {
        throw new Error("Keep your focus within 12,000 characters.");
      }
      const saved = await saveCoachingPreferences({
        revision: preferences?.source_revision ?? 0,
        richText: html,
        level,
        language,
      }, userId);
      if (!mounted.current) return;
      setPreferences(saved);
      await persistEnglishLevel(saved.english_level);
      setDirty(false);
      editor.current?.command("blur");
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "Couldn’t save your focus.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const back = () => {
    if (busy) return;
    if (!dirty) {
      onBack();
      return;
    }
    Alert.alert(
      "Save your speaking focus?",
      "Your changes haven’t been saved.",
      [{ text: "Keep editing", style: "cancel" }, {
        text: "Discard",
        style: "destructive",
        onPress: onBack,
      }, { text: "Save", onPress: () => void save() }],
    );
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen bottomPad={24} keyboardInsets={false}>
        <BackBar title="English level" onBack={back} />
        <Card style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
          {ENGLISH_LEVEL_OPTIONS.map((option, index) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{
                selected: level === option.value,
                disabled: !loaded || busy,
              }}
              disabled={!loaded || busy}
              onPress={() => {
                setLevel(option.value);
                setDirty(true);
              }}
              style={{
                minHeight: 60,
                paddingVertical: 10,
                borderBottomWidth: index === ENGLISH_LEVEL_OPTIONS.length - 1
                  ? 0
                  : hairline,
                borderColor: t.colors.sep,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    fontSize: 16.5,
                    fontWeight: level === option.value ? "700" : "500",
                    color: t.colors.ink,
                  }}
                >
                  {option.label}
                </Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    lineHeight: 17,
                    color: t.colors.ink3,
                  }}
                >
                  {ENGLISH_LEVEL_DETAIL[option.value]}
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: t.colors.accD }}>
                {level === option.value ? "✓" : ""}
              </Text>
            </Pressable>
          ))}
        </Card>
        {!preferences && loaded
          ? (
            <Text
              style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3 }}
            >
              Choose a level and save it for this account. Your speaking focus
              starts empty.
            </Text>
          )
          : null}
        <Card style={{ padding: 18, gap: 18 }}>
          <Text
            style={{ fontSize: 18, fontWeight: "600", color: t.colors.ink }}
          >
            Speaking focus
          </Text>
          {loaded
            ? (
              <SpeakingFocusEditor
                key={userId}
                ref={editor}
                disabled={busy}
                onFormatChange={setFormat}
                initialHtml={preferences?.rich_text ?? ""}
                language={language}
                onChange={(text) => {
                  setPlain(text);
                  setDirty(true);
                }}
                onFocusChange={setFocused}
              />
            )
            : error
            ? (
              <RecoveryState
                message={error}
                onRetry={() => {
                  setError(null);
                  setReload((n) => n + 1);
                }}
              />
            )
            : (
              <View
                style={{ alignItems: "center", gap: 12, paddingVertical: 16 }}
              >
                <ActivityIndicator color={t.colors.accD} />
                <Text style={{ color: t.colors.ink2, fontSize: 14 }}>
                  Loading your focus…
                </Text>
              </View>
            )}
        </Card>
        {error && loaded
          ? (
            <RecoveryState
              message={error}
              disabled={busy}
              onRetry={() => void save()}
            />
          )
          : null}
        {loaded
          ? (
            <Pill
              style={{ alignSelf: "stretch" }}
              onPress={() => void save()}
              disabled={busy || !dirty}
            >
              {busy ? "Saving…" : "Save"}
            </Pill>
          )
          : null}
      </Screen>
      {focused
        ? (
          <FocusFormatToolbar
            disabled={busy}
            selected={format}
            onCommand={(command) => editor.current?.command(command)}
          />
        )
        : <View style={{ height: insets.bottom }} />}
    </KeyboardAvoidingView>
  );
}
