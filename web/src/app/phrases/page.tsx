"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "../home.css";
import "./phrases.css";

type PhraseItem = {
  id: string;
  text: string;
  kind: string;
  meaning_ko: string | null;
  usage_note: string | null;
  start_time: number | null;
  status: "pending" | "ready" | "failed";
  created_at: string;
  video: { title: string; video_url: string | null } | null;
};

export default function PhrasesPage() {
  const [items, setItems] = useState<PhraseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("phrase_items")
      .select("id, text, kind, meaning_ko, usage_note, start_time, status, created_at, video:videos(title, video_url)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as unknown as PhraseItem[]);
        setLoading(false);
      });
  }, []);

  return (
    <main className="home-app phrase-bank-page">
      <header className="phrase-bank-head">
        <div>
          <Link href="/app" className="phrase-bank-brand">Shadowing<span>+</span></Link>
          <p className="eyebrow">VOCABULARY</p>
          <h1>Phrase Bank</h1>
          <p>Expressions you saved with their meaning in context.</p>
        </div>
        <Link href="/app" className="phrase-back">← Back to home</Link>
      </header>

      {loading ? <p className="phrase-empty">Loading Phrase Bank…</p> : items.length === 0 ? (
        <section className="phrase-empty">
          <h2>Nothing saved yet</h2>
          <p>Select a phrase inside a prepared YouTube subtitle, then choose <b>Save phrase</b>.</p>
        </section>
      ) : (
        <section className="phrase-bank-list" aria-label="Saved phrases">
          {items.map((item) => {
            const href = item.video?.video_url && item.start_time !== null
              ? `${item.video.video_url}&t=${Math.floor(item.start_time)}`
              : item.video?.video_url;
            return <article className="phrase-bank-card" key={item.id}>
              <div className="phrase-bank-top">
                <h2>{item.text}</h2>
                <span>{item.kind.replace(/_/g, " ")}</span>
              </div>
              {item.status === "ready" ? <>
                <p className="phrase-bank-meaning">{item.meaning_ko}</p>
                {item.usage_note && <p className="phrase-bank-note">{item.usage_note}</p>}
              </> : <p className="phrase-bank-pending">{item.status === "failed" ? "Explanation could not be generated." : "Explaining this phrase…"}</p>}
              {href && <a href={href} target="_blank" rel="noreferrer" className="phrase-bank-source">{item.video?.title ?? "Open source video"} ↗</a>}
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
