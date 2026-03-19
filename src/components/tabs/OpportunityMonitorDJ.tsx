/**
 * OpportunityMonitorDJ.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * DJ (Deobrat Jha) Opportunity Monitor — completely isolated from Pooja's tab.
 * Profile: IT Audit Manager | CISA | AWS Cloud Practitioner
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../../config/api';

// ── DJ Profile DNA ─────────────────────────────────────────────────────────────
const DJ_CORE_KEYWORDS = [
  'sox', 'sox 404', 'itgc', 'itac', 'cloud security', 'sap s/4hana', 's4hana',
  'nist', 'ai governance', 'ai/ml governance', 'soc1', 'soc2', 'soc 1', 'soc 2',
  'grc', 'cisa', 'aws cloud audit', 'cloud audit', 'pcaob', 'icfr', 'erp audit',
  'sap grc', 'identity access', 'iam', 'data governance', 'sox testing',
  'it audit', 'it risk', 'technology risk', 'cyber risk', 'it compliance',
  'internal audit', 'information security audit',
];

const DJ_EAD_SIGNALS = [
  'contract', 'consultant', 'w2', 'ead', 'immediate start', '1099',
  'project-based', 'temporary', 'contract-to-hire', 'sox testing cycle',
];

const DJ_MANAGER_TERMS = [
  'manager', 'director', 'avp', 'vp', 'vice president', 'head of', 'lead', 'principal',
];

type DJSector = 'all' | 'us-big4' | 'us-finance' | 'us-tech' | 'us-manufacturing'
              | 'india-gcc' | 'india-bank' | 'india-tech';
type DJRegion = 'all' | 'us' | 'india';
type Tier = 'high' | 'good' | 'broad';

interface ScoredDJJob {
  raw: any;
  score: number;
  tier: Tier;
  isEadFriendly: boolean;
  isManagerialGrade: boolean;
  matchedKeywords: string[];
}

function djJobText(job: any): string {
  return `${job.title} ${job.org_name || job.company || ''} ${job.snippet || ''} ${job.description || ''}`.toLowerCase();
}

function scoreDJJob(job: any): ScoredDJJob | null {
  const text = djJobText(job);
  const serverScore = job.high_suitability ? 25 : 0;

  const matchedCore = DJ_CORE_KEYWORDS.filter(kw => text.includes(kw));
  const isEad = DJ_EAD_SIGNALS.some(s => text.includes(s));
  const isMgr = DJ_MANAGER_TERMS.some(t => (job.title || '').toLowerCase().includes(t));

  const localScore =
    matchedCore.length * 12 +
    (isMgr ? 25 : 0) +
    (isEad ? 10 : 0);

  const blended = Math.min(serverScore + localScore, 100);

  // Gate: must have at least 1 keyword match or high_suitability flag
  if (blended < 20 && matchedCore.length === 0) return null;

  const tier: Tier = blended >= 70 ? 'high' : blended >= 45 ? 'good' : 'broad';

  return {
    raw: job,
    score: blended,
    tier,
    isEadFriendly: isEad,
    isManagerialGrade: isMgr,
    matchedKeywords: matchedCore.slice(0, 4),
  };
}

// ── Score Ring ─────────────────────────────────────────────────────────────────
const ScoreRing = ({ score, tier }: { score: number; tier: Tier }) => {
  const color = tier === 'high' ? '#22d3ee' : tier === 'good' ? '#f59e0b' : '#64748b';
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
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

// ── Badges ─────────────────────────────────────────────────────────────────────
const TierBadge = ({ tier }: { tier: Tier }) => {
  const cfg = {
    high:  { label: 'High Signal', bg: 'rgba(34,211,238,0.10)', color: '#22d3ee' },
    good:  { label: 'Good Match',  bg: 'rgba(245,158,11,0.10)', color: '#f59e0b' },
    broad: { label: 'Broad Match', bg: 'rgba(100,116,139,0.08)', color: '#64748b' },
  }[tier];
  return (
    <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px', background: cfg.bg, color: cfg.color, borderRadius: 4, flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
};

const EadBadge = () => (
  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px',
    background: 'rgba(34,211,238,0.12)', color: '#22d3ee',
    border: '1px solid rgba(34,211,238,0.3)', borderRadius: 4, flexShrink: 0 }}>
    ✓ EAD Friendly
  </span>
);

const ManagerialBadge = () => (
  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px',
    background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
    border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, flexShrink: 0 }}>
    ⭐ Managerial Grade
  </span>
);

// ── Job Card ───────────────────────────────────────────────────────────────────
const DJJobCard = ({ scored }: { scored: ScoredDJJob }) => {
  const { raw: job, score, tier, isEadFriendly, isManagerialGrade, matchedKeywords } = scored;
  const borderColor = tier === 'high' ? '#22d3ee' : tier === 'good' ? '#f59e0b' : '#334155';
  const orgName = job.org_name || job.company || 'Unknown';
  const applyUrl = job.apply_url || job.applyUrl || '#';

  return (
    <div style={{
      padding: '14px 18px', background: 'rgba(255,255,255,0.025)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${borderColor}`,
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{ paddingTop: 2 }}><ScoreRing score={score} tier={tier} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: '#f8fafc' }}>{job.title}</span>
          {isManagerialGrade && <ManagerialBadge />}
          {isEadFriendly && <EadBadge />}
          <TierBadge tier={tier} />
        </div>
        {/* Org + location */}
        <div style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 6 }}>
          {orgName}
          {job.location && <span style={{ color: '#64748b' }}> · {job.location}</span>}
          {job.posted_date && <span style={{ color: '#475569' }}> · {job.posted_date}</span>}
        </div>
        {/* Snippet */}
        {job.snippet && (
          <p style={{ fontSize: 12, color: '#cbd5e1', margin: '0 0 8px 0', lineHeight: 1.5 }}>
            {job.snippet}
          </p>
        )}
        {/* Matched keywords */}
        {matchedKeywords.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {matchedKeywords.map(kw => (
              <span key={kw} style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px',
                background: 'rgba(34,211,238,0.08)', color: '#67e8f9', borderRadius: 4,
              }}>{kw.toUpperCase()}</span>
            ))}
          </div>
        )}
        {/* Apply button */}
        {applyUrl && applyUrl !== '#' && (
          <a href={applyUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', fontSize: 10, fontWeight: 800,
              padding: '4px 12px', background: '#22d3ee', color: '#000',
              borderRadius: 6, textDecoration: 'none' }}>
            Apply →
          </a>
        )}
      </div>
    </div>
  );
};

// ── Summary Bar ───────────────────────────────────────────────────────────────
const DJSummaryBar = ({ jobs }: { jobs: ScoredDJJob[] }) => {
  if (jobs.length === 0) return null;
  const high = jobs.filter(j => j.tier === 'high').length;
  const good = jobs.filter(j => j.tier === 'good').length;
  const broad = jobs.filter(j => j.tier === 'broad').length;
  const ead = jobs.filter(j => j.isEadFriendly).length;
  const mgr = jobs.filter(j => j.isManagerialGrade).length;
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      {[
        { label: `${high} High Signal`, color: '#22d3ee', bg: 'rgba(34,211,238,0.08)' },
        { label: `${good} Good Match`,  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        { label: `${broad} Broad`,      color: '#475569', bg: 'rgba(71,85,105,0.06)' },
        { label: `${ead} EAD Friendly`, color: '#22d3ee', bg: 'rgba(34,211,238,0.05)' },
        { label: `${mgr} Managerial`,   color: '#fbbf24', bg: 'rgba(251,191,36,0.05)' },
      ].map(({ label, color, bg }) => (
        <span key={label} style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', background: bg, color, borderRadius: 20 }}>
          {label}
        </span>
      ))}
    </div>
  );
};

// ── Sector tab configs ────────────────────────────────────────────────────────
const US_SECTOR_TABS: { key: DJSector; label: string }[] = [
  { key: 'us-big4',          label: 'Big 4'         },
  { key: 'us-finance',       label: 'Banking'       },
  { key: 'us-tech',          label: 'Tech/Cloud'    },
  { key: 'us-manufacturing', label: 'Manufacturing' },
];
const INDIA_SECTOR_TABS: { key: DJSector; label: string }[] = [
  { key: 'india-gcc',  label: 'GCC'     },
  { key: 'india-bank', label: 'Banking' },
  { key: 'india-tech', label: 'IT/Tech' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export const OpportunityMonitorDJ = () => {
  const [region, setRegion] = useState<DJRegion>('us');
  const [sector, setSector] = useState<DJSector>('all');
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all');
  const [jobs, setJobs] = useState<ScoredDJJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [totalFetched, setTotalFetched] = useState(0);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());

  const fetchJobs = useCallback(async (djSector: DJSector, djRegion: DJRegion) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    seenIds.current.clear();

    const tryFetch = async (path: string): Promise<any[]> => {
      try {
        const data = await api.get(path);
        if (data?.broadened) setNotice(data.broadenedReason || 'Showing broadened results');
        if (data?.scanPending) setNotice(data.scanPendingMessage || 'Scan pending — results loading soon');
        return Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    try {
      // ── Primary: DJ monitor endpoint ──────────────────────────────────────
      const params = new URLSearchParams();
      if (djSector !== 'all') params.set('sector', djSector);
      if (djRegion !== 'all') params.set('region', djRegion);

      let rawJobs = await tryFetch(`/monitor/dj/jobs?${params.toString()}`);

      // ── Layer 1 fallback: /api/jobs?q=IT+Audit+Manager ───────────────────
      if (rawJobs.length === 0) {
        setNotice('Monitor DB empty — falling back to live job search (Layer 1)');
        const q = djRegion === 'india' ? 'IT+Audit+Manager+India' : 'IT+Audit+Manager+SOX+ITGC';
        const country = djRegion === 'india' ? 'india' : 'usa';
        rawJobs = await tryFetch(`/jobs?q=${q}&country=${country}&candidate=dj`);
      }

      // ── Layer 2 fallback: broaden to cloud risk ──────────────────────────
      if (rawJobs.length === 0) {
        setNotice('Layer 1 empty — broadening to Cloud Risk Audit search (Layer 2)');
        const country = djRegion === 'india' ? 'India' : 'US';
        rawJobs = await tryFetch(`/jobs?q=Cloud+Risk+Audit+GRC&country=${country}&candidate=dj`);
      }

      // Deduplicate
      const unique: any[] = [];
      rawJobs.forEach(job => {
        const key = job.id ?? `${job.title}__${job.org_name || job.company}`;
        if (!seenIds.current.has(key)) { seenIds.current.add(key); unique.push(job); }
      });

      setTotalFetched(unique.length);
      const scored = unique.map(scoreDJJob).filter(Boolean) as ScoredDJJob[];
      scored.sort((a, b) => b.score - a.score);
      setJobs(scored);
    } catch {
      setError('Failed to fetch DJ jobs. Check connection or try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => { fetchJobs('all', 'us'); }, [fetchJobs]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try { await api.post('/monitor/dj/scan', {}); } catch { /* scan runs in BG */ }
    await fetchJobs(sector, region);
    setLastScan(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setScanning(false);
  };

  const handleRegionChange = (r: DJRegion) => {
    setRegion(r);
    setSector('all');
    setTierFilter('all');
    fetchJobs('all', r);
  };

  const handleSectorChange = (s: DJSector) => {
    setSector(s);
    setTierFilter('all');
    fetchJobs(s, region);
  };

  const visibleJobs = jobs.filter(j => tierFilter === 'all' || j.tier === tierFilter);

  const currentSectorTabs = region === 'us' ? US_SECTOR_TABS
    : region === 'india' ? INDIA_SECTOR_TABS : [];

  return (
    <div style={{ color: 'white', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0, color: '#22d3ee' }}>
            DJ Opportunity Monitor
          </h1>
          <p style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 0 0', lineHeight: 1.6 }}>
            Deobrat Jha · IT Audit Manager · CISA · AWS Cloud Practitioner
            {lastScan && <span style={{ color: '#22d3ee', marginLeft: 10 }}>↻ {lastScan}</span>}
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || loading}
          style={{
            padding: '10px 20px', background: scanning ? '#1e293b' : 'rgba(34,211,238,0.1)',
            border: '1px solid #22d3ee', color: '#22d3ee', borderRadius: 8,
            fontSize: 12, fontWeight: 800, cursor: scanning ? 'default' : 'pointer',
          }}>
          {scanning ? '⚡ Scanning...' : '⚡ Run DJ Scan'}
        </button>
      </div>

      {/* Region tabs: US | India | All */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
        {([
          { key: 'us' as DJRegion, label: '🇺🇸 United States', sub: 'EAD / Contract / Big4' },
          { key: 'india' as DJRegion, label: '🇮🇳 India', sub: 'Manager+ / GCC / Banking' },
          { key: 'all' as DJRegion, label: '🌐 All Regions', sub: '' },
        ]).map(({ key, label, sub }) => (
          <button key={key} onClick={() => handleRegionChange(key)} style={{
            padding: '10px 18px', textAlign: 'left',
            background: region === key ? 'rgba(34,211,238,0.12)' : '#1e293b',
            border: `1px solid ${region === key ? '#22d3ee' : '#334155'}`,
            color: region === key ? '#22d3ee' : '#94a3b8',
            cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s',
          }}>
            <div style={{ fontWeight: 800, fontSize: 12.5 }}>{label}</div>
            {sub && <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 2 }}>{sub}</div>}
          </button>
        ))}
      </div>

      {/* Sector sub-tabs */}
      {currentSectorTabs.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
          <button onClick={() => handleSectorChange('all')} style={{
            padding: '6px 14px',
            background: sector === 'all' ? 'rgba(34,211,238,0.1)' : 'transparent',
            border: `1px solid ${sector === 'all' ? '#22d3ee' : '#334155'}`,
            color: sector === 'all' ? '#22d3ee' : '#64748b',
            cursor: 'pointer', fontWeight: 700, fontSize: 11.5, borderRadius: 5,
          }}>All</button>
          {currentSectorTabs.map(({ key, label }) => (
            <button key={key} onClick={() => handleSectorChange(key)} style={{
              padding: '6px 14px',
              background: sector === key ? 'rgba(34,211,238,0.1)' : 'transparent',
              border: `1px solid ${sector === key ? '#22d3ee' : '#334155'}`,
              color: sector === key ? '#22d3ee' : '#64748b',
              cursor: 'pointer', fontWeight: 700, fontSize: 11.5, borderRadius: 5,
            }}>{label}</button>
          ))}
        </div>
      )}

      {/* Notice banner (broadened / scan-pending / layer fallback) */}
      {notice && (
        <div style={{ padding: '8px 14px', background: 'rgba(34,211,238,0.06)',
          border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8,
          fontSize: 11.5, color: '#67e8f9', marginBottom: 8 }}>
          ⚡ {notice}
        </div>
      )}

      {/* Tier filter row */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 14, marginTop: 10 }}>
          {(['all', 'high', 'good', 'broad'] as const).map(t => (
            <button key={t} onClick={() => setTierFilter(t)} style={{
              padding: '5px 12px',
              background: tierFilter === t ? 'rgba(255,255,255,0.07)' : 'transparent',
              border: `1px solid ${tierFilter === t ? 'rgba(255,255,255,0.15)' : '#334155'}`,
              color: tierFilter === t ? '#f8fafc' : '#64748b',
              cursor: 'pointer', fontWeight: 700, fontSize: 11, borderRadius: 5,
            }}>
              {t === 'all'   ? `All (${jobs.length})`
               : t === 'high' ? `High Signal (${jobs.filter(j=>j.tier==='high').length})`
               : t === 'good' ? `Good (${jobs.filter(j=>j.tier==='good').length})`
               : `Broad (${jobs.filter(j=>j.tier==='broad').length})`}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#475569', alignSelf: 'center' }}>
            {totalFetched} fetched · {jobs.length} matched
          </span>
        </div>
      )}

      {/* Summary */}
      {!loading && <DJSummaryBar jobs={visibleJobs} />}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Scanning {region === 'us' ? 'US' : region === 'india' ? 'India' : 'all'} IT Audit opportunities...
          </div>
        ) : error ? (
          <div style={{ padding: 24, background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', fontSize: 12 }}>
            {error}
          </div>
        ) : visibleJobs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee', marginBottom: 8 }}>
              DJ Monitor Warming Up
            </div>
            <div style={{ fontSize: 12, color: '#64748b', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              The DJ scan pipeline is seeding 96 IT Audit orgs across US and India.
              Click <strong style={{ color: '#22d3ee' }}>Run DJ Scan</strong> to populate immediately,
              or wait for the daily cron at 10:00 UTC.
            </div>
          </div>
        ) : (
          visibleJobs.map((scored, i) => (
            <DJJobCard key={scored.raw.id ?? `${scored.raw.title}_${i}`} scored={scored} />
          ))
        )}
      </div>
    </div>
  );
};
