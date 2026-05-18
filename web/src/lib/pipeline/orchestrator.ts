import { setJobFailed, setJobStage } from "./jobs";
import { stage1Extract } from "./stage_1_extract";
import { stage2Transcribe } from "./stage_2_transcribe";
import { stage3Postprocess } from "./stage_3_postprocess";
import { stage4Translate } from "./stage_4_translate";
import { stage5Persist } from "./stage_5_persist";
import type { StageName } from "@/lib/types";

const STAGE_SEQUENCE: StageName[] = [
  "extract",
  "transcribe",
  "postprocess",
  "translate",
  "persist",
];

const STAGE_STATUS_MAP = {
  extract: "extracting",
  transcribe: "transcribing",
  postprocess: "postprocessing",
  translate: "translating",
  persist: "persisting",
} as const;

async function runStage(stage: StageName, jobId: string): Promise<void> {
  await setJobStage(jobId, stage, STAGE_STATUS_MAP[stage]);
  switch (stage) {
    case "extract":
      await stage1Extract(jobId);
      return;
    case "transcribe":
      await stage2Transcribe(jobId);
      return;
    case "postprocess":
      await stage3Postprocess(jobId);
      return;
    case "translate":
      await stage4Translate(jobId);
      return;
    case "persist":
      await stage5Persist(jobId);
      return;
  }
}

/**
 * Run the full pipeline from the given stage to the end.
 * On failure, marks the job as failed at the offending stage and stops.
 * Each stage is independently re-runnable — a retry can pass the failed
 * stage name to resume from there without re-paying upstream work.
 */
export async function runPipeline(
  jobId: string,
  fromStage: StageName = "extract",
): Promise<void> {
  const startIdx = STAGE_SEQUENCE.indexOf(fromStage);
  if (startIdx === -1) throw new Error(`Unknown stage: ${fromStage}`);

  for (let i = startIdx; i < STAGE_SEQUENCE.length; i++) {
    const stage = STAGE_SEQUENCE[i];
    try {
      await runStage(stage, jobId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await setJobFailed(jobId, stage, msg);
      throw err;
    }
  }
}

export async function runSingleStage(
  jobId: string,
  stage: StageName,
): Promise<void> {
  try {
    await runStage(stage, jobId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await setJobFailed(jobId, stage, msg);
    throw err;
  }
}

export { STAGE_SEQUENCE };
