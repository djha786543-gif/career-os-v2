import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from '../../config/api';

// ─── Data ─────────────────────────────────────────────────────────────────────

type Category = 'fellowship' | 'central-govt' | 'state-psc' | 'academia' | 'aggregator';

interface Portal {
  id: string;
  name: string;
  category: Category;
  type: string;
  eligibility: string;
  stipendOrPay: string;
  tenure: string;
  deadline: string;
  url: string;
  priority?: boolean;   // extra-highlight
  womenScheme?: boolean;
  note?: string;
}

const PORTALS: Portal[] = [
  // ═══ FELLOWSHIPS ═══
  {
    id: 'ramalingaswami',
    name: 'DBT Ramalingaswami Re-entry Fellowship',
    category: 'fellowship',
    type: 'Re-entry Fellowship',
    eligibility: 'PhD in Life Sciences / Biotechnology (returning from abroad)',
    stipendOrPay: '₹1,30,000 / month + HRA + ₹5L contingency / yr',
    tenure: '5 years',
    deadline: 'Annual — DBT website (Oct–Nov window)',
    url: 'https://dbtindia.gov.in',
    priority: true,
    note: 'Designed specifically for scientists returning to India from abroad.',
  },
  {
    id: 'inspire-faculty',
    name: 'DST-INSPIRE Faculty Award',
    category: 'fellowship',
    type: 'Independent Fellowship',
    eligibility: 'PhD awarded within 7 years; age ≤ 40',
    stipendOrPay: '₹1,25,000 / month + ₹7L contingency / yr',
    tenure: '5 years',
    deadline: 'Rolling (online-inspire.gov.in)',
    url: 'https://online-inspire.gov.in',
    priority: true,
    note: 'No host institution required at application stage. One of the most competitive early-career schemes.',
  },
  {
    id: 'biocare',
    name: 'DBT-BioCARe (Women Scientists Returning)',
    category: 'fellowship',
    type: 'Women-Specific Fellowship',
    eligibility: 'Women PhD in Life Sciences; age 27–45',
    stipendOrPay: '₹55,000–80,000 / month + contingency',
    tenure: '3 years (extendable)',
    deadline: 'Rolling — DBT website',
    url: 'https://dbtindia.gov.in',
    priority: true,
    womenScheme: true,
    note: 'Specifically for women scientists returning after a career break or those who could not continue research due to family commitments.',
  },
  {
    id: 'serb-srg',
    name: 'SERB Start-up Research Grant (SRG)',
    category: 'fellowship',
    type: 'Research Grant',
    eligibility: 'PhD within 2 years + host faculty position',
    stipendOrPay: 'Up to ₹35L over 2 years',
    tenure: '2 years',
    deadline: 'Rolling (serb.gov.in)',
    url: 'https://serb.gov.in',
    note: 'For newly appointed faculty — useful once a host institution is secured.',
  },
  {
    id: 'serb-ecr',
    name: 'SERB Early Career Research Award (ECR)',
    category: 'fellowship',
    type: 'Research Grant',
    eligibility: 'PhD within 6 years + faculty position',
    stipendOrPay: 'Up to ₹50L over 3 years',
    tenure: '3 years',
    deadline: 'Rolling (serb.gov.in)',
    url: 'https://serb.gov.in',
  },
  {
    id: 'serb-ramanujan',
    name: 'SERB Ramanujan Fellowship',
    category: 'fellowship',
    type: 'Re-entry Fellowship',
    eligibility: 'PhD; scientist returning from abroad; age ≤ 40',
    stipendOrPay: '₹1,35,000 / month + ₹5L research grant / yr',
    tenure: '5 years',
    deadline: 'Rolling (serb.gov.in)',
    url: 'https://serb.gov.in',
    priority: true,
    note: 'Strong complement to Ramalingaswami — apply to both simultaneously.',
  },
  {
    id: 'wellcome-dbt',
    name: 'DBT / Wellcome India Alliance — Early Career Fellowship',
    category: 'fellowship',
    type: 'Independent Fellowship',
    eligibility: 'PhD (≤ 5 years post-PhD); strong research proposal',
    stipendOrPay: 'Up to ₹2.5 Cr over 5 years (all-inclusive)',
    tenure: '5 years',
    deadline: 'Annual — Jan window (wellcomeindialliance.org)',
    url: 'https://wellcomeindialliance.org',
    priority: true,
    note: 'Highly prestigious, covers salary + research costs. Host institution required.',
  },
  {
    id: 'dst-wos',
    name: 'DST Women Scientist Scheme-A (WOS-A)',
    category: 'fellowship',
    type: 'Women-Specific Fellowship',
    eligibility: 'Women PhD; career break ≥ 1 year; age ≤ 57',
    stipendOrPay: '₹55,000 / month + ₹2L contingency / yr',
    tenure: '3 years',
    deadline: 'Rolling (dst.gov.in/wosa)',
    url: 'https://dst.gov.in',
    womenScheme: true,
    note: 'Provides a path back into research for women after career interruptions.',
  },
  {
    id: 'csir-ra',
    name: 'CSIR Research Associateship (RA)',
    category: 'fellowship',
    type: 'Research Associateship',
    eligibility: 'PhD in Life Sciences; age ≤ 32 (relaxable for women)',
    stipendOrPay: '₹54,000 / month + HRA',
    tenure: '3 years',
    deadline: 'Rolling (csirhrdg.res.in)',
    url: 'https://csirhrdg.res.in',
  },
  {
    id: 'icmr-ra',
    name: 'ICMR Research Associateship',
    category: 'fellowship',
    type: 'Research Associateship',
    eligibility: 'PhD in Life Sciences / Medical Sciences; age ≤ 40',
    stipendOrPay: '₹54,000 / month + HRA',
    tenure: '3 years',
    deadline: 'Rolling (icmr.gov.in)',
    url: 'https://icmr.gov.in',
  },

  // ═══ CENTRAL GOVT — PERMANENT ═══
  {
    id: 'icmr-scientist-b',
    name: 'ICMR Scientist-B',
    category: 'central-govt',
    type: 'Permanent Scientist Post',
    eligibility: 'PhD in Life Sciences / Biomedical Sciences',
    stipendOrPay: 'Level 11 — ₹67,700 – ₹2,08,700 / month',
    tenure: 'Permanent',
    deadline: 'Annual recruitment — recruitment.icmr.org.in',
    url: 'https://recruitment.icmr.org.in',
    priority: true,
  },
  {
    id: 'csir-scientist',
    name: 'CSIR Scientist (Direct / Pool Officer)',
    category: 'central-govt',
    type: 'Permanent Scientist Post',
    eligibility: 'PhD in Life Sciences / Biotechnology',
    stipendOrPay: 'Level 11 — ₹67,700 – ₹2,08,700 / month',
    tenure: 'Permanent',
    deadline: 'Annual / rolling — csirhrdg.res.in',
    url: 'https://csirhrdg.res.in',
  },
  {
    id: 'thsti',
    name: 'DBT-THSTI Scientist (Faridabad)',
    category: 'central-govt',
    type: 'Scientist / Research Scientist',
    eligibility: 'PhD in Life Sciences / Translational Research',
    stipendOrPay: '₹75,000 – ₹2,20,000 / month (as per scale)',
    tenure: 'Contractual → Permanent',
    deadline: 'Rolling — thsti.res.in/recruitment',
    url: 'https://thsti.res.in',
    priority: true,
    note: 'Translational focus matches cardiovascular / molecular biology research profile.',
  },
  {
    id: 'nii',
    name: 'NII Scientist (National Institute of Immunology)',
    category: 'central-govt',
    type: 'Permanent Scientist Post',
    eligibility: 'PhD in Life Sciences / Immunology / Molecular Biology',
    stipendOrPay: 'Level 11–13 (₹67,700 – ₹2,18,200 / month)',
    tenure: 'Permanent',
    deadline: 'Rolling — nii.res.in',
    url: 'https://nii.res.in',
  },
  {
    id: 'nbrc',
    name: 'NBRC Scientist (National Brain Research Centre)',
    category: 'central-govt',
    type: 'Scientist Post',
    eligibility: 'PhD in Neuroscience / Molecular Biology / Biology',
    stipendOrPay: 'Level 11–12 (₹67,700 – ₹2,12,400 / month)',
    tenure: 'Permanent',
    deadline: 'Rolling — nbrc.ac.in/jobs',
    url: 'https://nbrc.ac.in',
  },
  {
    id: 'nipgr',
    name: 'NIPGR Scientist (National Institute of Plant Genome Research)',
    category: 'central-govt',
    type: 'Scientist Post',
    eligibility: 'PhD in Molecular Biology / Genomics / Biochemistry',
    stipendOrPay: 'Level 11 (₹67,700 – ₹2,08,700 / month)',
    tenure: 'Permanent',
    deadline: 'Rolling — nipgr.ac.in',
    url: 'https://nipgr.ac.in',
  },
  {
    id: 'drdo-scientist-b',
    name: 'DRDO Scientist-B — Life Sciences',
    category: 'central-govt',
    type: 'Scientist Post',
    eligibility: 'PhD (First Class) in Life Sciences / Biotechnology',
    stipendOrPay: 'Level 11 — ₹67,700 – ₹2,08,700 / month',
    tenure: 'Permanent',
    deadline: 'Annual CEPTAM recruitment — drdo.gov.in',
    url: 'https://drdo.gov.in',
    note: 'DRDO CEPTAM-12 and similar annual cycles.',
  },
  {
    id: 'icar',
    name: 'ICAR Scientist — Animal Science / Biotechnology',
    category: 'central-govt',
    type: 'Scientist Post',
    eligibility: 'PhD in Animal Science / Molecular Biology / Biotechnology',
    stipendOrPay: 'Level 11 (₹67,700 – ₹2,08,700 / month)',
    tenure: 'Permanent',
    deadline: 'Annual ARS/NET — icar.org.in',
    url: 'https://icar.org.in',
    note: 'Agricultural Research Service (ARS) is the standard entry pathway.',
  },
  {
    id: 'aiims',
    name: 'AIIMS Research Scientist / Assistant Professor',
    category: 'central-govt',
    type: 'Faculty / Scientist',
    eligibility: 'PhD (and/or MD) in Biomedical / Life Sciences',
    stipendOrPay: 'Level 11–13 (₹67,700 – ₹2,18,200 / month)',
    tenure: 'Permanent / Contractual',
    deadline: 'Rolling — aiims.edu/recruitment',
    url: 'https://aiims.edu',
    note: 'All AIIMS (Delhi, Bhopal, Bhubaneswar, etc.) recruit independently.',
  },
  {
    id: 'rgcb',
    name: 'RGCB Scientist (Rajiv Gandhi Centre for Biotechnology)',
    category: 'central-govt',
    type: 'Scientist Post',
    eligibility: 'PhD in Life Sciences / Molecular Biology / Genomics',
    stipendOrPay: 'Level 11 (₹67,700 – ₹2,08,700 / month)',
    tenure: 'Permanent',
    deadline: 'Rolling — rgcb.res.in',
    url: 'https://rgcb.res.in',
  },

  // ═══ STATE PSC ═══
  {
    id: 'mppsc',
    name: 'MPPSC Scientific Officer (Madhya Pradesh)',
    category: 'state-psc',
    type: 'State PSC — Scientific Officer',
    eligibility: 'PhD or MSc + NET/SLET in Life Sciences',
    stipendOrPay: 'Pay Scale: ₹56,100 – ₹1,77,500 / month',
    tenure: 'Permanent',
    deadline: 'Active recruitment 2026 — mppsc.mp.gov.in',
    url: 'https://mppsc.mp.gov.in',
    priority: true,
    note: 'Active 2026 cycle — apply immediately.',
  },
  {
    id: 'uppsc',
    name: 'UPPSC Scientific Officer / Lecturer (Uttar Pradesh)',
    category: 'state-psc',
    type: 'State PSC — Scientific Officer',
    eligibility: 'PhD or MSc + NET in Life Sciences / Biochemistry',
    stipendOrPay: 'Pay Scale: ₹56,100 – ₹1,77,500 / month',
    tenure: 'Permanent',
    deadline: 'Annual — uppsc.up.nic.in',
    url: 'https://uppsc.up.nic.in',
  },
  {
    id: 'wbpsc',
    name: 'WBPSC Assistant Professor / Scientific Officer (West Bengal)',
    category: 'state-psc',
    type: 'State PSC — Scientific / Faculty',
    eligibility: 'PhD + NET or MSc + NET in Life Sciences',
    stipendOrPay: 'Pay Scale: ₹56,100 – ₹1,77,500 / month',
    tenure: 'Permanent',
    deadline: 'Annual — wbpsc.gov.in',
    url: 'https://wbpsc.gov.in',
  },
  {
    id: 'kscste',
    name: 'KSCSTE Research Scientist (Kerala)',
    category: 'state-psc',
    type: 'State Council Scientist Post',
    eligibility: 'PhD in Life Sciences / Biotechnology / Biochemistry',
    stipendOrPay: '₹55,000 – ₹1,75,000 / month (State scale)',
    tenure: 'Permanent / Contractual',
    deadline: 'Rolling — kscste.kerala.gov.in',
    url: 'https://kscste.kerala.gov.in',
    note: 'Kerala State Council for Science, Technology and Environment.',
  },
  {
    id: 'tnpsc',
    name: 'TNPSC Assistant Professor / Drug Inspector (Tamil Nadu)',
    category: 'state-psc',
    type: 'State PSC — Faculty / Scientist',
    eligibility: 'PhD + NET or MSc + NET in Life Sciences / Biochemistry',
    stipendOrPay: 'Pay Scale: ₹56,100 – ₹1,82,400 / month',
    tenure: 'Permanent',
    deadline: 'Annual — tnpsc.gov.in',
    url: 'https://tnpsc.gov.in',
  },
  {
    id: 'rpsc',
    name: 'RPSC Assistant Professor — Life Sciences (Rajasthan)',
    category: 'state-psc',
    type: 'State PSC — Faculty',
    eligibility: 'PhD + NET or MSc + NET in Life Sciences',
    stipendOrPay: 'Pay Scale: ₹56,100 – ₹1,77,500 / month',
    tenure: 'Permanent',
    deadline: 'Annual — rpsc.rajasthan.gov.in',
    url: 'https://rpsc.rajasthan.gov.in',
  },
  {
    id: 'kpsc',
    name: 'KPSC Scientific Officer / Lecturer (Karnataka)',
    category: 'state-psc',
    type: 'State PSC — Scientist / Faculty',
    eligibility: 'PhD or MSc + NET/KSET in Life Sciences',
    stipendOrPay: 'Pay Scale: ₹43,100 – ₹1,25,050 / month',
    tenure: 'Permanent',
    deadline: 'Annual — kpsc.kar.nic.in',
    url: 'https://kpsc.kar.nic.in',
  },

  // ═══ ACADEMIA ═══
  {
    id: 'iit-faculty',
    name: 'IIT Faculty — Biosciences / Biochemistry / Bioengineering',
    category: 'academia',
    type: 'Assistant Professor (Tenure-Track)',
    eligibility: 'PhD in Life Sciences + strong publication record',
    stipendOrPay: 'Level 12 — ₹1,01,500 / month + NPA + benefits',
    tenure: 'Tenure-track → Permanent',
    deadline: 'Rolling (most IITs year-round) — iitsystem.ac.in',
    url: 'https://www.iitsystem.ac.in',
    priority: true,
  },
  {
    id: 'iiser-faculty',
    name: 'IISER Faculty — Biology / Molecular Biology',
    category: 'academia',
    type: 'Assistant Professor',
    eligibility: 'PhD in Life Sciences; research-focused career',
    stipendOrPay: 'Level 12 — ₹1,01,500 / month + benefits',
    tenure: 'Tenure-track → Permanent',
    deadline: 'Rolling — iiserfaculty.in',
    url: 'https://www.iiserfaculty.in',
    priority: true,
  },
  {
    id: 'central-university',
    name: 'Central University — Assistant Professor',
    category: 'academia',
    type: 'Assistant Professor',
    eligibility: 'PhD + NET (or NET exemption for PhD pre-2009 regulations)',
    stipendOrPay: 'Level 10 — ₹57,700 – ₹1,82,400 / month',
    tenure: 'Permanent',
    deadline: 'Rolling per university — ugc.ac.in',
    url: 'https://ugc.ac.in',
    note: 'NET exemption applies if PhD is from a recognized university under UGC 2009 regulations.',
  },
  {
    id: 'ncbs',
    name: 'NCBS-TIFR Faculty (Bangalore)',
    category: 'academia',
    type: 'Faculty / Research Scientist',
    eligibility: 'PhD in Life Sciences / Molecular Biology',
    stipendOrPay: 'TIFR scale: ₹80,000 – ₹2,20,000 / month',
    tenure: 'Permanent (after tenure review)',
    deadline: 'Rolling — ncbs.res.in/jobs',
    url: 'https://ncbs.res.in',
    priority: true,
  },
  {
    id: 'instem',
    name: 'InStem Faculty / Scientist (Bangalore)',
    category: 'academia',
    type: 'Faculty / Research Scientist',
    eligibility: 'PhD in Life Sciences / Stem Cell Biology / Cardiovascular Biology',
    stipendOrPay: '₹80,000 – ₹2,20,000 / month',
    tenure: 'Contractual → Permanent',
    deadline: 'Rolling — instem.res.in',
    url: 'https://instem.res.in',
    priority: true,
    note: 'Strong cardiovascular / stem cell focus — aligns closely with Pooja's research profile.',
  },

  // ═══ AGGREGATORS ═══
  {
    id: 'indiabioscience',
    name: 'IndiaBioscience Jobs Board',
    category: 'aggregator',
    type: 'Job Aggregator',
    eligibility: 'PhD (varies per listing)',
    stipendOrPay: 'Varies',
    tenure: 'Varies',
    deadline: 'Live daily — indiabioscience.org/jobs',
    url: 'https://indiabioscience.org/jobs',
    priority: true,
    note: 'Best single source for life science positions across all Indian institutions — check weekly.',
  },
  {
    id: 'employment-news',
    name: 'Employment News / Rozgar Samachar',
    category: 'aggregator',
    type: 'Govt Jobs Gazette',
    eligibility: 'PhD (varies per listing)',
    stipendOrPay: 'Varies',
    tenure: 'Varies',
    deadline: 'Weekly publication — employmentnews.gov.in',
    url: 'https://www.employmentnews.gov.in',
    note: 'Official govt gazette — all PSC, ICMR, CSIR, DST vacancies appear here.',
  },
  {
    id: 'dbt-portal',
    name: 'DBT Portal — Ongoing Schemes & Calls',
    category: 'aggregator',
    type: 'Funding Agency Portal',
    eligibility: 'PhD in Life Sciences / Biotechnology',
    stipendOrPay: 'Varies per scheme',
    tenure: 'Varies',
    deadline: 'Multiple rolling windows — dbtindia.gov.in',
    url: 'https://dbtindia.gov.in',
    note: 'Central source for all DBT fellowships — Ramalingaswami, BioCARe, RA, grants.',
  },
  {
    id: 'dst-portal',
    name: 'DST / SERB Portal — All Active Calls',
    category: 'aggregator',
    type: 'Funding Agency Portal',
    eligibility: 'PhD in Science / Life Sciences',
    stipendOrPay: 'Varies per scheme',
    tenure: 'Varies',
    deadline: 'Rolling — serb.gov.in / dst.gov.in',
    url: 'https://serb.gov.in',
    note: 'Covers INSPIRE, SRG, ECR, CRG, Ramanujan, WOS-A — all in one place.',
  },
];

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORIES: { id: Category | 'all'; label: string; color: string }[] = [
  { id: 'all',          label: 'All',              color: '#64748b' },
  { id: 'fellowship',   label: 'Fellowships',      color: '#a855f7' },
  { id: 'central-govt', label: 'Central Govt',     color: '#3b82f6' },
  { id: 'state-psc',    label: 'State PSC',        color: '#f59e0b' },
  { id: 'academia',     label: 'Academia',         color: '#22c55e' },
  { id: 'aggregator',   label: 'Aggregators',      color: '#06b6d4' },
];

const CAT_COLOR: Record<string, string> = {
  fellowship:   '#a855f7',
  'central-govt': '#3b82f6',
  'state-psc':  '#f59e0b',
  academia:     '#22c55e',
  aggregator:   '#06b6d4',
};

// ─── Live Monitor Types ───────────────────────────────────────────────────────

type MonitorCategory = 'all' | 'central-govt' | 'state-psc' | 'academia' | 'aggregator';

interface LiveJob {
  id:               string;
  title:            string;
  org_name:         string;
  portal_category:  string;
  snippet:          string;
  apply_url:        string;
  posted_date:      string;
  source_portal:    string;
  relevance_score:  number;
  is_new:           boolean;
  detected_at:      string;
}

const MONITOR_CATS: { id: MonitorCategory; label: string; color: string }[] = [
  { id: 'all',          label: 'All',          color: '#64748b' },
  { id: 'central-govt', label: 'Central Govt', color: '#3b82f6' },
  { id: 'state-psc',    label: 'State PSC',    color: '#f59e0b' },
  { id: 'academia',     label: 'Academia',     color: '#22c55e' },
  { id: 'aggregator',   label: 'Aggregators',  color: '#06b6d4' },
];

const MON_CAT_COLOR: Record<string, string> = {
  'central-govt': '#3b82f6',
  'state-psc':    '#f59e0b',
  academia:       '#22c55e',
  aggregator:     '#06b6d4',
};

// ─── Live Monitor Section ─────────────────────────────────────────────────────

const LiveMonitorSection: React.FC = () => {
  const [jobs,         setJobs]         = useState<LiveJob[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [scanning,     setScanning]     = useState(false);
  const [lastScan,     setLastScan]     = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [catFilter,    setCatFilter]    = useState<MonitorCategory>('all');
  const [scanMsg,      setScanMsg]      = useState<string | null>(null);

  // Load cached results on mount
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/monitor/pooja-india/jobs');
      setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      if (data?.lastScan) setLastScan(data.lastScan);
    } catch {
      setError('Could not load results. Try scanning now.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Trigger Serper scan
  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setScanMsg(null);
    try {
      await api.post('/monitor/pooja-india/scan', {});
      setScanMsg('Scan running in background (~30 sec). Results will refresh shortly.');
      // Poll once after 35 sec
      setTimeout(() => { loadJobs(); setScanMsg(null); setScanning(false); }, 35000);
    } catch {
      setError('Scan failed. Check backend status.');
      setScanning(false);
    }
  };

  // Dismiss a job (applied / done)
  const handleDismiss = async (id: string) => {
    // Optimistic UI — remove immediately
    setJobs(prev => prev.filter(j => j.id !== id));
    try {
      await api.delete(`/monitor/pooja-india/jobs/${id}`);
    } catch {
      // Non-fatal — job already removed from UI
    }
  };

  const visible = catFilter === 'all'
    ? jobs
    : jobs.filter(j => j.portal_category === catFilter);

  const counts = MONITOR_CATS.reduce((acc, cat) => {
    acc[cat.id] = cat.id === 'all'
      ? jobs.length
      : jobs.filter(j => j.portal_category === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  const newCount = jobs.filter(j => j.is_new).length;

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>Live Openings Monitor</span>
            {newCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 10 }}>
                {newCount} new
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#475569' }}>
            Serper searches across {MONITOR_CATS.length - 1} categories · {jobs.length} active listings
            {lastScan && (
              <span style={{ marginLeft: 8, color: '#334155' }}>
                · Last scan: {new Date(lastScan).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || loading}
          style={{
            padding: '8px 18px', fontWeight: 900, fontSize: 12,
            background: scanning ? '#1e293b' : '#a855f7',
            color: scanning ? '#64748b' : '#fff',
            border: `1px solid ${scanning ? '#334155' : '#a855f7'}`,
            borderRadius: 7, cursor: scanning ? 'default' : 'pointer', flexShrink: 0,
          }}
        >
          {scanning ? '↻ Scanning...' : '⚡ Scan Now'}
        </button>
      </div>

      {/* Scan message */}
      {scanMsg && (
        <div style={{ padding: '8px 14px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 8, fontSize: 11.5, color: '#c084fc', marginBottom: 12 }}>
          {scanMsg}
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
        {MONITOR_CATS.map(cat => {
          const active = catFilter === cat.id;
          return (
            <button key={cat.id} onClick={() => setCatFilter(cat.id)} style={{
              padding: '5px 13px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
              borderRadius: 6, border: `1px solid ${active ? cat.color : '#334155'}`,
              background: active ? cat.color + '22' : 'transparent',
              color: active ? cat.color : '#64748b',
            }}>
              {cat.label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.75 }}>({counts[cat.id] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, fontSize: 12, color: '#f43f5e', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Job list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 13 }}>
          Loading cached results...
        </div>
      ) : visible.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(168,85,247,0.2)', borderRadius: 12, color: '#475569' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>No results yet.</div>
          <div style={{ fontSize: 12 }}>
            Click <strong style={{ color: '#a855f7' }}>⚡ Scan Now</strong> to search across all portals.
            Fellowship section is intentionally excluded — check those manually.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(job => {
            const catColor = MON_CAT_COLOR[job.portal_category] || '#64748b';
            const borderColor = job.relevance_score >= 3 ? '#a855f7' : job.relevance_score >= 2 ? catColor : '#334155';
            return (
              <div key={job.id} style={{
                padding: '13px 16px', background: '#1e293b', borderRadius: 10,
                borderLeft: `3px solid ${borderColor}`,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title + badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>{job.title}</span>
                    {job.is_new && (
                      <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 4 }}>NEW</span>
                    )}
                    {job.relevance_score >= 3 && (
                      <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', background: 'rgba(168,85,247,0.12)', color: '#a855f7', borderRadius: 4 }}>HIGH MATCH</span>
                    )}
                  </div>
                  {/* Org + category + date */}
                  <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: job.snippet ? 6 : 0 }}>
                    <span style={{ fontWeight: 700, color: '#94a3b8' }}>{job.org_name}</span>
                    <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '1px 6px',
                      background: catColor + '18', color: catColor, borderRadius: 3 }}>
                      {job.portal_category.replace('-', ' ').toUpperCase()}
                    </span>
                    {job.posted_date && job.posted_date !== 'Recent' && (
                      <span style={{ marginLeft: 8, color: '#475569' }}>{job.posted_date}</span>
                    )}
                  </div>
                  {/* Snippet */}
                  {job.snippet && (
                    <p style={{ margin: 0, fontSize: 11, color: '#475569', lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {job.snippet}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {job.apply_url && job.apply_url !== '#' && (
                    <button
                      onClick={() => window.open(job.apply_url, '_blank')}
                      style={{ padding: '5px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}
                    >
                      Open →
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(job.id)}
                    title="Mark as applied / remove"
                    style={{ padding: '5px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}
                  >
                    ✓ Applied
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {visible.length > 0 && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', fontSize: 10.5, color: '#334155', lineHeight: 1.7 }}>
          <strong style={{ color: '#475569' }}>Note:</strong> Results from Google index via Serper. Some PDF-only government notifications may not appear.
          Fellowship portals (Ramalingaswami, INSPIRE, BioCARe, etc.) are excluded here — check the Fellowships tab for those.
          Click <strong style={{ color: '#10b981' }}>✓ Applied</strong> to permanently remove a listing you have already applied to.
        </div>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export const IndiaPhDPortal: React.FC = () => {
  const [activeView,     setActiveView]     = useState<'portals' | 'monitor'>('portals');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [search,         setSearch]         = useState('');
  const [showWomenOnly,  setShowWomenOnly]  = useState(false);
  const [showPriorityOnly, setShowPriorityOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...PORTALS];
    if (activeCategory !== 'all') list = list.filter(p => p.category === activeCategory);
    if (showWomenOnly)    list = list.filter(p => p.womenScheme);
    if (showPriorityOnly) list = list.filter(p => p.priority);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.eligibility.toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q)
      );
    }
    // Sort: priority first, then by category order
    list.sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return 0;
    });
    return list;
  }, [activeCategory, search, showWomenOnly, showPriorityOnly]);

  const totalByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of PORTALS) map[p.category] = (map[p.category] || 0) + 1;
    map['all'] = PORTALS.length;
    return map;
  }, []);

  return (
    <div style={{ padding: '24px 20px', color: 'white', minHeight: '100vh', fontFamily: 'sans-serif', maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🇮🇳</span>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>
              India PhD-Eligible Positions
            </h1>
          </div>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setActiveView('portals')}
              style={{
                padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 6,
                background: activeView === 'portals' ? 'rgba(168,85,247,0.15)' : 'transparent',
                border: `1px solid ${activeView === 'portals' ? '#a855f7' : '#334155'}`,
                color: activeView === 'portals' ? '#a855f7' : '#64748b',
              }}
            >
              Portal Directory
            </button>
            <button
              onClick={() => setActiveView('monitor')}
              style={{
                padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: 6,
                background: activeView === 'monitor' ? 'rgba(34,197,94,0.12)' : 'transparent',
                border: `1px solid ${activeView === 'monitor' ? '#22c55e' : '#334155'}`,
                color: activeView === 'monitor' ? '#22c55e' : '#64748b',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Live Monitor
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
          All positions where <strong style={{ color: '#a855f7' }}>a PhD is the minimum eligibility</strong> — experience not counted as a gate.
          {' '}{PORTALS.length} portals across fellowships, central govt, state PSCs, academia, and aggregators.
        </p>
      </div>

      {/* ── Live Monitor View ────────────────────────────────────────────── */}
      {activeView === 'monitor' && (
        <div style={{ paddingTop: 4 }}>
          <LiveMonitorSection />
        </div>
      )}

      {/* ── Portal Directory View ────────────────────────────────────────── */}
      {activeView === 'portals' && (<>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search portals, type, keywords..."
          style={{
            flex: 1, minWidth: 220, padding: '8px 14px', background: '#1e293b',
            border: '1px solid #334155', borderRadius: 8, color: 'white', fontSize: 13, outline: 'none',
          }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={showPriorityOnly}
            onChange={e => setShowPriorityOnly(e.target.checked)}
            style={{ accentColor: '#f59e0b' }}
          />
          Priority only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f472b6', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={showWomenOnly}
            onChange={e => setShowWomenOnly(e.target.checked)}
            style={{ accentColor: '#f472b6' }}
          />
          Women schemes
        </label>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const count = totalByCategory[cat.id] ?? 0;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as Category | 'all')}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                borderRadius: 6, border: `1px solid ${isActive ? cat.color : '#334155'}`,
                background: isActive ? cat.color + '22' : '#1e293b',
                color: isActive ? cat.color : '#94a3b8',
                transition: 'all 0.15s',
              }}
            >
              {cat.label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.75 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: '#475569', marginBottom: 14 }}>
        Showing <strong style={{ color: '#94a3b8' }}>{filtered.length}</strong> of {PORTALS.length} portals
        {showWomenOnly && <span style={{ color: '#f472b6', marginLeft: 6 }}>· Women schemes only</span>}
        {showPriorityOnly && <span style={{ color: '#f59e0b', marginLeft: 6 }}>· Priority only</span>}
      </div>

      {/* Portal cards */}
      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#1e293b', borderRadius: 12, border: '1px dashed #334155', color: '#64748b' }}>
            No portals match the current filters.
          </div>
        ) : filtered.map(portal => {
          const catColor = CAT_COLOR[portal.category] || '#64748b';
          return (
            <div
              key={portal.id}
              style={{
                padding: '16px 18px',
                background: '#1e293b',
                borderRadius: 10,
                borderLeft: `4px solid ${portal.priority ? catColor : '#334155'}`,
                opacity: 1,
                position: 'relative',
              }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    {/* Category badge */}
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 7px',
                      background: catColor + '22', color: catColor,
                      borderRadius: 4, border: `1px solid ${catColor}44`, letterSpacing: '0.05em',
                    }}>
                      {portal.type.toUpperCase()}
                    </span>
                    {/* Priority badge */}
                    {portal.priority && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: 4, border: '1px solid rgba(245,158,11,0.3)' }}>
                        PRIORITY
                      </span>
                    )}
                    {/* Women badge */}
                    {portal.womenScheme && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', background: 'rgba(244,114,182,0.15)', color: '#f472b6', borderRadius: 4, border: '1px solid rgba(244,114,182,0.3)' }}>
                        WOMEN SCHEME
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
                    {portal.name}
                  </h3>
                </div>

                {/* Apply button */}
                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 14px', background: '#1d4ed8', color: 'white',
                    borderRadius: 6, fontSize: 11, fontWeight: 700,
                    textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                    display: 'inline-block',
                  }}
                >
                  Visit →
                </a>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 16px', marginBottom: portal.note ? 8 : 0 }}>
                <Detail label="Eligibility" value={portal.eligibility} color="#c084fc" />
                <Detail label="Stipend / Pay" value={portal.stipendOrPay} color="#34d399" />
                <Detail label="Tenure" value={portal.tenure} color="#94a3b8" />
                <Detail label="Deadline" value={portal.deadline} color="#fb923c" />
              </div>

              {/* Note */}
              {portal.note && (
                <p style={{ margin: '8px 0 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.55, borderTop: '1px solid #1e293b', paddingTop: 8 }}>
                  <span style={{ color: '#475569', fontWeight: 700 }}>Note: </span>{portal.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 32, padding: '12px 16px', background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
        <strong style={{ color: '#64748b' }}>PhD eligibility note:</strong> All positions above accept a PhD as the <em>minimum</em> qualification.
        Experience requirements listed in individual advertisements are preferred, not mandatory, unless explicitly stated as essential.
        For fellowships, check the host institution requirement — some (like INSPIRE Faculty) do not require one at the time of application.
      </div>

      </>)}
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const Detail = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div>
    <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </span>
    <p style={{ margin: '1px 0 0 0', fontSize: 12, color, lineHeight: 1.4 }}>{value}</p>
  </div>
);

export default IndiaPhDPortal;
