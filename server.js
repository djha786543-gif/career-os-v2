// ═══════════════════════════════════════════════════════════════════
// CAREER OS BACKEND  —  server.js
// ─────────────────────────────────────────────────────────────────
//  POST /api/claude      →  Anthropic proxy (keeps API key server-side)
//  GET  /api/jobs        →  Real job listings via Adzuna
//  GET  /health          →  Health check
// ═══════════════════════════════════════════════════════════════════

require('dotenv').config();
const express   = require('express');
const axios     = require('axios');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Validate required env vars ─────────────────────────────────
const REQUIRED = ['ANTHROPIC_API_KEY', 'ADZUNA_APP_ID', 'ADZUNA_APP_KEY'];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('\n❌  Missing required env vars:', missing.join(', '));
  console.error('    Copy .env.example → .env and fill in your keys\n');
  process.exit(1);
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ADZUNA_ID     = process.env.ADZUNA_APP_ID;
const ADZUNA_KEY    = process.env.ADZUNA_APP_KEY;
const IS_DEV        = process.env.NODE_ENV !== 'production';

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin)                         return cb(null, true); // curl / Postman
    if (IS_DEV)                          return cb(null, true); // dev: allow all
    if (origin.includes('claude.ai'))    return cb(null, true); // artifact sandbox
    if (origin === process.env.FRONTEND_URL) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods:      ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:  true
}));

app.use(express.json({ limit: '2mb' }));

// ── Rate limiters ──────────────────────────────────────────────
const mkLimiter = (max, msg) => rateLimit({
  windowMs: 60_000, max,
  standardHeaders: true,
  message: { error: msg }
});

const globalLimiter = mkLimiter(60,  'Too many requests — slow down');
const claudeLimiter = mkLimiter(15,  'Claude rate limit — wait 60s');
const jobLimiter    = mkLimiter(20,  'Job search limit — wait 60s');

app.use(globalLimiter);

// ══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════
app.get('/health', (req, res) => res.json({
  status:    'ok',
  version:   '1.0.0',
  timestamp: new Date().toISOString(),
  env:       IS_DEV ? 'development' : 'production',
  services:  { anthropic: true, adzuna: true }
}));

// ══════════════════════════════════════════════════════════════
// ANTHROPIC PROXY  —  POST /api/claude
// Keeps API key server-side — browser never sees it
// Body: { model?, messages, system?, max_tokens? }
// ══════════════════════════════════════════════════════════════
app.post('/api/claude', claudeLimiter, async (req, res) => {
  const { model, messages, system, max_tokens } = req.body;

  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: 'messages[] required' });

  try {
    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model:      model      || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || 1000,
        ...(system ? { system } : {}),
        messages
      },
      {
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 60_000
      }
    );
    return res.json(data);

  } catch (err) {
    const status  = err.response?.status  || 500;
    const message = err.response?.data?.error?.message || err.message;
    console.error(`[Claude] ${status}:`, message);
    return res.status(status).json({ error: message });
  }
});

// ══════════════════════════════════════════════════════════════
// ADZUNA COUNTRY CODES
// Adzuna uses 2-letter country codes in the URL path
// ══════════════════════════════════════════════════════════════
const COUNTRY_CODE = {
  'United States':  'us',
  'United Kingdom': 'gb',
  'Canada':         'ca',
  'Germany':        'de',
  'Australia':      'au',
  'Netherlands':    'nl',
  'Switzerland':    'ch',
  'Sweden':         'se',
  'Denmark':        'dk',
  'Singapore':      'sg',
  'Japan':          'jp',
};

// ══════════════════════════════════════════════════════════════
// ADZUNA SEARCH QUERIES per profile
// ══════════════════════════════════════════════════════════════
const DJ_QUERIES = [
  'IT Audit Manager',
  'SOX ITGC Audit Manager',
  'CISA GRC Manager',
  'AI Audit Governance',
  'IT Risk Manager',
  'Cloud Audit Manager',
];

const PJ_QUERIES = [
  'Postdoctoral Researcher cardiovascular',
  'Research Scientist molecular biology',
  'Postdoc molecular biology',
  'Scientist cardiovascular',
  'Research Associate genomics',
];

// ══════════════════════════════════════════════════════════════
// ADZUNA API CALL
// Returns raw Adzuna results array
// ══════════════════════════════════════════════════════════════
async function adzunaSearch({ query, countryCode, resultsPerPage = 10, page = 1 }) {
  const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}`;
  const params = {
    app_id:              ADZUNA_ID,
    app_key:             ADZUNA_KEY,
    what:                query,
    results_per_page:    resultsPerPage,
    'full_time':         1,
    sort_by:             'date',
  };

  const { data } = await axios.get(url, {
    params,
    timeout: 15_000
  });

  return data.results || [];
}

// ══════════════════════════════════════════════════════════════
// FIT SCORING — server-side, no AI call needed
// Scores job against profile keyword list
// ══════════════════════════════════════════════════════════════
const DJ_KEYWORDS = {
  'cisa':           15, 'sox':           12, 'itgc':          12,
  'it audit':       12, 'ai audit':      15, 'grc':           10,
  'risk manager':   10, 'cloud audit':   12, 'iso 27001':      8,
  'internal audit':  8, 'compliance':     6, 'governance':     8,
  'cobit':           8, 'nist':           8, 'soc 2':          8,
  'erp audit':       7, 'sap':            6, 'azure':          6,
  'aws':             8, 'python':         5, 'power bi':       5,
  'remote':          5,
};

const PJ_KEYWORDS = {
  'cardiovascular':     15, 'molecular biology':  12, 'postdoc':         10,
  'postdoctoral':       10, 'cell biology':       10, 'research scientist': 8,
  'crispr':             10, 'scrna':              12, 'rna seq':          10,
  'flow cytometry':      8, 'genomics':            8, 'immunology':        7,
  'bioinformatics':      8, 'mouse model':         7, 'confocal':          7,
  'lentiviral':          8, 'western blot':        6, 'pcr':               6,
  'qpcr':                7, 'heart':               8, 'cardiac':           8,
  'nature':              6, 'phd':                 5, 'scientist':         5,
};

function calcFitScore(job, profile) {
  const keywords = profile === 'dj' ? DJ_KEYWORDS : PJ_KEYWORDS;
  const text = `${job.title} ${job.description || ''} ${job.company?.display_name || ''}`.toLowerCase();
  let score = 40; // baseline
  for (const [kw, pts] of Object.entries(keywords)) {
    if (text.includes(kw)) score += pts;
  }
  return Math.min(Math.max(score, 30), 99);
}

// ══════════════════════════════════════════════════════════════
// EXTRACT KEY SKILLS from job title + description
// ══════════════════════════════════════════════════════════════
const DJ_SKILL_TAGS = ['CISA','SOX','ITGC','GRC','Cloud Audit','AI Audit','ISO 27001','Risk Management','ERP','SAP','AWS','Azure','COBIT','NIST','SOC 2','Python','Power BI'];
const PJ_SKILL_TAGS = ['Cardiovascular Research','Molecular Biology','scRNA-seq','CRISPR','Flow Cytometry','RNA-seq','Genomics','Bioinformatics','Mouse Models','Immunology','Cell Biology','PCR/qPCR','Confocal Microscopy','Western Blot','Lentiviral','ChIP-seq'];

function extractSkills(job, profile) {
  const text = `${job.title} ${job.description || ''}`.toLowerCase();
  const tags = profile === 'dj' ? DJ_SKILL_TAGS : PJ_SKILL_TAGS;
  return tags.filter(t => text.includes(t.toLowerCase())).slice(0, 4);
}

// ══════════════════════════════════════════════════════════════
// CLASSIFY Industry vs Academia (for Pooja)
// ══════════════════════════════════════════════════════════════
const INDUSTRY_SIGNALS = ['pharma','biotech','therapeutics','biosciences','biopharma','medtech','pfizer','novartis','roche','genentech','abbvie','astrazeneca','merck','bristol','sanofi','bayer','amgen','biogen','regeneron','moderna','gilead','vertex','medtronic','stryker','abbott','illumina','thermo fisher','qiagen','inc.','corp','ltd','llc','ag','diagnostics','oncology'];

function classifyCategory(job) {
  const txt = `${job.company?.display_name || ''} ${job.title} ${job.description || ''}`.toLowerCase();
  return INDUSTRY_SIGNALS.some(s => txt.includes(s)) ? 'INDUSTRY' : 'ACADEMIA';
}

// ══════════════════════════════════════════════════════════════
// NORMALIZE Adzuna job → our standard format
// ══════════════════════════════════════════════════════════════
function normalizeJob(raw, profile, idx) {
  const fitScore = calcFitScore(raw, profile);
  const keySkills = extractSkills(raw, profile);
  const isPJ = profile === 'pj';

  // Build snippet from description (first 250 chars, clean HTML)
  const cleanDesc = (raw.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);

  // Work mode
  let workMode = 'On-site';
  const descLow = (raw.description || '').toLowerCase();
  if (descLow.includes('remote') || raw.title?.toLowerCase().includes('remote')) workMode = 'Remote';
  else if (descLow.includes('hybrid')) workMode = 'Hybrid';

  // Posted date
  const postedDate = raw.created
    ? timeAgo(new Date(raw.created))
    : 'Recently posted';

  // Salary
  let salary = null;
  if (raw.salary_min && raw.salary_max) {
    salary = `$${Math.round(raw.salary_min/1000)}K – $${Math.round(raw.salary_max/1000)}K`;
  } else if (raw.salary_min) {
    salary = `$${Math.round(raw.salary_min/1000)}K+`;
  }

  return {
    id:          `adzuna_${raw.id || idx}`,
    title:       raw.title || 'Untitled Position',
    company:     raw.company?.display_name || 'Company Confidential',
    location:    raw.location?.display_name || '',
    salary,
    snippet:     cleanDesc || 'See full description at the apply link.',
    applyUrl:    raw.redirect_url || raw.adref || '#',
    postedDate,
    isRemote:    workMode === 'Remote',
    workMode,
    fitScore,
    fitReason:   buildFitReason(raw, profile, keySkills),
    keySkills:   keySkills.length ? keySkills : (isPJ ? ['Research Scientist'] : ['IT Audit']),
    category:    isPJ ? classifyCategory(raw) : undefined,
    source:      'Adzuna',
    sourceUrl:   raw.redirect_url,
  };
}

function buildFitReason(job, profile, skills) {
  if (profile === 'dj') {
    if (skills.length >= 3) return `Strong match — role requires ${skills.slice(0,2).join(' and ')} aligning with your CISA/SOX background.`;
    if (skills.length >= 1) return `Partial match on ${skills[0]} — your IT audit experience transfers well.`;
    return 'IT audit leadership role — review JD for specific alignment with your CISA credentials.';
  } else {
    if (skills.length >= 2) return `Strong fit — ${skills.slice(0,2).join(' + ')} directly match your cardiovascular research background.`;
    if (skills.length >= 1) return `Good match on ${skills[0]} — aligns with your molecular biology expertise.`;
    return 'Research role — review for cardiovascular or molecular biology scope.';
  }
}

function timeAgo(date) {
  const diffMs   = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays  <  7) return `${diffDays} days ago`;
  if (diffDays  < 14) return '1 week ago';
  if (diffDays  < 30) return `${Math.floor(diffDays/7)} weeks ago`;
  return `${Math.floor(diffDays/30)} months ago`;
}

// ══════════════════════════════════════════════════════════════
// JOB SEARCH ENDPOINT  —  GET /api/jobs
//
// Query params:
//   profile  = "dj" | "pj"          (required)
//   country  = "United States" etc   (required for pj)
//   page     = 1                     (optional)
//
// Returns: { jobs, total, page, country, profile, source, fetchedAt }
// ══════════════════════════════════════════════════════════════
app.get('/api/jobs', jobLimiter, async (req, res) => {
  const { profile, country = 'United States', page = 1 } = req.query;

  if (!profile || !['dj','pj'].includes(profile))
    return res.status(400).json({ error: 'profile must be "dj" or "pj"' });

  const countryCode = COUNTRY_CODE[country];
  if (!countryCode)
    return res.status(400).json({ error: `Unsupported country: ${country}. Valid: ${Object.keys(COUNTRY_CODE).join(', ')}` });

  const queries = profile === 'dj' ? DJ_QUERIES : PJ_QUERIES;

  console.log(`[Jobs] profile=${profile} country=${country}(${countryCode}) page=${page}`);

  try {
    // Fire multiple search queries in parallel for best coverage
    const searchPromises = queries.slice(0, 3).map(q =>
      adzunaSearch({ query: q, countryCode, resultsPerPage: 8, page: Number(page) })
        .catch(err => {
          console.error(`[Adzuna] query "${q}" failed:`, err.message);
          return []; // graceful degradation — one query failure won't kill the response
        })
    );

    const results = await Promise.all(searchPromises);

    // Flatten + deduplicate by Adzuna job ID
    const seen = new Set();
    const allRaw = results.flat().filter(job => {
      if (!job.id || seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });

    if (!allRaw.length) {
      return res.status(200).json({
        jobs: [],
        total: 0,
        page: Number(page),
        country,
        profile,
        source: 'Adzuna',
        fetchedAt: new Date().toISOString(),
        message: 'No results for this query — try a different country or search again'
      });
    }

    // Normalize and score
    const jobs = allRaw
      .map((raw, i) => normalizeJob(raw, profile, i))
      .sort((a, b) => b.fitScore - a.fitScore); // highest fit first

    console.log(`[Jobs] returning ${jobs.length} jobs for ${profile}/${country}`);

    return res.json({
      jobs,
      total:     jobs.length,
      page:      Number(page),
      country,
      profile,
      source:    'Adzuna',
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Jobs] error:', err.message);

    // Adzuna-specific error messages
    if (err.response?.status === 401)
      return res.status(401).json({ error: 'Invalid Adzuna credentials — check ADZUNA_APP_ID and ADZUNA_APP_KEY in .env' });
    if (err.response?.status === 429)
      return res.status(429).json({ error: 'Adzuna rate limit hit — wait 60 seconds. Free tier: 500 calls/day.' });

    return res.status(500).json({ error: `Job search failed: ${err.message}` });
  }
});

// PJ_QUERIES defined above as const array

// ══════════════════════════════════════════════════════════════
// 404 handler
// ══════════════════════════════════════════════════════════════
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// ══════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n✅  Career OS Backend running`);
  console.log(`    Local:   http://localhost:${PORT}`);
  console.log(`    Health:  http://localhost:${PORT}/health`);
  console.log(`    Jobs:    http://localhost:${PORT}/api/jobs?profile=dj`);
  console.log(`    Claude:  POST http://localhost:${PORT}/api/claude`);
  console.log(`    Mode:    ${IS_DEV ? 'development (all origins allowed)' : 'production'}\n`);
});

module.exports = app;
