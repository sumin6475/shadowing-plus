import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Text, TextInput } from "@/design/text";
import { useTheme } from "@/design/theme";
import { FONT_UI as SYSTEM } from "@/design/mobile-tokens";
import { loadNoteFolders, loadNoteVersions, type NoteFolder, type NoteVersion } from "@/lib/note-growth";
import { dateTimeLabel, durationLabel, loadMirrorSessions, loadPhraseBank, type MirrorSession, type MvpPhrase } from "@/lib/mvp";
import { parseOutline } from "@/lib/mvp-model";
import { rank, scoreMatch } from "@/lib/search-model";

export type NoteTool = "move" | "history" | "practice" | "phrases";
const failure = (error: unknown) => error instanceof Error ? error.message : "Please try again.";

export function NoteToolsSheet({ tool, noteId, folderId, onClose, onMove, onInsert, onOpenSession }: {
  tool: NoteTool | null;
  noteId: string;
  folderId: string | null;
  onClose: () => void;
  onMove: (folderId: string | null) => Promise<void>;
  onInsert: (phrase: string) => void;
  onOpenSession: (session: MirrorSession) => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={Boolean(tool)} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {tool ? <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 44 }} />
          <Text accessibilityRole="header" style={{ flex: 1, textAlign: "center", fontFamily: SYSTEM, fontSize: 17, fontWeight: "600", color: t.colors.ink }}>
            {tool === "move" ? "Move Note" : tool === "history" ? "Update History" : tool === "practice" ? "Talk History" : "Phrases"}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose}
            style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center" }, t.shadowCard]}>
            <SymbolView name="xmark" size={18} tintColor={t.colors.ink} />
          </Pressable>
        </View>
        {tool === "move" ? <Folders folderId={folderId} onMove={onMove} onClose={onClose} /> :
          tool === "history" ? <History noteId={noteId} /> : tool === "practice" ? <PracticeHistory noteId={noteId} onOpenSession={onOpenSession} /> : <Phrases onInsert={onInsert} onClose={onClose} />}
      </View> : null}
    </Modal>
  );
}
function ErrorLine({ error, retry }: { error: string | null; retry?: () => void }) {
  const t = useTheme();
  return error ? <Pressable accessibilityRole={retry ? "button" : undefined} onPress={retry} style={{ paddingVertical: 12 }}>
    <Text style={{ fontFamily: SYSTEM, fontSize: 14, color: t.colors.warn }}>{error}{retry ? " · Retry" : ""}</Text>
  </Pressable> : null;
}
function Row({ children, onPress, label, busy, trailing }: { children: ReactNode; onPress: () => void; label: string; busy?: boolean; trailing?: ReactNode }) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress}
    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", minHeight: 56, paddingVertical: 12, gap: 14, borderBottomWidth: 0.5, borderBottomColor: t.dark ? "rgba(235,235,245,0.12)" : "rgba(60,60,67,0.08)", opacity: pressed || busy ? 0.5 : 1 })}>
    <View style={{ flex: 1 }}>{children}</View>{trailing}
  </Pressable>;
}
function Folders({ folderId, onMove, onClose }: { folderId: string | null; onMove: (id: string | null) => Promise<void>; onClose: () => void }) {
  const t = useTheme();
  const [folders, setFolders] = useState<NoteFolder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => { setError(null); void loadNoteFolders().then(setFolders).catch(error => setError(failure(error))); };
  useEffect(() => { let alive = true; void loadNoteFolders().then(rows => { if (alive) setFolders(rows); }).catch(error => { if (alive) setError(failure(error)); }); return () => { alive = false; }; }, []);
  const move = async (id: string | null) => {
    if (busy) return;
    if (id === folderId) { onClose(); return; }
    setBusy(true); setError(null);
    try { await onMove(id); onClose(); } catch (error) { setError(failure(error)); } finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
    <ErrorLine error={error} retry={load} />
    {folders === null && !error ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}
    {folders ? [{ id: null, name: "No Folder" }, ...folders].map(folder => <Row key={folder.id ?? "none"} label={`Move note to ${folder.name}`} busy={busy} onPress={() => void move(folder.id)}
      trailing={folder.id === folderId ? <SymbolView name="checkmark" size={18} tintColor={t.colors.accD} /> : <SymbolView name="folder" size={20} tintColor={t.colors.ink2} />}>
      <Text style={{ fontFamily: SYSTEM, fontSize: 17, color: t.colors.ink }}>{folder.name}</Text>
    </Row>) : null}
  </ScrollView>;
}
function Phrases({ onInsert, onClose }: { onInsert: (phrase: string) => void; onClose: () => void }) {
  const t = useTheme();
  const [phrases, setPhrases] = useState<MvpPhrase[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); void loadPhraseBank().then(setPhrases).catch(error => setError(failure(error))); };
  useEffect(() => { let alive = true; void loadPhraseBank().then(rows => { if (alive) setPhrases(rows); }).catch(error => { if (alive) setError(failure(error)); }); return () => { alive = false; }; }, []);
  const rows = query.trim() ? rank(phrases ?? [], phrase => scoreMatch(query, phrase.text, [phrase.translation, phrase.usageNote])) : phrases ?? [];
  return <View style={{ flex: 1, paddingHorizontal: 20 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.colors.soft, borderRadius: 12, paddingHorizontal: 12, marginTop: 8, marginBottom: 10 }}>
      <SymbolView name="magnifyingglass" size={17} tintColor={t.colors.ink2} />
      <TextInput accessibilityLabel="Search saved phrases" value={query} onChangeText={setQuery} placeholder="Search phrases" autoCorrect={false} autoCapitalize="none"
        placeholderTextColor={t.colors.ink2} style={{ flex: 1, fontFamily: SYSTEM, fontSize: 17, color: t.colors.ink, minHeight: 44, paddingVertical: 8 }} />
    </View>
    <ErrorLine error={error} retry={load} />
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: 40 }}>
      {phrases === null && !error ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}
      {phrases && !rows.length ? <Text style={{ fontFamily: SYSTEM, color: t.colors.ink2, textAlign: "center", paddingVertical: 36 }}>{query ? "No matching phrases" : "No saved phrases yet"}</Text> : null}
      {rows.map(phrase => <Row key={phrase.id} label={`Add ${phrase.text} to point notes`} onPress={() => { onInsert(phrase.text); onClose(); }}
        trailing={<SymbolView name="plus.circle" size={22} tintColor={t.colors.accD} />}>
        <Text style={{ fontFamily: SYSTEM, fontSize: 17, lineHeight: 23, color: t.colors.ink }}>{phrase.text}</Text>
        {phrase.translation ? <Text style={{ fontFamily: SYSTEM, fontSize: 14, color: t.colors.ink2, marginTop: 4 }}>{phrase.translation}</Text> : null}
      </Row>)}
    </ScrollView>
  </View>;
}
function History({ noteId }: { noteId: string }) {
  const t = useTheme();
  const [versions, setVersions] = useState<NoteVersion[] | null>(null);
  const [selected, setSelected] = useState<NoteVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = async (offset = 0) => {
    setBusy(true); setError(null);
    try {
      const page = await loadNoteVersions(noteId, offset);
      setVersions(current => offset ? [...(current ?? []), ...page] : page);
      setMore(page.length === 50);
    } catch (error) { setError(failure(error)); } finally { setBusy(false); }
  };
  useEffect(() => { let alive = true; void loadNoteVersions(noteId).then(page => { if (alive) { setVersions(page); setMore(page.length === 50); } }).catch(error => { if (alive) setError(failure(error)); }); return () => { alive = false; }; }, [noteId]);
  return <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}>
    <ErrorLine error={error} retry={() => void load(versions?.length ?? 0)} />
    {selected ? <>
      <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={{ flexDirection: "row", gap: 6, alignItems: "center", paddingVertical: 16 }}>
        <SymbolView name="chevron.left" size={14} tintColor={t.colors.accD} /><Text style={{ fontFamily: SYSTEM, fontSize: 16, color: t.colors.accD }}>All updates</Text>
      </Pressable>
      <Text style={{ fontFamily: SYSTEM, fontSize: 26, fontWeight: "700", color: t.colors.ink, marginTop: 10 }}>{selected.title || "Untitled Note"}</Text>
      <Text style={{ fontFamily: SYSTEM, fontSize: 13, color: t.colors.ink2, marginTop: 8, marginBottom: 20 }}>{dateTimeLabel(selected.created_at)}</Text>
      {parseOutline(selected.body).map((section, index) => <View key={index} style={{ paddingVertical: 16 }}>
        <Text style={{ fontFamily: SYSTEM, fontSize: 20, fontWeight: "700", color: t.colors.ink, marginBottom: 12 }}>{section.heading}</Text>
        {section.points.map((point, index) => <View key={index} style={{ marginBottom: 12 }}>
          <Text style={{ fontFamily: SYSTEM, fontSize: 17, lineHeight: 24, color: t.colors.ink }}>•  {point}</Text>
          {section.notes?.[index] ? <Text style={{ fontFamily: SYSTEM, fontSize: 15, lineHeight: 21, color: t.colors.ink2, marginLeft: 18, marginTop: 5 }}>{section.notes[index]}</Text> : null}
        </View>)}
      </View>)}
    </> : <>
      {versions === null && !error ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}
      {versions?.length === 0 ? <Text style={{ fontFamily: SYSTEM, color: t.colors.ink2, textAlign: "center", paddingVertical: 40 }}>No updates yet</Text> : null}
      {versions?.map(version => <Row key={version.id} label={`View saved version from ${dateTimeLabel(version.created_at)}`} onPress={() => setSelected(version)}
        trailing={<SymbolView name="chevron.right" size={14} tintColor={t.colors.ink2} />}>
        <Text style={{ fontFamily: SYSTEM, fontSize: 17, color: t.colors.ink }}>{version.origin === "ask" ? "Ask draft applied" : version.origin === "practice" ? "Practice ideas applied" : "Saved version"}</Text>
        <Text style={{ fontFamily: SYSTEM, fontSize: 13, color: t.colors.ink2, marginTop: 5 }}>{dateTimeLabel(version.created_at)}</Text>
      </Row>)}
      {more ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void load(versions?.length ?? 0)} style={{ alignItems: "center", paddingVertical: 20 }}>
        {busy ? <ActivityIndicator /> : <Text style={{ fontFamily: SYSTEM, fontSize: 16, color: t.colors.accD }}>Earlier updates</Text>}
      </Pressable> : null}
    </>}
  </ScrollView>;
}

function PracticeHistory({ noteId, onOpenSession }: { noteId: string; onOpenSession: (session: MirrorSession) => void }) {
  const t = useTheme();
  const [sessions, setSessions] = useState<MirrorSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError(null);
    try { setSessions(await loadMirrorSessions(noteId)); }
    catch (error) { setError(failure(error)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let alive = true;
    void loadMirrorSessions(noteId).then(rows => { if (alive) setSessions(rows); })
      .catch(error => { if (alive) setError(failure(error)); });
    return () => { alive = false; };
  }, [noteId]);
  return <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}>
    <ErrorLine error={error} retry={busy ? undefined : () => void load()} />
    {(sessions === null && !error) || busy ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}
    {sessions?.length === 0 && !busy ? <View style={{ paddingVertical: 40, gap: 8 }}>
      <Text style={{ color: t.colors.ink, fontSize: 17, fontWeight: "600", textAlign: "center" }}>No practice sessions yet</Text>
      <Text style={{ color: t.colors.ink2, fontSize: 15, lineHeight: 22, textAlign: "center" }}>Use “Speak with this note” to start collecting your practice here.</Text>
    </View> : null}
    {!busy && sessions?.map(session => <Row key={session.id}
      label={`Open practice from ${dateTimeLabel(session.created_at)}`} onPress={() => onOpenSession(session)}
      trailing={<SymbolView name="chevron.right" size={14} tintColor={t.colors.ink2} />}>
      <Text style={{ fontSize: 17, fontWeight: "600", color: t.colors.ink }}>{durationLabel(session.seconds)} of speaking</Text>
      <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 5 }}>{dateTimeLabel(session.created_at)}</Text>
      <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2, marginTop: 8 }}>{session.transcript || "No transcript captured."}</Text>
    </Row>)}
  </ScrollView>;
}
