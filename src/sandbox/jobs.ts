export type JobStatus = 'running' | 'completed' | 'failed' | 'timeout';

export interface Job {
  id: string;
  status: JobStatus;
  startTime: number;       // ms since epoch, when execution began
  currentLine: number | null;
  linesExecuted: number;   // count of progress events seen so far
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

const jobs = new Map<string, Job>();

export function createJob(id: string): Job {
  const job: Job = {
    id,
    status: 'running',
    startTime: Date.now(),
    currentLine: null,
    linesExecuted: 0,
    stdout: '',
    stderr: '',
    exitCode: null
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<Job>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
}

// Derived value: how long the job has been (or was) running
export function getElapsedMs(job: Job): number {
  return Date.now() - job.startTime;
}