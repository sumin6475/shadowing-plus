import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/design/theme";
import { BackBar, Card, Chip, Hero, Icon, Pill, Screen, Serif } from "@/design/ui";
import { extractPhraseFromImage } from "@/lib/phrase-capture";
import { createPhrase, type PhraseKind } from "@/lib/phrases";
import { fetchAllStories, type StoryChoice } from "@/lib/speaking-world";
import type { Nav } from "./nav";

type CaptureSource = "manual" | "paste" | "image_ocr";
type Stage = "choose" | "edit" | "saved";

const KINDS: { value: PhraseKind; label: string }[] = [
  { value: "phrase", label: "Expression" },
  { value: "phrasal_verb", label: "Phrasal verb" },
  { value: "pattern", label: "Pattern" },
  { value: "idiom", label: "Idiom" },
  { value: "word", label: "Word" },
];

export function CaptureFab({ nav, aboveTabs }: { nav: Nav; aboveTabs: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a phrase"
      onPress={() => nav.push("capture")}
      style={[
        {
          position: "absolute",
          right: 18,
          bottom: aboveTabs ? Math.max(insets.bottom, 12) + 76 : Math.max(insets.bottom, 12) + 12,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: t.colors.acc,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.75)",
        },
        t.shadowLg,
      ]}
    >
      <Icon name="plus" s={24} w={2.4} c="#fff" />
    </Pressable>
  );
}

export function PhraseCaptureScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [stage, setStage] = useState<Stage>("choose");
  const [source, setSource] = useState<CaptureSource>("manual");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [meaning, setMeaning] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [kind, setKind] = useState<PhraseKind>("phrase");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [confidence, setConfidence] = useState<number | null>(null);
  const [stories, setStories] = useState<StoryChoice[]>([]);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storiesError, setStoriesError] = useState(false);

  const loadStories = useCallback(async () => {
    setStoriesLoading(true);
    setStoriesError(false);
    try {
      setStories(await fetchAllStories());
    } catch {
      setStoriesError(true);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  // A started-but-unsaved draft. Used to guard the back button and to decide
  // whether re-entering the editor needs a clean slate.
  const hasDraft = () => Boolean(text.trim() || context.trim() || meaning.trim() || usageNote.trim());

  const resetDraft = () => {
    setText("");
    setContext("");
    setMeaning("");
    setUsageNote("");
    setSourceLabel("");
    setKind("phrase");
    setSelection({ start: 0, end: 0 });
    setConfidence(null);
    setImageUri(null);
    setStoryId(null);
    setError(null);
  };

  // Every capture method starts fresh — no leftover fields from a prior draft.
  const openEditor = (nextSource: CaptureSource) => {
    resetDraft();
    setSource(nextSource);
    setStage("edit");
  };

  // Leaving the editor with unsaved input asks first, then discards the draft.
  const leaveEditor = () => {
    if (!hasDraft()) {
      resetDraft();
      setStage("choose");
      return;
    }
    Alert.alert(
      "Leave without saving?",
      "This phrase draft won’t be saved.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => { resetDraft(); setStage("choose"); } },
      ],
    );
  };

  const pickScreenshot = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    resetDraft();
    setImageUri(asset.uri);
    setSource("image_ocr");
    setStage("edit");
    setReading(true);
    try {
      const manipulator = ImageManipulator.ImageManipulator.manipulate(asset.uri);
      if (asset.width > 1600) manipulator.resize({ width: 1600, height: null });
      const rendered = await manipulator.renderAsync();
      const compact = await rendered.saveAsync({
        base64: true,
        compress: 0.78,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      if (!compact.base64) throw new Error("Couldn’t prepare this screenshot.");
      const draft = await extractPhraseFromImage(compact.base64);
      setContext(draft.contextText);
      setText(draft.suggestedPhrase);
      setKind(draft.kind);
      setMeaning(draft.meaning);
      setUsageNote(draft.usageNote);
      setConfidence(draft.confidence);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t read this screenshot.");
    } finally {
      setReading(false);
    }
  };

  const useSelectedText = () => {
    const selected = context.slice(selection.start, selection.end).replace(/\s+/g, " ").trim();
    if (selected) setText(selected);
  };

  const save = async () => {
    if (!text.trim()) {
      setError("Choose or type the expression you want to keep.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await createPhrase({
        text,
        meaning,
        usageNote,
        kind,
        context,
        source,
        sourceLabel,
        ocrConfidence: confidence,
        storyId,
      });
      if (saved.result === "already") Alert.alert("Already saved", "This expression is already in your Phrase Bank.");
      setStage("saved");
    } catch {
      setError("Couldn’t save this phrase. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (stage === "saved") {
    return (
      <Screen bottomPad={40}>
        <BackBar title="Add a phrase" onBack={nav.pop} />
        <Hero style={{ alignItems: "center", paddingVertical: 34 }}>
          <Icon name="check" s={30} w={2.5} c="#fff" />
          <Serif style={{ fontSize: 26, lineHeight: 34, color: "#fff", textAlign: "center", marginTop: 12 }}>{text}</Serif>
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.82)", textAlign: "center", marginTop: 8 }}>Saved to your Phrase Bank.</Text>
        </Hero>
        <Pill full onPress={nav.pop}>Done</Pill>
        {source === "image_ocr" ? (
          <Pill tone="tint" full onPress={() => {
            setText("");
            setMeaning("");
            setUsageNote("");
            setStage("edit");
          }}>
            Save another from this screenshot
          </Pill>
        ) : null}
      </Screen>
    );
  }

  if (stage === "choose") {
    return (
      <Screen bottomPad={40}>
        <BackBar title="Add a phrase" onBack={nav.pop} />
        <View style={{ paddingVertical: 8 }}>
          <Serif style={{ fontSize: 32, lineHeight: 39, color: t.colors.ink }}>Keep useful English{"\n"}from anywhere.</Serif>
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink3, marginTop: 9 }}>Capture the expression and the context where you found it.</Text>
        </View>
        <Card onPress={pickScreenshot} lg style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
            <Icon name="upload" s={22} c={t.colors.accD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Add from screenshot</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3, marginTop: 3 }}>We’ll extract the text. You choose what to keep.</Text>
          </View>
          <Icon name="chev" s={15} c={t.colors.ink3} />
        </Card>
        <Text style={{ fontSize: 12.5, color: t.colors.ink3, lineHeight: 18, paddingHorizontal: 4 }}>The screenshot is processed for this capture and isn’t stored by Shadowing+.</Text>
        <Card onPress={() => openEditor("paste")} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Icon name="text" s={22} c={t.colors.accD} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }}>Paste text</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>Paste a sentence, then select the expression.</Text>
          </View>
          <Icon name="chev" s={15} c={t.colors.ink3} />
        </Card>
        <Card onPress={() => openEditor("manual")} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Icon name="pen" s={22} c={t.colors.accD} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }}>Type a phrase</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>Add one you already have in mind.</Text>
          </View>
          <Icon name="chev" s={15} c={t.colors.ink3} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen bottomPad={54}>
      <BackBar title={source === "image_ocr" ? "From screenshot" : "Add a phrase"} onBack={leaveEditor} />
      {imageUri ? <Image source={{ uri: imageUri }} style={{ width: "100%", height: 210, borderRadius: 24, backgroundColor: t.colors.soft }} contentFit="contain" /> : null}
      {reading ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator color={t.colors.acc} />
          <Text style={{ fontSize: 13.5, color: t.colors.ink2, marginTop: 10 }}>Reading the visible text…</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>EXAMPLE / CONTEXT</Text>
        <TextInput
          value={context}
          onChangeText={setContext}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          multiline
          placeholder="Paste the sentence or context where you found it."
          placeholderTextColor={t.colors.ink3}
          style={{ minHeight: 92, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8, padding: 0 }}
        />
        {selection.end > selection.start ? (
          <Pill tone="tint" small onPress={useSelectedText} style={{ marginTop: 9 }}>Use selected words</Pill>
        ) : (
          <Text style={{ fontSize: 12, color: t.colors.ink3, marginTop: 8 }}>Select words above to copy them into the phrase field.</Text>
        )}
      </Card>

      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>PHRASE TO KEEP</Text>
        <TextInput value={text} onChangeText={setText} placeholder="e.g. take the plunge" placeholderTextColor={t.colors.ink3} style={{ fontSize: 20, fontFamily: "Newsreader", color: t.colors.ink, marginTop: 9, padding: 0 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 14 }}>
          {KINDS.map((item) => <Chip key={item.value} active={kind === item.value} onPress={() => setKind(item.value)}>{item.label}</Chip>)}
        </ScrollView>
      </Card>

      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>MEANING</Text>
        <TextInput value={meaning} onChangeText={setMeaning} placeholder="What it means to you" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, color: t.colors.ink, marginTop: 8, padding: 0 }} />
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 18 }}>USAGE NOTE</Text>
        <TextInput value={usageNote} onChangeText={setUsageNote} multiline placeholder="When or how you’d use it" placeholderTextColor={t.colors.ink3} style={{ minHeight: 46, fontSize: 15, lineHeight: 21, color: t.colors.ink, marginTop: 8, padding: 0 }} />
      </Card>

      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>WHERE IT BELONGS</Text>
        <TextInput value={sourceLabel} onChangeText={setSourceLabel} placeholder="Source name (optional)" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, color: t.colors.ink, marginTop: 9, padding: 0 }} />
        {storiesLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 14 }}>
            <ActivityIndicator size="small" color={t.colors.acc} />
            <Text style={{ fontSize: 12.5, color: t.colors.ink3 }}>Loading your stories…</Text>
          </View>
        ) : storiesError ? (
          <View style={{ paddingTop: 14, alignItems: "flex-start" }}>
            <Text style={{ fontSize: 12.5, lineHeight: 18, color: t.colors.ink3 }}>Couldn’t load your stories. You can still save this phrase without linking it.</Text>
            <Pill tone="tint" small onPress={loadStories} style={{ marginTop: 9 }}>Retry stories</Pill>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 14 }}>
              <Chip active={!storyId} onPress={() => setStoryId(null)}>Not linked yet</Chip>
              {stories.map((story) => <Chip key={story.id} active={storyId === story.id} onPress={() => setStoryId(story.id)}>{story.domainName ? `${story.domainName} · ${story.title}` : story.title}</Chip>)}
            </ScrollView>
            {stories.length === 0 ? <Text style={{ fontSize: 12.5, lineHeight: 18, color: t.colors.ink3, marginTop: 9 }}>No stories yet. You can link this phrase later.</Text> : null}
          </>
        )}
      </Card>

      {confidence != null && confidence < 0.7 ? <Text style={{ fontSize: 12.5, color: t.colors.ink3, lineHeight: 18 }}>The screenshot was hard to read. Check the extracted text before saving.</Text> : null}
      {error ? <Text style={{ fontSize: 13, color: "#E5484D", textAlign: "center" }}>{error}</Text> : null}
      <Pill full icon="bank" onPress={reading || saving ? undefined : save} style={{ opacity: reading || saving ? 0.6 : 1 }}>
        {saving ? <ActivityIndicator color="#fff" /> : "Save to Phrase Bank"}
      </Pill>
    </Screen>
  );
}
