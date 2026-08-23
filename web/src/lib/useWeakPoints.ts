"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  nextWeakPointPosition,
  normalizeCategory,
  sortWeakPoints,
  starredWeakPoints,
  type WeakPoint,
  type WeakPointPatch,
} from "@/lib/weak-points";

const MIGRATION_HINT =
  "Couldn't save. Apply supabase/migrations/022_weak_points.sql in the Supabase SQL Editor.";

function isMissingTable(message: string): boolean {
  return /weak_points|schema cache|does not exist/i.test(message);
}

export function useWeakPoints() {
  const [items, setItems] = useState<WeakPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("weak_points")
      .select("*")
      .order("position")
      .order("created_at");
    if (err) {
      setError(isMissingTable(err.message) ? MIGRATION_HINT : err.message);
      setItems([]);
    } else {
      setError(null);
      setItems(sortWeakPoints((data ?? []) as WeakPoint[]));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("weak_points")
        .select("*")
        .order("position")
        .order("created_at");
      if (cancelled) return;
      if (err) {
        setError(isMissingTable(err.message) ? MIGRATION_HINT : err.message);
        setItems([]);
      } else {
        setError(null);
        setItems(sortWeakPoints((data ?? []) as WeakPoint[]));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(
    async (input: { text: string; category?: string | null; starred?: boolean }) => {
      const text = input.text.trim();
      if (!text) return null;
      const row = {
        text: text.slice(0, 240),
        category: normalizeCategory(input.category),
        starred: input.starred ?? false,
        completed: false,
        position: nextWeakPointPosition(items),
      };
      const { data, error: err } = await supabase
        .from("weak_points")
        .insert(row)
        .select()
        .single();
      if (err) {
        setError(isMissingTable(err.message) ? MIGRATION_HINT : err.message);
        return null;
      }
      const created = data as WeakPoint;
      setItems((prev) => sortWeakPoints([...prev, created]));
      setError(null);
      return created;
    },
    [items],
  );

  const update = useCallback(async (id: string, patch: WeakPointPatch) => {
    const nextPatch = {
      ...patch,
      ...(patch.category !== undefined
        ? { category: normalizeCategory(patch.category) }
        : {}),
      ...(patch.text !== undefined ? { text: patch.text.trim().slice(0, 240) } : {}),
      updated_at: new Date().toISOString(),
    };
    setItems((prev) =>
      sortWeakPoints(
        prev.map((item) => (item.id === id ? { ...item, ...nextPatch } : item)),
      ),
    );
    const { error: err } = await supabase
      .from("weak_points")
      .update(nextPatch)
      .eq("id", id);
    if (err) {
      setError(isMissingTable(err.message) ? MIGRATION_HINT : err.message);
      await refresh();
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const { error: err } = await supabase.from("weak_points").delete().eq("id", id);
    if (err) {
      setError(isMissingTable(err.message) ? MIGRATION_HINT : err.message);
      await refresh();
    }
  }, [refresh]);

  const starred = useMemo(() => starredWeakPoints(items), [items]);

  return { items, starred, loading, error, refresh, add, update, remove };
}
