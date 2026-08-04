// shell.tsx — the app shell, ported from the prototype's SPApp. Owns tab state,
// a push/pop detail stack, the onboarding gate, and the self-talk context. Expo
// Router hosts this single tree; the floating TabBar (not Router tabs) drives
// tab switching so the stateful flows (Speak, Talk) stay intact.
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";

import { TabBar, type TabId } from "@/design/ui";
import { useTheme } from "@/design/theme";
import { Onboarding } from "@/screens/onboarding";
import { TodayScreen } from "@/screens/today";
import { PhrasesScreen, PhraseDetail, ReviewFlow } from "@/screens/phrases";
import { TalkScreen } from "@/screens/talk";
import { SpeakingWorldScreen, DomainScreen, StoryScreen, MessageScreen, RecsScreen } from "@/screens/world";
import { IslandDetail, IslandCreate } from "@/screens/islands";
import { LibraryScreen, LibItem, ChunkSave } from "@/screens/library";
import { SettingsScreen } from "@/screens/settings";
import type { Nav, TalkCtx, ViewName } from "@/screens/nav";
import type { PhraseItem } from "@/lib/phrases";

interface StackEntry {
  name: ViewName;
  props: Record<string, unknown>;
}

export function AppShell() {
  const t = useTheme();
  const [ob, setOb] = useState(true);
  const [tab, setTab] = useState<TabId>("today");
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [talkCtx, setTalkCtx] = useState<TalkCtx | undefined>(undefined);
  const [speakKey, setSpeakKey] = useState(0);

  const nav: Nav = useMemo(
    () => ({
      push: (name, props = {}) => setStack((s) => [...s, { name, props }]),
      pop: () => setStack((s) => s.slice(0, -1)),
      go: (id) => {
        setStack([]);
        if (id === "speak") {
          setTalkCtx(undefined);
          setSpeakKey((k) => k + 1);
        }
        setTab(id);
      },
      startTalk: (ctx) => {
        setStack([]);
        setTalkCtx(ctx);
        setSpeakKey((k) => k + 1);
        setTab("speak");
      },
    }),
    [],
  );

  const finishOnboarding = useCallback(() => {
    setOb(false);
    nav.go("today");
  }, [nav]);

  const top = stack[stack.length - 1];

  let content: React.ReactNode;
  if (ob) {
    content = <Onboarding done={finishOnboarding} />;
  } else if (top) {
    content = renderView(top, nav);
  } else {
    content = renderTab(tab, nav, talkCtx, speakKey);
  }

  const showTabBar = !ob && !top && tab !== "speak";

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {content}
      {showTabBar ? <TabBar tab={tab} go={nav.go} /> : null}
    </View>
  );
}

function renderTab(tab: TabId, nav: Nav, talkCtx: TalkCtx | undefined, speakKey: number): React.ReactNode {
  switch (tab) {
    case "today":
      return <TodayScreen nav={nav} />;
    case "phrases":
      return <PhrasesScreen nav={nav} />;
    case "speak":
      return <TalkScreen key={speakKey} nav={nav} talkCtx={talkCtx} />;
    case "topics":
      return <SpeakingWorldScreen nav={nav} />;
    case "library":
      return <LibraryScreen nav={nav} />;
  }
}

function renderView(entry: StackEntry, nav: Nav): React.ReactNode {
  const p = entry.props;
  switch (entry.name) {
    case "phrase":
      return <PhraseDetail nav={nav} item={p.item as PhraseItem | undefined} />;
    case "review":
      return <ReviewFlow nav={nav} item={p.item as PhraseItem | undefined} />;
    case "island":
      return <IslandDetail nav={nav} id={p.id as string} />;
    case "newIsland":
      return <IslandCreate nav={nav} />;
    case "domain":
      return <DomainScreen nav={nav} id={p.id as string} />;
    case "story":
      return <StoryScreen nav={nav} did={p.did as string} sid={p.sid as string} />;
    case "message":
      return <MessageScreen nav={nav} did={p.did as string} sid={p.sid as string} mid={p.mid as string} />;
    case "recs":
      return <RecsScreen nav={nav} />;
    case "libItem":
      return <LibItem nav={nav} id={p.id as string} title={p.title as string | undefined} />;
    case "saveChunk":
      return <ChunkSave nav={nav} segmentId={p.segmentId as string | undefined} text={p.text as string | undefined} translation={p.translation as string | null | undefined} time={p.time as string | undefined} />;
    case "settings":
      return <SettingsScreen nav={nav} />;
  }
}
