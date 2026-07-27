import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { GROQ_USD_PER_MINUTE } from "@/lib/usage";

const CALLBACK_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX_DURATION_SECONDS = 60 * 60;

export interface AsrEstimate {
  asrUsd: number;
  translationUsd: number;
  totalUsd: number;
}

export interface YoutubeAsrWorkerRequest {
  jobId: string;
  videoId: string;
  videoUrl: string;
  expectedDurationSeconds: number;
  uploadUrl: string;
  callbackUrl: string;
  issuedAt: number;
  nonce: string;
}

function secret(): string | null {
  return process.env.YOUTUBE_ASR_WORKER_SECRET || null;
}

export function youtubeAsrWorkerUrl(): string | null {
  const value = process.env.YOUTUBE_ASR_WORKER_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost" ? url.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

export function youtubeAsrConfigured(): boolean {
  return Boolean(youtubeAsrWorkerUrl() && secret());
}

export function youtubeAsrMaxDurationSeconds(): number {
  const value = Number(process.env.YOUTUBE_ASR_MAX_DURATION_SECONDS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_MAX_DURATION_SECONDS;
}

export function canonicalYoutubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const id = host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : (host === "youtube.com" || host.endsWith(".youtube.com"))
        ? url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/)?.[1]
        : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function canonicalYoutubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function estimateYoutubeAsrCost(durationSeconds: number): AsrEstimate {
  const minutes = Math.max(1, Math.ceil(Math.max(0, durationSeconds) / 60));
  const inputTokens = minutes * 420 + 1_500;
  const outputTokens = minutes * 230 + 250;
  const translationUsd = inputTokens * 0.15 / 1e6 + outputTokens * 0.6 / 1e6;
  const asrUsd = minutes * GROQ_USD_PER_MINUTE;
  return { asrUsd, translationUsd, totalUsd: asrUsd + translationUsd };
}

function signatureFor(body: string, timestamp: string, workerSecret: string): string {
  return createHmac("sha256", workerSecret).update(`${timestamp}.${body}`).digest("hex");
}

export function signYoutubeAsrPayload(payload: YoutubeAsrWorkerRequest): { body: string; timestamp: string; signature: string } {
  const workerSecret = secret();
  if (!workerSecret) throw new Error("Private ASR worker is not configured.");
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  return { body, timestamp, signature: signatureFor(body, timestamp, workerSecret) };
}

export function verifyYoutubeAsrSignature(body: string, timestamp: string | null, signature: string | null): boolean {
  const workerSecret = secret();
  if (!workerSecret || !timestamp || !signature || !/^\d{13}$/.test(timestamp)) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > CALLBACK_WINDOW_MS) return false;
  const expected = signatureFor(body, timestamp, workerSecret);
  const provided = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
}

export function newAsrNonce(): string {
  return randomUUID();
}

export async function dispatchYoutubeAsrWorker(payload: YoutubeAsrWorkerRequest): Promise<void> {
  const workerUrl = youtubeAsrWorkerUrl();
  if (!workerUrl) throw new Error("Private ASR worker is not configured.");
  const signed = signYoutubeAsrPayload(payload);
  const response = await fetch(`${workerUrl}/jobs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shadowing-asr-timestamp": signed.timestamp,
      "x-shadowing-asr-signature": signed.signature,
    },
    body: signed.body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Private ASR worker rejected the job (${response.status}).`);
}
