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

export async function listJobs(): Promise<Job[]> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function createJob(input: {
  title: string;
  media_type: "video" | "audio";
  source_key: string;
}): Promise<Job> {
  const { data, error } = await supabaseAdmin()
    .from(TABLE)
    .insert({
      title: input.title,
      media_type: input.media_type,
      source_key: input.source_key,
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

/**
 * Where the audio file lives. For audio uploads, the source IS the audio.
 * For video uploads, stage 1 writes audio.mp3 to a derived key.
 */
export function audioKeyFor(job: Job): string {
  return job.media_type === "audio"
    ? job.source_key
    : `jobs/${job.id}/audio.mp3`;
}
