import type { Job } from "@/types/api";

import { apiJson } from "./api";

/** GET /api/jobs — the caller's processing jobs, newest first (server order). */
export async function fetchJobs(): Promise<Job[]> {
  const { jobs } = await apiJson<{ jobs: Job[] }>("/api/jobs");
  return jobs;
}
