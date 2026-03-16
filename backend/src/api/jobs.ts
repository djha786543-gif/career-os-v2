import express from 'express';
import { fetchSerpApiJobs, getApiUsage } from '../services/serpApiJobFetcher';
import { candidates } from '../models/CandidatesData';
import { poojaProfiles } from '../models/PoojaProfiles';
import { computeMatchScore } from '../utils/matchScore';
import { setCache, getCache } from '../utils/cache';
import { classifyAcademicIndustry } from '../utils/classifyAcademicIndustry';

const router = express.Router();

// GET /api/jobs/usage - Track SerpApi usage
router.get('/usage', (req, res) => {
  res.json(getApiUsage());
});

// GET /api/jobs?candidate=dj&page=0&pageSize=50&remote=true&country=usa
router.get('/', async (req, res) => {
  try {
    const { 
      candidate: candidateId, 
      page = '0', 
      pageSize = '50', // Increased from 16 to 50
      remote = 'false', 
      country = 'usa' 
    } = req.query;
    
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    // Build search query based on candidate
    let searchQuery = '';
    let location = 'United States';
    let isRemote = remote === 'true';

    if (candidate.id === 'deobrat') {
      searchQuery = 'IT Audit'; // Broader query as requested
      location = 'United States';
      isRemote = true; // DJ always remote
    } else if (candidate.id === 'pooja') {
      // Pooja's search based on PoojaProfiles
      const track = (req.query.track as 'Academic' | 'Industry') || 'Industry';
      const profile = poojaProfiles[track];
      
      // Build query from job titles
      searchQuery = profile.jobTitles.slice(0, 2).join(' OR ');
      
      // Map country to location
      const countryMap: Record<string, string> = {
        'usa': 'United States',
        'uk': 'United Kingdom',
        'canada': 'Canada',
        'germany': 'Germany',
        'australia': 'Australia',
        'netherlands': 'Netherlands',
        'switzerland': 'Switzerland',
        'singapore': 'Singapore',
        'japan': 'Japan',
        'france': 'France',
        'all': 'Worldwide'
      };
      location = countryMap[country as string] || 'United States';
      isRemote = remote === 'true';
    }

    const cacheKey = `jobs:${candidateId}:${location}:${isRemote}:${page}`;
    
    // Check cache first (30 min TTL)
    let jobs = getCache(cacheKey);
    
    if (!jobs) {
      // Fetch from SerpApi
      const pageNum = parseInt(page as string);
      const start = pageNum * 50; // SerpApi pagination
      
      const rawJobs = await fetchSerpApiJobs(searchQuery, location, isRemote, start);
      
      // Score and enrich jobs
      jobs = rawJobs
        .map(job => {
          const fitScore = computeMatchScore(job, candidate);
          const fitReason = generateFitReason(job, candidate, fitScore);
          
          return {
            ...job,
            fitScore,
            fitReason,
            keySkills: job.skills.slice(0, 4),
            workMode: job.remote ? 'Remote' : job.hybrid ? 'Hybrid' : 'On-site',
            isRemote: job.remote,
            category: candidate.id === 'pooja' ? classifyAcademicIndustry(job) : undefined,
            eyConnection: candidate.id === 'deobrat' && Math.random() > 0.88, // 12% EY connection rate
            salary: job.salaryRange 
              ? `$${(job.salaryRange.min / 1000).toFixed(0)}K - $${(job.salaryRange.max / 1000).toFixed(0)}K`
              : 'Competitive',
            source: 'live'
          };
        })
        .filter(job => job.fitScore >= 60)
        .sort((a, b) => b.fitScore - a.fitScore);
      
      setCache(cacheKey, jobs);
    }

    // Pagination for response
    const pageSizeNum = parseInt(pageSize as string);
    const pageNum = parseInt(page as string);
    const start = pageNum * pageSizeNum;
    const paginatedJobs = jobs.slice(start, start + pageSizeNum);

    res.json({
      jobs: paginatedJobs,
      totalResults: jobs.length,
      totalPages: Math.ceil(jobs.length / pageSizeNum),
      hasNext: start + pageSizeNum < jobs.length,
      hasPrev: pageNum > 0,
      usage: getApiUsage() // Include usage stats in response
    });
    
  } catch (error: any) {
    console.error('Job fetch error:', error);
    res.status(500).json({ 
      error: 'Job fetch failed', 
      message: error.message,
      usage: getApiUsage()
    });
  }
});

function generateFitReason(job: any, candidate: any, fitScore: number): string {
  const reasons = [
    `${job.skills.filter((s: string) => candidate.skills.map((cs: string) => cs.toLowerCase()).includes(s.toLowerCase())).length} key skills match your profile`,
    `${job.experienceLevel} level aligns with your ${candidate.experienceYears}+ years experience`,
    `${job.company} is actively hiring for your specialization`,
    `Strong match with your ${candidate.specialization} background`,
    `Location and work mode preferences align perfectly`
  ];
  
  if (fitScore >= 85) return reasons[0];
  if (fitScore >= 75) return reasons[1];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

export default router;
