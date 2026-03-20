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
  sector: string;
}

interface SectorCount {
  sector: string;
  total: string;
  new_count: string;
}

const SECTORS = ['academia', 'industry', 'international', 'india'] as const;
const REGIONS = [
  { label: 'ALL', value: null },
  { label: 'USA', value: 'USA' },
  { label: 'UK', value: 'UK' },
  { label: 'DE', value: 'Germany' },
  { label: 'SG', value: 'Singapore' },
  { label: 'AU', value: 'Australia' },
  { label: 'CA', value: 'Canada' },
  { label: 'IN', value: 'India' },
];

export const OpportunityMonitor = () => {
  const [activeSector, setActiveSector] = useState<string>('academia');
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<SectorCount[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewOnly, setShowNewOnly] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sector: activeSector, limit: '100' });
      if (showNewOnly) params.set('isNew', 'true');
      const res = await fetch(`${API_BASE}/monitor/jobs?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      let allJobs: Job[] = Array.isArray(data?.jobs) ? data.jobs : [];

      if (activeRegion) {
        allJobs = allJobs.filter(job =>
          job.location?.toUpperCase().includes(activeRegion.toUpperCase()) ||
          job.country?.toUpperCase().includes(activeRegion.toUpperCase())
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

  useEffect(() => { fetchData(); }, [activeSector, activeRegion, showNewOnly]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch(`${API_BASE}/monitor/scan`, { method: 'POST' });
      // Scan runs in background — poll after 30s
      setTimeout(() => fetchData(), 30000);
    } catch (err) {
      console.error('Scan Error:', err);
    } finally {
      setScanning(false);
    }
  };

  const getCount = (sector: string) =>
    counts.find(c => c.sector === sector);

  return (
    <div style={{ padding: '20px', color: 'white', minHeight: '100vh', background: '#0f172a', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Opportunity Monitor</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Live job listings for Pooja — postdocs, research scientists, faculty worldwide
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showNewOnly}
              onChange={e => setShowNewOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            New only
          </label>
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{ padding: '8px 18px', background: scanning ? '#166534' : '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: scanning ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}
          >
            {scanning ? 'Scan started...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Sector tabs with counts */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
        {SECTORS.map(s => {
          const c = getCount(s);
          return (
            <button
              key={s}
              onClick={() => { setActiveSector(s); setActiveRegion(null); }}
              style={{
                padding: '8px 16px', background: activeSector === s ? '#1e40af' : '#1e293b',
                border: '1px solid ' + (activeSector === s ? '#3b82f6' : '#334155'),
                color: 'white', cursor: 'pointer', borderRadius: '4px', fontSize: '13px'
              }}
            >
              <span style={{ textTransform: 'capitalize' }}>{s}</span>
              {c && (
                <span style={{ marginLeft: '6px', fontSize: '11px', color: '#94a3b8' }}>
                  {c.total}
                  {parseInt(c.new_count) > 0 && (
                    <span style={{ marginLeft: '4px', color: '#22c55e', fontWeight: 'bold' }}>+{c.new_count}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Region filter */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {REGIONS.map(r => (
          <button
            key={r.label}
            onClick={() => setActiveRegion(r.value)}
            style={{
              padding: '5px 12px', fontSize: '12px',
              background: activeRegion === r.value ? '#22c55e' : '#1e293b',
              border: '1px solid #334155', color: 'white', cursor: 'pointer', borderRadius: '4px'
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Status */}
      {scanning && (
        <div style={{ padding: '12px 16px', background: '#1e3a5f', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#93c5fd' }}>
          Scan started in background. Results will refresh automatically in ~30 seconds.
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', background: '#450a0a', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#fca5a5' }}>
          Error: {error}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
      ) : jobs.length > 0 ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
            {jobs.length} position{jobs.length !== 1 ? 's' : ''} found
            {activeRegion ? ` in ${activeRegion}` : ''}
          </p>
          {jobs.map((job, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px 20px',
                background: '#1e293b',
                borderRadius: '10px',
                borderLeft: `4px solid ${job.is_new ? '#22c55e' : job.high_suitability ? '#3b82f6' : '#475569'}`,
                display: 'grid',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', lineHeight: '1.3' }}>
                  {job.is_new && (
                    <span style={{ fontSize: '10px', background: '#166534', color: '#86efac', padding: '2px 6px', borderRadius: '3px', marginRight: '8px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      NEW
                    </span>
                  )}
                  {job.title}
                </h3>
                {job.apply_url && (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flexShrink: 0, padding: '5px 12px', background: '#1d4ed8', color: 'white',
                      borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Apply →
                  </a>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                <span style={{ color: '#cbd5e1' }}>{job.org_name}</span>
                {' · '}
                <span style={{ color: '#22c55e' }}>{job.location}</span>
                {job.posted_date && job.posted_date !== 'Recent' && (
                  <span style={{ color: '#475569', marginLeft: '8px', fontSize: '11px' }}>{job.posted_date}</span>
                )}
              </p>

              {job.snippet && (
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                  {job.snippet}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px dashed #334155', color: '#94a3b8' }}>
          <p style={{ margin: '0 0 8px 0' }}>No positions found for <strong>{activeSector}</strong>{activeRegion ? ` in ${activeRegion}` : ''}.</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
            Click <strong>Run Scan</strong> to fetch the latest listings from all monitored organizations.
          </p>
        </div>
      )}
    </div>
  );
};

export default OpportunityMonitor;
