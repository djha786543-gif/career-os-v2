import { Job } from '../models/Job';
import { JobBoard } from '../models/JobBoard';
import { normalizeJob } from '../utils/jobNormalizer';
import { deduplicateJobs } from '../utils/deduplicateJobs';
import axios from 'axios';
import { fetchIndeedJobs } from './indeedFetcher';
import { extractSkillsAI } from '../utils/aiSkillExtractor';
import { fetchNaukriJobs } from './naukriFetcher';
import { fetchGlassdoorJobs } from './glassdoorFetcher';
import { fetchLinkedInJobs } from './linkedinFetcher';
import { fetchEuroJobs } from './eurojobsFetcher';
import { getCache, setCache } from '../utils/cache';

// Placeholder for API fetchers for each job board
async function fetchJobsFromBoard(jobBoard: JobBoard, region: string): Promise<any[]> {
  switch (jobBoard) {
    case 'Indeed':
      return await fetchIndeedJobs(region);
    case 'Naukri':
      return await fetchNaukriJobs(region);
    case 'Glassdoor':
      return await fetchGlassdoorJobs(region);
    case 'LinkedIn':
      return await fetchLinkedInJobs(region);
    case 'EuroJobs':
      return await fetchEuroJobs(region);
    default:
      return [];
  }
}

export async function ingestJobs(regions: string[], jobBoards: JobBoard[]): Promise<Job[]> {
  const cacheKey = `jobs:${regions.join(',')}:${jobBoards.join(',')}`;
  const cached = getCache(cacheKey);
  if (Array.isArray(cached)) return cached as Job[];
  let allJobs: Job[] = [];
  for (const region of regions) {
    for (const board of jobBoards) {
      const rawJobs = await fetchJobsFromBoard(board, region);
      let normalized = rawJobs.map(raw => normalizeJob(raw, board));
      for (const job of normalized) {
        if (!job.skills || job.skills.length === 0) {
          job.skills = await extractSkillsAI(job.description);
        }
      }
      allJobs = allJobs.concat(normalized);
    }
  }
  const deduped = deduplicateJobs(allJobs);
  setCache(cacheKey, deduped);
  return deduped;
}
