import React, { useState, useCallback } from 'react';
import { api } from '../../config/api';

// ── Pooja-specific filter constants ────────────────────────────────────────────
const POOJA_SIGNAL_KEYWORDS = [
  'postdoctoral', 'postdoc', 'iiser', 'iit', 'astrazeneca', 'novartis',
  'scientist', 'research', 'pharma', 'biotech', 'molecular biology',
  'cardiovascular', 'cancer biology', 'drug discovery',
];

const ACADEMIA_KEYWORDS = [
  'iit', 'iiser', 'university', 'postdoc', 'postdoctoral', 'academic',
  'institute', 'college', 'school of', 'professor', 'faculty',
  'research fellow', 'tifr', 'ncbs', 'jnu', 'niser',
];

const INDUSTRY_PHARMA_KEYWORDS = [
  'astrazeneca', 'novartis', 'pharma', 'biotech', 'pharmaceutical',
  'drug discovery', 'roche', 'pfizer', 'sanofi', 'gsk', 'abbvie',
  'merck', 'lilly', 'amgen', 'biogen', 'gilead', 'bayer', 'boehringer',
  'clinical', 'therapeutics', 'biologics',
];

function jobText(job: any): string {
  return `${job.title} ${job.company} ${job.snippet || ''} ${(job.keySkills || []).join(' ')}`.toLowerCase();
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.filter(kw => text.includes(kw)).length;
}

/** Core Pooja-match gate: fitScore > 85 OR ≥ 2 signal keyword hits */
function isPoojaMatch(job: any): boolean {
  if ((job.fitScore ?? 0) > 85) return true;
  return countMatches(jobText(job), POOJA_SIGNAL_KEYWORDS) >= 2;
}

function isAcademiaJob(job: any): boolean {
  if (job.category === 'ACADEMIA') return true;
  return countMatches(jobText(job), ACADEMIA_KEYWORDS) >= 1;
}

function isIndustryJob(job: any): boolean {
  if (job.category === 'INDUSTRY') return true;
  return countMatches(jobText(job), INDUSTRY_PHARMA_KEYWORDS) >= 1;
}

function isIndiaLocation(job: any): boolean {
  const loc = (job.location || '').toLowerCase();
  return loc.includes('india') || loc.includes('mumbai') || loc.includes('delhi') ||
    loc.includes('bangalore') || loc.includes('bengaluru') || loc.includes('pune') ||
    loc.includes('hyderabad') || loc.includes('chennai') || loc.includes('kolkata') ||
    job.region === 'India';
}

function matchesRegionFilter(job: any, region: string | null): boolean {
  if (!region) return true;
  const loc = (job.location || '').toLowerCase();
  if (region === 'DE') return loc.includes('german') || loc.includes('berlin') || loc.includes('munich') || loc.includes('hamburg');
  if (region === 'CA') return loc.includes('canada') || loc.includes('toronto') || loc.includes('vancouver') || loc.includes('montreal');
  if (region === 'SG') return loc.includes('singapore') || job.region === 'Asia';
  return true;
}

function buildApiPath(sector: string, region: string | null): string {
  const params = new URLSearchParams({ candidate: 'pooja' });
  if (sector === 'academia') params.set('track', 'Academic');
  else if (sector === 'industry') params.set('track', 'Industry');
  else if (sector === 'india') params.set('country', 'india');
  else if (sector === 'international') {
    if (region === 'DE') params.set('country', 'germany');
    else if (region === 'CA') params.set('country', 'canada');
    else if (region === 'SG') params.set('country', 'singapore');
  }
  return `/jobs?${params.toString()}`;
}

function applyPoojaFilter(jobs: any[], sector: string, region: string | null): any[] {
  let filtered = jobs.filter(isPoojaMatch);
  if (sector === 'academia') filtered = filtered.filter(isAcademiaJob);
  else if (sector === 'industry') filtered = filtered.filter(isIndustryJob);
  else if (sector === 'india') filtered = filtered.filter(isIndiaLocation);
  else if (sector === 'international') {
    filtered = filtered.filter(j => !isIndiaLocation(j));
    if (region) filtered = filtered.filter(j => matchesRegionFilter(j, region));
  }
  return filtered.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)).slice(0, 10);
}

// ── Score Ring ──────────────────────────────────────────────────────────────────
const ScoreRing = ({ score }: { score: number }) => {
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#f43f5e';
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
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

// ── Job Card ────────────────────────────────────────────────────────────────────
const JobCard = ({ job }: { job: any }) => {
  const isAcademia = job.category === 'ACADEMIA';
  const categoryColor = isAcademia ? '#818cf8' : '#34d399';
  const categoryLabel = isAcademia ? '🎓 Academia' : '🏭 Industry';
  return (
    <div style={{
      padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${categoryColor}`,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <ScoreRing score={job.fitScore ?? 0} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.title}
          </span>
          {job.category && (
            <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 7px', background: isAcademia ? 'rgba(129,140,248,0.12)' : 'rgba(52,211,153,0.12)', color: categoryColor, borderRadius: 4, flexShrink: 0 }}>
              {categoryLabel}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
          {job.company} &middot; <span style={{ color: '#22d3ee' }}>{job.location}</span>
        </div>
        {job.snippet && (
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {job.snippet}
          </div>
        )}
        {job.keySkills?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {job.keySkills.slice(0, 5).map((sk: string) => (
              <span key={sk} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: 10 }}>
                {sk}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        {job.salary && job.salary !== 'Market Rate' && (
          <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>{job.salary}</span>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {job.workMode && (
            <span style={{
              fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 4,
              color: job.workMode === 'Remote' ? '#22d3ee' : job.workMode === 'Hybrid' ? '#f59e0b' : '#94a3b8',
              background: job.workMode === 'Remote' ? 'rgba(34,211,238,0.08)' : job.workMode === 'Hybrid' ? 'rgba(245,158,11,0.08)' : 'rgba(148,163,184,0.08)',
            }}>
              {job.workMode}
            </span>
          )}
          {job.applyUrl && job.applyUrl !== '#' && (
            <button onClick={() => window.open(job.applyUrl, '_blank')}
              style={{ fontSize: 10, fontWeight: 800, padding: '4px 12px', background: 'white', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Apply →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────────
export const OpportunityMonitor = () => {
  const [activeSector, setActiveSector] = useState<'academia' | 'industry' | 'international' | 'india'>('academia');
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);

  const fetchJobs = useCallback(async (sector: typeof activeSector, region: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(buildApiPath(sector, region));
      const rawJobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
      setTotalFetched(rawJobs.length);
      setJobs(applyPoojaFilter(rawJobs, sector, region));
    } catch (err: any) {
      setError('Failed to fetch jobs. Check your connection or try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try { await api.post('/jobs/refresh', { candidate: 'pooja' }); } catch { /* non-fatal */ }
    await fetchJobs(activeSector, activeRegion);
    setLastScan(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setScanning(false);
  };

  const handleSectorChange = (sector: typeof activeSector) => {
    setActiveSector(sector);
    setActiveRegion(null);
    fetchJobs(sector, null);
  };

  const handleRegionChange = (region: string | null) => {
    setActiveRegion(region);
    fetchJobs(activeSector, region);
  };

  const SECTOR_LABELS: Record<string, string> = {
    academia: 'Academia', industry: 'Industry', international: 'International', india: 'India',
  };

  return (
    <div style={{ color: 'white', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Sup, Opportunity Monitor</h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
            Pooja-optimized · High-precision filter active
            {lastScan && <span style={{ color: '#10b981', marginLeft: 8 }}>Last scan: {lastScan}</span>}
          </p>
        </div>
        <button onClick={handleScan} disabled={scanning || loading}
          style={{ padding: '10px 24px', background: (scanning || loading) ? '#334155' : '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: (scanning || loading) ? 'default' : 'pointer', fontWeight: 900, fontSize: 13 }}>
          {scanning ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {/* Sector Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
        {(['academia', 'industry', 'international', 'india'] as const).map(s => (
          <button key={s} onClick={() => handleSectorChange(s)} style={{
            padding: '9px 18px',
            background: activeSector === s ? '#334155' : '#1e293b',
            border: `1px solid ${activeSector === s ? '#475569' : '#334155'}`,
            color: activeSector === s ? '#f8fafc' : '#94a3b8',
            cursor: 'pointer', fontWeight: activeSector === s ? 800 : 500, fontSize: 13, borderRadius: 6,
          }}>
            {SECTOR_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Region Sub-filters — International only */}
      {activeSector === 'international' && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 20 }}>
          {([null, 'DE', 'CA', 'SG'] as const).map(r => (
            <button key={r ?? 'ALL'} onClick={() => handleRegionChange(r)} style={{
              padding: '7px 16px',
              background: activeRegion === r ? '#22c55e' : '#1e293b',
              border: `1px solid ${activeRegion === r ? '#22c55e' : '#334155'}`,
              color: activeRegion === r ? '#000' : '#94a3b8',
              cursor: 'pointer', fontWeight: 700, fontSize: 12, borderRadius: 6,
            }}>
              {r ?? 'ALL'}
            </button>
          ))}
        </div>
      )}

      {/* Status line */}
      {(jobs.length > 0 || totalFetched > 0) && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, marginTop: activeSector !== 'international' ? 16 : 0 }}>
          Showing {jobs.length} curated matches from {totalFetched} fetched &middot; {SECTOR_LABELS[activeSector]}
          {activeRegion ? ` · ${activeRegion}` : ''} &middot; Pooja profile alignment applied
        </div>
      )}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Fetching opportunities...
          </div>
        ) : error ? (
          <div style={{ padding: 24, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, color: '#f43f5e', fontSize: 13, textAlign: 'center' }}>
            {error}
          </div>
        ) : jobs.length > 0 ? (
          jobs.map((job, idx) => <JobCard key={job.id ?? idx} job={job} />)
        ) : (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, color: '#64748b' }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              No jobs found for {SECTOR_LABELS[activeSector]}{activeRegion ? ` · ${activeRegion}` : ''}.
            </div>
            <div style={{ fontSize: 12 }}>
              Click <strong style={{ color: '#22c55e' }}>Run Scan</strong> to fetch fresh listings from the live backend.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityMonitor;
