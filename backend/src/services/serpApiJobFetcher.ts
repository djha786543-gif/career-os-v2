import axios from 'axios';
import { Job } from '../models/Job';

// Track API usage
let apiCallCount = 0;
let lastResetDate = new Date().toDateString();
const MONTHLY_LIMIT = 400; // ~$20 worth at $50/5000 calls = 400 calls

export function getApiUsage() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    apiCallCount = 0;
    lastResetDate = today;
  }
  return {
    used: apiCallCount,
    limit: MONTHLY_LIMIT,
    remaining: MONTHLY_LIMIT - apiCallCount,
    percentage: Math.round((apiCallCount / MONTHLY_LIMIT) * 100),
    estimatedCost: ((apiCallCount / 5000) * 50).toFixed(2)
  };
}

interface SerpApiJobResult {
  title: string;
  company_name: string;
  location: string;
  description: string;
  salary?: string;
  job_id: string;
  apply_options?: { link: string }[];
  detected_extensions?: {
    posted_at?: string;
    work_from_home?: boolean;
    schedule_type?: string;
  };
  thumbnail?: string;
}

export async function fetchSerpApiJobs(
  query: string, 
  location: string = 'United States',
  remote: boolean = false,
  start: number = 0
): Promise<Job[]> {
  const usage = getApiUsage();
  if (usage.remaining <= 0) {
    throw new Error('SerpApi monthly limit reached. Upgrade plan or wait for reset.');
  }

  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) throw new Error('SERP_API_KEY not configured');

  const searchQuery = remote ? `${query} remote` : query;

  const params = {
    engine: 'google_jobs',
    q: searchQuery,
    location,
    api_key: apiKey,
    hl: 'en',
    gl: 'us',
    start, // pagination support
    num: 50 // max results per call
  };

  try {
    const { data } = await axios.get('https://serpapi.com/search', { params });
    apiCallCount++; // Increment after successful call
    
    if (!data.jobs_results || data.jobs_results.length === 0) {
      return [];
    }

    return data.jobs_results.map((job: SerpApiJobResult) => ({
      id: job.job_id,
      title: job.title,
      company: job.company_name || 'Company Name Hidden',
      location: job.location,
      region: inferRegion(job.location),
      description: job.description || '',
      skills: extractSkillsFromDescription(job.description || '', query),
      experienceLevel: inferExperienceLevel(job.title),
      employmentType: job.detected_extensions?.schedule_type || 'Full-time',
      remote: remote || job.detected_extensions?.work_from_home || false,
      hybrid: /hybrid/i.test(job.description || ''),
      visaSponsorship: /visa|sponsorship|h1b|work authorization/i.test(job.description || ''),
      salaryRange: parseSalary(job.salary),
      jobBoard: 'Google Jobs',
      applyUrl: job.apply_options?.[0]?.link || `https://www.google.com/search?q=${encodeURIComponent(job.title + ' ' + job.company_name)}`,
      postedDate: job.detected_extensions?.posted_at || 'Recently',
      normalized: true
    }));
  } catch (error: any) {
    console.error('SerpApi fetch error:', error.response?.data || error.message);
    throw new Error(`SerpApi error: ${error.response?.data?.error || error.message}`);
  }
}

function inferRegion(location: string): 'US' | 'Europe' | 'India' {
  const loc = location.toLowerCase();
  if (/india|mumbai|delhi|bangalore|hyderabad|chennai/i.test(loc)) return 'India';
  if (/uk|united kingdom|germany|france|netherlands|switzerland|sweden|europe|london|berlin|paris/i.test(loc)) return 'Europe';
  return 'US';
}

function extractSkillsFromDescription(desc: string, query: string): string[] {
  const allPatterns = [
    // DJ IT Audit Skills
    /\b(SOX|ITGC|CISA|CISM|CGEIT|AWS|Azure|GCP|Python|SAP|NIST|ISO 27001|ISO 42001|COBIT|COSO|ServiceNow|AuditBoard|AIGP|AAIA|Zero Trust|IAM|SIEM|GRC|Compliance|Risk Assessment|AI Governance|Cloud Audit)\b/gi,
    // Pooja Research Skills
    /\b(qPCR|RT-PCR|ddPCR|RNA-seq|scRNA-seq|CRISPR|Cas9|Western blot|Flow cytometry|ChIP-seq|ATAC-seq|Confocal|Immunofluorescence|Mouse models|Lentiviral|AAV|Cell culture|Histology|IHC|ELISA|Bioinformatics|R|Python|Seurat|DESeq2|10x Genomics|Visium|Spatial transcriptomics)\b/gi,
  ];
  
  const matches = new Set<string>();
  allPatterns.forEach(pattern => {
    const found = desc.match(pattern);
    if (found) found.forEach(s => matches.add(s));
  });

  // Add query terms as implicit skills
  query.split(' ').forEach(term => {
    if (term.length > 3) matches.add(term);
  });

  return Array.from(matches).slice(0, 8);
}

function inferExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (/senior|sr\.|lead|principal|director|vp|chief|head of/i.test(t)) return 'Senior';
  if (/junior|jr\.|entry|associate|assistant/i.test(t)) return 'Junior';
  if (/manager|supervisor/i.test(t)) return 'Manager';
  return 'Mid-Level';
}

function parseSalary(salaryStr?: string): { min: number; max: number; currency: string } | undefined {
  if (!salaryStr) return undefined;
  
  // Match patterns like "$120K - $150K" or "$120,000 - $150,000"
  const match = salaryStr.match(/\$?([\d,]+)k?\s*[-–]\s*\$?([\d,]+)k?/i);
  if (!match) return undefined;

  const parseNum = (str: string) => {
    const num = parseInt(str.replace(/,/g, ''));
    return str.toLowerCase().includes('k') ? num * 1000 : num;
  };

  return {
    min: parseNum(match[1]),
    max: parseNum(match[2]),
    currency: 'USD'
  };
}
