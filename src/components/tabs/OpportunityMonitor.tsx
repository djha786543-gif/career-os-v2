import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../../config/api';
import { useProfile } from '../../context/ProfileContext';

// ─── Pooja Client-Side Scorer ─────────────────────────────────────────────────
const WET_LAB_RE = /\b(genotyping|pcr|qpcr|rt.?pcr|western blot|protein analysis|protein expression|immunohistochemistry|ihc|elisa|cell culture|primary cell|flow cytometry|immunofluorescence|confocal|microscopy|molecular biology|biochemistry|cloning|rna.?seq|transcriptomics|crispr|gene expression|sequencing|rna isolation|dna isolation|immunoprecipitation|chromatin|chip.?seq|atac.?seq|single.cell)\b/i;
const IN_VIVO_RE  = /\b(animal model|mouse model|in.?vivo|transgenic|knockout|knock.?in|conditional knockout|animal surgery|echocardiography|langendorff|cardiac perfusion|animal handling|rodent|murine|rat model|zebrafish|drosophila|genetically modified|cre.?lox)\b/i;
const PRIMARY_DOMAIN_RE   = /\b(cardiovascular|cardiomyopathy|peripartum|cardiac|heart failure|heart disease|cardiomyocyte|cardio|vascular|arrhythmia|cardiology|myocardial|coronary|atrial|ventricular|aortic|electrophysiology|heme|haemo|hemoglobin|haematology|hematology|molecular genetics|genomics|genetics|gene therapy|gene editing|gene|transcriptomics|rna.?seq)\b/i;
const SECONDARY_DOMAIN_RE = /\b(cancer|oncology|tumor|tumour|immunology|immune|inflammation|inflammatory|metabolism|metabolic|liver|fibrosis|neuroscience|neurological|pulmonary|renal|kidney|diabetes|obesity)\b/i;
const SENIOR_TITLE_RE  = /\b(senior scientist|principal scientist|staff scientist|group leader|team leader|associate investigator|lead scientist|scientist [2-9]|scientist ii|scientist iii|scientist iv)\b/i;
const FACULTY_TITLE_RE = /\b(assistant professor|associate professor|professor|faculty|tenure.?track|principal investigator|pi\b)\b/i;
const SCIENTIST_TITLE_RE = /\b(research scientist|scientist\b|r&d scientist|r&d|investigator)\b/i;
const POSTDOC_TITLE_RE   = /\b(postdoc|postdoctoral|research fellow|research associate)\b/i;
const LIFESCI_PHD_RE  = /\b(ph\.?d|doctorate|life science|biology|biochemistry|molecular|genetics|biomedical|bioscience)\b/i;
const MOLBIO_CONTEXT_RE = /\b(molecular biology|molecular|biochemistry|cell biology|genetics|genomics|protein|rna|dna|assay|experiment|laboratory|research)\b/i;
const LIFESCI_ANCHOR_RE = /\b(metabolism|molecular|biotech|cardiovascular|immunology|ph\.?d|biology|biological|biochem(?:istry|ical)?|genomics|genetics|genetic|research|faculty|staff|science|sciences|investigator|oncology|neuroscience|microbiology|virology|pharmacology|pharma(?:ceutical)?|proteomics|transcriptomics|bioinformatics|crispr|rna|sequencing|cancer|cardiac|immunobiology|epigenetics|haematology|hematology|cell biology|molecular genetics)\b/i;
const GARBAGE_TITLE_RE = /^\$|^\d+\s+(job|position|opening|result|postdoc|researcher)|\s+jobs(,\s+employment)?\s*$|^(careers?|admissions?|home|about\s+us?|open\s+positions?|join\s+our\s+team|our\s+team|opportunities|apply\s+now|contact\s+us?|sitemap|menu|navigation|explore|learn\s+more|vacancies)\s*$/i;

const TIER1_ORGS = new Set([
  'Harvard Medical School','Stanford Medicine','MIT Biology','UCSF','Broad Institute',
  'Johns Hopkins Medicine','Mayo Clinic Research','Salk Institute','Columbia University Medical Center',
  'Yale School of Medicine','Gladstone Institutes','Scripps Research','UT Southwestern Medical Center',
  'Baylor College of Medicine','Washington University St Louis','Weill Cornell Medicine',
  'Duke University Medical Center','University of Michigan Medical School',
  'Vanderbilt University Medical Center','University of Pennsylvania Perelman',
  'Northwestern University Feinberg','NIH NHLBI','NIH NIGMS','NIH NCI',
  'Karolinska Institute','ETH Zurich','EMBL Jobs','Francis Crick Institute',
  'Wellcome Sanger Institute','Max Planck Heart and Lung',
  'Genentech','Regeneron','Amgen','Pfizer Research','Merck Research',
  'Roche','GlaxoSmithKline GSK','AstraZeneca US','Novartis US','Moderna',
  'NCBS Bangalore','IISc Bangalore','TIFR Mumbai',
]);

function poojaClientScore(title: string, snippet: string, orgName: string, sector: string): number {
  const text = (title + ' ' + snippet).toLowerCase();
  const tl = title.toLowerCase();
  let score = 0;
  if (WET_LAB_RE.test(text) || IN_VIVO_RE.test(text)) score += 40;
  else if (LIFESCI_PHD_RE.test(text)) score += 20;
  if (PRIMARY_DOMAIN_RE.test(text)) score += 30;
  else if (SECONDARY_DOMAIN_RE.test(text)) score += 15;
  if (FACULTY_TITLE_RE.test(tl) || SENIOR_TITLE_RE.test(tl)) score += 20;
  else if (SCIENTIST_TITLE_RE.test(tl)) score += 18;
  else if (POSTDOC_TITLE_RE.test(tl)) {
    score += (TIER1_ORGS.has(orgName) || sector === 'academia' || sector === 'international') ? 12 : 8;
  }
  if (TIER1_ORGS.has(orgName)) score += 10;
  // Synergy: confirmed relevant role in core domain — short snippets miss wet-lab keywords
  if ((FACULTY_TITLE_RE.test(tl) || SENIOR_TITLE_RE.test(tl) || SCIENTIST_TITLE_RE.test(tl)) &&
      PRIMARY_DOMAIN_RE.test(text)) {
    score += 12;
  }
  if (LIFESCI_PHD_RE.test(text) && MOLBIO_CONTEXT_RE.test(text) &&
      (LIFESCI_ANCHOR_RE.test(title) || SCIENTIST_TITLE_RE.test(title) || FACULTY_TITLE_RE.test(title)) &&
      score < 50) score = 50;
  return Math.min(Math.round(score), 100);
}

function isGarbageTitle(title: string): boolean {
  if (!title || title.trim().length < 6) return true;
  if (GARBAGE_TITLE_RE.test(title.trim())) return true;
  if (/\d+\s+(cardiovascular|postdoc|molecular|research)\s+jobs?\b/i.test(title)) return true;
  if (/\bjobs?\s+in\s+(north america|united states|usa|uk|europe|global)\b/i.test(title)) return true;
  return false;
}

// ─── DJ Client-Side Scorer ────────────────────────────────────────────────────
const DJ_RANK1_TITLES_RE = /\b(it audit manager|it audit director|head of it audit|director of it audit|vp internal audit|avp it audit|senior manager it audit|technology risk manager|technology risk director|cloud risk manager|cloud audit manager|information security manager|sox audit manager|it compliance manager|cloud security manager|grc manager|it risk manager)\b/i;
const DJ_SENIORITY_RE    = /\b(manager|senior manager|director|avp|vp|vice president|head of|principal|lead)\b/i;
const DJ_TECHNICAL_RE    = /\b(sox|sox 404|itgc|itac|cloud security|cloud audit|sap s.?4hana|nist|ai governance|ml governance|soc1|soc 1|soc2|soc 2|grc|cisa|cissp|aws cloud|azure security|cloud risk|it general controls|application controls|it audit)\b/i;
const DJ_GARBAGE_RE      = /\b(intern|internship|entry level|entry-level|staff auditor|junior|graduate|trainee|fresher)\b/i;

function djClientScore(title: string, snippet: string, orgName: string): number {
  if (DJ_GARBAGE_RE.test(title.toLowerCase())) return 0;
  const text = (title + ' ' + snippet).toLowerCase();
  const tl = title.toLowerCase();
  let score = 0;
  if (DJ_RANK1_TITLES_RE.test(tl)) score += 50;
  else if (DJ_SENIORITY_RE.test(tl) && DJ_TECHNICAL_RE.test(text)) score += 40;
  else if (DJ_TECHNICAL_RE.test(text)) score += 25;
  if (text.includes('aws cloud audit') || text.includes('cloud audit') ||
      text.includes('ai governance') || text.includes('ml governance')) score += 20;
  if (tl.includes('manager') || tl.includes('director') || tl.includes('avp') || tl.includes('vp')) score += 15;
  const TIER1_DJ = new Set(['EY US Technology Risk','EY India GDS','EY UK','EY Germany',
    'Deloitte US Risk Advisory','Deloitte India','Deloitte UK','Deloitte Germany',
    'KPMG US Technology Risk','KPMG India','KPMG UK','KPMG Netherlands',
    'PwC US Digital Assurance','PwC India','PwC UK','PwC Germany',
    'Goldman Sachs','Goldman Sachs India','JPMorgan Chase','JPMorgan India GCC',
    'Amazon Web Services','Amazon India GCC','Microsoft','Microsoft India GCC','Google Cloud','Google India GCC',
    'HSBC UK','Barclays','Deutsche Bank','ING Netherlands','ABN AMRO']);
  if (TIER1_DJ.has(orgName)) score += 10;
  return Math.min(Math.round(score), 100);
}

// ─── Shared types & helpers ───────────────────────────────────────────────────
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
  suitability_score?: number;
  fail_reason?: string;
  sector: string;
  detected_at: string;
  ead_friendly?: boolean;
}

interface SectorCount { sector: string; total: string; new_count: string; }

const POOJA_SECTORS = ['academia', 'industry', 'international', 'india'] as const;
const DJ_SECTORS    = ['big4', 'banking', 'tech-cloud', 'manufacturing'] as const;

const POOJA_REGIONS = [
  { label: 'ALL', value: null },
  { label: 'USA', value: 'usa' },   { label: 'UK', value: 'uk' },
  { label: 'Germany', value: 'germany' }, { label: 'Netherlands', value: 'netherlands' },
  { label: 'Belgium', value: 'belgium' }, { label: 'Switzerland', value: 'switzerland' },
  { label: 'Sweden', value: 'sweden' },   { label: 'Denmark', value: 'denmark' },
  { label: 'Austria', value: 'austria' }, { label: 'France', value: 'france' },
  { label: 'Italy', value: 'italy' },     { label: 'Spain', value: 'spain' },
  { label: 'Finland', value: 'finland' }, { label: 'Norway', value: 'norway' },
  { label: 'Ireland', value: 'ireland' }, { label: 'Singapore', value: 'singapore' },
  { label: 'Australia', value: 'australia' }, { label: 'Canada', value: 'canada' },
  { label: 'India', value: 'india' },
];

const DJ_REGIONS = [
  { label: 'ALL', value: null },
  { label: 'USA', value: 'usa' },
  { label: 'India', value: 'india' },
  { label: 'Europe', value: 'europe' },
];

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#64748b';
  return '#475569';
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
  return `${Math.floor(days / 7)}w ago`;
}

export const OpportunityMonitor = () => {
  const { profile } = useProfile();
  const isDJ = profile === 'dj';

  const SECTORS  = isDJ ? DJ_SECTORS    : POOJA_SECTORS;
  const REGIONS  = isDJ ? DJ_REGIONS    : POOJA_REGIONS;
  const API_PATH = isDJ ? '/monitor/dj' : '/monitor';

  const [activeSector, setActiveSector] = useState<string>(SECTORS[0]);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [allJobs, setAllJobs]   = useState<Job[]>([]);
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [counts, setCounts]     = useState<SectorCount[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [scanNote, setScanNote] = useState('');

  // Reset sector when profile switches
  useEffect(() => {
    setActiveSector(isDJ ? 'big4' : 'academia');
    setActiveRegion(null);
    setMinScore(0);
    setAllJobs([]);
    setJobs([]);
    setCounts([]);
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sector: activeSector, limit: '100' });
      if (showNewOnly) params.set('isNew', 'true');
      // TASK 2: tell the API to pre-filter when the high-score slider is active
      if (minScore >= 70) params.set('highSuitability', 'true');

      const res = await fetch(`${API_BASE}${API_PATH}/jobs?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      const fetched: Job[] = (Array.isArray(data?.jobs) ? data.jobs : [])
        .filter((j: Job) => !isGarbageTitle(j.title))
        .map((j: Job) => {
          // Always run the client scorer — it's more nuanced than the backend's 0–6 signal.
          // Backend hard-filters remove spam/wrong-roles; client scorer ranks what remains.
          const clientScore = isDJ
            ? djClientScore(j.title, j.snippet || '', j.org_name)
            : poojaClientScore(j.title, j.snippet || '', j.org_name, j.sector);
          // Backend low-suitability = soft cap: borderline backend jobs can reach "Good" (65)
          // but are prevented from displacing genuinely strong confirmed hits.
          const match_score = (j.high_suitability === false && clientScore > 65)
            ? 65
            : clientScore;
          return { ...j, match_score };
        })
        .sort((a: Job, b: Job) => b.match_score - a.match_score);

      setAllJobs(fetched);
      setCounts(Array.isArray(data?.counts) ? data.counts : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering: instant on slider/region change
  useEffect(() => {
    let filtered = [...allJobs];
    if (activeRegion) {
      filtered = filtered.filter(job =>
        job.location?.toLowerCase().includes(activeRegion) ||
        job.country?.toLowerCase().includes(activeRegion)
      );
    }
    if (minScore > 0) {
      filtered = filtered.filter(job => (job.match_score || 0) >= minScore);
    }
    setJobs(filtered);
  }, [allJobs, activeRegion, minScore]);

  // Re-fetch when sector, newOnly, profile, or the high-suitability boundary (≥70) changes
  const highSuitabilityMode = minScore >= 70;
  useEffect(() => { fetchData(); }, [activeSector, showNewOnly, profile, highSuitabilityMode]);

  const handleScan = async () => {
    setScanning(true);
    setScanNote('');
    try {
      await fetch(`${API_BASE}${API_PATH}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setScanNote('Scan running in background — refreshing in 35s...');
      setTimeout(() => { fetchData(); setScanNote(''); }, 35000);
    } catch (err) {
      setError('Scan failed: ' + (err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const getCount = (sector: string) => counts.find(c => c.sector === sector);

  // Count jobs per region from already-loaded allJobs — drives count badges on country buttons
  const regionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const job of allJobs) {
      const hay = ((job.location || '') + ' ' + (job.country || '')).toLowerCase();
      for (const r of REGIONS) {
        if (r.value && hay.includes(r.value)) {
          map[r.value] = (map[r.value] || 0) + 1;
        }
      }
    }
    return map;
  }, [allJobs, isDJ]);

  // Score breakdown uses actual client scores — backend flag no longer gates counts
  const scoreBreakdown = jobs.length > 0 ? {
    strong:  jobs.filter(j => (j.match_score || 0) >= 70).length,
    good:    jobs.filter(j => (j.match_score || 0) >= 50 && (j.match_score || 0) < 70).length,
    partial: jobs.filter(j => (j.match_score || 0) < 50).length,
  } : null;

  const subtitle = isDJ
    ? 'Live positions scored against DJ\'s IT Audit profile · Manager+ grade · SOX/Cloud/GRC prioritized'
    : 'Live positions scored against Pooja\'s profile · No expired listings · Industry & India prioritized';

  const scoreHint = isDJ
    ? { high: 'IT Audit Manager + SOX + Cloud/GRC', med: 'Technology Risk, ITGC, adjacent', low: 'Adjacent field, limited overlap' }
    : { high: 'wet-lab + cardiovascular/genetics',   med: 'molecular biology, transferable domain', low: 'adjacent field, limited overlap' };

  const scoreLegend = isDJ
    ? 'Scored: Title(50) + Cloud/AI-Gov(20) + Seniority(15) + Org(10) + Misc(5)'
    : 'Scored: Technical(40) + Domain(30) + Title(20) + Org(10)';

  return (
    <div style={{ padding: '20px', color: 'white', minHeight: '100vh', background: '#0f172a', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Opportunity Monitor</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer' }}>
            <input type="checkbox" checked={showNewOnly} onChange={e => setShowNewOnly(e.target.checked)} />
            New only
          </label>
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              padding: '7px 14px', background: scanning ? '#166534' : '#22c55e',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: scanning ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '12px'
            }}
          >
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Score filter */}
      <div style={{ background: '#1e293b', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
              Min Match Score: <strong style={{ color: minScore >= 70 ? '#22c55e' : minScore >= 50 ? '#f59e0b' : '#94a3b8' }}>
                {minScore === 0 ? 'All' : `${minScore}+`}
              </strong>
              {' '}
              <span style={{ fontSize: '10px', color: '#475569' }}>
                ({allJobs.filter(j => minScore === 0 || (j.match_score || 0) >= minScore).length} of {allJobs.length} visible)
              </span>
            </label>
            <input
              type="range" min={0} max={80} step={10} value={minScore}
              onChange={e => setMinScore(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569', marginTop: '2px' }}>
              <span>All</span><span>30</span><span>50</span><span>70</span><span>80</span>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.6' }}>
            <div><span style={{ color: '#22c55e' }}>■</span> 75–100 <strong style={{ color: '#94a3b8' }}>High</strong> — {scoreHint.high}</div>
            <div><span style={{ color: '#f59e0b' }}>■</span> 50–74 <strong style={{ color: '#94a3b8' }}>Medium</strong> — {scoreHint.med}</div>
            <div><span style={{ color: '#64748b' }}>■</span> &lt;50 <strong style={{ color: '#475569' }}>Low</strong> — {scoreHint.low}</div>
            <div style={{ marginTop: '3px', color: '#475569', fontSize: '9px' }}>{scoreLegend}</div>
          </div>
        </div>
      </div>

      {/* Sector tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {SECTORS.map(s => {
          const c = getCount(s);
          const label = isDJ
            ? ({ 'big4': 'Big 4', 'banking': 'Banking', 'tech-cloud': 'Tech/Cloud', 'manufacturing': 'Manufacturing' } as Record<string, string>)[s] || s
            : s;
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
              <span style={{ textTransform: 'capitalize' }}>{label}</span>
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
        {REGIONS.map(r => {
          const cnt = r.value ? (regionCounts[r.value] || 0) : null;
          return (
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
            {cnt !== null && cnt > 0 && (
              <span style={{ marginLeft: '4px', fontSize: '10px', color: activeRegion === r.value ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>
                {cnt}
              </span>
            )}
          </button>
          );
        })}
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
          {scoreBreakdown.strong  > 0 && <span style={{ color: '#22c55e' }}>● {scoreBreakdown.strong} strong fit (70+)</span>}
          {scoreBreakdown.good    > 0 && <span style={{ color: '#f59e0b' }}>● {scoreBreakdown.good} good fit (50–69)</span>}
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
            // Low signal = client score < 30 (truly off-profile, regardless of backend flag)
            const isLowSignal = score < 30;
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
                  position: 'relative',
                  opacity: isLowSignal ? 0.55 : 1,
                }}
              >
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: isLowSignal ? '#94a3b8' : '#f8fafc', lineHeight: '1.3' }}>
                      {job.is_new && (
                        <span style={{ fontSize: '9px', background: '#166534', color: '#86efac', padding: '2px 5px', borderRadius: '3px', marginRight: '6px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                          NEW
                        </span>
                      )}
                      {isDJ && job.ead_friendly && (
                        <span style={{ fontSize: '9px', background: '#1e3a5f', color: '#93c5fd', padding: '2px 5px', borderRadius: '3px', marginRight: '6px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                          EAD
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
