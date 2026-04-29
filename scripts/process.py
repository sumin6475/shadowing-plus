#!/usr/bin/env python3
"""
Shadowing Plus - Local processing pipeline

Video → Audio extraction → Transcription → Translation → Supabase upload
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import requests
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
VIBE_API_PORT = os.environ.get("VIBE_API_PORT", "65224")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


def extract_audio(video_path: str, output_path: str) -> None:
    """Extract audio (mp3) from video using FFmpeg"""
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "libmp3lame", "-q:a", "4",
        "-y", output_path,
    ]
    print(f"[1/4] Extracting audio: {video_path}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FFmpeg error:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"  → Done: {output_path}")


def get_audio_duration(audio_path: str) -> float:
    """Get audio duration in seconds using FFprobe"""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "json", audio_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def _normalize(text: str) -> str:
    """Normalize text for comparison: lowercase, collapse whitespace"""
    return re.sub(r'\s+', ' ', text.strip().lower())


def _is_mostly_latin(text: str) -> bool:
    """Check if text is mostly Latin characters (filters non-English hallucinations)"""
    latin = sum(1 for c in text if c.isascii() and c.isalpha())
    total = sum(1 for c in text if c.isalpha())
    return latin / total > 0.5 if total > 0 else False


def postprocess_segments(segments: list[dict], audio_duration: float) -> list[dict]:
    """Postprocess Whisper output: empty segments, abnormal lengths, timing collapse, non-English hallucinations"""
    if not segments:
        return segments

    result = list(segments)

    # 1. Remove empty/meaningless segments
    result = [s for s in result if _normalize(s["text"]) and len(_normalize(s["text"])) > 1]

    # 2. Fix abnormally long segments (>60s)
    for i, seg in enumerate(result):
        if seg["end"] - seg["start"] > 60.0:
            if i + 1 < len(result):
                seg["end"] = result[i + 1]["start"]
            else:
                seg["end"] = seg["start"] + 15.0

    # (Removed: timing collapse redistribution — caused false positives
    #  that destroyed accurate Vibe timestamps. Trust Vibe output instead.)

    # 4. Remove non-English hallucinations
    before = len(result)
    result = [s for s in result if _is_mostly_latin(s["text"])]
    if len(result) < before:
        print(f"  → Removed non-English hallucinations: {before} → {len(result)}")

    # 5. Sanity-check end_time (preserve Vibe values; only cap extreme outliers)
    for i, seg in enumerate(result):
        # Don't let end exceed audio duration or next segment's start
        if i + 1 < len(result):
            seg["end"] = min(seg["end"], result[i + 1]["start"])
        seg["end"] = min(seg["end"], audio_duration)
        seg["end"] = max(seg["end"], seg["start"] + 0.5)

    # 6. Reindex
    for i, seg in enumerate(result):
        seg["index"] = i

    return result


def _resolve_model_path() -> str:
    """Find ggml*.bin model file in model/ directory"""
    path = os.environ.get("VIBE_MODEL_PATH", "")
    if path:
        return path
    model_dir = Path(__file__).parent.parent / "model"
    bins = sorted(model_dir.glob("ggml*.bin"))
    if bins:
        return str(bins[0])
    print("Model file not found. Place a ggml*.bin file in the model/ directory.", file=sys.stderr)
    sys.exit(1)


def _load_model(port: str, model_path: str) -> None:
    """Load model via Vibe Sona API (POST /v1/models/load)"""
    url = f"http://127.0.0.1:{port}/v1/models/load"
    resp = requests.post(url, json={"path": model_path}, timeout=120)
    if resp.status_code != 200:
        print(f"Model load failed ({resp.status_code}):\n{resp.text}", file=sys.stderr)
        sys.exit(1)
    print(f"  Model loaded: {resp.json().get('model', model_path)}")


def transcribe(audio_path: str, port: str) -> list[dict]:
    """Transcribe audio via Vibe local API"""
    print(f"[2/4] Transcribing (Vibe port={port})...")

    # Load model
    model_path = _resolve_model_path()
    _load_model(port, model_path)

    url = f"http://127.0.0.1:{port}/v1/audio/transcriptions"
    with open(audio_path, "rb") as f:
        resp = requests.post(
            url,
            files={"file": (Path(audio_path).name, f, "audio/mpeg")},
            data=[
                ("model", model_path),
                ("response_format", "verbose_json"),
                ("word_timestamps", "true"),
            ],
            timeout=600,
        )

    if resp.status_code != 200:
        print(f"Vibe API error ({resp.status_code}):\n{resp.text}", file=sys.stderr)
        sys.exit(1)

    data = resp.json()
    segments = data.get("segments", [])

    print(f"  → Done: {len(segments)} segments")
    return segments


def translate_batch(
    segments: list[dict],
    batch_size: int = 5,
    model: str = "gpt-4o-mini",
) -> list[dict]:
    """Batch translate segments + generate word meanings via GPT-4o-mini"""
    print(f"[3/4] Translating (model={model}, batch={batch_size})...")
    results = []

    for i in range(0, len(segments), batch_size):
        batch = segments[i : i + batch_size]
        batch_indices = list(range(i, i + len(batch)))

        # Context sentences
        context_before = segments[i - 1]["text"] if i > 0 else ""
        context_after = segments[i + len(batch)]["text"] if i + len(batch) < len(segments) else ""

        segments_text = "\n".join(
            f"- {seg['text']}" for seg in batch
        )

        prompt = f"""You are a translation assistant for English language learners (Korean speakers).

For each segment, provide a natural Korean translation that captures the context and nuance (NOT machine-literal translation).

Context before: {context_before}
Context after: {context_after}

Segments:
{segments_text}

Output format (JSON only, no markdown):
Return segments in the SAME ORDER as the input. Do not reorder or skip any.
{{
  "segments": [
    {{
      "translation": "Korean translation here"
    }}
  ]
}}

Rules:
- Translation should sound natural in Korean, not word-by-word
- Consider surrounding sentences for context"""

        resp = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        content = resp.choices[0].message.content
        parsed = json.loads(content)

        # Position-based mapping (does not rely on GPT's returned index)
        for batch_pos, item in enumerate(parsed.get("segments", [])):
            if batch_pos >= len(batch):
                break
            original_seg = batch[batch_pos]
            global_idx = batch_indices[batch_pos]

            # Use Vibe word timestamps directly
            vibe_words = [
                {"word": w.get("word", ""), "start": w.get("start"), "end": w.get("end")}
                for w in original_seg.get("words", [])
                if w.get("word", "").strip()
            ]

            results.append({
                "index": global_idx,
                "text": original_seg["text"],
                "start": original_seg["start"],
                "end": original_seg["end"],
                "translation": item.get("translation", "[translation failed]"),
                "words": vibe_words if vibe_words else None,
            })

        # Fill placeholders for segments GPT failed to return
        got = min(len(parsed.get("segments", [])), len(batch))
        if got < len(batch):
            print(f"  ⚠ GPT returned {got}/{len(batch)} — filling placeholders for the rest")
            for k in range(got, len(batch)):
                seg = batch[k]
                results.append({
                    "index": batch_indices[k],
                    "text": seg["text"],
                    "start": seg["start"],
                    "end": seg["end"],
                    "translation": "[translation failed]",
                    "words": None,
                })

        done = min(i + batch_size, len(segments))
        print(f"  → {done}/{len(segments)} segments done")

    return results


def upload_to_supabase(
    audio_path: str,
    title: str,
    duration: float,
    segments: list[dict],
    local_video_path: str | None = None,
) -> str:
    """Upload audio + data to Supabase"""
    print("[4/4] Uploading to Supabase...")

    # 0. Delete existing data with the same title (for reprocessing)
    existing = supabase.table("videos").select("id").eq("title", title).execute()
    if existing.data:
        old_ids = [v["id"] for v in existing.data]
        print(f"  → Deleting existing data ({len(old_ids)} video(s))...")
        # segments & bookmarks are deleted via ON DELETE CASCADE
        for old_id in old_ids:
            supabase.table("videos").delete().eq("id", old_id).execute()

    # 1. Upload audio file (delete existing then re-upload)
    audio_filename = Path(audio_path).name
    storage_path = f"audio/{audio_filename}"

    try:
        supabase.storage.from_("audio").remove([storage_path])
    except Exception:
        pass  # Ignore if file doesn't exist

    with open(audio_path, "rb") as f:
        supabase.storage.from_("audio").upload(
            storage_path,
            f,
            file_options={"content-type": "audio/mpeg"},
        )

    audio_url = f"{SUPABASE_URL}/storage/v1/object/public/audio/{storage_path}"
    print(f"  → Audio uploaded: {audio_url}")

    # 2. Create video record
    video_data = {
        "title": title,
        "duration": duration,
        "audio_url": audio_url,
    }
    if local_video_path:
        video_data["local_video_path"] = local_video_path
    video_resp = supabase.table("videos").insert(video_data).execute()

    video_id = video_resp.data[0]["id"]
    print(f"  → Video record created: {video_id}")

    # 3. Bulk insert segments
    segment_rows = [
        {
            "video_id": video_id,
            "index": seg["index"],
            "start_time": seg["start"],
            "end_time": seg["end"],
            "text": seg["text"],
            "translation": seg["translation"],
            "words": seg["words"],
        }
        for seg in segments
    ]

    batch_size = 100
    for i in range(0, len(segment_rows), batch_size):
        batch = segment_rows[i : i + batch_size]
        supabase.table("segments").insert(batch).execute()

    print(f"  → {len(segment_rows)} segments uploaded")
    return video_id


def main():
    parser = argparse.ArgumentParser(description="Shadowing Plus - Video processing pipeline")
    parser.add_argument("video", help="Path to video file")
    parser.add_argument("--title", required=True, help="Video title")
    parser.add_argument("--vibe-port", default=VIBE_API_PORT, help="Vibe API port")
    parser.add_argument("--model", default="gpt-4o-mini", help="Translation model (default: gpt-4o-mini)")
    parser.add_argument("--batch-size", type=int, default=5, help="Translation batch size")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run transcription + postprocess only, print segments (no GPT calls)")
    args = parser.parse_args()

    video_path = os.path.abspath(args.video)
    if not os.path.isfile(video_path):
        print(f"File not found: {video_path}", file=sys.stderr)
        sys.exit(1)

    # 1. Extract audio
    with tempfile.TemporaryDirectory() as tmpdir:
        audio_filename = Path(video_path).stem + ".mp3"
        audio_path = os.path.join(tmpdir, audio_filename)
        extract_audio(video_path, audio_path)

        # Audio duration
        duration = get_audio_duration(audio_path)
        print(f"  Duration: {duration:.1f}s ({duration/60:.1f}min)")

        # 2. Transcription
        raw_segments = transcribe(audio_path, args.vibe_port)

        # 2-1. Merge consecutive duplicate segments
        # Whisper hallucination: same text repeated in consecutive segments
        # Only merge consecutive duplicates; preserve intentional repetitions with other sentences in between
        deduped: list[dict] = []
        for seg in raw_segments:
            norm = _normalize(seg["text"])
            if not norm:
                continue
            if deduped and _normalize(deduped[-1]["text"]) == norm:
                deduped[-1]["end"] = seg["end"]
            else:
                deduped.append(seg)
        if len(deduped) < len(raw_segments):
            print(f"  → Dedup: {len(raw_segments)} → {len(deduped)} segments")
        raw_segments = deduped

        # 2-2. Whisper postprocessing (timing collapse, abnormal lengths, non-English hallucinations)
        raw_segments = postprocess_segments(raw_segments, duration)
        print(f"  → Postprocessed: {len(raw_segments)} segments")

        if args.dry_run:
            print(f"\n[DRY RUN] {len(raw_segments)} segments:")
            for seg in raw_segments:
                print(f"  [{seg.get('index', '?')}] {seg['start']:.2f}-{seg['end']:.2f}  {seg['text'].strip()}")
            print("\nSkipping translation and upload.")
            sys.exit(0)

        # 3. Translate + word meanings
        translated = translate_batch(raw_segments, args.batch_size, args.model)

        # 4. Upload to Supabase
        video_id = upload_to_supabase(
            audio_path, args.title, duration, translated,
            local_video_path=video_path,
        )

    print(f"\n✅ Done! Video ID: {video_id}")
    print(f"   View in web app: /player/{video_id}")


if __name__ == "__main__":
    main()
