import { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/design/text";
import { hairline, useTheme } from "@/design/theme";
import { Icon, Pill } from "@/design/ui";
import { ASK_MAX_CHARS, type Draft } from "@/lib/ask-model";

const parts = ["opening", "body", "closing"] as const;

export function NoteDraftEditor({ initialTitle, initialDraft, saving, failed, canRevise, onClose, onSave, onRevise }: {
  initialTitle: string;
  initialDraft: Draft;
  saving: boolean;
  failed: boolean;
  canRevise: boolean;
  onClose: () => void;
  onSave: (title: string, draft: Draft) => void;
  onRevise: (message: string) => void;
}) {
  const t = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialDraft);
  const [selection, setSelection] = useState("");
  const [quote, setQuote] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const hasBody = parts.some(part => draft[part].trim());
  const close = () => {
    if (saving) return;
    if (title === initialTitle && parts.every(part => draft[part] === initialDraft[part]) && !comment.trim()) return onClose();
    Alert.alert("Discard draft edits?", "The original draft stays in your conversation.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard edits", style: "destructive", onPress: onClose },
    ]);
  };
  const revise = () => {
    const passage = quote ? '\nSelected passage: ' + quote : "";
    const body = parts.map(part => draft[part]).filter(Boolean).join("\n\n");
    onRevise('Revise this draft: ' + comment.trim() + passage + '\n\nDraft: ' + title + '\n' + body);
  };
  return (
    <Modal visible presentationStyle="pageSheet" animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.colors.card }}
        onLayout={e => e.currentTarget.measureInWindow((_x, y) => setKeyboardOffset(y))}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={keyboardOffset} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close draft" disabled={saving} onPress={close}
              style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: t.colors.soft, opacity: pressed ? 0.65 : 1 })}>
              <Icon name="x" s={20} c={t.colors.ink} />
            </Pressable>
            <View pointerEvents="none" style={{ position: "absolute", left: 88, right: 88, alignItems: "center" }}>
              <Text accessibilityRole="header" style={{ color: t.colors.ink, fontSize: 17, fontWeight: "600" }}>Note draft</Text>
            </View>
            <Pill disabled={saving || !title.trim() || !hasBody || quote !== null} onPress={() => onSave(title.trim(), draft)}>{saving ? "Saving…" : "Save"}</Pill>
          </View>
          {failed && <Text accessibilityRole="alert" style={{ paddingHorizontal: 20, color: t.colors.warn }}>Couldn’t save. Your edits are here. Tap Save to retry.</Text>}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: t.padc, paddingTop: 12, paddingBottom: 32, gap: 14 }}>
            <TextInput accessibilityLabel="Note title" value={title} editable={!saving && quote === null} maxLength={80}
              onChangeText={setTitle} placeholder="Note title" placeholderTextColor={t.colors.ink3}
              style={{ color: t.colors.ink, fontSize: 26, fontWeight: "600", padding: 0 }} />
            {parts.filter(part => initialDraft[part] || part === "body").map(part => (
              <TextInput key={part} accessibilityLabel={part + " paragraph"} multiline scrollEnabled={false}
                editable={!saving && quote === null} value={draft[part]} maxLength={2000}
                onChangeText={value => { setDraft(current => ({ ...current, [part]: value })); setSelection(""); }}
                onFocus={() => setSelection("")}
                onSelectionChange={({ nativeEvent: { selection: range } }) => setSelection(draft[part].slice(range.start, range.end))}
                placeholder="Write a paragraph" placeholderTextColor={t.colors.ink3}
                style={{ padding: 0, color: t.colors.ink, fontSize: 17, lineHeight: 26, minHeight: 32, textAlignVertical: "top" }} />
            ))}
          </ScrollView>
          <View style={{ borderTopWidth: hairline, borderColor: t.colors.sep, paddingHorizontal: t.padc, paddingTop: 10, paddingBottom: 16, gap: 10 }}>
            {quote === null ? (
              <Pill tone="soft" icon="chat" disabled={!canRevise || saving || !hasBody} onPress={() => setQuote(selection)} style={{ alignSelf: "stretch" }}>
                {selection ? "Comment on selection" : "Comment on draft"}
              </Pill>
            ) : (
              <>
                {quote ? <Text numberOfLines={2} style={{ color: t.colors.ink2 }}>“{quote}”</Text> : null}
                <TextInput autoFocus multiline accessibilityLabel="Draft feedback" placeholder="What should change?"
                  placeholderTextColor={t.colors.ink3} value={comment} maxLength={ASK_MAX_CHARS} onChangeText={setComment}
                  style={{ color: t.colors.ink, fontSize: 16, minHeight: 44, maxHeight: 100 }} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pill full tone="tint" onPress={() => setQuote(null)}>Back</Pill>
                  <Pill full disabled={!canRevise || !comment.trim()} onPress={revise}>Revise in Ask</Pill>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
