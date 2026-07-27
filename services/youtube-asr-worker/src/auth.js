import { createHmac, timingSafeEqual } from "node:crypto";

const WINDOW_MS = 10 * 60 * 1000;

function secret() {
  const value = process.env.YOUTUBE_ASR_WORKER_SECRET;
  if (!value) throw new Error("YOUTUBE_ASR_WORKER_SECRET is required");
  return value;
}

function sign(body, timestamp) {
  return createHmac("sha256", secret()).update(`${timestamp}.${body}`).digest("hex");
}

export function verifyRequest(body, timestamp, signature) {
  if (!timestamp || !signature || !/^\d{13}$/.test(timestamp)) return false;
  if (Math.abs(Date.now() - Number(timestamp)) > WINDOW_MS) return false;
  const expected = Buffer.from(sign(body, timestamp), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function signedHeaders(body) {
  const timestamp = String(Date.now());
  return {
    "content-type": "application/json",
    "x-shadowing-asr-timestamp": timestamp,
    "x-shadowing-asr-signature": sign(body, timestamp),
  };
}
