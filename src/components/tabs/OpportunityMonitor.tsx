import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';

interface Job {
  title: string;
  org_name: string;
  location: string;
  country: string;
  snippet: string;
  apply_url: string;
  posted_date: string;
  is_new: boolean;
  high_suitability: boolean;
  match_score: number;
  sector: string;
  detected_at: string;
}

interface SectorCount {
  sector: string;
  total: string;
  new_count: string;
}

const SECTORS = ['academia', 'industry', 'international', 'india'] as const;

const REGIONS = [
  { label: 'ALL', value: null },
  { label: 'USA', value: 'usa' },
  { label: 'UK', value: 'uk' },
  { label: 'Germany', value: 'germany' },
  { label: 'Singapore', value: 'singapore' },
  { label: 'Australia', value: 'australia' },
  { label: 'Canada', value: 'canada' },
  { label: 'India', value: 'india' },
];

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e';   // green — strong match
  if (score >= 50) return '#f59e0b';   // amber — good match
  if (score >= 30) return '#64748b';   // slate — partial match
  return '#475569';                    // dim — weak
}

function scoreBg(score: number): string {
  if (score >= 70) return 'rgba(34,197,94,0.12)';
  if (score >= 50) return 'rgba(245,158,11,0.10)';
  return 'rgba(100,116,139,0.08)';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Strong fit';
  if (score >= 65) return 'Good fit';
  if (score >= 50) return 'Partial fit';
  if (score >= 30) return 'Possible';
  return 'Low match';
}

function borderColor(score: number, isNew: boolean): string {
  if (isNew) return '#22c55e';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#334155';
}

function daysAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export const OpportunityMonitor = () => {
  const [activeSector, setActiveSector] = useState<string>('academia');
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<SectorCount[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [scanNote, setScanNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sector: activeSector, limit: '100' });
      if (showNewOnly) params.set('isNew', 'true');
      if (minScore > 0) params.set('minScore', String(minScore));

      const res = await fetch(`${API_BASE}/monitor/jobs?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      let allJobs: Job[] = Array.isArray(data?.jobs) ? data.jobs : [];

      if (activeRegion) {
        allJobs = allJobs.filter(job =>
          job.location?.toLowerCase().includes(activeRegion) ||
          job.country?.toLowerCase().includes(activeRegion)
        );
      }

      setJobs(allJobs);
      setCounts(Array.isArray(data?.counts) ? data.counts : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeSector, activeRegion, showNewOnly, minScore]);

  const handleScan = async () => {
    setScanning(true);
    setScanNote('');
    try {
      await fetch(`${API_BASE}/monitor/scan`, { method: 'POST' });
      setScanNote('Scan running in background — refreshing in 35s...');
      setTimeout(() => {
        fetchData();
        setScanNote('');
      }, 35000);
    } catch (err) {
      setError('Scan failed: ' + (err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const getCount = (sector: string) => counts.find(c => c.sector === sector);

  const scoreBreakdown = jobs.length > 0 ? {
    strong: jobs.filter(j => (j.match_score || 0) >= 70).length,
    good: jobs.filter(j => (j.match_score || 0) >= 50 && (j.match_score || 0) < 70).length,
    partial: jobs.filter(j => (j.match_score || 0) < 50).length,
  } : null;

  return (
    <div style={{ padding: '20px', color: 'white', minHeight: '100vh', background: '#0f172a', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Opportunity Monitor</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
            Live positions scored against Pooja's profile · No expired listings · Industry & India prioritized
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>
            <input type="checkbox" checked={showNewOnly} onChange={e => setShowNewOnly(e.target.checked)} />
            New only
          </label>
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              padding: '7px 16px', background: scanning ? '#166534' : '#22c55e',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: scanning ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '12px'
            }}
          >
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Score filter + legend */}
      <div style={{ background: '#1e293b', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              Min Match Score: <strong style={{ color: minScore >= 70 ? '#22c55e' : minScore >= 50 ? '#f59e0b' : '#94a3b8' }}>{minScore}+</strong>
            </label>
            <input
              type="range" min={0} max={80} step={10} value={minScore}
              onChange={e => setMinScore(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569', marginTop: '2px' }}>
              <span>All</span><span>30</span><span>50</span><span>70</span><span>80+</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#22c55e', display: 'inline-block' }}/>
              <span style={{ color: '#94a3b8' }}>70+ Strong</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }}/>
              <span style={{ color: '#94a3b8' }}>50+ Good</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#64748b', display: 'inline-block' }}/>
              <span style={{ color: '#94a3b8' }}>&lt;50 Partial</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sector tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {SECTORS.map(s => {
          const c = getCount(s);
          return (
            <button
              key={s}
              onClick={() => { setActiveSector(s); setActiveRegion(null); }}
              style={{
                padding: '7px 14px',
                background: activeSector === s ? '#1e40af' : '#1e293b',
                border: '1px solid ' + (activeSector === s ? '#3b82f6' : '#334155'),
                color: 'white', cursor: 'pointer', borderRadius: '4px', fontSize: '12px'
              }}
            >
              <span style={{ textTransform: 'capitalize' }}>{s}</span>
              {c && (
                <span style={{ marginLeft: '6px', fontSize: '10px', color: '#94a3b8' }}>
                  {c.total}
                  {parseInt(c.new_count) > 0 && (
                    <span style={{ marginLeft: '3px', color: '#22c55e', fontWeight: 'bold' }}>+{c.new_count}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Region filter */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {REGIONS.map(r => (
          <button
            key={r.label}
            onClick={() => setActiveRegion(r.value)}
            style={{
              padding: '4px 10px', fontSize: '11px',
              background: activeRegion === r.value ? '#22c55e' : '#1e293b',
              border: '1px solid #334155', color: 'white', cursor: 'pointer', borderRadius: '4px'
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Status banners */}
      {scanNote && (
        <div style={{ padding: '10px 14px', background: '#1e3a5f', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#93c5fd' }}>
          {scanNote}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 14px', background: '#450a0a', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Score summary bar */}
      {!loading && scoreBreakdown && jobs.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', fontSize: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: '#64748b' }}>{jobs.length} position{jobs.length !== 1 ? 's' : ''}</span>
          {scoreBreakdown.strong > 0 && <span style={{ color: '#22c55e' }}>● {scoreBreakdown.strong} strong fit (70+)</span>}
          {scoreBreakdown.good > 0 && <span style={{ color: '#f59e0b' }}>● {scoreBreakdown.good} good fit (50–69)</span>}
          {scoreBreakdown.partial > 0 && <span style={{ color: '#64748b' }}>● {scoreBreakdown.partial} partial (&lt;50)</span>}
          {activeRegion && <span style={{ color: '#475569' }}>in {activeRegion}</span>}
        </div>
      )}

      {/* Job cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
      ) : jobs.length > 0 ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {jobs.map((job, idx) => {
            const score = job.match_score || 0;
            return (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  background: scoreBg(score),
                  backgroundColor: '#1e293b',
                  borderRadius: '10px',
                  borderLeft: `4px solid ${borderColor(score, job.is_new)}`,
                  display: 'grid',
                  gap: '6px',
                  position: 'relative'
                }}
              >
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#f8fafc', lineHeight: '1.3' }}>
                      {job.is_new && (
                        <span style={{ fontSize: '9px', background: '#166534', color: '#86efac', padding: '2px 5px', borderRadius: '3px', marginRight: '6px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                          NEW
                        </span>
                      )}
                      {job.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                      <span style={{ color: '#cbd5e1' }}>{job.org_name}</span>
                      {' · '}
                      <span style={{ color: '#22c55e' }}>{job.location}</span>
                      {job.detected_at && (
                        <span style={{ color: '#475569', marginLeft: '8px', fontSize: '10px' }}>
                          {daysAgo(job.detected_at)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Score badge + Apply button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <div style={{
                      textAlign: 'center',
                      background: '#0f172a',
                      border: `1px solid ${scoreColor(score)}`,
                      borderRadius: '6px',
                      padding: '4px 8px',
                      minWidth: '52px'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: scoreColor(score), lineHeight: 1 }}>
                        {score}
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {scoreLabel(score)}
                      </div>
                    </div>
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '5px 12px', background: '#1d4ed8', color: 'white',
                          borderRadius: '5px', fontSize: '11px', fontWeight: 'bold',
                          textDecoration: 'none', whiteSpace: 'nowrap'
                        }}
                      >
                        Apply →
                      </a>
                    )}
                  </div>
                </div>

                {/* Snippet */}
                {job.snippet && (
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                    {job.snippet}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            No positions found for <strong>{activeSector}</strong>
            {activeRegion ? ` in ${activeRegion}` : ''}
            {minScore > 0 ? ` with score ≥${minScore}` : ''}.
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>
            {minScore > 0
              ? `Try lowering the score filter or click Run Scan to refresh.`
              : `Click Run Scan to fetch latest positions from all monitored organizations.`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default OpportunityMonitor;
