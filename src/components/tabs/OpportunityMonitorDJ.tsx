/**
 * OpportunityMonitorDJ.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * DJ (Deobrat Jha) — Dedicated Opportunity Monitor.
 * Architecturally isolated from Pooja's OpportunityMonitor.tsx.
 *
 * Profile DNA: IT Audit Manager · CISA · AWS Certified Cloud Practitioner
 * Core Keywords: SOX 404, ITGC/ITAC, Cloud Security, SAP S/4HANA, NIST,
 *                AI/ML Governance, SOC1/SOC2, GRC
 *
 * MULTI-LAYER FALLBACK:
 *   Primary  → /api/monitor/dj/jobs?sector=<sector>
 *   Layer 1  → /api/jobs?q=IT+Audit+Manager&country=US      (if DJ table empty)
 *   Layer 2  → /api/jobs?q=Cloud+Risk+Audit&country=India   (if US yields zero)
 *
 * SECTOR TABS: Big 4 | Banking | Tech/Cloud | Manufacturing
 * VISUAL TAGS: 'EAD Friendly' (US roles) · 'Managerial Grade' (India roles)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../../config/api';

// ─── DJ Scoring — keywords ───────────────────────────────────────────────────

const DJ_RANK1_TITLES = [
  'it audit manager', 'it audit director', 'head of it audit', 'director of it audit',
  'vp internal audit', 'avp it audit', 'senior manager it audit', 'technology risk manager',
  'technology risk director', 'cloud risk manager', 'cloud audit manager',
  'sox audit manager', 'it compliance manager', 'cloud security manager',
  'grc manager', 'it risk manager', 'information security manager',
];

const DJ_TECHNICAL_ANCHORS = [
  'sox', 'itgc', 'itac', 'cloud security', 'cloud audit', 'sap s/4hana', 'sap s4hana',
  'nist', 'ai governance', 'ml governance', 'soc1', 'soc 1', 'soc2', 'soc 2',
  'grc', 'cisa', 'cissp', 'aws cloud', 'azure security', 'cloud risk', 'it audit',
];

const DJ_SENIORITY_KW = [
  'manager', 'senior manager', 'director', 'avp', 'vp', 'vice president',
  'head of', 'principal', 'lead',
];

const DJ_TIER1_ORGS = new Set([
  'EY US Technology Risk', 'EY India GDS', 'Deloitte US Risk Advisory', 'Deloitte India',
  'KPMG US Technology Risk', 'KPMG India', 'PwC US Digital Assurance', 'PwC India',
  'Goldman Sachs', 'Goldman Sachs India', 'JPMorgan Chase', 'JPMorgan India GCC',
  'Public Storage', 'Western Digital', 'Investar Bank',
  'Amazon Web Services', 'Amazon India GCC', 'Microsoft', 'Microsoft India GCC',
  'Google Cloud', 'Google India GCC',
]);

// ─── Hard filter — same as backend ───────────────────────────────────────────

const DJ_GLOBAL_HARD = ['intern', 'entry level', 'staff auditor', 'junior', 'graduate', 'trainee'];
const DJ_INDIA_HARD  = ['senior associate', 'associate', 'analyst'];

function passesHardFilter(title: string, country: string): boolean {
  const t = title.toLowerCase();
  if (DJ_GLOBAL_HARD.some(term => t.includes(term))) return false;
  if (country === 'India' && DJ_INDIA_HARD.some(term => t.includes(term))) return false;
  return true;
}

// ─── DJ Suitability Scoring ───────────────────────────────────────────────────

type DJTier = 'elite' | 'strong' | 'potential';

interface DJScoredJob {
  raw: any;
  score: number;
  tier: DJTier;
  matchedTitles: string[];
  matchedAnchors: string[];
  hasSeniority: boolean;
  eadFriendly: boolean;
  managerialGrade: boolean;
}

function jobText(job: any): string {
  return `${job.title} ${job.org_name || job.company || ''} ${job.snippet || ''} ${job.description || ''}`.toLowerCase();
}

function scoreDJJob(job: any): DJScoredJob | null {
  const title = job.title || '';
  const country = job.country || '';
  if (!passesHardFilter(title, country)) return null;

  const text = jobText(job);
  const matchedTitles   = DJ_RANK1_TITLES.filter(kw => text.includes(kw));
  const matchedAnchors  = DJ_TECHNICAL_ANCHORS.filter(a => text.includes(a));
  const hasSeniority    = DJ_SENIORITY_KW.some(kw => text.includes(kw));

  // Score ≥ 4 gate (mirrors backend scoring)
  let score = 0;
  if (text.includes('aws cloud audit') || text.includes('cloud audit') ||
      text.includes('ai governance') || text.includes('ml governance')) score += 2;
  if (text.includes('manager') || text.includes('director') ||
      text.includes('avp') || text.includes('vp') || text.includes('head of')) score += 2;
  const orgName = job.org_name || job.company || '';
  if (DJ_TIER1_ORGS.has(orgName)) score += 1;

  // Boost from suitability_score if available from DB
  const dbScore = job.suitability_score ?? 0;
  const finalScore = dbScore > 0 ? Math.max(dbScore, score) : score;

  // Must meet minimum threshold or have strong title/anchor signal
  if (finalScore < 2 && matchedTitles.length === 0 && matchedAnchors.length < 2) return null;

  const tier: DJTier = finalScore >= 5 ? 'elite' : finalScore >= 4 ? 'strong' : 'potential';

  return {
    raw: job,
    score: finalScore,
    tier,
    matchedTitles,
    matchedAnchors,
    hasSeniority,
    eadFriendly: job.ead_friendly === true || job.org_ead_friendly === true,
    managerialGrade: job.managerial_grade === true || job.org_managerial_grade === true ||
                     (country === 'India' && hasSeniority),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DJSector = 'all' | 'big4' | 'banking' | 'tech-cloud' | 'manufacturing';
type DJCountry = 'all' | 'USA' | 'India';
type DJSource = 'all' | 'monitor' | 'indeed';

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScoreRing = ({ score, tier }: { score: number; tier: DJTier }) => {
  const color = tier === 'elite' ? '#22d3ee' : tier === 'strong' ? '#10b981' : '#f59e0b';
  const r = 14, circ = 2 * Math.PI * r;
  const pct = Math.min((score / 5) * 100, 100);
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <svg width="36" height="36" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
      </svg>
      <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        fontSize: 9, fontWeight: 900, color }}>
        {score}
      </span>
    </div>
  );
};

const TierBadge = ({ tier }: { tier: DJTier }) => {
  const cfg = {
    elite:    { label: 'Elite Match', bg: 'rgba(34,211,238,0.12)', color: '#22d3ee' },
    strong:   { label: 'Strong Fit',  bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    potential:{ label: 'Potential',   bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  }[tier];
  return (
    <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 8px',
      background: cfg.bg, color: cfg.color, borderRadius: 4, flexShrink: 0 }}>
      {cfg.label}
    </span>
  );
};

const EADBadge = () => (
  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 7px',
    background: 'rgba(99,102,241,0.14)', color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.3)', borderRadius: 4, flexShrink: 0 }}>
    EAD Friendly
  </span>
);

const ManagerialBadge = () => (
  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 7px',
    background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
    border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, flexShrink: 0 }}>
    Managerial Grade
  </span>
);

const IndeedBadge = () => (
  <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 7px',
    background: 'rgba(20,184,166,0.12)', color: '#2dd4bf',
    border: '1px solid rgba(20,184,166,0.3)', borderRadius: 4, flexShrink: 0 }}>
    Indeed Live
  </span>
);

const JobCard = ({ scored }: { scored: DJScoredJob }) => {
  const { raw: job, score, tier, matchedAnchors, eadFriendly, managerialGrade } = scored;
  const borderColor = tier === 'elite' ? '#22d3ee' : tier === 'strong' ? '#10b981' : '#f59e0b';
  const orgName = job.org_name || job.company || '';
  const applyUrl = job.apply_url || job.applyUrl || '#';
  const isIndeed = job.source === 'indeed';

  const visibleTags = matchedAnchors.slice(0, 4).map(a => a.toUpperCase());

  return (
    <div style={{
      padding: '14px 18px', background: 'rgba(255,255,255,0.025)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${borderColor}`,
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{ paddingTop: 2 }}><ScoreRing score={score} tier={tier} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: '#f8fafc' }}>{job.title}</span>
          <TierBadge tier={tier} />
          {isIndeed     && <IndeedBadge />}
          {eadFriendly  && <EADBadge />}
          {managerialGrade && <ManagerialBadge />}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{orgName}</span>
          &nbsp;&middot;&nbsp;
          <span style={{ color: '#22d3ee' }}>{job.location || job.country}</span>
          {job.country && (
            <span style={{ marginLeft: 8, fontSize: 10, color: '#475569',
              padding: '1px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
              {job.country}
            </span>
          )}
          {job.salary && job.salary !== 'Not disclosed' && (
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#10b981' }}>
              {job.salary}
            </span>
          )}
        </div>
        {job.snippet && (
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {job.snippet}
          </div>
        )}
        {visibleTags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
            {visibleTags.map(tag => (
              <span key={tag} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px',
                background: 'rgba(34,211,238,0.07)', color: '#22d3ee', borderRadius: 10 }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
        {job.posted_date && job.posted_date !== 'Recent' && (
          <span style={{ fontSize: 10, color: '#475569' }}>{job.posted_date}</span>
        )}
        {job.is_new && (
          <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 7px',
            background: 'rgba(16,185,129,0.12)', color: '#10b981', borderRadius: 4 }}>
            NEW
          </span>
        )}
        {applyUrl && applyUrl !== '#' && (
          <button onClick={() => window.open(applyUrl, '_blank')}
            style={{ fontSize: 10, fontWeight: 800, padding: '5px 14px', background: '#22d3ee',
              color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Apply →
          </button>
        )}
      </div>
    </div>
  );
};

const SummaryBar = ({ jobs }: { jobs: DJScoredJob[] }) => {
  const elite    = jobs.filter(j => j.tier === 'elite').length;
  const strong   = jobs.filter(j => j.tier === 'strong').length;
  const potential= jobs.filter(j => j.tier === 'potential').length;
  const ead      = jobs.filter(j => j.eadFriendly).length;
  const mgr      = jobs.filter(j => j.managerialGrade).length;
  if (!jobs.length) return null;
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      {elite > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px',
        background: 'rgba(34,211,238,0.08)', color: '#22d3ee', borderRadius: 20 }}>
        ⚡ {elite} Elite
      </span>}
      {strong > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px',
        background: 'rgba(16,185,129,0.08)', color: '#10b981', borderRadius: 20 }}>
        ✓ {strong} Strong
      </span>}
      {potential > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px',
        background: 'rgba(245,158,11,0.08)', color: '#f59e0b', borderRadius: 20 }}>
        ~ {potential} Potential
      </span>}
      {ead > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px',
        background: 'rgba(99,102,241,0.08)', color: '#818cf8', borderRadius: 20 }}>
        🛂 {ead} EAD Friendly
      </span>}
      {mgr > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px',
        background: 'rgba(251,191,36,0.08)', color: '#fbbf24', borderRadius: 20 }}>
        🏅 {mgr} Managerial Grade
      </span>}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const OpportunityMonitorDJ: React.FC = () => {
  const [sector,        setSector]        = useState<DJSector>('all');
  const [country,       setCountry]       = useState<DJCountry>('all');
  const [jobs,          setJobs]          = useState<DJScoredJob[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [scanning,      setScanning]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [totalFetched,  setTotalFetched]  = useState(0);
  const [lastScan,      setLastScan]      = useState<string | null>(null);
  const [tierFilter,    setTierFilter]    = useState<DJTier | 'all'>('all');
  const [sourceFilter,  setSourceFilter]  = useState<DJSource>('all');
  const [fallbackUsed,  setFallbackUsed]  = useState<string | null>(null);
  const [indeedLoading, setIndeedLoading] = useState(false);
  const seenIds = useRef(new Set<string>());

  const fetchIndeedJobs = useCallback(async (): Promise<any[]> => {
    setIndeedLoading(true);
    try {
      const data = await api.get('/monitor/dj/indeed-jobs');
      const list: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
      return list.map(j => ({ ...j, source: 'indeed' }));
    } catch {
      return [];
    } finally {
      setIndeedLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async (s: DJSector, c: DJCountry) => {
    setLoading(true);
    setError(null);
    setFallbackUsed(null);
    seenIds.current.clear();

    try {
      // Build primary URL
      const primaryParams = new URLSearchParams();
      if (s !== 'all') primaryParams.set('sector', s);
      if (c !== 'all') primaryParams.set('country', c);
      primaryParams.set('limit', '80');

      const primaryPath = `/monitor/dj/jobs?${primaryParams.toString()}`;
      const raw: any[] = [];

      // Fetch monitor DB jobs + Indeed in parallel
      const [, indeedRaw] = await Promise.allSettled([
        (async () => {
          try {
            const data = await api.get(primaryPath);
            const list: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
            list.forEach(job => {
              const key = job.id ?? `${job.title}__${job.org_name}`;
              if (!seenIds.current.has(key)) { seenIds.current.add(key); raw.push(job); }
            });
          } catch { /* fallback below */ }

          // Layer 1 fallback: /api/jobs with IT Audit Manager query (US)
          if (raw.length === 0) {
            setFallbackUsed('Layer 1: Broadening to live IT Audit Manager search (US)');
            try {
              const data = await api.get('/jobs?q=IT+Audit+Manager&country=US&candidate=dj');
              const list: any[] = Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data) ? data : [];
              list.forEach(job => {
                const key = job.id ?? `${job.title}__${job.company}`;
                if (!seenIds.current.has(key)) { seenIds.current.add(key); raw.push({ ...job, country: 'USA', ead_friendly: true }); }
              });
            } catch { /* continue to layer 2 */ }
          }

          // Layer 2 fallback: Cloud Risk Audit — India
          if (raw.length === 0) {
            setFallbackUsed('Layer 2: Broadening to Cloud Risk Audit search (India)');
            try {
              const data = await api.get('/jobs?q=Cloud+Risk+Audit&country=India&candidate=dj');
              const list: any[] = Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data) ? data : [];
              list.forEach(job => {
                const key = job.id ?? `${job.title}__${job.company}`;
                if (!seenIds.current.has(key)) { seenIds.current.add(key); raw.push({ ...job, country: 'India', managerial_grade: true }); }
              });
            } catch { /* give up */ }
          }

          if (raw.length > 0) setFallbackUsed(null);
        })(),
        fetchIndeedJobs(),
      ]);

      // Merge Indeed results (deduped by title+company)
      const indeedJobs: any[] = indeedRaw.status === 'fulfilled' ? indeedRaw.value : [];
      indeedJobs.forEach(job => {
        const key = `indeed__${(job.title || '').toLowerCase()}__${(job.company || job.org_name || '').toLowerCase()}`;
        if (!seenIds.current.has(key)) {
          seenIds.current.add(key);
          raw.push(job);
        }
      });

      setTotalFetched(raw.length);
      const scored = raw.map(scoreDJJob).filter(Boolean) as DJScoredJob[];
      scored.sort((a, b) => b.score - a.score);
      setJobs(scored);
    } catch {
      setError('Failed to fetch. Check connection or try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [fetchIndeedJobs]);

  useEffect(() => { fetchJobs('all', 'all'); }, [fetchJobs]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      await api.post('/monitor/dj/scan', {});
    } catch { /* non-fatal — scan runs in background */ }
    await fetchJobs(sector, country);
    setLastScan(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setScanning(false);
  };

  const handleSectorChange = (s: DJSector) => {
    setSector(s);
    setTierFilter('all');
    fetchJobs(s, country);
  };

  const handleCountryChange = (c: DJCountry) => {
    setCountry(c);
    fetchJobs(sector, c);
  };

  const SECTORS: { key: DJSector; label: string }[] = [
    { key: 'all',           label: 'All Sectors' },
    { key: 'big4',          label: 'Big 4'       },
    { key: 'banking',       label: 'Banking'     },
    { key: 'tech-cloud',    label: 'Tech/Cloud'  },
    { key: 'manufacturing', label: 'Manufacturing'},
  ];

  const COUNTRIES: { key: DJCountry; label: string }[] = [
    { key: 'all',   label: 'All' },
    { key: 'USA',   label: '🇺🇸 USA'   },
    { key: 'India', label: '🇮🇳 India'  },
  ];

  const visibleJobs = jobs.filter(j => {
    if (tierFilter !== 'all' && j.tier !== tierFilter) return false;
    if (sourceFilter === 'indeed'  && j.raw.source !== 'indeed') return false;
    if (sourceFilter === 'monitor' && j.raw.source === 'indeed') return false;
    return true;
  });
  const indeedCount  = jobs.filter(j => j.raw.source === 'indeed').length;
  const monitorCount = jobs.filter(j => j.raw.source !== 'indeed').length;

  return (
    <div style={{ color: 'white', fontFamily: 'var(--font-sans, sans-serif)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0, color: '#22d3ee' }}>
            Opportunity Monitor
          </h1>
          <p style={{ fontSize: 11.5, color: '#475569', margin: '4px 0 0 0', lineHeight: 1.6 }}>
            Deobrat Jha · IT Audit / Cloud Risk · CISA · AWS Certified
            {lastScan && <span style={{ color: '#22d3ee', marginLeft: 10 }}>↻ {lastScan}</span>}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {['SOX 404', 'ITGC/ITAC', 'Cloud Security', 'SAP S/4HANA', 'AI Governance', 'GRC', 'SOC1/SOC2'].map(kw => (
              <span key={kw} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px',
                background: 'rgba(34,211,238,0.07)', color: '#67e8f9', borderRadius: 10 }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
        <button onClick={handleScan} disabled={scanning || loading}
          style={{
            padding: '9px 22px', background: (scanning || loading) ? '#334155' : '#22d3ee',
            color: (scanning || loading) ? '#94a3b8' : '#000', border: 'none', borderRadius: 8,
            cursor: (scanning || loading) ? 'default' : 'pointer',
            fontWeight: 900, fontSize: 12.5, flexShrink: 0,
          }}>
          {scanning ? 'Scanning...' : '⚡ Run Scan'}
        </button>
      </div>

      {/* Sector Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 6, flexWrap: 'wrap' }}>
        {SECTORS.map(({ key, label }) => (
          <button key={key} onClick={() => handleSectorChange(key)} style={{
            padding: '8px 16px',
            background: sector === key ? '#1e3a4a' : '#1e293b',
            border: `1px solid ${sector === key ? '#22d3ee' : '#334155'}`,
            color: sector === key ? '#22d3ee' : '#94a3b8',
            cursor: 'pointer', fontWeight: sector === key ? 800 : 500, fontSize: 12.5, borderRadius: 6,
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Country Toggle */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
        {COUNTRIES.map(({ key, label }) => (
          <button key={key} onClick={() => handleCountryChange(key)} style={{
            padding: '6px 14px',
            background: country === key ? 'rgba(34,211,238,0.1)' : 'transparent',
            border: `1px solid ${country === key ? '#22d3ee' : '#334155'}`,
            color: country === key ? '#22d3ee' : '#64748b',
            cursor: 'pointer', fontWeight: 700, fontSize: 11.5, borderRadius: 5,
          }}>
            {label}
            {key === 'USA'   && <span style={{ marginLeft: 5, fontSize: 9, color: '#818cf8' }}>EAD</span>}
            {key === 'India' && <span style={{ marginLeft: 5, fontSize: 9, color: '#fbbf24' }}>Mgr+</span>}
          </button>
        ))}
      </div>

      {/* Source Toggle */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 14, alignItems: 'center' }}>
        {([
          { key: 'all',     label: `All Sources (${jobs.length})` },
          { key: 'monitor', label: `Monitor DB (${monitorCount})` },
          { key: 'indeed',  label: `Indeed Live (${indeedCount})` },
        ] as { key: DJSource; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setSourceFilter(key)} style={{
            padding: '5px 13px',
            background: sourceFilter === key ? (key === 'indeed' ? 'rgba(20,184,166,0.12)' : 'rgba(34,211,238,0.1)') : 'transparent',
            border: `1px solid ${sourceFilter === key ? (key === 'indeed' ? '#2dd4bf' : '#22d3ee') : '#334155'}`,
            color: sourceFilter === key ? (key === 'indeed' ? '#2dd4bf' : '#22d3ee') : '#64748b',
            cursor: 'pointer', fontWeight: 700, fontSize: 11, borderRadius: 5,
          }}>
            {label}
          </button>
        ))}
        {indeedLoading && (
          <span style={{ fontSize: 10, color: '#2dd4bf', marginLeft: 6 }}>
            ↻ fetching Indeed…
          </span>
        )}
      </div>

      {/* Fallback notice */}
      {fallbackUsed && (
        <div style={{ padding: '8px 14px', background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8,
          fontSize: 11.5, color: '#f59e0b', marginBottom: 10 }}>
          ⚡ {fallbackUsed}
        </div>
      )}

      {/* Tier filter */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['all', 'elite', 'strong', 'potential'] as const).map(t => (
            <button key={t} onClick={() => setTierFilter(t)} style={{
              padding: '5px 12px',
              background: tierFilter === t ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${tierFilter === t ? 'rgba(255,255,255,0.15)' : '#334155'}`,
              color: tierFilter === t ? '#f8fafc' : '#64748b',
              cursor: 'pointer', fontWeight: 700, fontSize: 11, borderRadius: 5,
            }}>
              {t === 'all'       ? `All (${jobs.length})`
               : t === 'elite'  ? `⚡ Elite (${jobs.filter(j => j.tier === 'elite').length})`
               : t === 'strong' ? `✓ Strong (${jobs.filter(j => j.tier === 'strong').length})`
               : `~ Potential (${jobs.filter(j => j.tier === 'potential').length})`}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#475569', alignSelf: 'center' }}>
            {totalFetched} fetched · {jobs.length} matched
          </span>
        </div>
      )}

      {/* Summary bar */}
      {!loading && <SummaryBar jobs={visibleJobs} />}

      {/* Job list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Scanning {sector === 'all' ? 'all sectors' : sector} across{' '}
            {country === 'all' ? 'USA + India' : country}...
          </div>
        ) : error ? (
          <div style={{ padding: 20, background: 'rgba(244,63,94,0.07)',
            border: '1px solid rgba(244,63,94,0.18)', borderRadius: 10,
            color: '#f43f5e', fontSize: 13, textAlign: 'center' }}>
            {error}
          </div>
        ) : visibleJobs.length > 0 ? (
          visibleJobs.map((scored, idx) => (
            <JobCard key={scored.raw.id ?? idx} scored={scored} />
          ))
        ) : (
          <div style={{ padding: '44px 24px', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(34,211,238,0.15)', borderRadius: 12, color: '#64748b' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>⚙️</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14, color: '#94a3b8' }}>
              No matches yet.
            </div>
            <div style={{ fontSize: 12 }}>
              Click{' '}<strong style={{ color: '#22d3ee' }}>⚡ Run Scan</strong>{' '}
              to populate the DJ monitor table from 85 target organizations.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityMonitorDJ;
