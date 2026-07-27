import http from "node:http";

import { signedHeaders, verifyRequest } from "./auth.js";
import { acquireNormalizedAudio } from "./commands.js";

const port = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 64 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) reject(new Error("Request is too large."));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function complete(callbackUrl, jobId, nonce) {
  const body = JSON.stringify({ jobId, nonce });
  const response = await fetch(callbackUrl, { method: "POST", headers: signedHeaders(body), body });
  if (!response.ok) throw new Error(`Completion callback failed (${response.status}).`);
}

async function processJob(payload) {
  // Logs intentionally contain only a job id — signed URLs and source URLs can
  // carry sensitive query strings or reveal the learner's viewing history.
  console.info("youtube-asr started", { jobId: payload.jobId });
  const { bytes, durationSeconds } = await acquireNormalizedAudio(payload.videoUrl);
  // The browser estimate is also enforced by the worker. A material mismatch
  // can mean the source changed between the learner's confirmation and fetch.
  if (Math.abs(durationSeconds - Number(payload.expectedDurationSeconds)) > 10) {
    throw new Error("Video duration changed after ASR confirmation.");
  }
  const uploaded = await fetch(payload.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "audio/mpeg", "content-length": String(bytes.length) },
    body: bytes,
  });
  if (!uploaded.ok) throw new Error(`R2 upload failed (${uploaded.status}).`);
  await complete(payload.callbackUrl, payload.jobId, payload.nonce);
  console.info("youtube-asr completed", { jobId: payload.jobId });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true })); return;
  }
  if (req.method !== "POST" || req.url !== "/jobs") { res.writeHead(404); res.end(); return; }
  try {
    const body = await readBody(req);
    if (!verifyRequest(body, req.headers["x-shadowing-asr-timestamp"], req.headers["x-shadowing-asr-signature"])) {
      res.writeHead(401); res.end(JSON.stringify({ error: "Unauthorized" })); return;
    }
    const payload = JSON.parse(body);
    if (!payload?.jobId || !payload?.videoUrl || !payload?.uploadUrl || !payload?.callbackUrl || !payload?.nonce || !Number.isFinite(payload.expectedDurationSeconds) || payload.expectedDurationSeconds <= 0) {
      throw new Error("Invalid job payload.");
    }
    res.writeHead(202, { "content-type": "application/json" }); res.end(JSON.stringify({ accepted: true }));
    void processJob(payload).catch((error) => console.error("youtube-asr failed", { jobId: payload.jobId, error: error instanceof Error ? error.message : "unknown" }));
  } catch (error) {
    res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request." }));
  }
});

server.listen(port, "0.0.0.0", () => console.info("youtube-asr worker listening", { port }));
