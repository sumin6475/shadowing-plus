import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function maxDurationSeconds() {
  const value = Number(process.env.YOUTUBE_ASR_MAX_DURATION_SECONDS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 3600;
}

export function canonicalVideoUrl(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const id = host === "youtu.be"
    ? url.pathname.split("/").filter(Boolean)[0]
    : (host === "youtube.com" || host.endsWith(".youtube.com"))
      ? url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/)?.[1]
      : null;
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error("Only canonical YouTube video URLs are accepted.");
  return `https://www.youtube.com/watch?v=${id}`;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-1000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code}): ${stderr}`)));
  });
}

function runCapture(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout = `${stdout}${chunk}`.slice(-1000); });
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-1000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} failed (${code}): ${stderr}`)));
  });
}

async function videoDuration(url, cwd) {
  const output = await runCapture("yt-dlp", ["--no-playlist", "--skip-download", "--print", "%(duration)s", url], cwd);
  const value = Number(output.trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error("Video duration could not be determined.");
  if (value > maxDurationSeconds()) throw new Error(`Video exceeds the ${Math.floor(maxDurationSeconds() / 60)} minute ASR limit.`);
  return value;
}

export async function acquireNormalizedAudio(videoUrl) {
  const cwd = await mkdtemp(path.join(tmpdir(), "shadowing-asr-"));
  try {
    const url = canonicalVideoUrl(videoUrl);
    const durationSeconds = await videoDuration(url, cwd);
    await run("yt-dlp", ["--no-playlist", "--no-progress", "-f", "bestaudio/best", "-o", "source.%(ext)s", url], cwd);
    const source = (await readdir(cwd)).find((name) => name.startsWith("source."));
    if (!source) throw new Error("Audio source was not produced.");
    const output = path.join(cwd, "audio.mp3");
    await run("ffmpeg", ["-y", "-i", path.join(cwd, source), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", output], cwd);
    return { bytes: await readFile(output), durationSeconds };
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}
