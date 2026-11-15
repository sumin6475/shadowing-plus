import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/design/text";
import { SERIF, useTheme } from "@/design/theme";
import { Pill } from "@/design/ui";
import type { SavedPhraseMatch } from "@/lib/phrase-duplicates";

export interface PhraseSaveReview {
  text: string;
  matches: SavedPhraseMatch[];
}

export function PhraseSaveReviewSheet({ review, onConfirm, onEdit, onDismiss }: {
  review: PhraseSaveReview | null;
  onConfirm: () => void;
  onEdit: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const exact = review?.matches[0]?.match === "exact";
  return (
    <Modal visible={Boolean(review)} transparent animationType="slide" statusBarTranslucent onRequestClose={onEdit} onDismiss={onDismiss}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,22,28,0.3)" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Return to editing the phrase" onPress={onEdit} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ maxHeight: "80%", backgroundColor: t.colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 18) + 12 }}>
          <View style={{ width: 34, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: t.colors.soft, marginBottom: 22 }} />
          <Text accessibilityRole="header" style={{ fontSize: 21, lineHeight: 27, fontWeight: "600", color: t.colors.ink, marginBottom: 20 }}>
            {exact ? "This phrase is already saved" : "A similar phrase is saved"}
          </Text>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.8, color: t.colors.ink2, marginBottom: 8 }}>YOU’RE SAVING</Text>
              <Text style={{ fontFamily: SERIF, fontSize: 27, lineHeight: 33, color: t.colors.ink }}>{review?.text}</Text>
            </View>
            {review?.matches.map(item => (
              <View key={item.id} style={{ backgroundColor: t.colors.bg, borderRadius: 18, padding: 16, gap: 7 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 0.8, color: t.colors.ink2 }}>ALREADY IN YOUR PHRASES</Text>
                <Text style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 32, color: t.colors.ink }}>{item.text}</Text>
                {item.meaning ? <Text style={{ fontSize: 14, lineHeight: 20, color: t.colors.ink2 }}>{item.meaning}</Text> : null}
                {item.source ? <Text style={{ fontSize: 12, color: t.colors.ink2 }}>{item.source}</Text> : null}
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
            <Pill tone="card" full onPress={onEdit} style={{ paddingHorizontal: 10 }} textStyle={{ fontSize: 15 }}>Edit phrase</Pill>
            <Pill full onPress={onConfirm} style={{ paddingHorizontal: 10 }} textStyle={{ fontSize: 15 }}>{exact ? "Use saved" : "Save anyway"}</Pill>
          </View>
        </View>
      </View>
    </Modal>
  );
}
