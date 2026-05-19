"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MobilePractice, {
  type PracticeQueueItem,
} from "@/components/mobile/MobilePractice";
import DesktopPractice from "@/components/practice/DesktopPractice";
import MobileTabBar from "@/components/mobile/MobileTabBar";
import { PracticeIcon } from "@/components/mobile/Icons";

import "../home.css";
import "../mobile.css";
import "./practice.css";

interface PracticeRow {
  id: string;
  memo: string | null;
  ease_factor: number | null;
  interval_days: number | null;
  due_at: string | null;
  lapses: number | null;
  segment: {
    id: string;
    text: string;
    translation: string | null;
    start_time: number;
    end_time: number;
    video: {
      id: string;
      title: string;
      audio_url: string;
      folder: { id: string; name: string; color: string | null } | null;
    };
  } | null;
}

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeInner />
    </Suspense>
  );
}

function PracticeInner() {
  const params = useSearchParams();
  const mode = params.get("mode"); // 'all' or null
  const clipId = params.get("clip"); // optional filter
  const [queue, setQueue] = useState<PracticeQueueItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      let q = supabase
        .from("bookmarks")
        .select(
          "id, memo, ease_factor, interval_days, due_at, lapses, segment:segments(id, text, translation, start_time, end_time, video:videos!inner(id, title, audio_url, folder:folders(id, name, color)))",
        )
        .order("due_at", { ascending: true, nullsFirst: true });

      if (mode !== "all") {
        q = q.lte("due_at", new Date().toISOString());
      }

      const { data, error } = await q;
      if (error) {
        setErr(error.message);
        setQueue([]);
        return;
      }
      const rows = (data ?? []) as unknown as PracticeRow[];
      const filtered = clipId
        ? rows.filter((r) => r.segment?.video.id === clipId)
        : rows;

      const built: PracticeQueueItem[] = filtered.flatMap((r) => {
        if (!r.segment?.video) return [];
        const v = r.segment.video;
        return [
          {
            bookmarkId: r.id,
            segmentId: r.segment.id,
            videoId: v.id,
            videoTitle: v.title,
            audioUrl: v.audio_url,
            folder: v.folder
              ? { id: v.folder.id, color: v.folder.color }
              : null,
            folderName: v.folder?.name ?? null,
            startTime: r.segment.start_time,
            endTime: r.segment.end_time,
            text: r.segment.text,
            translation: r.segment.translation,
            note: r.memo,
            srs: {
              ease_factor: r.ease_factor ?? 2.5,
              interval_days: r.interval_days ?? 0,
              lapses: r.lapses ?? 0,
            },
          },
        ];
      });
      setQueue(built);
    }
    load();
  }, [mode, clipId]);

  if (queue === null) {
    return (
      <>
        <div className="m-app">
          <div className="m-content" style={{ paddingTop: 40, textAlign: "center", color: "var(--text-4)" }}>
            Loading…
          </div>
        </div>
        <DesktopShellMessage>
          <p style={{ color: "var(--text-4)", fontSize: 14 }}>Loading…</p>
        </DesktopShellMessage>
      </>
    );
  }

  if (err) {
    return (
      <>
        <div className="m-app">
          <div className="m-content" style={{ paddingTop: 40, textAlign: "center" }}>
            <p style={{ color: "var(--text-3)" }}>Couldn&apos;t load practice queue.</p>
            <p style={{ color: "var(--text-4)", fontSize: 12 }}>{err}</p>
            <p style={{ color: "var(--text-4)", fontSize: 12, marginTop: 12 }}>
              If this is the first time, apply migration{" "}
              <code>004_bookmarks_srs.sql</code> in Supabase.
            </p>
          </div>
        </div>
        <DesktopShellMessage title="Couldn&apos;t load practice queue">
          <p style={{ color: "var(--text-3)", margin: 0 }}>{err}</p>
          <p style={{ color: "var(--text-4)", fontSize: 13, marginTop: 12 }}>
            If this is the first run, apply migration{" "}
            <code>004_bookmarks_srs.sql</code> in Supabase.
          </p>
        </DesktopShellMessage>
      </>
    );
  }

  if (queue.length === 0) {
    return (
      <>
        <div className="m-app">
          <div className="m-bar">
            <div className="m-bar-spacer">
              <div className="m-bar-title">
                Shadowing<span className="plus">+</span>
              </div>
            </div>
          </div>
          <div className="m-content" style={{ textAlign: "center", gap: 16 }}>
            <h1 className="m-page-title" style={{ fontSize: 32 }}>
              Nothing due
            </h1>
            <p className="m-page-sub">
              {mode === "all"
                ? "You don't have any bookmarks yet."
                : "All caught up. Come back later — sentences will surface as their intervals elapse."}
            </p>
            {mode !== "all" && (
              <Link href="/practice?mode=all" className="m-fab" style={{ position: "static", display: "inline-flex" }}>
                <PracticeIcon /> Practice all anyway
              </Link>
            )}
            <Link href="/bookmarks" style={{ color: "var(--accent-text)", marginTop: 12 }}>
              ← Back to bookmarks
            </Link>
          </div>
          <MobileTabBar active="practice" />
        </div>
        <DesktopShellMessage title="Nothing due">
          <p style={{ color: "var(--text-3)", margin: 0, maxWidth: 440 }}>
            {mode === "all"
              ? "You don't have any bookmarks yet."
              : "All caught up. Come back later — sentences will surface as their intervals elapse."}
          </p>
          {mode !== "all" && (
            <Link
              href="/practice?mode=all"
              className="pr-done-btn primary"
              style={{ marginTop: 8 }}
            >
              Practice all anyway
            </Link>
          )}
          <Link href="/bookmarks" style={{ color: "var(--accent-text)", marginTop: 8 }}>
            ← Back to bookmarks
          </Link>
        </DesktopShellMessage>
      </>
    );
  }

  return (
    <>
      <MobilePractice initialQueue={queue} />
      <DesktopPractice initialQueue={queue} />
    </>
  );
}

function DesktopShellMessage({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pr-page">
      <div className="pr-bar">
        <div className="pr-bar-inner">
          <div className="pr-bar-left">
            <Link href="/bookmarks" className="pr-back" aria-label="Back">
              ←
            </Link>
            <div className="pr-crumb">
              <Link href="/bookmarks">Bookmarks</Link>
              <span className="sep">›</span>
              <span className="current">Practice all</span>
            </div>
          </div>
        </div>
      </div>
      <div
        className="pr-done"
        style={{ paddingTop: 120, justifyContent: "flex-start" }}
      >
        {title && <h1 className="pr-done-title">{title}</h1>}
        {children}
      </div>
    </div>
  );
}
