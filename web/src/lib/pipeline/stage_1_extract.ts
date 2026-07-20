import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { audioKeyFor, getJob, updateJobProgress } from "./jobs";
import { getSignedDownloadUrl, putBuffer } from "@/lib/r2";
import { isOwner, maxClipMinutes } from "@/lib/quota";

/**
 * Read a media file's duration (seconds) from its header via ffmpeg, without
 * decoding it. ffmpeg with `-i` and no output prints "Duration: HH:MM:SS.xx"
 * to stderr then exits non-zero ("no output file") — we parse stderr and ignore
 * the exit code. Returns null if the header has no duration (fail open).
 */
function probeDurationSeconds(inputUrl: string): Promise<number | null> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary for this platform");
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as unknown as string, [
      "-reconnect", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      "-i", inputUrl,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", () => {
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return resolve(null);
      resolve(Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]));
    });
  });
}

function runFfmpegExtract(inputUrl: string, outputPath: string): Promise<void> {
  if (!ffmpegPath) {
    throw new Error(
      "ffmpeg-static did not provide a binary for this platform",
    );
  }
  return new Promise((resolve, reject) => {
    // Read the source straight from R2 over HTTPS instead of staging the whole
    // (possibly multi-hundred-MB) file in the function's tiny /tmp — that was
    // blowing up with ENOSPC. ffmpeg seeks the container via HTTP range
    // requests; the reconnect flags ride out transient drops on long reads.
    //
    // Output still goes to a real file (not a pipe): libmp3lame must seek back
    // to the start to write the Xing/Info header (`-write_xing 1`), which a
    // pipe can't do. The mp3 is far smaller than the source, so /tmp is fine.
    //
    // CBR 192kbps matches the prior `-q:a 4` VBR quality while giving
    // byte-precise seek — important for iOS Safari's mid-play `currentTime`
    // accuracy in the practice loop.
    const proc = spawn(ffmpegPath as unknown as string, [
      "-reconnect", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      "-i", inputUrl,
      "-vn",
      "-acodec", "libmp3lame",
      "-b:a", "192k",
      "-write_xing", "1",
      "-y", outputPath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

/**
 * Stage 1: Extract audio from the source file.
 * - media_type=audio  → no-op (the source already IS the audio).
 * - media_type=video  → stream source from R2 through ffmpeg, upload audio.mp3.
 */
export async function stage1Extract(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await updateJobProgress(jobId, "extract", 0);

  const sourceUrl = await getSignedDownloadUrl(job.source_key, 3600);

  // Cost guard: reject over-long clips before any paid work (extraction, ASR,
  // translation). Owners are exempt; fails open if the header has no duration.
  if (!isOwner(job.user_id ?? "")) {
    const durationSecs = await probeDurationSeconds(sourceUrl);
    const limitMin = maxClipMinutes();
    if (durationSecs !== null && durationSecs > limitMin * 60) {
      throw new Error(
        `This clip is about ${Math.round(durationSecs / 60)} minutes. ` +
          `The beta limit is ${limitMin} minutes per clip — please trim it and re-upload.`,
      );
    }
  }

  if (job.media_type === "audio") {
    await updateJobProgress(jobId, "extract", 100);
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `sp-${jobId}-`));
  const audioFile = path.join(tmpDir, "audio.mp3");
  try {
    await updateJobProgress(jobId, "extract", 20);

    await runFfmpegExtract(sourceUrl, audioFile);
    await updateJobProgress(jobId, "extract", 80);

    const buf = fs.readFileSync(audioFile);
    await putBuffer(audioKeyFor(job), buf, "audio/mpeg");
    await updateJobProgress(jobId, "extract", 100);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
