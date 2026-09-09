// shell.tsx — shell state shared across the NativeTabs routes, ported from the
// prototype's SPApp. Owns the detail push/pop stack, the self-talk context and
// the toast. The tab bar itself is the native UITabBar from expo-router's
// NativeTabs (src/app/(app)/_layout.tsx); each tab route renders a TabHost,
// which shows the tab's base screen or the pushed detail view on top of it.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Icon, type TabId } from "@/design/ui";
import { useTheme } from "@/design/theme";
import { TodayScreen } from "@/screens/today";
import { PhrasesScreen, PhraseRoute, ReviewFlow } from "@/screens/phrases";
import { TalkScreen } from "@/screens/talk";
import { DomainScreen, StoryScreen, MessageScreen, MessageCreate, RecsScreen, SessionsScreen, SessionDetail, SessionFeedbackDetail, TopicsListScreen } from "@/screens/world";
import { IslandDetail, IslandCreate } from "@/screens/islands";
import { LibraryScreen, LibItem } from "@/screens/library";
import { SettingsScreen } from "@/screens/settings";
import { SpeakingStudioScreen } from "@/screens/studio";
import { SpeakingNoteScreen, StudioHomeScreen, StudioSituationScreen, StudioTopicScreen } from "@/screens/studio-information";
import { EditProfileScreen, EnglishLevelScreen, FeedbackFocusScreen, FirstLanguageScreen, PhrasesPerDayScreen, DailySpeakingGoalScreen, ThemeScreen } from "@/screens/edit-profile";
import { RemindersScreen } from "@/screens/reminders";
import { PrivacyScreen } from "@/screens/privacy";
import { CaptureFab, PhraseCaptureScreen, type CaptureImageAsset, type ClipCaptureSeed } from "@/screens/capture";
import { PracticeHubScreen, QuickRehearsalScreen } from "@/screens/practice";
import type { Nav, TalkCtx, ViewName } from "@/screens/nav";
import type { PhraseItem } from "@/lib/phrases";
import type { TalkSession } from "@/lib/speaking-world";

interface StackEntry {
  name: ViewName;
  props: Record<string, unknown>;
}

/** Tab id → route path inside the (app) group. `sessions` has no tab of its
 * own anymore; it lands on the Studio tab (the sessions list is a pushed view). */
const TAB_PATHS = {
  today: "/",
  phrases: "/phrases",
  speak: "/talk",
  topics: "/studio",
  sessions: "/studio",
} as const satisfies Record<TabId, string>;

interface ShellState {
  nav: Nav;
  stack: StackEntry[];
  talkCtx: TalkCtx | undefined;
  speakKey: number;
  notice: { message: string; shownAt: number } | null;
  talkFocused: boolean;
  /** Stable — safe to use inside focus effects. */
  setTalkFocused: (focused: boolean) => void;
  /** Stable. Clears the self-talk context when the Talk tab blurs. */
  resetTalk: () => void;
  /** Stable. Called when a tab gains focus; clears the detail stack if the
   * focused tab actually changed (deep links bypass nav.go, which normally
   * does this). */
  onTabFocused: (tab: TabId) => void;
}

const ShellContext = createContext<ShellState | null>(null);

function useShell(): ShellState {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("TabHost must be rendered inside ShellProvider");
  return shell;
}

/** True while the native tab bar should be hidden: a detail view is pushed, or
 * the full-screen Talk (mirror) tab is active. */
export function useShellBarHidden(): boolean {
  const shell = useShell();
  return shell.stack.length > 0 || shell.talkFocused;
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [talkCtx, setTalkCtx] = useState<TalkCtx | undefined>(undefined);
  const [speakKey, setSpeakKey] = useState(0);
  const [notice, setNotice] = useState<{ message: string; shownAt: number } | null>(null);
  const [talkFocused, setTalkFocusedState] = useState(false);
  const [speakingDataRevision, setSpeakingDataRevision] = useState(0);

  const notify = useCallback((message: string) => {
    setNotice({ message, shownAt: Date.now() });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice((current) => (current?.shownAt === notice.shownAt ? null : current));
    }, 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  const setTalkFocused = useCallback((focused: boolean) => {
    setTalkFocusedState(focused);
  }, []);

  const resetTalk = useCallback(() => {
    setTalkCtx(undefined);
    setSpeakKey((k) => k + 1);
  }, []);

  const invalidateSpeakingData = useCallback(() => {
    setSpeakingDataRevision((r) => r + 1);
  }, []);

  const lastFocusedTab = useRef<TabId | null>(null);
  const onTabFocused = useCallback((tab: TabId) => {
    if (lastFocusedTab.current !== null && lastFocusedTab.current !== tab) {
      setStack([]);
    }
    lastFocusedTab.current = tab;
  }, []);

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
        router.navigate(TAB_PATHS[id]);
      },
      startTalk: (ctx) => {
        setStack([]);
        setTalkCtx(ctx);
        setSpeakKey((k) => k + 1);
        router.navigate(TAB_PATHS.speak);
      },
      notify,
      speakingDataRevision,
      invalidateSpeakingData,
    }),
    [notify, speakingDataRevision, invalidateSpeakingData],
  );

  const value = useMemo<ShellState>(
    () => ({ nav, stack, talkCtx, speakKey, notice, talkFocused, setTalkFocused, resetTalk, onTabFocused }),
    [nav, stack, talkCtx, speakKey, notice, talkFocused, setTalkFocused, resetTalk, onTabFocused],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

/** One native tab's content: the base screen, or the pushed detail stack when
 * this tab is focused. NativeTabs keeps every tab mounted, so the Talk screen
 * (live mic) only mounts while its tab is actually focused. */
export function TabHost({ tab }: { tab: TabId }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const shell = useShell();
  const { nav, setTalkFocused, resetTalk, onTabFocused } = shell;
  const [focused, setFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      onTabFocused(tab);
      if (tab === "speak") setTalkFocused(true);
      return () => {
        setFocused(false);
        if (tab === "speak") {
          setTalkFocused(false);
          resetTalk();
        }
      };
    }, [tab, setTalkFocused, resetTalk, onTabFocused]),
  );

  // The detail stack is global (it clears on tab switch and the tab bar is
  // hidden while it's open), but only the focused tab renders it.
  const stack = focused ? shell.stack : [];
  const top = stack[stack.length - 1];
  const prev = stack.length >= 2 ? stack[stack.length - 2] : undefined;
  const captureOverLibItem = top?.name === "capture" && prev?.name === "libItem";
  const libItemEntry = captureOverLibItem ? prev : top?.name === "libItem" ? top : undefined;
  // Enable edge-swipe-back only when a pushed view is on top and it uses the
  // standard nav.pop back (capture runs its own unsaved-draft guard; review is
  // a native sheet with its own leave-confirm).
  const swipeBackEnabled = focused && !!top && top.name !== "capture" && top.name !== "review";

  // iOS-style left-edge swipe = back. The in-app stack isn't a native
  // navigator, so we drive nav.pop() from an edge Pan. runOnJS keeps the JS
  // callback valid with reanimated present; failOffsetY yields to scrolling.
  const backSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(18)
        .failOffsetY([-16, 16])
        .runOnJS(true)
        .onEnd((e) => {
          if (e.translationX > 60) nav.pop();
        }),
    [nav],
  );

  let content: React.ReactNode;
  if (tab === "speak") {
    content = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} pointerEvents={top ? "none" : "auto"} collapsable={false}>
          {focused ? <TalkScreen key={shell.speakKey} nav={nav} talkCtx={shell.talkCtx} /> : null}
        </View>
        {top ? <View style={styles.captureOverlay}>{renderView(top, nav)}</View> : null}
      </View>
    );
  } else if (libItemEntry) {
    const libProps = libItemEntry.props;
    content = (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} pointerEvents={captureOverLibItem ? "none" : "auto"} collapsable={false}>
          <LibItem
            key={String(libProps.id ?? "clip")}
            nav={nav}
            id={libProps.id as string}
            title={libProps.title as string | undefined}
            covered={captureOverLibItem}
          />
        </View>
        {captureOverLibItem && top ? (
          <View style={styles.captureOverlay}>
            {renderView(top, nav)}
          </View>
        ) : null}
      </View>
    );
  } else if (top?.name === "review") {
    // The review flow presents itself as a native pageSheet Modal; keep the
    // tab's base screen mounted underneath so the sheet slides over real
    // content instead of an empty background.
    content = (
      <View style={{ flex: 1 }}>
        {renderTab(tab, nav)}
        {renderView(top, nav)}
      </View>
    );
  } else if (top) {
    content = renderView(top, nav);
  } else {
    content = renderTab(tab, nav);
  }

  const showCaptureFab =
    focused &&
    tab !== "speak" &&
    tab !== "topics" &&
    top?.name !== "capture" &&
    top?.name !== "phrase" &&
    top?.name !== "review" &&
    top?.name !== "practiceHub" &&
    top?.name !== "rehearsal" &&
    top?.name !== "libItem" &&
    top?.name !== "editProfile" &&
    top?.name !== "firstLanguage" &&
    top?.name !== "feedbackFocus" &&
    top?.name !== "phrasesPerDay" &&
    top?.name !== "dailySpeakingGoal" &&
    top?.name !== "reminders" &&
    top?.name !== "studio" &&
    top?.name !== "studioTopic" &&
    top?.name !== "situation" &&
    top?.name !== "speakingNote";

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {content}
      {swipeBackEnabled ? (
        <GestureDetector gesture={backSwipe}>
          <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 22, zIndex: 90 }} />
        </GestureDetector>
      ) : null}
      {showCaptureFab ? <CaptureFab nav={nav} aboveTabs={false} /> : null}
      {focused && shell.notice ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: Math.max(insets.bottom, 12) + 20,
            alignItems: "center",
            zIndex: 120,
          }}
        >
          <View style={[{ minHeight: 42, borderRadius: 999, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.colors.pill }, t.shadowLg]}>
            <Icon name="check" s={15} w={2.6} c="#fff" />
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#fff" }}>{shell.notice.message}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function renderTab(tab: TabId, nav: Nav): React.ReactNode {
  switch (tab) {
    case "today":
      return <TodayScreen nav={nav} />;
    case "phrases":
      return <PhrasesScreen nav={nav} />;
    case "topics":
    case "sessions":
      return <StudioHomeScreen nav={nav} />;
    case "speak":
      return null; // handled in TabHost (needs focus + key)
  }
}

function renderView(entry: StackEntry, nav: Nav): React.ReactNode {
  const p = entry.props;
  switch (entry.name) {
    case "phrase":
      return <PhraseRoute nav={nav} item={p.item as PhraseItem | undefined} id={p.id as string | undefined} />;
    case "review":
      return <ReviewFlow nav={nav} item={p.item as PhraseItem | undefined} queue={p.queue as PhraseItem[] | undefined} />;
    case "practiceHub":
      return <PracticeHubScreen nav={nav} item={p.item as PhraseItem | undefined} />;
    case "rehearsal":
      return <QuickRehearsalScreen nav={nav} item={p.item as PhraseItem | undefined} />;
    case "island":
      return <IslandDetail nav={nav} id={p.id as string} />;
    case "newIsland":
      return <IslandCreate nav={nav} domainId={p.domainId as string | undefined} domainName={p.domainName as string | undefined} />;
    case "domain":
      return <DomainScreen nav={nav} id={p.id as string} name={p.name as string | undefined} />;
    case "story":
      return (
        <StoryScreen
          nav={nav}
          id={p.id as string}
          title={p.title as string | undefined}
          domainId={p.domainId as string | undefined}
          domainName={p.domainName as string | undefined}
        />
      );
    case "message":
      return <MessageScreen nav={nav} id={p.id as string | undefined} label={p.label as string | undefined} storyId={p.storyId as string | undefined} storyTitle={p.storyTitle as string | undefined} />;
    case "newMessage":
      return <MessageCreate nav={nav} storyId={p.storyId as string | undefined} storyTitle={p.storyTitle as string | undefined} />;
    case "recs":
      return <RecsScreen nav={nav} />;
    case "session":
      return <SessionDetail nav={nav} session={p.session as TalkSession | undefined} />;
    case "feedback":
      return <SessionFeedbackDetail nav={nav} feedbackId={p.id as string | undefined} />;
    case "library":
      return <LibraryScreen nav={nav} />;
    case "libItem":
      return <LibItem nav={nav} id={p.id as string} title={p.title as string | undefined} covered={p.covered === true} />;
    case "capture":
      return <PhraseCaptureScreen nav={nav} imageAsset={p.imageAsset as CaptureImageAsset | undefined} clipSeed={p.clipSeed as ClipCaptureSeed | undefined} />;
    case "settings":
      return <SettingsScreen nav={nav} />;
    case "editProfile":
      return <EditProfileScreen nav={nav} />;
    case "firstLanguage":
      return <FirstLanguageScreen nav={nav} />;
    case "englishLevel":
      return <EnglishLevelScreen nav={nav} />;
    case "themePref":
      return <ThemeScreen nav={nav} />;
    case "feedbackFocus":
      return <FeedbackFocusScreen nav={nav} />;
    case "phrasesPerDay":
      return <PhrasesPerDayScreen nav={nav} />;
    case "dailySpeakingGoal":
      return <DailySpeakingGoalScreen nav={nav} />;
    case "reminders":
      return <RemindersScreen nav={nav} />;
    case "privacy":
      return <PrivacyScreen nav={nav} />;
    case "studio":
      return <SpeakingStudioScreen nav={nav} />;
    case "studioTopic":
      return <StudioTopicScreen nav={nav} id={p.id as string} name={p.name as string | undefined} />;
    case "situation":
      return <StudioSituationScreen nav={nav} id={p.id as string} topicId={p.topicId as string} title={p.title as string | undefined} />;
    case "speakingNote":
      return <SpeakingNoteScreen nav={nav} id={p.id as string} />;
    case "topicsList":
      return <TopicsListScreen nav={nav} />;
    case "sessionsList":
      return <SessionsScreen nav={nav} stacked />;
  }
}

const styles = StyleSheet.create({
  captureOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
});
