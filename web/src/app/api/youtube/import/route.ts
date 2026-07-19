import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/pipeline/jobs";
import { getSessionUserId } from "@/lib/supabase-server";
import { putJson, jobKey } from "@/lib/r2";
import {
  mergeDuplicates,
  dropEmpty,
  fixTiming,
  regroupSentences,
} from "@/lib/pipeline/postprocess";
import { TRANSLATION_LANGUAGE_OPTIONS } from "@/lib/pipeline/languages";
import { canImportYoutube } from "@/lib/youtubeImport";
import type { PipelineSegment } from "@/lib/types";

const TARGET_NAMES = new Set<string>(TRANSLATION_LANGUAGE_OPTIONS);

export const maxDuration = 60;

/** Fetch with an abort timeout so a hung YouTube request can't stall the
 *  serverless function until the platform timeout. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * YouTube captions arrive as 2-line "rolling" display fragments that often
 * break a sentence mid-phrase ("...storage room and" / "not alone."). Only
 * regroup into real sentences when the track actually carries sentence
 * punctuation — auto-generated (ASR) tracks have none, and regrouping those
 * would collapse the whole video into a single segment.
 */
function captionsArePunctuated(segs: PipelineSegment[]): boolean {
  if (segs.length === 0) return false;
  let withPunct = 0;
  for (const s of segs) if (/[.!?…]/.test(s.text)) withPunct++;
  return withPunct / segs.length >= 0.2;
}

/**
 * Normalize raw caption fragments into clean, translatable segments: drop
 * rolling duplicates, remove empties, de-overlap timings, and (when the track
 * is punctuated) regroup fragments into whole sentences. Mirrors the relevant
 * subset of stage 3 postprocess, which YouTube jobs skip.
 */
function normalizeCaptions(
  segments: PipelineSegment[],
  duration: number | null,
): PipelineSegment[] {
  const lastEnd = segments.length ? segments[segments.length - 1].end : 0;
  const audioDuration = duration && duration > 0 ? duration : lastEnd + 5;

  let out = mergeDuplicates(segments);
  out = dropEmpty(out);
  out = fixTiming(out, audioDuration);
  if (captionsArePunctuated(out)) {
    out = regroupSentences(out);
    out = fixTiming(out, audioDuration);
  }
  return out;
}

function getYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  // A bare 11-char video id pasted on its own.
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // watch?v=, youtu.be/, embed/, v/, shorts/, live/, u/w/ forms.
  const regExp =
    /(?:youtu\.be\/|\/shorts\/|\/live\/|\/embed\/|\/v\/|u\/\w\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

// Decode basic + numeric HTML entities returned in subtitles
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

interface RawSubtitleSegment {
  index: number;
  text: string;
  start: number;
  end: number;
  words: null;
}

interface Json3Seg {
  utf8?: string;
}
interface Json3Event {
  segs?: Json3Seg[];
  tStartMs?: number;
  dDurationMs?: number;
}
interface Json3Body {
  events?: Json3Event[];
}

interface CaptionTrack {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
}
interface YtPlayerData {
  captions?: {
    playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
  };
  videoDetails?: { title?: string; lengthSeconds?: string };
}

/**
 * Fetch and parse a caption track. YouTube serves either the json3 format or
 * the legacy XML `timedtext` format depending on the baseUrl it handed back,
 * so we detect the shape from the response body rather than trusting `fmt`.
 */
async function fetchSubtitleSegments(
  baseUrl: string,
): Promise<RawSubtitleSegment[]> {
  // Force json3. The InnerTube ANDROID client hands back baseUrls that already
  // pin `fmt=srv3` (XML); `fmt` isn't part of the signed `sparams`, so swapping
  // it is safe and gives us the cleaner JSON shape.
  const url = /[?&]fmt=/.test(baseUrl)
    ? baseUrl.replace(/([?&])fmt=[^&]*/, "$1fmt=json3")
    : `${baseUrl}&fmt=json3`;
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch subtitle details from YouTube");
  }

  const body = (await res.text()).trim();
  if (!body) {
    throw new Error("Subtitle response from YouTube was empty.");
  }

  const segments: RawSubtitleSegment[] = [];
  let idx = 0;

  if (body.startsWith("{")) {
    // json3 format
    const subJson = JSON.parse(body) as Json3Body;
    for (const event of subJson.events || []) {
      if (!event.segs || event.segs.length === 0) continue;
      const text = decodeHtmlEntities(
        event.segs.map((s) => s.utf8 ?? "").join("").trim(),
      );
      if (!text || text === "\n") continue;
      const start = (event.tStartMs ?? 0) / 1000;
      if (!Number.isFinite(start)) continue;
      const duration = (event.dDurationMs ?? 0) / 1000;
      segments.push({ index: idx++, text, start, end: start + duration, words: null });
    }
  } else {
    // Strip residual tags + decode (timedtext is often double-encoded).
    const cleanText = (chunk: string) =>
      decodeHtmlEntities(decodeHtmlEntities(chunk.replace(/<[^>]+>/g, "")))
        .replace(/\s+/g, " ")
        .trim();

    // Legacy format: <text start="1.5" dur="3.2">caption text</text> (seconds)
    const textMatches = [
      ...body.matchAll(
        /<text[^>]*\bstart="([\d.]+)"(?:[^>]*\bdur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g,
      ),
    ];
    if (textMatches.length > 0) {
      for (const m of textMatches) {
        const start = parseFloat(m[1]);
        const duration = m[2] ? parseFloat(m[2]) : 0;
        const text = cleanText(m[3]);
        if (!text) continue;
        segments.push({ index: idx++, text, start, end: start + duration, words: null });
      }
    } else {
      // timedtext v3 format: <p t="1500" d="3200"><s>word</s>...</p> (ms)
      const pMatches = [
        ...body.matchAll(
          /<p[^>]*\bt="(\d+)"(?:[^>]*\bd="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g,
        ),
      ];
      for (const m of pMatches) {
        const start = parseInt(m[1], 10) / 1000;
        const duration = m[2] ? parseInt(m[2], 10) / 1000 : 0;
        const text = cleanText(m[3]);
        if (!text) continue;
        segments.push({ index: idx++, text, start, end: start + duration, words: null });
      }
    }
  }

  // Backfill any missing/zero end times from the next cue's start so AB-repeat
  // and karaoke highlighting have a sane window to work with.
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].end > segments[i].start) continue;
    const next = segments[i + 1];
    segments[i].end = next ? next.start : segments[i].start + 2;
  }

  return segments;
}

async function getYoutubeCaptionsTracklist(videoId: string) {
  // Try InnerTube API first
  try {
    const resp = await fetchWithTimeout("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
          },
        },
        videoId: videoId,
      }),
      headers: {
        "content-type": "application/json",
        "user-agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
      },
    });
    if (resp.ok) {
      const data = (await resp.json()) as YtPlayerData;
      const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      const title = data.videoDetails?.title || "YouTube Video";
      const duration = data.videoDetails?.lengthSeconds 
        ? parseInt(data.videoDetails.lengthSeconds, 10) 
        : null;
      if (tracks && tracks.length > 0) {
        return { tracks, title, duration };
      }
    }
  } catch (e) {
    console.error("InnerTube fetch failed:", e);
  }

  // Fallback to HTML scraping
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await response.text();

  let playerResponse: YtPlayerData | null = null;
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (match) {
    try {
      playerResponse = JSON.parse(match[1]);
    } catch {}
  }
  if (!playerResponse) {
    const match2 = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*</);
    if (match2) {
      try {
        playerResponse = JSON.parse(match2[1]);
      } catch {}
    }
  }
  if (!playerResponse) {
    const tracksMatch = html.match(/"captionTracks"\s*:\s*(\[.+?\])/);
    if (tracksMatch) {
      try {
        const captionTracks = JSON.parse(tracksMatch[1]);
        playerResponse = { captions: { playerCaptionsTracklistRenderer: { captionTracks } } };
      } catch {}
    }
  }

  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  let title = "YouTube Video";
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    title = titleMatch[1].replace(" - YouTube", "");
  }
  if (playerResponse?.videoDetails?.title) {
    title = playerResponse.videoDetails.title;
  }
  const duration = playerResponse?.videoDetails?.lengthSeconds 
    ? parseInt(playerResponse.videoDetails.lengthSeconds, 10) 
    : null;

  if (!tracks || tracks.length === 0) {
    throw new Error("No captions found for this video. Please make sure the video has subtitles/captions enabled.");
  }

  return { tracks, title, duration };
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Personal-use tool, gated to the owner allowlist (see lib/youtubeImport.ts).
  // 404 rather than 403 so the endpoint doesn't advertise itself to non-owners.
  if (!canImportYoutube(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { url, targetLang } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Missing YouTube URL" }, { status: 400 });
    }
    // YouTube import always pulls the English caption track (see track
    // selection below), so source stays English; only the translation target
    // is user-selectable. Validate against the option list, else DB default.
    const target =
      typeof targetLang === "string" && TARGET_NAMES.has(targetLang)
        ? targetLang
        : undefined;

    const videoId = getYoutubeVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    let tracks: CaptionTrack[];
    let title: string;
    let duration: number | null;
    try {
      const res = await getYoutubeCaptionsTracklist(videoId);
      tracks = res.tracks;
      title = res.title;
      duration = res.duration;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Try to find English captions
    let track = tracks.find((t) => t.languageCode === "en" && t.kind !== "asr");
    if (!track) {
      track = tracks.find((t) => t.languageCode === "en");
    }
    if (!track) {
      track = tracks.find((t) => t.languageCode?.startsWith("en"));
    }
    if (!track) {
      track = tracks[0]; // Fallback to first track
    }

    if (!track || !track.baseUrl) {
      return NextResponse.json({ error: "No usable captions found for this video." }, { status: 400 });
    }

    // Fetch + parse the transcript (handles both json3 and legacy XML).
    let segments: RawSubtitleSegment[];
    try {
      segments = await fetchSubtitleSegments(track.baseUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      return NextResponse.json(
        { error: msg || "Failed to fetch subtitle details from YouTube" },
        { status: 400 },
      );
    }

    if (segments.length === 0) {
      return NextResponse.json({ error: "No text segments extracted from subtitles." }, { status: 400 });
    }

    // Clean up rolling fragments → de-overlap timings → regroup into sentences
    // (when punctuated). This is what makes the downstream 1:1 translation
    // reliable and the shadowing lines whole.
    const processed = normalizeCaptions(segments, duration);
    if (processed.length === 0) {
      return NextResponse.json({ error: "No text segments extracted from subtitles." }, { status: 400 });
    }

    // Titles scraped from HTML/InnerTube can carry HTML entities (&amp; etc.).
    const cleanTitle =
      decodeHtmlEntities(String(title ?? "")).trim() || "YouTube Video";

    // Create the job record in Supabase
    const job = await createJob({
      title: cleanTitle,
      media_type: "video",
      source_key: `youtube://${videoId}`,
      user_id: userId,
      // source stays at the DB default (eng); only the translation target is
      // user-selectable for YouTube imports.
      target_lang: target,
    });

    // Write segments.json to R2
    await putJson(jobKey(job.id, "segments.json"), {
      audio_duration_secs: duration,
      segments: processed,
    });

    return NextResponse.json({
      jobId: job.id,
      title: job.title,
    });

  } catch (err) {
    console.error("YouTube import error:", err);
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json(
      { error: msg || "Failed to import YouTube video" },
      { status: 500 },
    );
  }
}
