"use client";

import { useCallback, useImperativeHandle, useRef, useState, forwardRef } from "react";
import type { MediaType } from "@/lib/types";
import { UploadIcon } from "./home/Icons";

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v"]);
const AUDIO_EXTS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"]);

function detectMediaType(filename: string, contentType: string): MediaType | null {
  const lower = filename.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf("."));
  if (VIDEO_EXTS.has(ext)) return "video";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  return null;
}

function deriveTitle(filename: string): string {
  const lastSlash = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
  const base = filename.slice(lastSlash + 1);
  const dot = base.lastIndexOf(".");
  return (dot > 0 ? base.slice(0, dot) : base).trim() || "Untitled";
}

export interface UploadDropzoneHandle {
  pick: () => void;
}

interface Props {
  onJobQueued: () => void;
}

const UploadDropzone = forwardRef<UploadDropzoneHandle, Props>(
  function UploadDropzone({ onJobQueued }, ref) {
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      pick: () => inputRef.current?.click(),
    }));

    const handleFiles = useCallback(
      async (files: FileList | File[]) => {
        const list = Array.from(files);
        if (list.length === 0) return;
        setError(null);
        setUploading(true);

        try {
          for (const file of list) {
            const mediaType = detectMediaType(file.name, file.type);
            if (!mediaType) {
              setError(`Unsupported file type: ${file.name}`);
              continue;
            }
            const title = deriveTitle(file.name);

            const presignRes = await fetch("/api/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                filename: file.name,
                contentType:
                  file.type || (mediaType === "video" ? "video/mp4" : "audio/mpeg"),
                mediaType,
              }),
            });
            if (!presignRes.ok) {
              const body = await presignRes.json().catch(() => ({}));
              throw new Error(`Upload init failed: ${body.error ?? presignRes.status}`);
            }
            const { jobId, uploadUrl } = (await presignRes.json()) as {
              jobId: string;
              uploadUrl: string;
            };

            const putRes = await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: {
                "Content-Type":
                  file.type || (mediaType === "video" ? "video/mp4" : "audio/mpeg"),
              },
            });
            if (!putRes.ok) {
              throw new Error(`R2 upload failed (${putRes.status})`);
            }

            fetch(`/api/jobs/${jobId}/run`, { method: "POST" }).catch((e) => {
              console.error("run failed", e);
            });
          }
          onJobQueued();
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        } finally {
          setUploading(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      },
      [onJobQueued],
    );

    return (
      <div
        className={"dropzone" + (dragging ? " is-dragging" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
        <div className="dropzone-icon">
          <UploadIcon />
        </div>
        <div className="dropzone-body">
          <div className="dropzone-title">
            {uploading
              ? "Uploading…"
              : dragging
                ? "Drop to upload"
                : "Drop a video or audio file, or click to choose"}
          </div>
          <div className="dropzone-sub">
            Title is taken from the filename — you can rename later.
          </div>
          {error && <div className="dropzone-error">{error}</div>}
        </div>
        <div className="dropzone-meta">
          <span className="dropzone-formats">MP4 · MP3 · WAV · M4A · MOV</span>
        </div>
      </div>
    );
  },
);

export default UploadDropzone;
