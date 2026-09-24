// search.tsx — global Search, opened by pulling down at the top of Today,
// Phrases, or Studio. Searches phrases and Studio topics, situations, and
// speaking notes on-device (lib/search.ts).
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/design/theme";
import { Card, Icon } from "@/design/ui";
import { loadSearchIndex, searchIndex, snippet, type SearchIndex } from "@/lib/search";
import type { Nav } from "./nav";

// Opening a result pushes a view on top, which unmounts this screen. Keep the
// query and loaded data for the current Search visit so Back returns to the
// same results. A new pull starts a new visit (a new `visit` id).
let visitCache: { visit: number; query: string; index: SearchIndex | null } | null = null;

export function SearchScreen({ nav, visit }: { nav: Nav; visit: number }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const cached = visitCache?.visit === visit ? visitCache : null;
  const [query, setQuery] = useState(cached?.query ?? "");
  const [index, setIndex] = useState<SearchIndex | null>(cached?.index ?? null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setIndex(await loadSearchIndex());
    } catch {
      setError("Couldn’t load your library. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    if (index) return;
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [index, load]);

  useEffect(() => {
    visitCache = { visit, query, index };
  }, [visit, query, index]);

  const results = useMemo(() => (index && query.trim() ? searchIndex(index, query) : null), [index, query]);

  const searchBar = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: insets.top + 8, paddingBottom: 10 }}>
      <View
        style={[
          {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: t.colors.card,
            borderRadius: 9999,
            height: 44,
            paddingHorizontal: 16,
            borderWidth: 0.5,
            borderColor: t.ring,
          },
          t.shadowCard,
        ]}
      >
        <Icon name="search" s={17} c={t.colors.ink3} />
        <TextInput
          autoFocus={!cached}
          value={query}
          onChangeText={setQuery}
          placeholder="Phrases, topics, notes"
          placeholderTextColor={t.colors.ink3}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel="Search"
          style={{ flex: 1, minWidth: 0, margin: 0, paddingVertical: 0, fontSize: 15, lineHeight: 20, color: t.colors.ink }}
        />
      </View>
      <Pressable accessibilityRole="button" onPress={nav.pop} hitSlop={8}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.accD }}>Cancel</Text>
      </Pressable>
    </View>
  );

  let body: ReactNode;
  if (error) {
    body = (
      <View style={{ alignItems: "center", gap: 12, paddingTop: 48 }}>
        <Text style={{ fontSize: 15, color: t.colors.ink2, textAlign: "center" }}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => void load()} hitSlop={8}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.accD }}>Try again</Text>
        </Pressable>
      </View>
    );
  } else if (!query.trim()) {
    body = <Hint>Search the phrases you kept and your Studio topics, situations, and notes.</Hint>;
  } else if (!index) {
    body = <ActivityIndicator color={t.colors.acc} style={{ paddingTop: 48 }} />;
  } else if (!results || results.total === 0) {
    body = <Hint>{`No matches for “${query.trim()}”.`}</Hint>;
  } else {
    body = (
      <>
        <Group title="Phrases" count={results.phrases.length}>
          {results.phrases.map((p) => (
            <ResultRow
              key={p.id}
              title={p.text}
              subtitle={p.translation}
              onPress={() => nav.push("phrase", { item: p })}
            />
          ))}
        </Group>
        <Group title="Speaking notes" count={results.notes.length}>
          {results.notes.map((n) => (
            <ResultRow
              key={n.id}
              title={n.title}
              subtitle={snippet(n.body || n.goal, query) ?? [n.topicName, n.situationTitle].filter(Boolean).join(" · ")}
              onPress={() => nav.push("speakingNote", { id: n.id })}
            />
          ))}
        </Group>
        <Group title="Situations" count={results.situations.length}>
          {results.situations.map((s) => (
            <ResultRow
              key={s.id}
              title={s.title}
              subtitle={s.topicName}
              onPress={() => nav.push("situation", { id: s.id, topicId: s.topicId, title: s.title })}
            />
          ))}
        </Group>
        <Group title="Topics" count={results.topics.length}>
          {results.topics.map((topic) => (
            <ResultRow
              key={topic.id}
              title={topic.name}
              subtitle={`${topic.situationCount} ${topic.situationCount === 1 ? "situation" : "situations"}`}
              onPress={() => nav.push("studioTopic", { id: topic.id, name: topic.name })}
            />
          ))}
        </Group>
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {searchBar}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 32, gap: t.gap }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </View>
  );
}

function Hint({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink3, textAlign: "center", paddingTop: 48, paddingHorizontal: 12 }}>{children}</Text>;
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const t = useTheme();
  if (count === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 6 }}>
        {`${title.toUpperCase()} · ${count}`}
      </Text>
      {children}
    </View>
  );
}

function ResultRow({ title, subtitle, onPress }: { title: string; subtitle?: string | null; onPress: () => void }) {
  const t = useTheme();
  return (
    <Card onPress={onPress} style={{ paddingVertical: 11, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", letterSpacing: -0.1, color: t.colors.ink }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13.5, color: t.colors.ink2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />
    </Card>
  );
}
