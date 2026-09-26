/**
 * Canonical application vocabulary for the Studio domain.
 *
 * The persistence adapter still uses the deployed Supabase identifiers
 * domains/stories/messages/talk_sessions. New application code imports this
 * module and does not expose those legacy names to screens or product copy.
 */
import {
  archiveDomain,
  archiveStory,
  createBeat,
  createDomain,
  createMessage,
  createStory,
  createStoryInDefaultTopic,
  createTalkSession,
  deleteBeat,
  deleteTalkSession,
  ensureStoryDomain,
  fetchAllStories,
  fetchBeats,
  fetchDomains,
  fetchMessages,
  fetchRecentTalkedStory,
  fetchStories,
  fetchStory,
  fetchStudioCollection,
  fetchStudioSnapshot as fetchPersistedStudioSnapshot,
  fetchTalkSessions,
  formatSpeakingTime,
  renameDomain,
  setBeatPositions,
  updateBeat,
  updateStoryDomain,
  updateStorySummary,
  type Beat as PersistedBeat,
  type Domain as PersistedTopic,
  type RecentTalkedStory as PersistedRecentSituation,
  type Story as PersistedSituation,
  type StoryChoice as PersistedSituationChoice,
  type StoryMessage as PersistedNoteOutline,
  type StudioDomain as PersistedTopicCollection,
  type StudioSnapshot as PersistedStudioSnapshot,
  type TalkSession as PersistedAttempt,
} from "./studio-persistence";

export interface Topic extends Omit<PersistedTopic, "storyCount"> { situationCount: number; }
export interface SituationSummary extends Omit<PersistedSituation, "domainId" | "messageCount" | "sessionCount"> {
  topicId: string | null;
  noteCount: number;
  attemptCount: number;
}
export interface TopicCollection { topic: Topic; situations: SituationSummary[]; }
export interface SituationChoice extends Omit<PersistedSituationChoice, "domainName"> { topicName: string | null; }
export interface SpeakingNoteOutline extends Omit<PersistedNoteOutline, "storyId"> { situationId: string; }
export type SpeakingBeat = PersistedBeat;
export interface Attempt extends Omit<PersistedAttempt, "storyId" | "storyTitle"> {
  situationId: string | null;
  situationTitle: string | null;
}
export interface RecentAttemptSituation extends Omit<PersistedRecentSituation, "storyId" | "storyTitle" | "messageId"> {
  situationId: string;
  noteId: string | null;
  situationTitle: string;
}
export interface StudioSnapshot extends Omit<PersistedStudioSnapshot, "sessionCount" | "activeStories"> {
  attemptCount: number;
  activeSituations: number;
}

const mapTopic = (row: PersistedTopic): Topic => ({ id: row.id, name: row.name, color: row.color, position: row.position, situationCount: row.storyCount });
const mapSituation = (row: PersistedSituation): SituationSummary => ({ id: row.id, topicId: row.domainId, title: row.title, summary: row.summary, status: row.status, position: row.position, noteCount: row.messageCount, attemptCount: row.sessionCount });
const mapAttempt = (row: PersistedAttempt): Attempt => ({ id: row.id, situationId: row.storyId, situationTitle: row.storyTitle, transcript: row.transcript, durationSeconds: row.durationSeconds, createdAt: row.createdAt, audioKey: row.audioKey });

export const situationHasActivity = (row: SituationSummary): boolean => row.noteCount > 0 || row.attemptCount > 0;
export const fetchTopics = async (): Promise<Topic[]> => (await fetchDomains()).map(mapTopic);
export const fetchAttempts = async (limit = 100, situationId?: string): Promise<Attempt[]> => (await fetchTalkSessions(limit, situationId)).map(mapAttempt);
export const seedInitialStudio = async (): Promise<void> => {
  // fetchTopics owns the idempotent first-use seed.
  await fetchTopics();
};
export const fetchSituations = async (topicId: string): Promise<SituationSummary[]> => (await fetchStories(topicId)).map(mapSituation);
export const fetchTopicCollections = async (): Promise<TopicCollection[]> => (await fetchStudioCollection()).map((group: PersistedTopicCollection) => ({ topic: mapTopic(group.domain), situations: group.stories.map(mapSituation) }));
export const fetchSituationChoices = async (): Promise<SituationChoice[]> => (await fetchAllStories()).map((row) => ({ id: row.id, title: row.title, topicName: row.domainName }));
export const fetchSituation = async (id: string) => {
  const row = await fetchStory(id);
  return row ? { id: row.id, title: row.title, summary: row.summary, topicId: row.domainId, topicName: row.domainName } : null;
};
export const updateSituationDescription = updateStorySummary;
export const moveSituationToTopic = updateStoryDomain;
export const fetchSpeakingNoteOutlines = async (situationId: string): Promise<SpeakingNoteOutline[]> => (await fetchMessages(situationId)).map((row) => ({ id: row.id, situationId: row.storyId, label: row.label, audience: row.audience, targetSeconds: row.targetSeconds, position: row.position }));
export const fetchSpeakingBeats = fetchBeats;
export const createTopic = createDomain;
export const renameTopic = renameDomain;
export const archiveTopic = archiveDomain;
export const createSituation = createStory;
export const createSituationInDefaultTopic = createStoryInDefaultTopic;
export const ensureSituationTopic = ensureStoryDomain;
export const createSpeakingNoteOutline = createMessage;
export const createSpeakingBeat = createBeat;
export const updateSpeakingBeat = updateBeat;
export const deleteSpeakingBeat = deleteBeat;
export const setSpeakingBeatPositions = setBeatPositions;
export const deleteAttempt = deleteTalkSession;
export const archiveSituation = archiveStory;
export const createAttempt = (input: { situationId?: string | null; noteId?: string | null; transcript: string; durationSeconds: number }) => createTalkSession({ storyId: input.situationId, messageId: input.noteId, transcript: input.transcript, durationSeconds: input.durationSeconds });
export const fetchRecentAttemptSituation = async (): Promise<RecentAttemptSituation | null> => {
  const row = await fetchRecentTalkedStory();
  return row ? { situationId: row.storyId, noteId: row.messageId, situationTitle: row.storyTitle, beats: row.beats } : null;
};
export const fetchStudioSnapshot = async (): Promise<StudioSnapshot> => {
  const row = await fetchPersistedStudioSnapshot();
  return { totalSeconds: row.totalSeconds, attemptCount: row.sessionCount, activeTopics: row.activeTopics, activeSituations: row.activeStories, topicTime: row.topicTime, lastSevenDays: row.lastSevenDays };
};
export { formatSpeakingTime };
