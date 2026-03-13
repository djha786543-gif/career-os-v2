import { Job } from '../models/Job';

// Deduplicate jobs based on title, company, and location
export function deduplicateJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = `${job.title}|${job.company}|${job.location}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
