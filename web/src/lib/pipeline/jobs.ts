import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Job, JobStatus, StageName } from "@/lib/types";

const TABLE = "jobs";

export async function getJob(jobId: string): Promise<Job | null> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Job | null;
}

// Scoped to one owner — the library feed must only show the caller's jobs.
// (The service key bypasses RLS, so this .eq is the enforcement point.)
export async function listJobs(userId: string): Promise<Job[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function createJob(input: {
  title: string;
  media_type: "video" | "audio";
  source_key: string;
  // Owner. Required post-auth: the service key can't rely on DEFAULT auth.uid(),
  // so the creating route passes the verified session user id explicitly.
  user_id: string;
  // Per-clip language pair (migration 011). Omit to accept the DB default
  // (eng → Korean), which keeps older callers and un-specified uploads working.
  source_lang?: string;
  target_lang?: string;
}): Promise<Job> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .insert({
      title: input.title,
      media_type: input.media_type,
      source_key: input.source_key,
      user_id: input.user_id,
      // Only set when provided so the column DEFAULT covers the omitted case.
      ...(input.source_lang ? { source_lang: input.source_lang } : {}),
      ...(input.target_lang ? { target_lang: input.target_lang } : {}),
      status: "pending",
      progress: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Job;
}

async function updateJob(jobId: string, fields: Partial<Job>): Promise<void> {
  const { error } = await supabaseAdmin()
    .from(TABLE)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw error;
}

export async function setJobStage(
  jobId: string,
  stage: StageName,
  status: JobStatus,
): Promise<void> {
  await updateJob(jobId, { current_stage: stage, status, error: null });
}

export async function updateJobProgress(
  jobId: string,
  stage: StageName,
  pct: number,
): Promise<void> {
  await updateJob(jobId, {
    current_stage: stage,
    progress: Math.max(0, Math.min(100, Math.round(pct))),
  });
}

export async function setJobFailed(
  jobId: string,
  stage: StageName,
  message: string,
): Promise<void> {
  await updateJob(jobId, {
    current_stage: stage,
    status: "failed",
    error: message,
  });
}

export async function setJobReady(
  jobId: string,
  videoId: string,
): Promise<void> {
  await updateJob(jobId, {
    status: "ready",
    current_stage: null,
    progress: 100,
    video_id: videoId,
    error: null,
  });
}

export async function deleteJob(jobId: string): Promise<void> {
  const { error } = await supabaseAdmin().from(TABLE).delete().eq("id", jobId);
  if (error) throw error;
}

// The in-progress statuses a running pipeline moves through. `pending` is
// excluded on purpose: a pending job hasn't entered the pipeline yet (its
// upload may still be streaming to R2), so it must not be reaped.
const IN_PROGRESS_STATUSES: JobStatus[] = [
  "extracting",
  "transcribing",
  "postprocessing",
  "translating",
  "persisting",
];

/**
 * Fail jobs that have been stuck mid-pipeline longer than `staleMs`.
 *
 * The orchestrator only calls `setJobFailed` from a caught JS exception, so a
 * hard function timeout or instance death (common on Vercel's 60s Hobby cap for
 * long media) leaves a job frozen in an in-progress status with no error. This
 * reaper is the backstop: it flips those to `failed` so the UI can offer retry.
 * Stages are R2-checkpoint-resumable, so retry resumes without re-paying work.
 *
 * Returns the ids it reaped.
 */
export async function reapStuckJobs(staleMs = 10 * 60 * 1000): Promise<string[]> {
  const cutoff = new Date(Date.now() - staleMs).toISOString();
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .update({
      status: "failed" as JobStatus,
      error: "Timed out — the pipeline stopped responding. Press retry to resume.",
      updated_at: new Date().toISOString(),
    })
    .in("status", IN_PROGRESS_STATUSES)
    .lt("updated_at", cutoff)
    .select("id");
  if (error) throw error;
  return (data ?? []).map((r) => (r as { id: string }).id);
}

/**
 * Where the audio file lives. For audio uploads, the source IS the audio.
 * For video uploads, stage 1 writes audio.mp3 to a derived key.
 */
export function audioKeyFor(job: Job): string {
  return job.media_type === "audio"
    ? job.source_key
    : `jobs/${job.id}/audio.mp3`;
}
