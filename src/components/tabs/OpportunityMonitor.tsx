import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../../config/api';
import { daysAgo, isExpiredJob } from '../../utils/monitorHelpers';

// ── Pooja Holistic Profile ──────────────────────────────────────────────────────
// Weighted scoring: institution hits (×20), expertise hits (×15), role hits (×10)
// Gate threshold: computed score ≥ 30 → show; tier label drives card styling.

const INSTITUTIONS = {
  // Indian premier research & academic
  india: [
    'iit ', 'iit,', 'iit-', 'iisc', 'aiims', 'iiser', 'csir', 'ccmb', 'icmr',
    'tifr', 'jncasr', 'nii ', 'dbt ', 'dst ', 'ncbs', 'niser', 'jnu',
    'inmas', 'nimhans', 'pgimer', 'sgpgi', 'sctimst', 'actrec',
  ],
  // Indian biotech/pharma industry
  indiaIndustry: [
    'biocon', 'syngene', 'dr reddy', 'sun pharma', 'sun pharmaceutical', 'cipla',
    'serum institute', 'zydus', 'lupin', 'wockhardt', 'piramal',
    'glenmark', 'aurobindo', 'cadila', 'alembic',
    'jubilant', 'aragen', 'anthem biosciences', 'tata memorial', 'lupin research',
  ],
  // International pharma/biotech (high Pooja alignment)
  international: [
    'astrazeneca', 'novartis', 'roche', 'pfizer', 'sanofi', 'gsk',
    'abbvie', 'merck', 'lilly', 'amgen', 'biogen', 'gilead', 'bayer',
    'boehringer', 'novo nordisk', 'takeda', 'bristol myers', 'regeneron',
    // Asia pharma
    'daiichi sankyo', 'astellas', 'eisai', 'samsung biologics', 'celltrion',
    'chugai', 'ono pharmaceutical', 'shionogi', 'mitsubishi tanabe',
    'a*star', 'astar', 'csl behring', 'beigene', 'yuhan',
    'pfizer australia', 'roche singapore', 'gsk singapore',
    'novartis singapore', 'abbvie singapore', 'bayer asia',
    // Indian industry
    'dr reddy', 'sun pharma', 'sun pharmaceutical', 'cipla',
    'zydus', 'lupin', 'piramal',
    'glenmark', 'aurobindo', 'alembic',
    'jubilant', 'aragen', 'anthem biosciences', 'tata memorial',
    'serum institute', 'lupin research',
  ],
};
const ALL_INSTITUTIONS = [
  ...INSTITUTIONS.india,
  ...INSTITUTIONS.indiaIndustry,
  ...INSTITUTIONS.international,
];

const EXPERTISE = {
  // Core Pooja expertise — highest weight
  core: [
    'cardiovascular', 'cardiomyopathy', 'heart failure', 'cardiac',
    'molecular biology', 'cell biology', 'heme', 'hemoglobin',
    'senescence', 'aging', 'epigenetics',
    'rna-seq', 'rnaseq', 'single cell', 'single-cell',
    'echocardiography', 'echo', 'in vivo', 'mouse model',
    'zebrafish', 'drosophila',
  ],
  // Adjacent expertise — medium weight
  adjacent: [
    'translational research', 'translational medicine',
    'genetics', 'genomics', 'proteomics', 'metabolomics',
    'drug discovery', 'target identification', 'preclinical',
    'biomarker', 'clinical research', 'oncology',
    'stem cell', 'regenerative', 'gene editing', 'crispr',
    'flow cytometry', 'western blot', 'pcr', 'confocal',
    'cancer biology', 'tumor', 'immunology', 'inflammation',
  ],
};

const ROLES = [
  'postdoctoral', 'postdoc', 'post-doc',
  'research scientist', 'research associate', 'research fellow',
  'principal scientist', 'senior scientist', 'staff scientist',
  'scientist i', 'scientist ii', 'scientist iii',
  'faculty', 'professor', 'associate professor',
  'r&d scientist', 'biologics', 'pharmacologist', 'toxicologist',
  'medicinal chemist', 'structural biologist', 'cell biologist',
  'molecular biologist', 'biochemist', 'bioinformatician',
];

type Tier = 'high' | 'good' | 'broad';

interface ScoredJob {
  raw: any;
  score: number;
  tier: Tier;
  matchedInstitutions: string[];
  matchedExpertise: string[];
  matchedRole: string;
}

function jobText(job: any): string {
  return `${job.title} ${job.company} ${job.snippet || ''} ${job.description || ''} ${(job.keySkills || []).join(' ')}`.toLowerCase();
}

function scoreJob(job: any): ScoredJob | null {
  const text = jobText(job);
  const serverScore = job.fitScore ?? 0;

  const matchedInstitutions = ALL_INSTITUTIONS.filter(k => text.includes(k));
  const matchedCoreExp = EXPERTISE.core.filter(k => text.includes(k));
  const matchedAdjExp = EXPERTISE.adjacent.filter(k => text.includes(k));
  const matchedExpertise = [...matchedCoreExp, ...matchedAdjExp];
  const matchedRole = ROLES.find(r => text.includes(r)) ?? '';

  // Weighted local score
  const localScore =
    matchedInstitutions.length * 20 +
    matchedCoreExp.length * 15 +
    matchedAdjExp.length * 8 +
    (matchedRole ? 10 : 0);

  // Blend: server score dominates if present, local boosts if high
  const blended = serverScore > 0
    ? Math.max(serverScore, Math.min(localScore, 100))
    : Math.min(localScore, 100);

  // Hard gate: must have at least ONE life-science signal.
  // For industry/india: role match alone is sufficient if score >= 15
  const hasSignal = matchedInstitutions.length > 0 ||
                    matchedExpertise.length > 0 ||
                    !!matchedRole
  if (!hasSignal) return null

  // Soft gate: overall score must be meaningful
  if (blended < 20) return null;

  const tier: Tier = blended >= 75 ? 'high' : blended >= 50 ? 'good' : 'broad';

  return { raw: job, score: blended, tier, matchedInstitutions, matchedExpertise, matchedRole };
}

// ── API path builder ────────────────────────────────────────────────────────────
type Sector = 'all' | 'academia' | 'industry' | 'india' | 'international';

// India uses the monitor endpoint (/monitor/jobs?sector=india) — not /jobs.
// Industry now also queries monitor DB for Europe + Asia scanned orgs.
function buildApiPaths(sector: Sector, region: string | null): string[] {
  const base = (params: Record<string, string>) =>
    `/jobs?${new URLSearchParams({ candidate: 'pooja', ...params }).toString()}`;

  if (sector === 'all') return [
    base({ track: 'Academic' }),
    base({ track: 'Industry' }),
    '/monitor/jobs?sector=india',       // India via monitor DB
    '/monitor/jobs?sector=industry',    // Industry Europe/Asia via monitor DB
    base({ region: 'international' }),
  ];
  if (sector === 'academia') return [base({ track: 'Academic' })];
  if (sector === 'industry') return [
    base({ track: 'Industry' }),
    '/monitor/jobs?sector=industry',    // scanned Europe + Asia + US industry orgs
  ];
  if (sector === 'india') return [
    '/monitor/jobs?sector=india',
    base({ country: 'india' }),   // Adzuna India — reliable supplement
  ];
  if (sector === 'international') {
    const country = region === 'US' ? 'usa'
      : region === 'UK' ? 'uk'
      : region === 'DE' ? 'germany'
      : region === 'CA' ? 'canada'
      : region === 'SG' ? 'singapore'
      : undefined;
    return [base(country ? { region: 'international', country } : { region: 'international' })];
  }
  return [base({})];
}

// Normalise monitor-API jobs (org_name / apply_url / fit_score) → scoreJob-compatible shape
function normaliseMonitorJob(job: any): any {
  const out = { ...job };
  if (!out.company && out.org_name)   out.company  = out.org_name;
  if (!out.applyUrl && out.apply_url) out.applyUrl = out.apply_url;
  if (out.fitScore == null && out.fit_score != null) out.fitScore = out.fit_score;
  return out;
}

// ── Industry region filter ────────────────────────────────────────────────────
type IndustryRegion = 'All' | 'North America' | 'Europe' | 'Asia';
const INDUSTRY_REGIONS: IndustryRegion[] = ['All', 'North America', 'Europe', 'Asia'];

const INDUSTRY_REGION_COUNTRIES: Record<Exclude<IndustryRegion, 'All'>, string[]> = {
  'North America': ['usa', 'united states', 'canada', 'us,'],
  'Europe': ['uk', 'united kingdom', 'germany', 'switzerland', 'france',
             'denmark', 'ireland', 'netherlands', 'belgium', 'sweden', 'europe'],
  'Asia': ['japan', 'singapore', 'south korea', 'korea', 'china',
           'shanghai', 'tokyo', 'india', 'australia', 'melbourne', 'sydney'],
};

function matchesIndustryRegion(job: any, region: IndustryRegion): boolean {
  if (region === 'All') return true;
  const text = `${job.country || ''} ${job.location || ''}`.toLowerCase();
  return INDUSTRY_REGION_COUNTRIES[region].some(c => text.includes(c));
}

// ── India sub-sector constants ────────────────────────────────────────────────
type IndiaSubsector = 'All' | 'Academic' | 'Govt Research' | 'Industry';
const INDIA_SUBSECTORS: IndiaSubsector[] = ['All', 'Academic', 'Govt Research', 'Industry'];
// Fuzzy keyword matching handles Adzuna company names (e.g. "Biocon" vs "Biocon Biologics")
const INDIA_INDUSTRY_KEYWORDS = [
  'biocon', 'syngene', 'astrazeneca', 'dr reddy', 'sun pharma', 'cipla',
  'zydus', 'lupin', 'piramal', 'glenmark', 'aurobindo', 'alembic',
  'wockhardt', 'serum institute', 'divi', 'strides', 'torrent pharma',
  'jubilant', 'abbott india', 'pfizer india', 'sanofi india',
  'novartis', 'roche', 'merck', 'johnson', 'bayer', 'novozymes',
  'reliance life', 'tata', 'hll lifecare', 'bharat biotech', 'biological e',
  'intas', 'cadila', 'emcure', 'natco', 'hetero', 'granules', 'divis',
  'aragen', 'anthem', 'laurus', 'divi lab', 'suven', 'dishman',
  'philips india', 'siemens healthineers', 'ge healthcare india',
  'thermo fisher india', 'waters india', 'agilent india',
];
const INDIA_ACADEMIC_KEYWORDS = [
  'iit ', 'iit,', 'iit-', 'iisc', 'iiser', 'tifr', 'ncbs', 'jncasr',
  'niser', 'jnu ', 'jnu,', 'bits pilani', 'manipal', 'university',
  'college', 'institute of technology', 'institute of science',
];
const INDIA_GOVT_KEYWORDS = [
  'csir', 'drdo', 'icmr', 'icar', 'dbt ', 'dbt-', 'dbt,',
  'national institute', 'national centre', 'national center',
  'government', 'ministry', 'department of', 'aiims', 'nimhans',
  'pgimer', 'sgpgi', 'regional centre', 'regional center',
  'centre for cellular', 'centre for dna', 'inmas', 'defence',
];
function getIndiaSubsector(orgName: string): IndiaSubsector {
  const text = (orgName || '').toLowerCase();
  if (INDIA_INDUSTRY_KEYWORDS.some(k => text.includes(k))) return 'Industry';
  if (INDIA_ACADEMIC_KEYWORDS.some(k => text.includes(k))) return 'Academic';
  if (INDIA_GOVT_KEYWORDS.some(k => text.includes(k))) return 'Govt Research';
  // Unknown companies from Adzuna are almost always private industry
  return 'Industry';
}

// ── Elite Match — senior India roles ─────────────────────────────────────────
const ELITE_TERMS = [
  'assistant professor', 'associate professor', 'scientist c', 'scientist d',
  'scientist e', 'group leader', 'staff scientist', 'principal scientist',
  'senior scientist',
];
function isEliteMatch(title: string): boolean {
  const t = title.toLowerCase();
  return ELITE_TERMS.some(term => t.includes(term));
}

// ── Score Ring ──────────────────────────────────────────────────────────────────
const ScoreRing = ({ score, tier }: { score: number; tier: Tier }) => {
  const color = tier === 'high' ? '#10b981' : tier === 'good' ? '#f59e0b' : '#94a3b8';
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
      </svg>
      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 9, fontWeight: 900, color }}>
        {score}
      </span>
    </div>
  );
};

// ── Tier Badge ──────────────────────────────────────────────────────────────────
const TierBadge = ({ tier }: { tier: Tier }) => {
  const cfg = {
    high:  { label: 'High Signal', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    good:  { label: 'Good Match',  bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    broad: { label: 'Broad Match', bg: 'rgba(148,163,184,0.08)', color: '#94a3b8' },
  }[tier];
  return (
    <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', background: cfg.bg, color: cfg.color, borderRadius: 4, flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
};

// ── Job Card ────────────────────────────────────────────────────────────────────
const JobCard = ({ scored }: { scored: ScoredJob }) => {
  const { raw: job, score, tier, matchedInstitutions, matchedExpertise, matchedRole } = scored;
  const borderColor = tier === 'high' ? '#10b981' : tier === 'good' ? '#f59e0b' : '#334155';
  const visibleKeywords = [
    ...matchedInstitutions.slice(0, 2).map(k => k.trim()),
    ...matchedExpertise.slice(0, 3),
  ].filter(Boolean);
  const displaySkills = visibleKeywords.length > 0 ? visibleKeywords : (job.keySkills ?? []).slice(0, 5);

  return (
    <div style={{
      padding: '14px 18px', background: '#fff', borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.07)', borderLeft: `3px solid ${borderColor}`,
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{ paddingTop: 2 }}><ScoreRing score={score} tier={tier} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: '#1C1917' }}>{job.title}</span>
          {isEliteMatch(job.title) && (
            <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px',
              background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.4)', borderRadius: 4 }}>
              ⭐ Elite Match
            </span>
          )}
          <TierBadge tier={tier} />
          {job.category && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px',
              background: job.category === 'ACADEMIA' ? 'rgba(129,140,248,0.1)' : 'rgba(52,211,153,0.1)',
              color: job.category === 'ACADEMIA' ? '#818cf8' : '#34d399', borderRadius: 4 }}>
              {job.category === 'ACADEMIA' ? 'Academia' : 'Industry'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#78716C', marginBottom: 5 }}>
          <span style={{ fontWeight: 600 }}>{job.company}</span>
          &nbsp;&middot;&nbsp;
          <span style={{ color: '#0369A1' }}>{job.location}</span>
          {matchedRole && (
            <span style={{ marginLeft: 8, fontSize: 10, color: '#78716C' }}>({matchedRole})</span>
          )}
        </div>
        {job.snippet && (
          <div style={{ fontSize: 11, color: '#78716C', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {job.snippet}
          </div>
        )}
        {displaySkills.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
            {displaySkills.map((sk: string) => (
              <span key={sk} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px',
                background: matchedExpertise.includes(sk) || matchedInstitutions.map(k=>k.trim()).includes(sk)
                  ? 'rgba(3,105,161,0.08)' : 'rgba(0,0,0,0.04)',
                color: matchedExpertise.includes(sk) || matchedInstitutions.map(k=>k.trim()).includes(sk)
                  ? '#0369A1' : '#78716C', borderRadius: 10 }}>
                {sk}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
        {job.salary && job.salary !== 'Market Rate' && (
          <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>{job.salary}</span>
        )}
        {job.workMode && (
          <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 4,
            color: job.workMode === 'Remote' ? '#22d3ee' : job.workMode === 'Hybrid' ? '#f59e0b' : '#94a3b8',
            background: job.workMode === 'Remote' ? 'rgba(34,211,238,0.07)' : job.workMode === 'Hybrid' ? 'rgba(245,158,11,0.07)' : 'rgba(148,163,184,0.07)' }}>
            {job.workMode}
          </span>
        )}
        {job.applyUrl && job.applyUrl !== '#' && (
          <button onClick={() => window.open(job.applyUrl, '_blank')}
            style={{ fontSize: 10, fontWeight: 800, padding: '4px 12px', background: 'white',
              color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Apply →
          </button>
        )}
      </div>
    </div>
  );
};

// ── Summary bar ─────────────────────────────────────────────────────────────────
const SummaryBar = ({ jobs }: { jobs: ScoredJob[] }) => {
  const high = jobs.filter(j => j.tier === 'high').length;
  const good = jobs.filter(j => j.tier === 'good').length;
  const broad = jobs.filter(j => j.tier === 'broad').length;
  if (jobs.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
      {[
        { label: `${high} High Signal`, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
        { label: `${good} Good Match`,  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        { label: `${broad} Broad`,      color: '#64748b', bg: 'rgba(100,116,139,0.06)' },
      ].map(({ label, color, bg }) => (
        <span key={label} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', background: bg, color, borderRadius: 20 }}>
          {label}
        </span>
      ))}
    </div>
  );
};

// ── Main ────────────────────────────────────────────────────────────────────────
export const OpportunityMonitor = () => {
  const [sector, setSector] = useState<Sector>('academia');
  const [region, setRegion] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ScoredJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all');
  const [indiaSubsector, setIndiaSubsector] = useState<IndiaSubsector>('All');
  const [industryRegion, setIndustryRegion] = useState<IndustryRegion>('All');
  const [broadenedNotice, setBroadenedNotice] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());

  const fetchJobs = useCallback(async (s: Sector, r: string | null, bust = false) => {
    setLoading(true);
    setError(null);
    setBroadenedNotice(null);
    seenIds.current.clear();
    try {
      const cacheBust = bust ? `&_t=${Date.now()}` : '';
      const paths = buildApiPaths(s, r).map(p => p + cacheBust);
      const results = await Promise.allSettled(paths.map(p => api.get(p)));
      const raw: any[] = [];
      results.forEach(res => {
        if (res.status === 'fulfilled') {
          const data = res.value;
          if (data?.broadened) setBroadenedNotice(data.broadenedReason ?? 'Showing broadened results');
          const list: any[] = Array.isArray(data?.jobs) ? data.jobs
            : Array.isArray(data) ? data : [];
          list.forEach(job => {
            const normalised = normaliseMonitorJob(job);
            const key = normalised.id ?? `${normalised.title}__${normalised.company}`;
            if (!seenIds.current.has(key)) { seenIds.current.add(key); raw.push(normalised); }
          });
        }
      });
      // Drop jobs older than 30 days
      const fresh = raw.filter(j => !isExpiredJob(j.postedDate ?? j.posted_date));
      setTotalFetched(fresh.length);
      const scored = fresh.map(scoreJob).filter(Boolean) as ScoredJob[];
      // Sort: newest first, then score descending
      scored.sort((a, b) => {
        const dA = daysAgo(a.raw.postedDate ?? a.raw.posted_date);
        const dB = daysAgo(b.raw.postedDate ?? b.raw.posted_date);
        if (dA !== dB) return dA - dB;
        return b.score - a.score;
      });
      setJobs(scored);
    } catch {
      setError('Failed to fetch. Check connection or try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Merges additional jobs from a monitor endpoint into existing results.
  // Used when region/subsector tabs are clicked to fetch targeted live data.
  const supplementJobs = useCallback(async (path: string) => {
    try {
      const data = await api.get(path);
      if (data?.broadened) setBroadenedNotice(data.broadenedReason ?? 'Live search active');
      const list: any[] = Array.isArray(data?.jobs) ? data.jobs
        : Array.isArray(data) ? data : [];
      const newScored: ScoredJob[] = [];
      list.forEach(job => {
        const norm = normaliseMonitorJob(job);
        const key = norm.id ?? `${norm.title}__${norm.company}`;
        if (!seenIds.current.has(key)) {
          seenIds.current.add(key);
          const scored = scoreJob(norm);
          if (scored) newScored.push(scored);
        }
      });
      if (newScored.length > 0) {
        setJobs(prev => [...prev, ...newScored].sort((a, b) => {
          const dA = daysAgo(a.raw.postedDate ?? a.raw.posted_date);
          const dB = daysAgo(b.raw.postedDate ?? b.raw.posted_date);
          if (dA !== dB) return dA - dB;
          return b.score - a.score;
        }));
        setTotalFetched(prev => prev + list.length);
      }
    } catch { /* non-fatal — existing jobs remain visible */ }
  }, []);

  // Auto-load on mount
  useEffect(() => { fetchJobs('academia', null); }, [fetchJobs]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      if (sector === 'india' || sector === 'industry') {
        // Trigger the monitor scan pipeline for India + global industry orgs
        await api.post('/monitor/scan', {});
      } else {
        await api.post('/jobs/refresh', { candidate: 'pooja' });
      }
    } catch { /* non-fatal — scan runs in background */ }
    await fetchJobs(sector, region);
    setLastScan(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setScanning(false);
  };

  const handleForceRefresh = async () => {
    setJobs([]);
    setTotalFetched(0);
    setBroadenedNotice(null);
    await fetchJobs(sector, region, true /* bust cache */);
  };

  const handleSectorChange = (s: Sector) => {
    setSector(s);
    setRegion(null);
    setTierFilter('all');
    setIndiaSubsector('All');
    setIndustryRegion('All');
    setBroadenedNotice(null);
    fetchJobs(s, null);
  };

  const handleRegionChange = (r: string | null) => {
    setRegion(r);
    fetchJobs(sector, r);
  };

  const SECTORS: { key: Sector; label: string }[] = [
    { key: 'all',           label: 'All' },
    { key: 'academia',      label: 'Academia' },
    { key: 'industry',      label: 'Industry' },
    { key: 'india',         label: 'India' },
    { key: 'international', label: 'International' },
  ];

  const INT_REGIONS = [null, 'US', 'UK', 'DE', 'CA', 'SG'];

  const visibleJobs = jobs
    .filter(j => tierFilter === 'all' || j.tier === tierFilter)
    .filter(j => sector !== 'india' || indiaSubsector === 'All' ||
      getIndiaSubsector(j.raw.org_name ?? j.raw.company ?? '') === indiaSubsector)
    .filter(j => sector !== 'industry' || matchesIndustryRegion(j.raw, industryRegion))
    .slice(0, 30);

  return (
    <div style={{ color: '#1C1917', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0, color: '#1C1917' }}>Opportunity Monitor</h1>
          <p style={{ fontSize: 11.5, color: '#78716C', margin: '4px 0 0 0', lineHeight: 1.6 }}>
            Pooja Choubey · Life Sciences · Holistic match engine active
            {lastScan && <span style={{ color: '#10b981', marginLeft: 10 }}>↻ {lastScan}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={handleForceRefresh} disabled={loading}
            title="Clear cached results and re-fetch from backend (bypasses browser cache)"
            style={{ padding: '9px 16px', background: 'transparent',
              color: loading ? '#A8A29E' : '#78716C',
              border: `1px solid ${loading ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.15)'}`,
              borderRadius: 8, cursor: loading ? 'default' : 'pointer',
              fontWeight: 700, fontSize: 11.5 }}>
            ↺ Clear Cache
          </button>
          <button onClick={handleScan} disabled={scanning || loading}
            style={{ padding: '9px 22px', background: (scanning || loading) ? 'rgba(0,0,0,0.08)' : '#22c55e',
              color: (scanning || loading) ? '#A8A29E' : 'white', border: 'none', borderRadius: 8, cursor: (scanning||loading) ? 'default' : 'pointer',
              fontWeight: 900, fontSize: 12.5 }}>
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Sector tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
        {SECTORS.map(({ key, label }) => (
          <button key={key} onClick={() => handleSectorChange(key)} style={{
            padding: '8px 16px',
            background: sector === key ? '#F4F0E6' : 'transparent',
            border: `1px solid ${sector === key ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'}`,
            color: sector === key ? '#1C1917' : '#78716C',
            cursor: 'pointer', fontWeight: sector === key ? 800 : 500, fontSize: 12.5, borderRadius: 6,
          }}>{label}</button>
        ))}
      </div>

      {/* Industry region filter — North America / Europe / Asia */}
      {sector === 'industry' && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
          {INDUSTRY_REGIONS.map(r => (
            <button key={r} onClick={() => {
              setIndustryRegion(r);
              if (r === 'Asia') {
                supplementJobs('/monitor/jobs?sector=industry&region=asia');
                // Adzuna Singapore — most reliable Asian market on Adzuna
                supplementJobs('/jobs?candidate=pooja&country=sg&track=Industry');
              } else if (r === 'Europe') {
                supplementJobs('/monitor/jobs?sector=industry&region=europe');
                // Adzuna UK + Germany for reliable European coverage
                supplementJobs('/jobs?candidate=pooja&country=gb&track=Industry');
                supplementJobs('/jobs?candidate=pooja&country=de&track=Industry');
              } else if (r === 'North America') {
                supplementJobs('/monitor/jobs?sector=industry&region=north_america');
              }
            }} style={{
              padding: '6px 14px',
              background: industryRegion === r ? 'rgba(52,211,153,0.12)' : 'transparent',
              border: `1px solid ${industryRegion === r ? '#34d399' : 'rgba(0,0,0,0.08)'}`,
              color: industryRegion === r ? '#059669' : '#78716C',
              cursor: 'pointer', fontWeight: industryRegion === r ? 800 : 500, fontSize: 12, borderRadius: 5,
            }}>
              {r === 'North America' ? '🌎 N. America'
               : r === 'Europe'       ? '🌍 Europe'
               : r === 'Asia'         ? '🌏 Asia'
               : r}
            </button>
          ))}
        </div>
      )}

      {/* India sub-sector filter */}
      {sector === 'india' && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
          {INDIA_SUBSECTORS.map(sub => (
            <button key={sub} onClick={() => {
              setIndiaSubsector(sub);
              if (sub === 'Industry') {
                supplementJobs('/monitor/jobs?sector=india&subsector=industry');
                supplementJobs('/jobs?candidate=pooja&country=in&track=Industry');
              }
            }} style={{
              padding: '6px 14px',
              background: indiaSubsector === sub ? 'rgba(236,72,153,0.1)' : 'transparent',
              border: `1px solid ${indiaSubsector === sub ? '#ec4899' : 'rgba(0,0,0,0.08)'}`,
              color: indiaSubsector === sub ? '#be185d' : '#78716C',
              cursor: 'pointer', fontWeight: indiaSubsector === sub ? 800 : 500, fontSize: 12, borderRadius: 5,
            }}>{sub}</button>
          ))}
        </div>
      )}

      {/* Broadened-search notice */}
      {broadenedNotice && (
        <div style={{ padding: '8px 14px', background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8,
          fontSize: 11.5, color: '#f59e0b', marginBottom: 8 }}>
          ⚡ {broadenedNotice}
        </div>
      )}

      {/* International region sub-tabs */}
      {sector === 'international' && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
          {INT_REGIONS.map(r => (
            <button key={r ?? 'ALL'} onClick={() => handleRegionChange(r)} style={{
              padding: '6px 13px',
              background: region === r ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: `1px solid ${region === r ? '#6366f1' : 'rgba(0,0,0,0.08)'}`,
              color: region === r ? '#4f46e5' : '#78716C',
              cursor: 'pointer', fontWeight: 700, fontSize: 11.5, borderRadius: 5,
            }}>{r ?? 'ALL'}</button>
          ))}
        </div>
      )}

      {/* Tier filter row */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 14, marginTop: 10 }}>
          {(['all', 'high', 'good', 'broad'] as const).map(t => (
            <button key={t} onClick={() => setTierFilter(t)} style={{
              padding: '5px 12px',
              background: tierFilter === t ? 'rgba(0,0,0,0.07)' : 'transparent',
              border: `1px solid ${tierFilter === t ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'}`,
              color: tierFilter === t ? '#1C1917' : '#78716C',
              cursor: 'pointer', fontWeight: 700, fontSize: 11, borderRadius: 5,
            }}>
              {t === 'all' ? `All (${jobs.length})`
               : t === 'high' ? `High Signal (${jobs.filter(j=>j.tier==='high').length})`
               : t === 'good' ? `Good (${jobs.filter(j=>j.tier==='good').length})`
               : `Broad (${jobs.filter(j=>j.tier==='broad').length})`}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#A8A29E', alignSelf: 'center' }}>
            {totalFetched} fetched · {jobs.length} matched
          </span>
        </div>
      )}

      {/* Summary */}
      {!loading && <SummaryBar jobs={visibleJobs} />}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#78716C', fontSize: 13 }}>
            Scanning across{sector === 'all' ? ' all tracks' : ` ${sector}`}...
          </div>
        ) : error ? (
          <div style={{ padding: 20, background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.18)',
            borderRadius: 10, color: '#f43f5e', fontSize: 13, textAlign: 'center' }}>{error}</div>
        ) : visibleJobs.length > 0 ? (
          visibleJobs.map((scored, idx) => <JobCard key={scored.raw.id ?? idx} scored={scored} />)
        ) : (
          <div style={{ padding: '44px 24px', textAlign: 'center', background: 'rgba(0,0,0,0.02)',
            border: '1px dashed rgba(0,0,0,0.08)', borderRadius: 12, color: '#78716C' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🔬</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>No matches for current filters.</div>
            <div style={{ fontSize: 12 }}>
              Try <strong style={{ color: '#44403C' }}>All</strong> tier or click{' '}
              <strong style={{ color: '#22c55e' }}>Run Scan</strong> to refresh from the live backend.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityMonitor;
