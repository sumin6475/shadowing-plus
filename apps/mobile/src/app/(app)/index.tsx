import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Motif, TypeScale } from "@/constants/cobalt";
import { useAuth } from "@/lib/auth";
import { fetchJobs } from "@/lib/jobs";
import { useCobalt } from "@/hooks/use-cobalt";
import type { Job } from "@/types/api";

/**
 * Phase 0 smoke-test home. Proves the authed API path end to end: it calls
 * `GET /api/jobs` with the session Bearer token and renders the result. This
 * screen becomes the Library in Phase 1.
 */
export default function HomeScreen() {
  const c = useCobalt();
  const { session, signOut } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setJobs(await fetchJobs());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const email = session?.user.email ?? "signed in";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: c.text }]}>Your clips</Text>
          <Text style={[styles.subtitle, { color: c.text3 }]}>{email}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [
            styles.signOut,
            { borderColor: c.hairline, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.signOutText, { color: c.text2 }]}>Sign out</Text>
        </Pressable>
      </View>

      {jobs === null && !error ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
          <Pressable onPress={load} style={styles.retry}>
            <Text style={[styles.retryText, { color: c.accent }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={jobs ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.text3 }]}>
              No clips yet. Upload one from the web app to see it here.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: c.hairlineSoft }]}>
              <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.rowMeta, { color: c.text3 }]}>{item.status}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerText: { gap: 2, flexShrink: 1 },
  title: { fontSize: TypeScale.title1, fontWeight: "700" },
  subtitle: { fontSize: TypeScale.footnote },
  signOut: {
    height: Motif.buttonHeight.medium,
    paddingHorizontal: 16,
    borderRadius: Motif.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: { fontSize: TypeScale.subheadline, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  error: { fontSize: TypeScale.callout, textAlign: "center" },
  retry: { padding: 8 },
  retryText: { fontSize: TypeScale.headline, fontWeight: "600" },
  list: { paddingHorizontal: 20, flexGrow: 1 },
  empty: { fontSize: TypeScale.callout, textAlign: "center", paddingTop: 48 },
  row: {
    minHeight: Motif.row,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  rowTitle: { fontSize: TypeScale.body, flexShrink: 1 },
  rowMeta: { fontSize: TypeScale.footnote, textTransform: "capitalize" },
});
