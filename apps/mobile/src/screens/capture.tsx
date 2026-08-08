import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, InteractionManager, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/design/theme";
import { BackBar, Card, Chip, Icon, Pill, Screen } from "@/design/ui";
import { extractPhraseFromImage, extractPhraseFromText, fillPhraseDetails, type PhraseCaptureDraft } from "@/lib/phrase-capture";
import { createPhrase, fetchPhrasesForCaptureContext, updatePhraseDetails, type PhraseKind } from "@/lib/phrases";
import { fetchAllStories, type StoryChoice } from "@/lib/speaking-world";
import type { Nav } from "./nav";

export interface CaptureImageAsset {
  uri: string;
  width: number;
  height: number;
  origin: "camera" | "library";
}

const KINDS: { value: PhraseKind; label: string }[] = [
  { value: "phrase", label: "Expression" },
  { value: "phrasal_verb", label: "Phrasal verb" },
  { value: "pattern", label: "Pattern" },
  { value: "idiom", label: "Idiom" },
  { value: "word", label: "Word" },
];

interface SavedCapturePhrase {
  id: string;
  text: string;
  kind: PhraseKind;
  meaning: string;
  usageNote: string;
  result: "saved" | "already";
}

export function CaptureFab({ nav, aboveTabs }: { nav: Nav; aboveTabs: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [pendingImageOrigin, setPendingImageOrigin] = useState<CaptureImageAsset["origin"] | null>(null);
  const fabBottom = aboveTabs ? Math.max(insets.bottom, 12) + 76 : Math.max(insets.bottom, 12) + 12;

  const launchImagePicker = async (origin: CaptureImageAsset["origin"]) => {
    try {
      if (origin === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Camera access needed",
            "Allow camera access to capture English from a book, screen, or anything around you.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => void Linking.openSettings() },
            ],
          );
          return;
        }
      }

      const result = origin === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], cameraType: ImagePicker.CameraType.back, allowsEditing: false, quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      nav.push("capture", { imageAsset: { uri: asset.uri, width: asset.width, height: asset.height, origin } satisfies CaptureImageAsset });
    } catch {
      Alert.alert("Couldn’t open that photo", "Try again, or use Write or Paste Text instead.");
    } finally {
      setLaunching(false);
    }
  };

  const chooseImage = (origin: CaptureImageAsset["origin"]) => {
    if (launching) return;
    setLaunching(true);
    setOpen(false);
    if (Platform.OS === "ios") {
      // iOS cannot reliably present PHPicker while this React Native Modal is
      // still dismissing. Wait for onDismiss before opening the native picker.
      setPendingImageOrigin(origin);
      return;
    }
    InteractionManager.runAfterInteractions(() => void launchImagePicker(origin));
  };

  const launchPendingImagePicker = () => {
    if (!pendingImageOrigin) return;
    const origin = pendingImageOrigin;
    setPendingImageOrigin(null);
    void launchImagePicker(origin);
  };

  const menuItem = (icon: "camera" | "photo" | "text", label: string, onPress: () => void, last = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.sep,
        backgroundColor: pressed ? t.colors.soft : "transparent",
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} s={18} c={t.colors.accD} />
      </View>
      <Text style={{ fontSize: 15.5, fontWeight: "600", color: t.colors.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onDismiss={launchPendingImagePicker} onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.08)" }} onPress={() => setOpen(false)}>
          <View
            style={[
              {
                position: "absolute",
                right: 18,
                bottom: fabBottom + 64,
                width: 250,
                overflow: "hidden",
                borderRadius: 23,
                backgroundColor: t.colors.card,
                borderWidth: 1,
                borderColor: t.ring,
              },
              t.shadowLg,
            ]}
          >
            {menuItem("camera", "Take a Photo", () => chooseImage("camera"))}
            {menuItem("photo", "Choose from Photos", () => chooseImage("library"))}
            {menuItem("text", "Write or Paste Text", () => {
              setOpen(false);
              nav.push("capture");
            }, true)}
          </View>
        </Pressable>
      </Modal>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? "Close add phrase menu" : "Add a phrase"}
        onPress={launching ? undefined : () => setOpen((value) => !value)}
        style={[
          {
            position: "absolute",
            right: 18,
            bottom: fabBottom,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: t.colors.acc,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.75)",
            opacity: launching ? 0.65 : 1,
          },
          t.shadowLg,
        ]}
      >
        {launching ? <ActivityIndicator color="#fff" /> : <Icon name={open ? "x" : "plus"} s={24} w={2.4} c="#fff" />}
      </Pressable>
    </>
  );
}

export function PhraseCaptureScreen({ nav, imageAsset }: { nav: Nav; imageAsset?: CaptureImageAsset }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const contextInputRef = useRef<TextInput>(null);
  const processedImageRef = useRef(false);
  const contextLookupRef = useRef(0);
  const [imageUri, setImageUri] = useState<string | null>(imageAsset?.uri ?? null);
  const [reading, setReading] = useState(Boolean(imageAsset));
  const [filling, setFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [contextTranslation, setContextTranslation] = useState("");
  const [textSource, setTextSource] = useState<"manual" | "paste">("manual");
  const [meaning, setMeaning] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [kind, setKind] = useState<PhraseKind>("phrase");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detailedPhrase, setDetailedPhrase] = useState("");
  const [stories, setStories] = useState<StoryChoice[]>([]);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storiesError, setStoriesError] = useState(false);
  const [savedPhrases, setSavedPhrases] = useState<SavedCapturePhrase[]>([]);
  const [savePrompt, setSavePrompt] = useState<SavedCapturePhrase | null>(null);
  const [selectedSaved, setSelectedSaved] = useState<SavedCapturePhrase | null>(null);
  const [editingSaved, setEditingSaved] = useState(false);
  const [savedEditText, setSavedEditText] = useState("");
  const [savedEditKind, setSavedEditKind] = useState<PhraseKind>("phrase");
  const [savedEditMeaning, setSavedEditMeaning] = useState("");
  const [savedEditNote, setSavedEditNote] = useState("");
  const [savedEditError, setSavedEditError] = useState<string | null>(null);
  const [savingSavedEdit, setSavingSavedEdit] = useState(false);

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

  const applyDraft = useCallback((draft: PhraseCaptureDraft, replaceContext: boolean) => {
    if (replaceContext) setContext(draft.contextText);
    setContextTranslation(draft.contextTranslation);
    setText(draft.suggestedPhrase);
    setKind(draft.kind);
    setMeaning(draft.meaning);
    setUsageNote(draft.usageNote);
    setConfidence(draft.confidence);
    setDetailedPhrase(draft.suggestedPhrase);
  }, []);

  const hydrateSavedPhrases = useCallback(async (contextText: string) => {
    const lookup = contextLookupRef.current + 1;
    contextLookupRef.current = lookup;
    try {
      const found = await fetchPhrasesForCaptureContext(contextText);
      if (contextLookupRef.current !== lookup) return;
      setSavedPhrases(found.map((phrase) => ({ ...phrase, result: "saved" })));
    } catch {
      // Phrase capture remains usable if context history cannot be restored.
      // Keep any in-memory chips instead of turning a read failure into loss.
    }
  }, []);

  const readImageAsset = useCallback(async (asset: CaptureImageAsset) => {
    setImageUri(asset.uri);
    setReading(true);
    setError(null);
    try {
      const manipulator = ImageManipulator.ImageManipulator.manipulate(asset.uri);
      if (asset.width > 1600) manipulator.resize({ width: 1600, height: null });
      const rendered = await manipulator.renderAsync();
      const compact = await rendered.saveAsync({ base64: true, compress: 0.78, format: ImageManipulator.SaveFormat.JPEG });
      if (!compact.base64) throw new Error("Couldn’t prepare this photo.");
      const draft = await extractPhraseFromImage(compact.base64);
      applyDraft(draft, true);
      await hydrateSavedPhrases(draft.contextText);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t read this photo.");
    } finally {
      setReading(false);
    }
  }, [applyDraft, hydrateSavedPhrases]);

  useEffect(() => {
    if (!imageAsset || processedImageRef.current) return;
    processedImageRef.current = true;
    void readImageAsset(imageAsset);
  }, [imageAsset, readImageAsset]);

  const hasDraft = () => savedPhrases.length > 0
    ? Boolean(text.trim() || meaning.trim() || usageNote.trim())
    : Boolean(imageUri || text.trim() || context.trim() || meaning.trim() || usageNote.trim());

  const leaveEditor = () => {
    if (!hasDraft()) {
      nav.pop();
      return;
    }
    Alert.alert(
      "Leave without saving?",
      "This phrase draft won’t be saved.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: nav.pop },
      ],
    );
  };

  const pasteText = async () => {
    const value = (await Clipboard.getStringAsync()).trim();
    if (!value) {
      setError("There isn’t any text to paste.");
      return;
    }
    setContext(value);
    setContextTranslation("");
    contextLookupRef.current += 1;
    setSavedPhrases([]);
    setTextSource("paste");
    setSelection({ start: 0, end: 0 });
    setError(null);
    requestAnimationFrame(() => contextInputRef.current?.focus());
  };

  const acceptPaste = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setContext(clean);
    setContextTranslation("");
    contextLookupRef.current += 1;
    setSavedPhrases([]);
    setTextSource("paste");
    setSelection({ start: 0, end: 0 });
    setError(null);
  };

  const fillFromContext = async () => {
    const input = context.trim();
    if (!input) {
      setError("Paste or type some context first.");
      return;
    }
    setFilling(true);
    setError(null);
    try {
      const draft = await extractPhraseFromText(input);
      if (!draft.suggestedPhrase) throw new Error("We couldn’t find a phrase to suggest. Select words above or type one yourself.");
      applyDraft(draft, false);
      await hydrateSavedPhrases(draft.contextText || input);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t fill this phrase right now.");
    } finally {
      setFilling(false);
    }
  };

  const useSelectedText = () => {
    const selected = context.slice(selection.start, selection.end).replace(/\s+/g, " ").trim();
    if (selected) setText(selected);
  };

  const fillCurrentPhraseDetails = async () => {
    const phrase = text.trim();
    if (!phrase) {
      setError("Type the phrase you want help with first.");
      return;
    }
    setFilling(true);
    setError(null);
    try {
      const draft = await fillPhraseDetails(phrase, context.trim());
      setKind(draft.kind);
      setMeaning(draft.meaning);
      setUsageNote(draft.usageNote);
      setDetailedPhrase(phrase);
      if (draft.contextTranslation) setContextTranslation(draft.contextTranslation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t fill these details right now.");
    } finally {
      setFilling(false);
    }
  };

  const resetPhraseFields = () => {
    setText("");
    setMeaning("");
    setUsageNote("");
    setKind("phrase");
    setDetailedPhrase("");
    setSelection({ start: 0, end: 0 });
    setError(null);
  };

  const acceptReplacementImage = (asset: CaptureImageAsset) => {
    const replace = () => {
      setSavedPhrases([]);
      contextLookupRef.current += 1;
      setSavePrompt(null);
      setSelectedSaved(null);
      setContext("");
      setContextTranslation("");
      setConfidence(null);
      resetPhraseFields();
      void readImageAsset(asset);
    };

    if (savedPhrases.length === 0) {
      replace();
      return;
    }
    Alert.alert(
      "Start from a different photo?",
      "The phrases you already saved will stay in your Phrase Bank. This screen will reset for the new photo.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Use new photo", style: "destructive", onPress: replace },
      ],
    );
  };

  const replaceImage = async (origin: CaptureImageAsset["origin"]) => {
    if (reading) return;
    try {
      if (origin === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Camera access needed",
            "Allow camera access to take another photo.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => void Linking.openSettings() },
            ],
          );
          return;
        }
      }
      const result = origin === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], cameraType: ImagePicker.CameraType.back, allowsEditing: false, quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      acceptReplacementImage({ uri: asset.uri, width: asset.width, height: asset.height, origin });
    } catch {
      Alert.alert("Couldn’t open that photo", "Try taking or choosing the photo again.");
    }
  };

  const keepCapturing = () => {
    setSavePrompt(null);
    resetPhraseFields();
    if (context.trim()) void hydrateSavedPhrases(context);
  };

  const openSavedPhrase = (phrase: SavedCapturePhrase) => {
    setSelectedSaved(phrase);
    setEditingSaved(false);
    setSavedEditText(phrase.text);
    setSavedEditKind(phrase.kind);
    setSavedEditMeaning(phrase.meaning);
    setSavedEditNote(phrase.usageNote);
    setSavedEditError(null);
  };

  const saveSavedPhraseEdits = async () => {
    if (!selectedSaved || !savedEditText.trim()) {
      setSavedEditError("Enter a phrase to save.");
      return;
    }
    setSavingSavedEdit(true);
    setSavedEditError(null);
    try {
      await updatePhraseDetails(selectedSaved.id, {
        text: savedEditText,
        kind: savedEditKind,
        meaning: savedEditMeaning,
        usageNote: savedEditNote,
      });
      const updated: SavedCapturePhrase = {
        ...selectedSaved,
        text: savedEditText.replace(/\s+/g, " ").trim(),
        kind: savedEditKind,
        meaning: savedEditMeaning.trim(),
        usageNote: savedEditNote.trim(),
      };
      setSavedPhrases((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedSaved(updated);
      setEditingSaved(false);
    } catch (caught) {
      setSavedEditError(caught instanceof Error ? caught.message : "Couldn’t update this phrase.");
    } finally {
      setSavingSavedEdit(false);
    }
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
        contextTranslation,
        source: imageUri ? "image_ocr" : textSource,
        sourceLabel,
        ocrConfidence: imageUri ? confidence : null,
        storyId,
      });
      const captured: SavedCapturePhrase = {
        id: saved.id,
        text: text.replace(/\s+/g, " ").trim(),
        kind,
        meaning: meaning.trim(),
        usageNote: usageNote.trim(),
        result: saved.result,
      };
      if (saved.result === "saved") {
        setSavedPhrases((current) => {
          const withoutCurrent = current.filter((item) => item.id !== captured.id);
          return [...withoutCurrent, captured];
        });
      }
      setSavePrompt(captured);
    } catch {
      setError("Couldn’t save this phrase. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const showNativePasteButton = Platform.OS === "ios" && Clipboard.isPasteButtonAvailable;
  const canFill = Boolean(context.trim()) && !reading && !filling;
  const phraseNeedsDetails = Boolean(text.trim()) && text.trim().toLocaleLowerCase("en") !== detailedPhrase.trim().toLocaleLowerCase("en");
  const detailButtonLabel = filling
    ? "Filling…"
    : phraseNeedsDetails && Boolean(detailedPhrase)
      ? "Update AI details"
      : meaning.trim() || usageNote.trim()
        ? "Refresh AI details"
        : "Fill details with AI";

  return (
    <>
      <Screen bottomPad={54}>
      <BackBar title={imageUri ? "From photo" : "Add a phrase"} onBack={leaveEditor} />

      {imageUri ? (
        <>
          <Image source={{ uri: imageUri }} style={{ width: "100%", height: 210, borderRadius: 24, backgroundColor: t.colors.soft }} contentFit="contain" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
            <Pill tone="tint" small icon="camera" onPress={reading ? undefined : () => void replaceImage("camera")} style={{ opacity: reading ? 0.5 : 1 }}>
              Take again
            </Pill>
            <Pill tone="tint" small icon="photo" onPress={reading ? undefined : () => void replaceImage("library")} style={{ opacity: reading ? 0.5 : 1 }}>
              Choose another
            </Pill>
          </View>
          <Text style={{ fontSize: 12.5, color: t.colors.ink3, lineHeight: 18, paddingHorizontal: 4 }}>This photo is processed for this capture and isn’t stored by Shadowing+.</Text>
        </>
      ) : null}

      {reading ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator color={t.colors.acc} />
          <Text style={{ fontSize: 13.5, color: t.colors.ink2, marginTop: 10 }}>Reading the visible text…</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>CONTEXT</Text>
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: t.colors.ink3, marginTop: 5 }}>
          {imageUri ? "Check the text we found, then choose what you want to keep." : "Paste or type a sentence, dialogue, or expression. Context is optional if you already know the phrase."}
        </Text>
        <TextInput
          ref={contextInputRef}
          value={context}
          onChangeText={(value) => {
            setContext(value);
            setContextTranslation("");
            contextLookupRef.current += 1;
            setSavedPhrases([]);
            if (error) setError(null);
          }}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          editable={!reading}
          autoFocus={!imageAsset}
          multiline
          placeholder="Paste a sentence, dialogue, or expression…"
          placeholderTextColor={t.colors.ink3}
          style={{ minHeight: 96, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 10, padding: 0 }}
        />

        {contextTranslation ? (
          <View style={{ borderTopWidth: 1, borderTopColor: t.colors.sep, marginTop: 14, paddingTop: 13 }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>CONTEXT TRANSLATION</Text>
            <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 7 }}>{contextTranslation}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 11 }}>
          {!imageUri && showNativePasteButton ? (
            <Clipboard.ClipboardPasteButton
              acceptedContentTypes={["plain-text"]}
              backgroundColor={t.colors.soft}
              foregroundColor={t.colors.ink}
              cornerStyle="capsule"
              displayMode="iconAndLabel"
              onPress={(payload) => {
                if (payload.type === "text") acceptPaste(payload.text);
              }}
              style={{ width: 98, height: 34 }}
            />
          ) : !imageUri ? (
            <Pill tone="tint" small onPress={() => void pasteText()}>Paste</Pill>
          ) : null}

          {!imageUri ? (
            <Pill tone="soft" small icon="sparkle" onPress={canFill ? () => void fillFromContext() : undefined} style={{ opacity: canFill ? 1 : 0.5 }}>
              {filling ? "Filling…" : "Fill from context"}
            </Pill>
          ) : null}

          {selection.end > selection.start ? (
            <Pill tone="tint" small onPress={useSelectedText}>Use selected words</Pill>
          ) : null}
        </View>

        {!imageUri ? <Text style={{ fontSize: 11.5, color: t.colors.ink3, marginTop: 9 }}>AI suggests one phrase and drafts the details. You can edit everything.</Text> : null}
      </Card>

      <Card>
        {savedPhrases.length > 0 ? (
          <>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>SAVED FROM THIS CONTEXT</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 10 }}>
              {savedPhrases.map((phrase) => (
                <Pressable
                  key={phrase.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View saved phrase ${phrase.text}`}
                  onPress={() => openSavedPhrase(phrase)}
                  style={({ pressed }) => ({
                    minHeight: 34,
                    borderRadius: 999,
                    paddingHorizontal: 13,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    backgroundColor: t.colors.accS,
                    opacity: pressed ? 0.78 : 1,
                  })}
                >
                  <Icon name="check" s={14} w={2.5} c={t.colors.accD} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.accD }}>{phrase.text}</Text>
                  <Icon name="chev" s={11} w={2.2} c={t.colors.accD} />
                </Pressable>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: t.colors.sep, marginVertical: 15 }} />
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>NEXT PHRASE TO KEEP</Text>
          </>
        ) : (
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>PHRASE TO KEEP</Text>
        )}
        <TextInput value={text} onChangeText={(value) => { setText(value); if (error) setError(null); }} placeholder="e.g. take the plunge" placeholderTextColor={t.colors.ink3} style={{ fontSize: 20, fontFamily: "Newsreader", color: t.colors.ink, marginTop: 9, padding: 0 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 14 }}>
          {KINDS.map((item) => <Chip key={item.value} active={kind === item.value} onPress={() => setKind(item.value)}>{item.label}</Chip>)}
        </ScrollView>
        <Pill
          tone="soft"
          small
          icon="sparkle"
          onPress={text.trim() && !reading && !filling ? () => void fillCurrentPhraseDetails() : undefined}
          style={{ alignSelf: "flex-start", marginTop: 13, opacity: text.trim() && !reading && !filling ? 1 : 0.5 }}
        >
          {detailButtonLabel}
        </Pill>
        <Text style={{ fontSize: 11.5, lineHeight: 17, color: t.colors.ink3, marginTop: 8 }}>
          {savedPhrases.length > 0 ? "Select another expression above, or type it here." : "Keeps your phrase exactly as written and fills only its learning details."}
        </Text>
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

      {confidence != null && confidence < 0.7 ? <Text style={{ fontSize: 12.5, color: t.colors.ink3, lineHeight: 18 }}>Check the suggested phrase before saving — the source was hard to interpret.</Text> : null}
      {error ? <Text style={{ fontSize: 13, color: "#E5484D", textAlign: "center" }}>{error}</Text> : null}
      <Pill full icon="bank" onPress={reading || filling || saving ? undefined : save} style={{ opacity: reading || filling || saving ? 0.6 : 1 }}>
        {saving ? <ActivityIndicator color="#fff" /> : savedPhrases.length > 0 ? "Save this phrase" : "Save to Phrase Bank"}
      </Pill>
      </Screen>

    <Modal
      visible={Boolean(savePrompt)}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={keepCapturing}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.28)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: 38,
            borderTopRightRadius: 38,
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 18) + 12,
            alignItems: "center",
          }}
        >
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.soft, marginBottom: 20 }} />
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" s={21} w={2.6} c="#fff" />
          </View>
          <Text style={{ fontSize: 21, lineHeight: 28, fontWeight: "700", color: t.colors.ink, textAlign: "center", marginTop: 14 }}>
            “{savePrompt?.text}” {savePrompt?.result === "already" ? "is already saved" : "saved"}
          </Text>
          <Text style={{ fontSize: 15, color: t.colors.ink2, textAlign: "center", marginTop: 7, marginBottom: 20 }}>Keep going with this context?</Text>
          <Pill onPress={keepCapturing} style={{ width: "100%", alignSelf: "stretch" }}>Save another</Pill>
          <Pill tone="ghost" onPress={() => { setSavePrompt(null); nav.pop(); }} style={{ alignSelf: "center", marginTop: 4 }}>Done</Pill>
          <Text style={{ fontSize: 12.5, color: t.colors.ink3, textAlign: "center", marginTop: 3 }}>The photo and context will stay here.</Text>
        </Pressable>
      </View>
    </Modal>

    <Modal
      visible={Boolean(selectedSaved)}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => { if (!savingSavedEdit) setSelectedSaved(null); }}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.28)", justifyContent: "flex-end" }}
        onPress={() => { if (!savingSavedEdit) setSelectedSaved(null); }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            maxHeight: "82%",
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: 38,
            borderTopRightRadius: 38,
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 18) + 12,
          }}
        >
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 18 }} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {editingSaved ? (
              <>
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: t.colors.accD }}>EDIT SAVED PHRASE</Text>
                <TextInput
                  value={savedEditText}
                  onChangeText={setSavedEditText}
                  autoFocus
                  placeholder="Phrase"
                  placeholderTextColor={t.colors.ink3}
                  style={{ fontSize: 27, lineHeight: 34, fontFamily: "Newsreader", color: t.colors.ink, marginTop: 9, padding: 0 }}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 14 }}>
                  {KINDS.map((item) => <Chip key={item.value} active={savedEditKind === item.value} onPress={() => setSavedEditKind(item.value)}>{item.label}</Chip>)}
                </ScrollView>
                <View style={{ height: 1, backgroundColor: t.colors.sep, marginVertical: 17 }} />
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>MEANING</Text>
                <TextInput value={savedEditMeaning} onChangeText={setSavedEditMeaning} placeholder="Meaning" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8, padding: 0 }} />
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 18 }}>USAGE NOTE</Text>
                <TextInput value={savedEditNote} onChangeText={setSavedEditNote} multiline placeholder="Usage note" placeholderTextColor={t.colors.ink3} style={{ minHeight: 54, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8, padding: 0 }} />
                {savedEditError ? <Text style={{ fontSize: 13, color: "#E5484D", textAlign: "center", marginTop: 12 }}>{savedEditError}</Text> : null}
                <Pill full onPress={savingSavedEdit ? undefined : () => void saveSavedPhraseEdits()} style={{ marginTop: 20, opacity: savingSavedEdit ? 0.6 : 1 }}>
                  {savingSavedEdit ? <ActivityIndicator color="#fff" /> : "Save changes"}
                </Pill>
                <Pill tone="ghost" onPress={savingSavedEdit ? undefined : () => setEditingSaved(false)} style={{ alignSelf: "center", marginTop: 4 }}>Cancel</Pill>
              </>
            ) : selectedSaved ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: t.colors.ink3 }}>SAVED PHRASE</Text>
                  <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="check" s={12} w={2.5} c="#fff" />
                  </View>
                </View>
                <Text style={{ fontSize: 29, lineHeight: 37, fontFamily: "Newsreader", color: t.colors.ink, marginTop: 9 }}>{selectedSaved.text}</Text>
                <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: t.colors.accS, paddingHorizontal: 13, paddingVertical: 7, marginTop: 10 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "600", color: t.colors.accD }}>{KINDS.find((item) => item.value === selectedSaved.kind)?.label ?? "Expression"}</Text>
                </View>
                <View style={{ height: 1, backgroundColor: t.colors.sep, marginVertical: 17 }} />
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>MEANING</Text>
                <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8 }}>{selectedSaved.meaning || "No meaning added yet."}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 18 }}>USAGE NOTE</Text>
                <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8 }}>{selectedSaved.usageNote || "No usage note added yet."}</Text>
                <Pill tone="soft" full onPress={() => setEditingSaved(true)} style={{ marginTop: 20 }}>Edit saved phrase</Pill>
                <Pill tone="ghost" onPress={() => setSelectedSaved(null)} style={{ alignSelf: "center", marginTop: 4 }}>Close</Pill>
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}
