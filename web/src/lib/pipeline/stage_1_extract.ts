import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import ffmpegPath from "ffmpeg-static";
import { audioKeyFor, getJob, updateJobProgress } from "./jobs";
import { getSignedDownloadUrl, putBuffer } from "@/lib/r2";

function runFfmpegExtract(inputPath: string, outputPath: string): Promise<void> {
  if (!ffmpegPath) {
    throw new Error(
      "ffmpeg-static did not provide a binary for this platform",
    );
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as unknown as string, [
      "-i", inputPath,
      "-vn",
      "-acodec", "libmp3lame",
      "-q:a", "4",
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

async function downloadToFile(url: string, dest: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Source download failed: ${resp.status}`);
  if (!resp.body) throw new Error("Source response had no body");
  const out = fs.createWriteStream(dest);
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(resp.body as never)
      .pipe(out)
      .on("finish", () => resolve())
      .on("error", reject);
  });
}

/**
 * Stage 1: Extract audio from the source file.
 * - media_type=audio  → no-op (the source already IS the audio).
 * - media_type=video  → download source, run ffmpeg, upload audio.mp3.
 */
export async function stage1Extract(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await updateJobProgress(jobId, "extract", 0);

  if (job.media_type === "audio") {
    await updateJobProgress(jobId, "extract", 100);
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `sp-${jobId}-`));
  const sourceFile = path.join(tmpDir, "source");
  const audioFile = path.join(tmpDir, "audio.mp3");
  try {
    const sourceUrl = await getSignedDownloadUrl(job.source_key, 3600);
    await downloadToFile(sourceUrl, sourceFile);
    await updateJobProgress(jobId, "extract", 40);

    await runFfmpegExtract(sourceFile, audioFile);
    await updateJobProgress(jobId, "extract", 80);

    const buf = fs.readFileSync(audioFile);
    await putBuffer(audioKeyFor(job), buf, "audio/mpeg");
    await updateJobProgress(jobId, "extract", 100);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
