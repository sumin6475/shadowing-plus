"use client";

import { useCallback, useState } from "react";
import type { MediaType } from "@/lib/types";

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

interface UseUpload {
  handleFiles: (files: FileList | File[]) => Promise<void>;
  uploading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
}

/**
 * Shared upload pipeline (presign → PUT to R2 → kick off the job).
 * Lives in a hook so both the desktop dropzone and the mobile shell can
 * own their own <input type="file"> — the mobile input must render inside
 * the visible `.m-app` subtree, since a file input nested in a
 * `display:none` ancestor never fires `change` on mobile browsers.
 */
export function useUpload(onJobQueued: () => void): UseUpload {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }
    },
    [onJobQueued],
  );

  return { handleFiles, uploading, error, setError };
}
