import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, InteractionManager, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { useTheme } from "@/design/theme";
import { AnimatedPressable, BackBar, Card, Chip, Icon, Pill, Screen, usePressFx } from "@/design/ui";
import { BlurView } from "expo-blur";
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

export interface ClipCaptureSeed {
  contextText: string;
  contextTranslation?: string | null;
  sourceLabel?: string;
  videoId?: string;
  segmentId?: string;
  start?: number;
  end?: number;
  source?: "clip" | "speak";
  storyId?: string | null;
  said?: string | null;
}

const KINDS: { value: PhraseKind; label: string }[] = [
  { value: "phrase", label: "Expression" },
  { value: "phrasal_verb", label: "Phrasal verb" },
  { value: "pattern", label: "Pattern" },
  { value: "idiom", label: "Idiom" },
  { value: "word", label: "Word" },
];

function CaptureLabel({ label, tag }: { label: string; tag?: "Required" | "Optional" }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>{label}</Text>
      {tag ? <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3 }}>{tag.toUpperCase()}</Text> : null}
    </View>
  );
}

interface SavedCapturePhrase {
  id: string;
  text: string;
  kind: PhraseKind;
  meaning: string;
  usageNote: string;
  result: "saved" | "already";
}

export function PhraseAddMenu({
  open,
  onClose,
  nav,
  anchorBottom,
}: {
  open: boolean;
  onClose: () => void;
  nav: Nav;
  anchorBottom: number;
}) {
  const t = useTheme();
  const [launching, setLaunching] = useState(false);
  const [pendingImageOrigin, setPendingImageOrigin] = useState<CaptureImageAsset["origin"] | null>(null);

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
    onClose();
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
        minHeight: 48,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: t.colors.sep,
        backgroundColor: pressed ? t.colors.soft : "transparent",
      })}
    >
      <Icon name={icon} s={18} w={1.8} c={t.colors.ink2} />
      <Text style={{ fontSize: 16, fontWeight: "500", color: t.colors.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onDismiss={launchPendingImagePicker} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.12)" }} onPress={onClose}>
        <View
          style={[
            {
              position: "absolute",
              alignSelf: "center",
              left: 28,
              right: 28,
              bottom: anchorBottom,
              overflow: "hidden",
              borderRadius: 16,
            },
            t.shadowLg,
          ]}
        >
          {Platform.OS === "ios" ? (
            <BlurView intensity={80} tint={t.dark ? "systemChromeMaterialDark" : "systemChromeMaterial"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.card }]} />
          )}
          <View style={{ backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.55)" : t.colors.card }}>
            {menuItem("camera", "Take a Photo", () => chooseImage("camera"))}
            {menuItem("photo", "Choose from Photos", () => chooseImage("library"))}
            {menuItem("text", "Write or Paste Text", () => {
              onClose();
              nav.push("capture");
            }, true)}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function CaptureFab({ nav, aboveTabs }: { nav: Nav; aboveTabs: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const fx = usePressFx(0.92);
  const fabBottom = aboveTabs ? Math.max(insets.bottom, 12) + 76 : Math.max(insets.bottom, 12) + 12;

  return (
    <>
      <PhraseAddMenu open={open} onClose={() => setOpen(false)} nav={nav} anchorBottom={fabBottom + 64} />
      {/* Solid disc keeps the shadow on the same view and drops the gradient,
          translucent border, and overflow clip that combined into a halo with
          left/right cropping. */}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={open ? "Close add phrase menu" : "Add a phrase"}
        onPress={() => setOpen((value) => !value)}
        onPressIn={fx.pressIn}
        onPressOut={fx.pressOut}
        style={[
          {
            position: "absolute",
            right: 18,
            bottom: fabBottom,
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            backgroundColor: t.colors.acc,
          },
          t.shadowLg,
          { transform: [{ scale: fx.scale }] },
        ]}
      >
        <Icon name={open ? "x" : "plus"} s={24} w={2.4} c="#fff" />
      </AnimatedPressable>
    </>
  );
}

export function PhraseCaptureScreen({ nav, imageAsset, clipSeed }: { nav: Nav; imageAsset?: CaptureImageAsset; clipSeed?: ClipCaptureSeed }) {
  const t = useTheme();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const contextInputRef = useRef<TextInput>(null);
  const processedImageRef = useRef(false);
  const processedClipRef = useRef(false);
  const contextLookupRef = useRef(0);
  const [imageUri, setImageUri] = useState<string | null>(imageAsset?.uri ?? null);
  const [reading, setReading] = useState(Boolean(imageAsset));
  const [filling, setFilling] = useState(Boolean(clipSeed?.contextText) && !imageAsset);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [detectedText, setDetectedText] = useState("");
  const [detectedTranslation, setDetectedTranslation] = useState("");
  const [detectedTranslatedFrom, setDetectedTranslatedFrom] = useState("");
  const [context, setContext] = useState(clipSeed?.contextText ?? "");
  const [contextTranslation, setContextTranslation] = useState(clipSeed?.contextTranslation ?? "");
  const [contextTranslatedFrom, setContextTranslatedFrom] = useState(clipSeed?.contextTranslation ? (clipSeed.contextText ?? "") : "");
  const [textSource, setTextSource] = useState<"manual" | "paste">("manual");
  const [meaning, setMeaning] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [learnerNote, setLearnerNote] = useState("");
  const [sourceLabel, setSourceLabel] = useState(clipSeed?.sourceLabel ?? "");
  const [kind, setKind] = useState<PhraseKind>("phrase");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [detectedSelection, setDetectedSelection] = useState({ start: 0, end: 0 });
  const [confidence, setConfidence] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [stories, setStories] = useState<StoryChoice[]>([]);
  const [storyId, setStoryId] = useState<string | null>(clipSeed?.storyId ?? null);
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

  const applyPhraseDraft = useCallback((draft: PhraseCaptureDraft) => {
    setText(draft.suggestedPhrase);
    setKind(draft.kind);
    setMeaning(draft.meaning);
    setUsageNote(draft.usageNote);
    setConfidence(draft.confidence);
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
      applyPhraseDraft(draft);
      setDetectedText(draft.contextText);
      setDetectedTranslation(draft.contextTranslation);
      setDetectedTranslatedFrom(draft.contextText);
      setContext("");
      setContextTranslation("");
      setContextTranslatedFrom("");
      await hydrateSavedPhrases(draft.contextText);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t read this photo.");
    } finally {
      setReading(false);
    }
  }, [applyPhraseDraft, hydrateSavedPhrases]);

  useEffect(() => {
    if (!imageAsset || processedImageRef.current) return;
    processedImageRef.current = true;
    void readImageAsset(imageAsset);
  }, [imageAsset, readImageAsset]);

  const fillFromClipSeed = useCallback(async (seed: ClipCaptureSeed) => {
    const input = seed.contextText.trim();
    if (!input) return;
    setFilling(true);
    setError(null);
    try {
      const draft = await extractPhraseFromText(input);
      if (!draft.suggestedPhrase) throw new Error("We couldn’t find a phrase to suggest. Select words above or type one yourself.");
      applyPhraseDraft(draft);
      if (seed.contextTranslation) {
        setContextTranslation(seed.contextTranslation);
        setContextTranslatedFrom(input);
      } else if (draft.contextTranslation) {
        setContextTranslation(draft.contextTranslation);
        setContextTranslatedFrom(input);
      }
      await hydrateSavedPhrases(draft.contextText || input);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t fill this phrase right now.");
    } finally {
      setFilling(false);
    }
  }, [applyPhraseDraft, hydrateSavedPhrases]);

  useEffect(() => {
    if (!clipSeed?.contextText || processedClipRef.current) return;
    processedClipRef.current = true;
    void fillFromClipSeed(clipSeed);
  }, [clipSeed, fillFromClipSeed]);

  const hasDraft = () => savedPhrases.length > 0
    ? Boolean(text.trim() || meaning.trim() || usageNote.trim() || learnerNote.trim())
    : Boolean(imageUri || text.trim() || meaning.trim() || usageNote.trim() || learnerNote.trim() || detectedText.trim() || (!clipSeed && context.trim()));

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
    setTextSource("paste");
    setSelection({ start: 0, end: 0 });
    setError(null);
    requestAnimationFrame(() => contextInputRef.current?.focus());
  };

  const acceptPaste = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setContext(clean);
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
      applyPhraseDraft(draft);
      if (draft.contextTranslation) {
        setContextTranslation(draft.contextTranslation);
        setContextTranslatedFrom(input);
      }
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

  const useSelectedDetected = () => {
    const selected = detectedText.slice(detectedSelection.start, detectedSelection.end).replace(/\s+/g, " ").trim();
    if (selected) setText(selected);
  };

  const useDetectedAsContext = () => {
    const selected = detectedText.slice(detectedSelection.start, detectedSelection.end).replace(/\s+/g, " ").trim();
    if (!selected) return;
    setContext(selected);
    setContextTranslation("");
    setContextTranslatedFrom("");
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
      if (draft.contextTranslation) {
        setContextTranslation(draft.contextTranslation);
        setContextTranslatedFrom(context.trim());
      }
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
      setContextTranslatedFrom("");
      setDetectedText("");
      setDetectedTranslation("");
      setDetectedTranslatedFrom("");
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
        learnerNote,
        kind,
        context,
        contextTranslation,
        source: imageUri ? "image_ocr" : clipSeed?.source === "speak" ? "speak" : clipSeed ? "clip" : textSource,
        sourceLabel,
        ocrConfidence: imageUri ? confidence : null,
        videoId: clipSeed?.videoId,
        segmentId: clipSeed?.segmentId,
        startTime: clipSeed?.start,
        endTime: clipSeed?.end,
        storyId,
        said: clipSeed?.said,
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
        posthog?.capture("phrase_saved", {
          source: imageUri ? "image_ocr" : clipSeed?.source === "speak" ? "speak" : clipSeed ? "clip" : textSource,
          phrase_kind: kind,
          linked_to_story: Boolean(storyId),
        });
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
  const contextTranslationStale = Boolean(contextTranslation.trim()) && context.trim() !== contextTranslatedFrom.trim();
  const detectedTranslationStale = Boolean(detectedTranslation.trim()) && detectedText.trim() !== detectedTranslatedFrom.trim();
  const detectedHasSelection = detectedSelection.end > detectedSelection.start;

  return (
    <>
      <Screen bottomPad={54}>
      <BackBar title={clipSeed?.source === "speak" ? "From this talk" : clipSeed ? "From this clip" : imageUri ? "From photo" : "Add a phrase"} onBack={leaveEditor} />

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
          <Text style={{ fontSize: 12.5, color: t.colors.ink3, lineHeight: 18, paddingHorizontal: 4 }}>This photo is processed for this capture and isn’t stored by Saylo.</Text>
        </>
      ) : null}

      {reading || (Boolean(clipSeed) && filling && !text.trim()) ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <ActivityIndicator color={t.colors.acc} />
          <Text style={{ fontSize: 13.5, color: t.colors.ink2, marginTop: 10 }}>
            {reading ? "Reading the visible text…" : "Finding a phrase…"}
          </Text>
        </Card>
      ) : null}

      {imageUri ? (
        <Card>
          <CaptureLabel label="DETECTED TEXT" tag="Optional" />
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: t.colors.ink3, marginTop: 5 }}>
            Check the text we found, then choose what you want to keep.
          </Text>
          <TextInput
            value={detectedText}
            onChangeText={(value) => {
              setDetectedText(value);
              if (error) setError(null);
            }}
            onSelectionChange={(event) => setDetectedSelection(event.nativeEvent.selection)}
            editable={!reading}
            multiline
            placeholder="Text from this photo…"
            placeholderTextColor={t.colors.ink3}
            style={{ minHeight: 96, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 10, padding: 0 }}
          />
          {detectedTranslation ? (
            <View style={{ borderTopWidth: 1, borderTopColor: t.colors.sep, marginTop: 14, paddingTop: 13 }}>
              <Text style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>TRANSLATION</Text>
              {detectedTranslationStale ? <Text style={{ fontSize: 11.5, color: t.colors.ink3, marginTop: 4 }}>May not match your edit</Text> : null}
              <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 7 }}>{detectedTranslation}</Text>
            </View>
          ) : null}
          {detectedHasSelection ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 11 }}>
              <Pill tone="tint" small onPress={useSelectedDetected}>Use selected words</Pill>
              <Pill tone="soft" small onPress={useDetectedAsContext}>Use as context</Pill>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CaptureLabel label="CONTEXT" tag="Optional" />
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: t.colors.ink3, marginTop: 5 }}>
          {clipSeed?.source === "speak"
            ? "We’ll pick one reusable expression from this suggestion. You can edit everything."
            : clipSeed
              ? "We’ll pick one reusable expression from this line. You can edit everything."
              : "The sentence or example that contains this phrase. Optional if you already know it."}
        </Text>
        <TextInput
          ref={contextInputRef}
          value={context}
          onChangeText={(value) => {
            setContext(value);
            if (error) setError(null);
          }}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          editable={!reading}
          autoFocus={!imageAsset && !clipSeed}
          multiline
          placeholder="e.g. Don’t let his mood rub off on you."
          placeholderTextColor={t.colors.ink3}
          style={{ minHeight: imageUri ? 70 : 96, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 10, padding: 0 }}
        />

        {contextTranslation ? (
          <View style={{ borderTopWidth: 1, borderTopColor: t.colors.sep, marginTop: 14, paddingTop: 13 }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>CONTEXT TRANSLATION</Text>
            {contextTranslationStale ? <Text style={{ fontSize: 11.5, color: t.colors.ink3, marginTop: 4 }}>May not match your edit</Text> : null}
            <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 7 }}>{contextTranslation}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 11 }}>
          {!imageUri && !clipSeed && showNativePasteButton ? (
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
          ) : !imageUri && !clipSeed ? (
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
            <CaptureLabel label="NEXT PHRASE TO KEEP" tag="Required" />
          </>
        ) : (
          <CaptureLabel label="PHRASE TO KEEP" tag="Required" />
        )}
        <TextInput value={text} onChangeText={(value) => { setText(value); if (error) setError(null); }} placeholder="e.g. take the plunge" placeholderTextColor={t.colors.ink3} style={{ fontSize: 20, fontFamily: "Newsreader", color: t.colors.ink, marginTop: 9, padding: 0 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 14 }}>
          {KINDS.map((item) => <Chip key={item.value} active={kind === item.value} onPress={() => setKind(item.value)}>{item.label}</Chip>)}
        </ScrollView>
        <Pill
          tone="soft"
          full
          icon="sparkle"
          onPress={text.trim() && !reading && !filling ? () => void fillCurrentPhraseDetails() : undefined}
          style={{ width: "100%", alignSelf: "stretch", marginTop: 13, opacity: text.trim() && !reading && !filling ? 1 : 0.5 }}
        >
          {filling ? "Filling…" : "Refresh with AI"}
        </Pill>
        {savedPhrases.length > 0 ? (
          <Text style={{ fontSize: 11.5, lineHeight: 17, color: t.colors.ink3, marginTop: 8 }}>
            Select another expression above, or type it here.
          </Text>
        ) : null}
      </Card>

      <Card>
        <CaptureLabel label="MEANING" tag="Optional" />
        <TextInput value={meaning} onChangeText={setMeaning} placeholder="What it means to you" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, color: t.colors.ink, marginTop: 8, padding: 0 }} />
        <View style={{ marginTop: 18 }}>
          <CaptureLabel label="HOW IT’S USED" tag="Optional" />
        </View>
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: t.colors.ink3, marginTop: 5 }}>Not an example sentence. Context holds the sentence.</Text>
        <TextInput value={usageNote} onChangeText={setUsageNote} multiline placeholder="When this sounds natural" placeholderTextColor={t.colors.ink3} style={{ minHeight: 46, fontSize: 15, lineHeight: 21, color: t.colors.ink, marginTop: 8, padding: 0 }} />
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: moreOpen }}
        onPress={() => setMoreOpen((open) => !open)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingVertical: 6 }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>MORE</Text>
        <View style={{ transform: [{ rotate: moreOpen ? "90deg" : "0deg" }] }}>
          <Icon name="chev" s={14} c={t.colors.ink3} />
        </View>
      </Pressable>

      {moreOpen ? (
        <Card>
          <CaptureLabel label="WHERE IT BELONGS" tag="Optional" />
          <TextInput value={sourceLabel} onChangeText={setSourceLabel} placeholder="Source name" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, color: t.colors.ink, marginTop: 9, padding: 0 }} />
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
          <View style={{ height: 1, backgroundColor: t.colors.sep, marginVertical: 16 }} />
          <CaptureLabel label="YOUR NOTE" tag="Optional" />
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: t.colors.ink3, marginTop: 5 }}>A private reminder for you. AI does not fill this.</Text>
          <TextInput value={learnerNote} onChangeText={setLearnerNote} multiline placeholder="Why you want this, or when you’ll use it…" placeholderTextColor={t.colors.ink3} style={{ minHeight: 54, fontSize: 15, lineHeight: 21, color: t.colors.ink, marginTop: 8, padding: 0 }} />
        </Card>
      ) : null}

      {confidence != null && confidence < 0.7 ? <Text style={{ fontSize: 12.5, color: t.colors.ink3, lineHeight: 18 }}>Check the suggested phrase before saving.</Text> : null}
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
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 18 }}>HOW IT’S USED</Text>
                <TextInput value={savedEditNote} onChangeText={setSavedEditNote} multiline placeholder="How it’s used" placeholderTextColor={t.colors.ink3} style={{ minHeight: 54, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8, padding: 0 }} />
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
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 18 }}>HOW IT’S USED</Text>
                <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8 }}>{selectedSaved.usageNote || "No usage added yet."}</Text>
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
