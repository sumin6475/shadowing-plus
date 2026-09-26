// picker-sheet.tsx — the one way to choose from a list that grows.
//
// Chip grids do not survive their own data. They wrap unpredictably, so the
// sheet's height moves with its contents; long titles get clipped mid-word;
// a horizontal chip rail inside a vertical sheet gives no sign that anything
// is off-screen; and there is nowhere to put a search field. Studio hit all
// four at once — and its phrase picker had quietly capped itself at ten.
//
// So: rows, sections, and a search field that appears once the list is long
// enough to need one. Lifted from the Add-to-a-story sheet in practice.tsx,
// which already worked this way.
import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/design/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hairline, useTheme } from "@/design/theme";
import { Icon, Serif } from "@/design/ui";

export interface PickerRow {
  id: string;
  label: string;
  /** Second line — the topic a situation belongs to, a phrase's gloss. */
  sublabel?: string | null;
}

export interface PickerSection {
  key: string;
  /** Omit on a single unlabelled section. */
  title?: string;
  rows: PickerRow[];
}

/** Below this the list fits on screen and a search field is just noise. */
const SEARCH_THRESHOLD = 8;

export function PickerSheet(props: PickerSheetProps) {
  // The body is mounted only while the sheet is open, so its search query
  // starts empty every time. Resetting it from an effect instead would leave a
  // stale query silently hiding most of the list on the next open, for one
  // render, and the compiler lints the synchronous setState besides.
  return (
    <Modal visible={props.open} transparent animationType="slide" statusBarTranslucent onRequestClose={props.onClose}>
      {props.open ? <PickerBody {...props} /> : null}
    </Modal>
  );
}

interface PickerSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** null while loading. */
  sections: PickerSection[] | null;
  selectedIds: string[];
  /** Multi-select keeps the sheet open and shows a check per row. */
  multiple?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Return the row's label for creating `query`, or null to offer nothing. */
  createLabel?: (query: string) => string | null;
  onCreate?: (query: string) => void | Promise<void>;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Row currently being written; shows a spinner and dims the rest. */
  busyId?: string | null;
}

function PickerBody({
  title,
  subtitle,
  sections,
  selectedIds,
  multiple = false,
  searchPlaceholder = "Search",
  emptyLabel = "Nothing here yet.",
  createLabel,
  onCreate,
  onSelect,
  onClose,
  busyId,
}: PickerSheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const total = useMemo(
    () => (sections ?? []).reduce((sum, section) => sum + section.rows.length, 0),
    [sections],
  );
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!sections) return null;
    if (!needle) return sections;
    return sections
      .map((section) => ({
        ...section,
        rows: section.rows.filter(
          (row) =>
            row.label.toLowerCase().includes(needle) ||
            (row.sublabel ?? "").toLowerCase().includes(needle),
        ),
      }))
      .filter((section) => section.rows.length > 0);
  }, [sections, needle]);

  const matches = (filtered ?? []).reduce((sum, section) => sum + section.rows.length, 0);
  // Only when nothing matched. Offering "Create 'Daily'" underneath three rows
  // that already say Daily invites the wrong tap, and the create target is the
  // currently selected topic — not the one those rows belong to.
  const create = needle && matches === 0 && createLabel ? createLabel(q.trim()) : null;
  const selected = new Set(selectedIds);

  const runCreate = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    try {
      await onCreate(q.trim());
      setQ("");
    } finally {
      setCreating(false);
    }
  };

  return (
      <View style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,22,28,0.28)" }]}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View
            style={{
              maxHeight: "92%",
              backgroundColor: t.colors.bg,
              borderTopLeftRadius: 38,
              borderTopRightRadius: 38,
              paddingHorizontal: 22,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 18) + 8,
            }}
          >
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 16 }} />
            <Serif style={{ fontSize: 22, color: t.colors.ink, textAlign: "center" }}>{title}</Serif>
            {subtitle ? (
              <Text style={{ fontSize: 13.5, lineHeight: 19, color: t.colors.ink3, textAlign: "center", marginTop: 6 }}>{subtitle}</Text>
            ) : null}

            {total > SEARCH_THRESHOLD || needle ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  backgroundColor: t.colors.card,
                  borderRadius: 999,
                  height: 42,
                  paddingHorizontal: 15,
                  marginTop: 14,
                  borderWidth: 0.5,
                  borderColor: t.ring,
                }}
              >
                <Icon name="search" s={16} c={t.colors.ink3} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={t.colors.ink3}
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={{ flex: 1, minWidth: 0, paddingVertical: 0, fontSize: 15, color: t.colors.ink }}
                />
                {q ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQ("")} hitSlop={8}>
                    <Icon name="x" s={14} w={2.2} c={t.colors.ink3} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {sections === null ? (
                <View style={{ paddingVertical: 28, alignItems: "center" }}>
                  <ActivityIndicator color={t.colors.acc} />
                </View>
              ) : matches === 0 && !create ? (
                <Text style={{ fontSize: 13.5, lineHeight: 20, color: t.colors.ink3, textAlign: "center", paddingVertical: 24 }}>
                  {needle ? "No match." : emptyLabel}
                </Text>
              ) : (
                (filtered ?? []).map((section) => (
                  <View key={section.key}>
                    {section.title ? (
                      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, marginTop: 12, marginBottom: 4 }}>
                        {section.title}
                      </Text>
                    ) : null}
                    {section.rows.map((row, index) => {
                      const on = selected.has(row.id);
                      return (
                        <Pressable
                          key={row.id}
                          accessibilityRole={multiple ? "checkbox" : "radio"}
                          accessibilityState={{ selected: on, checked: on }}
                          onPress={() => onSelect(row.id)}
                          disabled={Boolean(busyId)}
                          style={({ pressed }) => ({
                            minHeight: 52,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingHorizontal: 4,
                            borderTopWidth: index ? hairline : 0,
                            borderTopColor: t.colors.sep,
                            backgroundColor: pressed ? t.colors.soft : "transparent",
                            opacity: busyId && busyId !== row.id ? 0.5 : 1,
                          })}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: on ? "700" : "600", color: t.colors.ink }} numberOfLines={2}>
                              {row.label}
                            </Text>
                            {row.sublabel ? (
                              <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 2 }} numberOfLines={1}>
                                {row.sublabel}
                              </Text>
                            ) : null}
                          </View>
                          {busyId === row.id ? (
                            <ActivityIndicator color={t.colors.acc} />
                          ) : on ? (
                            <Icon name="check" s={17} w={2.6} c={t.colors.accD} />
                          ) : multiple ? (
                            <Icon name="plus" s={16} w={2.2} c={t.colors.ink3} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))
              )}

              {create ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void runCreate()}
                  disabled={creating}
                  style={({ pressed }) => ({
                    minHeight: 52,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 4,
                    marginTop: 8,
                    borderTopWidth: hairline,
                    borderTopColor: t.colors.sep,
                    backgroundColor: pressed ? t.colors.soft : "transparent",
                    opacity: creating ? 0.6 : 1,
                  })}
                >
                  {creating ? <ActivityIndicator color={t.colors.acc} /> : <Icon name="plus" s={16} w={2.4} c={t.colors.accD} />}
                  <Text style={{ flex: 1, fontSize: 15.5, fontWeight: "600", color: t.colors.accD }} numberOfLines={2}>
                    {create}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({ minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 6, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: multiple ? t.colors.accD : t.colors.ink2 }}>
                {multiple ? "Done" : "Cancel"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
  );
}
