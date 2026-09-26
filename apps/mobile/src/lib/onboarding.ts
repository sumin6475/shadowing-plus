import AsyncStorage from "@react-native-async-storage/async-storage";

import { createPhrase } from "./phrases";
import { createNote, loadNote, saveMirrorSession } from "./mvp";

export const ONBOARDING_STORAGE_KEY = "saylo.onboarding.v1";

type OnboardingDraftListener = (draft: OnboardingDraft) => void;

const onboardingDraftListeners = new Set<OnboardingDraftListener>();

export type OnboardingStep =
  "welcome" | "story" | "notes" | "beats" | "phrase" | "talk" | "keep";

export type OnboardingStatus =
  "not_started" | "in_progress" | "awaiting_sign_in" | "completed";

export interface OnboardingDraft {
  version: 1;
  status: OnboardingStatus;
  step: OnboardingStep;
  storyTitle: string;
  notes: string;
  beats: string[];
  phrase: string;
  phraseExample: string;
  transcript: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
  importedForUserId: string | null;
  storyId: string | null;
  messageId: string | null;
  beatIds: string[];
  phraseId: string | null;
  talkSessionId: string | null;
}

const FIRST_PHRASE = "What I’m trying to do is…";

export function createOnboardingDraft(): OnboardingDraft {
  const now = new Date().toISOString();
  return {
    version: 1,
    status: "not_started",
    step: "welcome",
    storyTitle: "My startup",
    notes: "",
    beats: [],
    phrase: FIRST_PHRASE,
    phraseExample: "",
    transcript: "",
    durationSeconds: 0,
    createdAt: now,
    updatedAt: now,
    importedForUserId: null,
    storyId: null,
    messageId: null,
    beatIds: [],
    phraseId: null,
    talkSessionId: null,
  };
}

function isStep(value: unknown): value is OnboardingStep {
  return [
    "welcome",
    "story",
    "notes",
    "beats",
    "phrase",
    "talk",
    "keep",
  ].includes(String(value));
}

function isStatus(value: unknown): value is OnboardingStatus {
  return [
    "not_started",
    "in_progress",
    "awaiting_sign_in",
    "completed",
  ].includes(String(value));
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft> {
  const fallback = createOnboardingDraft();
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return fallback;
    const value = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (value.version !== 1) return fallback;
    return {
      ...fallback,
      ...value,
      status: isStatus(value.status) ? value.status : fallback.status,
      step: isStep(value.step) ? value.step : fallback.step,
      beats: Array.isArray(value.beats)
        ? value.beats.filter((beat): beat is string => typeof beat === "string")
        : [],
      beatIds: Array.isArray(value.beatIds)
        ? value.beatIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return fallback;
  }
}

export async function saveOnboardingDraft(
  draft: OnboardingDraft,
): Promise<OnboardingDraft> {
  const next = { ...draft, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
  onboardingDraftListeners.forEach((listener) => listener(next));
  return next;
}

export async function resetOnboardingDraft(): Promise<OnboardingDraft> {
  return saveOnboardingDraft(createOnboardingDraft());
}

export function subscribeToOnboardingDraft(
  listener: OnboardingDraftListener,
): () => void {
  onboardingDraftListeners.add(listener);
  return () => onboardingDraftListeners.delete(listener);
}

export function shapeOnboardingBeats(
  storyTitle: string,
  notes: string,
): string[] {
  const ideas = notes
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  const labels = beatLabels(storyTitle);
  return labels.map((label, index) => ideas[index] ?? label);
}

function beatLabels(storyTitle: string): string[] {
  const title = storyTitle.toLocaleLowerCase("en");
  if (title.includes("startup") || title.includes("what i do")) {
    return [
      "What I’m building",
      "Who it helps",
      "The problem I care about",
      "Why it matters",
    ];
  }
  if (title.includes("challenge")) {
    return [
      "What happened",
      "Why it was difficult",
      "What I did",
      "What I learned",
    ];
  }
  if (title.includes("future")) {
    return [
      "Where I’m heading",
      "Why I want it",
      "What I’m doing now",
      "What comes next",
    ];
  }
  return [
    "The starting point",
    "What changed",
    "What I learned",
    "Why it matters to me",
  ];
}

export function makePhraseExample(storyTitle: string, beats: string[]): string {
  const usefulBeat = beats.find((beat) => beat.trim())?.trim();
  if (usefulBeat && !beatLabels(storyTitle).includes(usefulBeat)) {
    const continuation =
      usefulBeat.charAt(0).toLocaleLowerCase("en") +
      usefulBeat.slice(1).replace(/[.!?]+$/, "");
    return `What I’m trying to do is ${continuation}.`;
  }
  const title = storyTitle.toLocaleLowerCase("en");
  if (title.includes("startup"))
    return "What I’m trying to do is build something that helps people use the English they already know.";
  if (title.includes("challenge"))
    return "What I’m trying to do is explain how I handled a recent challenge.";
  if (title.includes("future"))
    return "What I’m trying to do is take the next step toward my future plans.";
  return `What I’m trying to do is tell my story about ${storyTitle.toLocaleLowerCase("en")}.`;
}

/** Import a signed-out onboarding draft into the authenticated Studio.
 * Remote ids are checkpointed after every write so retrying never duplicates a
 * completed step. Phrase creation has its own normalized-text dedupe as well.
 */
export async function importOnboardingDraft(
  draft: OnboardingDraft,
  userId: string,
  onCheckpoint?: (draft: OnboardingDraft) => void,
): Promise<OnboardingDraft> {
  if (draft.status === "completed" && draft.importedForUserId === userId)
    return draft;

  let current = draft;
  const checkpoint = async (patch: Partial<OnboardingDraft>) => {
    current = await saveOnboardingDraft({ ...current, ...patch });
    onCheckpoint?.(current);
  };

  let messageId = current.messageId;
  if (messageId) {
    await loadNote(messageId);
  } else {
    const note = await createNote(
      current.storyTitle,
      current.notes || current.beats.map((beat) => `- ${beat}`).join("\n"),
    );
    messageId = note.id;
    await checkpoint({ messageId });
  }

  let phraseId = current.phraseId;
  if (!phraseId) {
    const phrase = await createPhrase({
      text: current.phrase,
      usageNote: current.phraseExample,
      context: current.notes,
      source: "speak",
      sourceLabel: "My first Saylo story",
      said: current.transcript,
    });
    phraseId = phrase.id;
    await checkpoint({ phraseId });
  }

  let talkSessionId = current.talkSessionId;
  if (!talkSessionId) {
    talkSessionId = globalThis.expo.uuidv4();
    await saveMirrorSession({
      id: talkSessionId,
      noteId: messageId,
      transcript: current.transcript,
      seconds: current.durationSeconds,
    });
    if (!talkSessionId) throw new Error("We couldn’t save your first talk.");
    await checkpoint({ talkSessionId });
  }

  await checkpoint({
    status: "completed",
    importedForUserId: userId,
    step: "keep",
  });
  return current;
}
