// search.tsx — global Search, opened by pulling down at the top of Phrases or
// Studio. Matches the learner's phrases and notes on-device (lib/search.ts).
// Ported from the cloud session's PR #11 onto the MVP screens.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT } from "@/design/mobile-tokens";
import { Text, TextInput } from "@/design/text";
import { useTheme } from "@/design/theme";
import { Icon } from "@/design/ui";
import { notePreview } from "@/lib/mvp";
import { loadSearchIndex, searchIndex, type SearchIndex } from "@/lib/search";
import { snippet } from "@/lib/search-model";
import { Row, SectionCard } from "./mvp";
import type { Nav } from "./nav";

// Opening a result pushes a view on top, which unmounts this screen. Keep the
// query and loaded data for the current visit so Back returns to the same
// results. A new pull starts a new visit (a new `visit` id).
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
      setError("Couldn’t load your phrases and notes. Check your connection and try again.");
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

  const results = useMemo(
    () => (index && query.trim() ? searchIndex(index, query) : null),
    [index, query],
  );

  let body: ReactNode;
  if (error) {
    body = (
      <View style={{ alignItems: "center", gap: 12, paddingTop: 48 }}>
        <Text style={{ fontSize: 15, color: t.colors.ink2, textAlign: "center" }}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => void load()} hitSlop={8}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 16, color: t.colors.acc }}>Try again</Text>
        </Pressable>
      </View>
    );
  } else if (!query.trim()) {
    body = <Hint>Search the phrases you kept and your Studio notes.</Hint>;
  } else if (!index) {
    body = <ActivityIndicator color={t.colors.acc} style={{ paddingTop: 48 }} />;
  } else if (!results || results.total === 0) {
    body = <Hint>{`No matches for “${query.trim()}”.`}</Hint>;
  } else {
    body = (
      <>
        {results.phrases.length ? (
          <SectionCard label={`Phrases · ${results.phrases.length}`}>
            {results.phrases.map((p, i) => (
              <ResultRow
                key={p.id}
                last={i === results.phrases.length - 1}
                title={p.text}
                subtitle={p.translation}
                onPress={() => nav.push("mvpPhrase", { id: p.id })}
              />
            ))}
          </SectionCard>
        ) : null}
        {results.notes.length ? (
          <SectionCard label={`Notes · ${results.notes.length}`}>
            {results.notes.map((n, i) => (
              <ResultRow
                key={n.id}
                last={i === results.notes.length - 1}
                title={n.title || "Untitled note"}
                subtitle={snippet(notePreview(n.body), query)}
                onPress={() => nav.push("mvpNote", { id: n.id })}
              />
            ))}
          </SectionCard>
        ) : null}
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 18,
          paddingTop: insets.top + 8,
          paddingBottom: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: t.colors.card,
            borderRadius: 9999,
            height: 44,
            paddingHorizontal: 16,
          }}
        >
          <Icon name="search" s={17} c={t.colors.ink3} />
          <TextInput
            autoFocus={!cached}
            value={query}
            onChangeText={setQuery}
            placeholder="Phrases and notes"
            placeholderTextColor={t.colors.ink3}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Search"
            style={{ flex: 1, minWidth: 0, paddingVertical: 0, fontSize: 16, color: t.colors.ink }}
          />
        </View>
        <Pressable accessibilityRole="button" onPress={nav.pop} hitSlop={8}>
          <Text style={{ fontFamily: FONT.semibold, fontSize: 16, color: t.colors.acc }}>Cancel</Text>
        </Pressable>
      </View>
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
  return (
    <Text
      style={{
        fontSize: 15,
        lineHeight: 21,
        color: t.colors.ink3,
        textAlign: "center",
        paddingTop: 48,
        paddingHorizontal: 12,
      }}
    >
      {children}
    </Text>
  );
}

function ResultRow({
  title,
  subtitle,
  last,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  last: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Row last={last}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.semibold, fontSize: 16, color: t.colors.ink }}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={{ fontSize: 14, color: t.colors.ink3 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name="chev" s={14} c={t.colors.ink2} />
      </Pressable>
    </Row>
  );
}
