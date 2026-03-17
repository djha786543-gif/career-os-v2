import axios from 'axios';

type ProfileId = 'dj' | 'pj';

interface Job {
    company: string;
}

interface JobsResponse {
    status: string;
    candidate: string;
    jobs: Job[];
    totalResults: number;
}

interface FrontendJob {
    company: string;
}

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://career-os-portal-production.up.railway.app').replace(/\/$/, '');

async function fetchRegions(
    candidateId: string,
    track?: string,
    regions: string[] = ['de', 'ca', 'sg']
): Promise<JobsResponse> {
    const requests = regions.map(region =>
        axios.get(`${BASE}/api/jobs`, {
            params: {
                candidate: candidateId,
                region,
                track,
                filter_top_companies: true
            }
        }).catch(() => null) // Silently fail individual region requests
    );

    const responses = await Promise.all(requests);
    const successful = responses.filter(Boolean).map(r => r.data);

    return successful.reduce((acc, curr) => ({
        ...acc,
        jobs: [...acc.jobs, ...(curr.jobs || [])],
        totalResults: acc.totalResults + (curr.totalResults || 0)
    }), { status: 'success', candidate: candidateId, jobs: [], totalResults: 0 });
}

export async function fetchJobs(
    profileId: ProfileId,
    track?: string,
    regions: string[] = ['de', 'ca', 'sg']
): Promise<JobsResponse> {
    const candidateId = profileId === 'dj' ? 'deobrat' : 'pooja';

    try {
        // First attempt with original track
        const results = await fetchRegions(candidateId, track, regions);

        // Retry logic for IT Audit
        if (results.jobs.length === 0 && track?.includes('IT Audit')) {
            const retryResults = await fetchRegions(candidateId, 'Internal Audit', regions);
            return {
                ...results,
                jobs: [...results.jobs, ...retryResults.jobs],
                totalResults: results.totalResults + retryResults.totalResults
            };
        }

        return results;
    } catch (error) {
        console.error('Fetch jobs error:', error);
        return {
            status: 'error',
            candidate: candidateId,
            jobs: [],
            totalResults: 0
        };
    }
}

export async function fetchAdzunaJobs(
    region: string,
    keywords: string,
    sector: 'corporate' | 'academic'
): Promise<FrontendJob[]> {
    const ADZUNA_ID = process.env.ADZUNA_APP_ID;
    const ADZUNA_KEY = process.env.ADZUNA_APP_KEY;

    if (!ADZUNA_ID || !ADZUNA_KEY) {
        throw new Error('Missing Adzuna credentials');
    }

    const response = await axios.get(`https://api.adzuna.com/v1/api/jobs/${region}/search/1`, {
        params: {
            app_id: ADZUNA_ID,
            app_key: ADZUNA_KEY,
            what: keywords,
            content_type: 'json'
        }
    });

    return filterTopCompanies(response.data.results, sector);
}

function filterTopCompanies(jobs: FrontendJob[], sector: 'corporate' | 'academic' | 'government'): FrontendJob[] {
  const poojaResearchTargets = [
    // Academic
    'Technical University of Munich', 'LMU Munich', 'University of Toronto',
    'National University of Singapore', 'Indian Institute of Science',
    // Government
    'AIIMS Delhi', 'Max Planck Institutes', 'A*STAR Research Institutes'
  ];

  return jobs.filter(job => {
    const companyName = job.company?.toLowerCase() || '';
    return poojaResearchTargets.some(target => 
      companyName.includes(target.toLowerCase())
    );
  });
}

export async function refreshJobs(profileId: ProfileId, track?: string): Promise<void> {
  const candidateId = profileId === 'dj' ? 'deobrat' : 'pooja';
  const regions = profileId === 'pj' ? ['de', 'ca', 'sg', 'in'] : ['us'];
  
  await axios.post(`${BASE}/api/jobs/refresh`, {
    candidate: candidateId,
    track,
    regions
  });
}
