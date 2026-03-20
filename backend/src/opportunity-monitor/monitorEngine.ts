import { pool } from '../db/client'
import { MONITOR_ORGS, MonitorOrg } from './orgConfig'
import { geminiGroundedSearch } from '../services/geminiClient'
import crypto from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// DR. POOJA CHOUBEY — Profile-Based Matching Engine
// Built from her actual CV (January 2026):
//   PhD Molecular Genetics (Delhi), Postdoc Tulane + Lundquist/UCLA
//   Co-first author Nature Communications (IF 15.7) — PTRH2/cardiomyopathy
//   Target: Research Scientist / Sr Scientist / Asst Professor / Group Leader
//   Salary floor: $95k USD | ₹22 LPA India
// ─────────────────────────────────────────────────────────────────────────────

// DOMAIN ANCHORS — Pooja's core research areas (scored by specificity)
// Each tuple: [regex, points] — max 40 pts total from domain
const DOMAIN_TIERS: Array<[RegExp, number]> = [
  // Tier A — her exact specialisation (15 pts)
  [/\b(cardiovascular|cardiomyopathy|peripartum|cardiac|heart failure|heart disease|cardiomyocyte|cardio)\b/i, 15],
  // Tier B — primary model systems (10 pts)
  [/\b(transgenic|knockout|cre.lox|conditional knockout|mouse model|in.vivo|genetically modified)\b/i, 10],
  // Tier C — her genomics expertise (8 pts)
  [/\b(rna.?seq|transcriptom|single.cell|scRNA|rnaseq|deseq|edger|bulk RNA)\b/i, 8],
  // Tier D — her other research domains (4 pts each, capped at 7)
  [/\b(cellular senescence|senescence|aging|ageing|SASP|p21|p16)\b/i, 4],
  [/\b(heme|heme oxygenase|hmox|heme metabolism|molecular genetics|prolactin|placenta)\b/i, 3],
]
const DOMAIN_MAX = 40

// TECHNIQUE ANCHORS — her specific wet-lab skills (5 pts each, max 30 pts)
const TECHNIQUE_KEYWORDS = [
  'echocardiography', 'echo', 'langendorff', 'ekg', 'electrocardiography',
  'immunohistochemistry', 'ihc', 'immunofluorescence', 'confocal',
  'western blot', 'flow cytometry', 'elisa', 'tunel', 'beta-galactosidase',
  'rna-seq', 'bioinformatics', 'ipa', 'ingenuity pathway', 'pathway analysis',
  'genomics', 'cell culture', 'crispr', 'gene expression', 'transcriptomics',
  'hydroxyproline', 'cardiac fibrosis', 'senescence assay',
]
const TECHNIQUE_PTS = 5
const TECHNIQUE_MAX = 30

// TITLE/SENIORITY MATCH — target roles only (20 pts)
// Pooja is targeting Equivalent+ positions — NOT postdocs (except academia international)
const SENIOR_SCIENTIST_RE = /\b(senior scientist|principal scientist|staff scientist|group leader|investigator|associate investigator|research scientist ii|research scientist iii)\b/i
const FACULTY_RE = /\b(assistant professor|associate professor|faculty|tenure.track|tenure track)\b/i
const SCIENTIST_RE = /\b(scientist\b|research scientist)\b/i
const SCIENTIST_LEVEL_RE = /\b(scientist [I]{1,3}|scientist [1-3]|scientist [A-E]|scientist [IV]+)\b/i

// Hard filter: reject roles that are clearly not suitable for Pooja
const HARD_FILTER_TERMS = [
  'technician', 'intern', 'internship', 'junior', 'admin', 'administrative',
  'coordinator', 'lab manager', 'lab tech'
]
// Exception: "assistant" is blocked UNLESS it's "assistant professor"
// Postdoc is blocked EXCEPT for academia/international where it still has value
const NOISE_DISCIPLINE_RE = /\b(data|market(?:ing)?|software|i\.?t\.?|finance|financial|social|computer|machine\s+learning|analyst|clinical\s+data)\s+(scientist|researcher)\b/i
const LIFESCI_ANCHOR_RE = /\b(metabolism|molecular|biotech|cardiovascular|immunology|ph\.?d|biology|biological|biochem(?:istry|ical)?|genomics|genetics|genetic|research|faculty|staff|science|sciences|investigator|oncology|neuroscience|microbiology|virology|pharmacology|pharma(?:ceutical)?|proteomics|transcriptomics|bioinformatics|crispr|rna|sequencing|cancer|cardiac|immunobiology|epigenetics|haematology|hematology|cell biology|molecular genetics)\b/i
const GARBAGE_TITLE_RE = /^\$|^\d+\s+(job|position|opening|result|postdoc|researcher)/i

// Tier 1 org prestige bonus (10 pts)
const TIER1_ORG_NAMES = new Set([
  'Harvard Medical School', 'Stanford Medicine', 'MIT Biology', 'UCSF',
  'Broad Institute', 'Johns Hopkins Medicine', 'Mayo Clinic Research',
  'Salk Institute', 'Columbia University Medical Center', 'Yale School of Medicine',
  'Gladstone Institutes', 'Scripps Research', 'UT Southwestern Medical Center',
  'Baylor College of Medicine', 'Washington University St Louis', 'Weill Cornell Medicine',
  'Duke University Medical Center', 'University of Michigan Medical School',
  'Vanderbilt University Medical Center', 'University of Pennsylvania Perelman',
  'Northwestern University Feinberg',
  'NIH NHLBI', 'NIH NIGMS', 'NIH NCI',
  'Karolinska Institute', 'ETH Zurich', 'EMBL Jobs', 'Francis Crick Institute',
  'Wellcome Sanger Institute', 'Max Planck Heart and Lung',
  'Max Planck Institute for Molecular Biomedicine', 'Hubrecht Institute',
  'Genentech', 'Regeneron', 'Amgen', 'Pfizer Research', 'Merck Research',
  'Roche', 'GlaxoSmithKline GSK', 'AstraZeneca US', 'Novartis US', 'Moderna',
  'NCBS Bangalore', 'IISc Bangalore', 'TIFR Mumbai',
  'Baker Heart Institute', 'Victor Chang Cardiac Research Institute',
  'Duke-NUS Medical School',
])

// ─── Location Filter ──────────────────────────────────────────────────────────
const RELEVANT_LOCATIONS = [
  'usa', 'united states', 'new york', 'boston', 'san francisco', 'seattle',
  'chicago', 'houston', 'los angeles', 'bethesda', 'cambridge, ma',
  'cambridge ma', 'la jolla', 'san diego', 'torrance', 'baltimore',
  'durham', 'nashville', 'philadelphia', 'ann arbor',
  'uk', 'united kingdom', 'london', 'edinburgh', 'oxford',
  'cambridge, uk', 'cambridge uk', 'manchester', 'glasgow', 'hinxton',
  'germany', 'berlin', 'heidelberg', 'munich', 'frankfurt', 'cologne',
  'sweden', 'stockholm', 'gothenburg',
  'switzerland', 'zurich', 'basel', 'geneva',
  'netherlands', 'amsterdam', 'utrecht',
  'france', 'paris',
  'denmark', 'copenhagen',
  'portugal', 'lisbon',
  'canada', 'toronto', 'montreal', 'vancouver',
  'singapore',
  'australia', 'melbourne', 'sydney', 'brisbane',
  'india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi',
  'hyderabad', 'pune', 'faridabad', 'trivandrum', 'kolkata', 'chennai',
  'gurgaon', 'gurugram', 'noida', 'chandigarh', 'tirupati',
]

function isRelevantLocation(location: string = ''): boolean {
  if (!location || location.trim() === '') return false
  const loc = location.toLowerCase()
  return RELEVANT_LOCATIONS.some(l => loc.includes(l))
}

// ─── Hard Filter ─────────────────────────────────────────────────────────────
function passesHardFilter(title: string, sector?: string): boolean {
  const t = title.trim()
  if (t.length < 6) return false
  if (GARBAGE_TITLE_RE.test(t)) return false
  if (/\d+\s+(cardiovascular|postdoc|molecular|research)\s+jobs?\b/i.test(t)) return false
  if (/\bjobs?\s+in\s+(north america|united states|usa|uk|europe|global)\b/i.test(t)) return false

  // Assistant Professor always passes
  if (/assistant\s+professor/i.test(t)) return true

  // Postdoc: allowed for academia/international sectors only
  if (/\b(postdoc|postdoctoral)\b/i.test(t)) {
    return sector === 'academia' || sector === 'international'
  }

  if (NOISE_DISCIPLINE_RE.test(t)) return false

  const tl = t.toLowerCase()
  // Block "assistant" unless it precedes "professor" (already caught above)
  if (tl.includes('assistant') && !tl.includes('assistant professor')) return false
  if (HARD_FILTER_TERMS.some(term => tl.includes(term))) return false

  return LIFESCI_ANCHOR_RE.test(t)
}

// ─── Relevance gate (minimum bar to even consider a job) ─────────────────────
function isRelevant(title: string, description: string = ''): boolean {
  const text = (title + ' ' + description).toLowerCase()
  return LIFESCI_ANCHOR_RE.test(text) || SCIENTIST_RE.test(title)
}

// ─── POOJA MATCH SCORE — 0 to 100 ────────────────────────────────────────────
// Implements the exact scoring matrix requested:
//
// 1. Core Technical Mastery     (40 pts)
//    Full 40 if job requires ANY high-level wet-lab (PCR, protein, IHC, cell culture)
//    OR in-vivo work (animal model, surgery, mouse). Reasoning: someone who does
//    Langendorff/echocardiography adapts easily to other physiological assays.
//
// 2. Domain / Disease Alignment  (30 pts)
//    30 — cardiovascular, heme, molecular genetics (her exact domains)
//    15 — oncology, immunology, metabolism (transferable molecular skills)
//
// 3. Seniority & Title           (20 pts)
//    Scientist / R&D / PI / Faculty / Group Leader → 20
//    Postdoc at Tier 1 institution → 12 (don't penalise)
//    Postdoc elsewhere → 8
//
// 4. Institutional Fit           (10 pts)
//    Tier 1 research orgs bonus
//
// Floor Rule: PhD Life Sciences + Molecular Biology context → minimum score 50
// ─────────────────────────────────────────────────────────────────────────────

// ── Component 1: Core Technical Mastery (40 pts) ─────────────────────────────
const WET_LAB_RE = /\b(genotyping|pcr|qpcr|rt.?pcr|western blot|protein analysis|protein expression|immunohistochemistry|ihc|elisa|cell culture|primary cell|flow cytometry|immunofluorescence|confocal|microscopy|molecular biology|biochemistry|cloning|rna.?seq|transcriptomics|crispr|gene expression|sequencing|rna isolation|dna isolation|immunoprecipitation|chromatin|chip.?seq|atac.?seq|single.cell)\b/i
const IN_VIVO_RE  = /\b(animal model|mouse model|in.?vivo|transgenic|knockout|knock.?in|conditional knockout|animal surgery|echocardiography|langendorff|cardiac perfusion|animal handling|rodent|murine|rat model|zebrafish|drosophila|genetically modified|cre.?lox)\b/i

// ── Component 2: Domain / Disease Alignment (30 pts full, 15 pts partial) ────
const PRIMARY_DOMAIN_RE   = /\b(cardiovascular|cardiomyopathy|peripartum|cardiac|heart failure|heart disease|cardiomyocyte|cardio|vascular|heme|haemo|hemoglobin|haematology|hematology|molecular genetics|genomics|genetics|gene|transcriptomics|rna.?seq)\b/i
const SECONDARY_DOMAIN_RE = /\b(cancer|oncology|tumor|tumour|immunology|immune|inflammation|inflammatory|metabolism|metabolic|liver|fibrosis|neuroscience|neurological|pulmonary|renal|kidney|diabetes|obesity)\b/i

// ── Component 3: Seniority / Title (20 pts) ──────────────────────────────────
const SENIOR_TITLE_RE  = /\b(senior scientist|principal scientist|staff scientist|group leader|team leader|associate investigator|lead scientist|scientist [2-9]|scientist ii|scientist iii|scientist iv)\b/i
const FACULTY_TITLE_RE = /\b(assistant professor|associate professor|professor|faculty|tenure.?track|principal investigator|pi\b)\b/i
const SCIENTIST_TITLE_RE = /\b(research scientist|scientist\b|r&d scientist|r&d|investigator)\b/i
const POSTDOC_TITLE_RE   = /\b(postdoc|postdoctoral|research fellow|research associate)\b/i

// ── Floor rule context ────────────────────────────────────────────────────────
const LIFESCI_PHD_RE  = /\b(ph\.?d|doctorate|life science|biology|biochemistry|molecular|genetics|biomedical|bioscience)\b/i
const MOLBIO_CONTEXT_RE = /\b(molecular biology|molecular|biochemistry|cell biology|genetics|genomics|protein|rna|dna|assay|experiment|laboratory|research)\b/i

export function poojaMatchScore(title: string, snippet: string, orgName: string, sector?: string): number {
  const text   = (title + ' ' + snippet).toLowerCase()
  const tLower = title.toLowerCase()
  let score = 0

  // ── 1. Core Technical Mastery (40 pts) ───────────────────────────────────
  const hasWetLab = WET_LAB_RE.test(text)
  const hasInVivo = IN_VIVO_RE.test(text)
  if (hasWetLab || hasInVivo) {
    score += 40
  } else if (LIFESCI_PHD_RE.test(text)) {
    score += 20  // Life-science role, no explicit technique keywords — partial credit
  }

  // ── 2. Domain / Disease Alignment (30 pts / 15 pts) ──────────────────────
  if (PRIMARY_DOMAIN_RE.test(text)) {
    score += 30
  } else if (SECONDARY_DOMAIN_RE.test(text)) {
    score += 15
  }

  // ── 3. Seniority & Title (20 pts) ────────────────────────────────────────
  if (FACULTY_TITLE_RE.test(tLower)) {
    score += 20
  } else if (SENIOR_TITLE_RE.test(tLower)) {
    score += 20
  } else if (SCIENTIST_TITLE_RE.test(tLower)) {
    score += 18
  } else if (POSTDOC_TITLE_RE.test(tLower)) {
    // Postdoc: full credit at Tier 1 / academia; partial elsewhere
    const isTier1Academia = TIER1_ORG_NAMES.has(orgName) ||
      sector === 'academia' || sector === 'international'
    score += isTier1Academia ? 12 : 8
  }

  // ── 4. Institutional Fit (10 pts) ────────────────────────────────────────
  if (TIER1_ORG_NAMES.has(orgName)) score += 10

  // ── Floor Rule ────────────────────────────────────────────────────────────
  // PhD Life Sciences + molecular biology context → cannot be below 50
  const requiresPhd    = LIFESCI_PHD_RE.test(text)
  const hasMolBio      = MOLBIO_CONTEXT_RE.test(text)
  const isLifeSciTitle = LIFESCI_ANCHOR_RE.test(title) || SCIENTIST_TITLE_RE.test(title) || FACULTY_TITLE_RE.test(title)
  if (requiresPhd && hasMolBio && isLifeSciTitle && score < 50) {
    score = 50
  }

  return Math.min(Math.round(score), 100)
}

// ─── Rescore all active jobs in the DB using current scorer ──────────────────
// Called on: server boot, after scan, and via POST /api/monitor/rescore
// This fixes rows that were inserted before match_score column existed (all 0).
export async function rescoreAllActiveJobs(): Promise<number> {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, snippet, org_name, sector FROM monitor_jobs WHERE is_active = true`
    )
    let updated = 0
    for (const row of rows) {
      const ms = poojaMatchScore(row.title, row.snippet || '', row.org_name, row.sector)
      await pool.query(
        `UPDATE monitor_jobs SET match_score = $1, high_suitability = $2 WHERE id = $3`,
        [ms, ms >= 50, row.id]
      )
      updated++
    }
    console.log(`[Monitor] Rescored ${updated} active jobs`)
    return updated
  } catch (err) {
    console.error('[Monitor] Rescore failed:', (err as Error).message)
    return 0
  }
}

// Filter out generic social/landing-page URLs that don't point to actual job postings
function extractCanonicalUrl(url: string, fallback: string): string {
  if (!url) return fallback
  const GENERIC_DOMAINS = [
    'linkedin.com/company', 'linkedin.com/in/', 'linkedin.com/jobs',
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
    'youtube.com', 'glassdoor.com/Overview'
  ]
  if (GENERIC_DOMAINS.some(d => url.includes(d))) return fallback
  return url
}

function hashContent(title: string, org: string, location: string): string {
  return crypto
    .createHash('sha256')
    .update(`${title}|${org}|${location}`)
    .digest('hex')
    .slice(0, 64)
}

// RECOMMENDATION 3: Timeout wrapper for all external calls
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
  )
  return Promise.race([promise, timeout])
}

interface ScannedJob {
  externalId: string
  title: string
  orgName: string
  location: string
  country: string
  applyUrl: string
  snippet: string
  postedDate?: string
  contentHash: string
  matchScore: number      // 0–100 based on Pooja's CV profile
  highSuitability: boolean
}

// websearch via Gemini grounded search — finds live individual job postings
async function scanViaWebSearch(org: MonitorOrg): Promise<ScannedJob[]> {
  try {
    const isIndustry = org.sector === 'industry' || org.sector === 'india'
    const roleGuidance = isIndustry
      ? 'Focus on: Research Scientist, Senior Scientist, Principal Scientist, Scientist I/II/III, Group Leader, Investigator. Do NOT include postdoctoral positions.'
      : 'Include: Research Scientist, Postdoctoral Fellow/Associate, Assistant Professor, Faculty, Group Leader, Staff Scientist.'

    const prompt = `You are a life-sciences job search expert. Search the web RIGHT NOW for currently open positions at ${org.name} that match this candidate profile:

Candidate: Dr. Pooja Choubey — PhD Molecular Genetics, 3+ years postdoc experience in cardiovascular biology, peripartum cardiomyopathy, transgenic mouse models (Cre-lox), RNA-seq/transcriptomics, cellular senescence, echocardiography, Langendorff perfusion, immunohistochemistry, confocal microscopy. Co-first author Nature Communications 2025 (IF 15.7).

Search query: "${org.searchQuery}"

Rules:
- ONLY real individual job postings currently open (not search result pages, salary pages, news articles, person profiles)
- Posted in 2025 or 2026 only — NO expired listings
- ${roleGuidance}
- Locations: USA, UK, Germany, Sweden, Switzerland, Netherlands, France, Denmark, Canada, Singapore, Australia, or India ONLY
- Each entry MUST have a direct URL to the actual job posting (not the org homepage)

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "title": "exact job title as posted",
    "location": "City, Country",
    "applyUrl": "https://direct-link-to-job-posting",
    "snippet": "2-sentence description of role and key requirements (max 200 chars)",
    "postedDate": "YYYY-MM-DD or Recent"
  }
]

If no matching open positions are found, return: []`

    const raw = await withTimeout(
      geminiGroundedSearch(prompt, 2500),
      30000,
      `webSearch for ${org.name}`
    )

    const cleaned = raw.replace(/```json\n?|```/g, '').trim()
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start === -1 || end === -1) {
      console.log(`[Monitor] webSearch no JSON for ${org.name}`)
      return []
    }

    let parsed: any[]
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1))
    } catch (parseErr) {
      console.error(`[Monitor] JSON parse failed for ${org.name}:`, (parseErr as Error).message)
      return []
    }

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((j: any) => j.title && typeof j.title === 'string' && j.title.trim().length >= 6)
      .filter((j: any) => isRelevant(j.title, j.snippet))
      .filter((j: any) => j.location && isRelevantLocation(j.location))
      .filter((j: any) => passesHardFilter(j.title, org.sector))
      .map((j: any) => {
        const ms = poojaMatchScore(j.title, j.snippet || '', org.name, org.sector)
        return {
          externalId: hashContent(j.title, org.name, j.location || ''),
          title: j.title.trim(),
          orgName: org.name,
          location: j.location,
          country: org.country,
          applyUrl: extractCanonicalUrl(j.applyUrl || '', org.careersUrl || ''),
          snippet: (j.snippet || '').slice(0, 200),
          postedDate: j.postedDate || 'Recent',
          contentHash: hashContent(j.title, org.name, j.location || ''),
          matchScore: ms,
          highSuitability: ms >= 40
        }
      })
      .filter((j: ScannedJob) => j.matchScore >= 20)   // minimum bar
      .sort((a: ScannedJob, b: ScannedJob) => b.matchScore - a.matchScore)

  } catch (err) {
    console.error(`[Monitor] webSearch failed for ${org.name}:`, (err as Error).message)
    return []
  }
}

async function scanViaUSAJobs(org: MonitorOrg): Promise<ScannedJob[]> {
  try {
    const query = encodeURIComponent(org.searchQuery)
    const url = `https://data.usajobs.gov/api/search?Keyword=${query}&ResultsPerPage=10`

    const resp = await withTimeout(
      fetch(url, {
        headers: {
          'User-Agent': 'career-os-portal@railway.app',
          'Authorization-Key': process.env.USAJOBS_API_KEY || ''
        }
      }),
      10000,
      `USAJobs for ${org.name}`
    )

    if (!resp.ok) {
      console.warn(`[Monitor] USAJobs returned ${resp.status} for ${org.name}, falling back to webSearch`)
      return scanViaWebSearch(org)
    }

    const data = await resp.json()
    const items = data?.SearchResult?.SearchResultItems || []

    return items
      .filter((item: any) => {
        const title = item.MatchedObjectDescriptor?.PositionTitle || ''
        return isRelevant(title) && passesHardFilter(title, org.sector)
      })
      .map((item: any) => {
        const d = item.MatchedObjectDescriptor
        const title = d.PositionTitle || ''
        const location = d.PositionLocation?.[0]?.LocationName || 'Washington DC, USA'
        const snippet = (d.UserArea?.Details?.JobSummary || '').slice(0, 200)
        const ms = poojaMatchScore(title, snippet, d.OrganizationName || org.name, org.sector)
        return {
          externalId: d.PositionID || hashContent(title, org.name, location),
          title,
          orgName: d.OrganizationName || org.name,
          location,
          country: 'USA',
          applyUrl: d.ApplyURI?.[0] || '',
          snippet,
          postedDate: d.PublicationStartDate?.split('T')[0] || 'Recent',
          contentHash: hashContent(title, org.name, location),
          matchScore: ms,
          highSuitability: ms >= 40
        }
      })
      .filter((j: ScannedJob) => j.matchScore >= 20)
      .sort((a: ScannedJob, b: ScannedJob) => b.matchScore - a.matchScore)
  } catch (err) {
    console.error(`[Monitor] USAJobs failed for ${org.name}:`, (err as Error).message)
    return scanViaWebSearch(org)
  }
}

async function scanViaRSS(org: MonitorOrg): Promise<ScannedJob[]> {
  if (!org.rssUrl) return scanViaWebSearch(org)
  try {
    const resp = await withTimeout(
      fetch(org.rssUrl, {
        headers: { 'User-Agent': 'career-os-portal@railway.app' }
      }),
      8000,
      `RSS for ${org.name}`
    )

    const text = await resp.text()
    const items: ScannedJob[] = []
    const itemMatches = text.match(/<item>([\s\S]*?)<\/item>/g) || []

    for (const item of itemMatches.slice(0, 15)) {
      const title = (
        item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      ).trim()

      const link = (
        item.match(/<link>(.*?)<\/link>/)?.[1] || ''
      ).trim()

      const desc = (
        item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description>(.*?)<\/description>/)?.[1] || ''
      ).replace(/<[^>]+>/g, '').slice(0, 150).trim()

      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || 'Recent'

      if (!isRelevant(title, desc)) continue
      if (!passesHardFilter(title, org.sector)) continue

      const location = org.country
      if (!isRelevantLocation(location)) continue

      const ms = poojaMatchScore(title, desc, org.name, org.sector)
      if (ms < 20) continue

      items.push({
        externalId: hashContent(title, org.name, location),
        title,
        orgName: org.name,
        location,
        country: org.country,
        applyUrl: extractCanonicalUrl(link, org.careersUrl || ''),
        snippet: desc,
        postedDate: pubDate,
        contentHash: hashContent(title, org.name, location),
        matchScore: ms,
        highSuitability: ms >= 40
      })
    }

    if (items.length === 0) {
      console.log(`[Monitor] RSS empty for ${org.name}, falling back to webSearch`)
      return scanViaWebSearch(org)
    }

    return items.sort((a, b) => b.matchScore - a.matchScore)

  } catch (err) {
    console.error(`[Monitor] RSS failed for ${org.name}:`, (err as Error).message)
    return scanViaWebSearch(org)
  }
}

export async function scanOrg(orgId: string, org: MonitorOrg): Promise<{
  found: number, newJobs: number, error?: string
}> {
  let jobs: ScannedJob[] = []

  try {
    switch (org.apiType) {
      case 'rss':      jobs = await scanViaRSS(org);      break
      case 'usajobs':  jobs = await scanViaUSAJobs(org);  break
      default:         jobs = await scanViaWebSearch(org)
    }
  } catch (err) {
    const msg = (err as Error).message
    try {
      await pool.query(
        `INSERT INTO monitor_scans (org_id, jobs_found, new_jobs, status, error_message)
         VALUES ($1, 0, 0, 'error', $2)`,
        [orgId, msg]
      )
    } catch (dbErr) {
      console.error('[Monitor] Failed to log scan error:', (dbErr as Error).message)
    }
    return { found: 0, newJobs: 0, error: msg }
  }

  let newCount = 0

  for (const job of jobs) {
    try {
      const result = await pool.query(
        `INSERT INTO monitor_jobs
           (org_id, external_id, title, org_name, location, country,
            sector, apply_url, snippet, posted_date, content_hash,
            high_suitability, match_score, is_new, is_active, last_seen_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,true,NOW())
         ON CONFLICT (org_id, external_id) DO UPDATE
           SET is_active = true,
               last_seen_at = NOW(),
               high_suitability = $12,
               match_score = $13,
               is_new = CASE
                 WHEN monitor_jobs.content_hash != $11 THEN true
                 ELSE monitor_jobs.is_new
               END,
               content_hash = $11
         RETURNING (xmax = 0) as inserted`,
        [orgId, job.externalId, job.title, job.orgName,
         job.location, job.country, org.sector,
         job.applyUrl, job.snippet, job.postedDate, job.contentHash,
         job.highSuitability, job.matchScore]
      )
      if (result.rows[0]?.inserted) newCount++
    } catch (err) {
      console.error(`[Monitor] Failed to save job "${job.title}":`, (err as Error).message)
    }
  }

  try {
    await pool.query(
      'UPDATE monitor_orgs SET last_scanned_at = NOW() WHERE id = $1',
      [orgId]
    )
    await pool.query(
      `INSERT INTO monitor_scans (org_id, jobs_found, new_jobs, status)
       VALUES ($1, $2, $3, 'success')`,
      [orgId, jobs.length, newCount]
    )
  } catch (err) {
    console.error('[Monitor] Failed to update scan record:', (err as Error).message)
  }

  console.log(`[Monitor] ${org.name}: ${jobs.length} found, ${newCount} new`)
  return { found: jobs.length, newJobs: newCount }
}

// RECOMMENDATION 2: PostgreSQL advisory lock to prevent duplicate cron runs
export async function runFullScan(): Promise<void> {
  const lockId = 987654321

  let lockAcquired = false
  let client

  try {
    client = await pool.connect()

    const lockResult = await client.query(
      'SELECT pg_try_advisory_lock($1) as acquired',
      [lockId]
    )
    lockAcquired = lockResult.rows[0]?.acquired === true

    if (!lockAcquired) {
      console.log('[Monitor] Another instance is already scanning, skipping...')
      client.release()
      return
    }

    console.log('[Monitor] Advisory lock acquired, starting full scan...')

    // Cost optimisation: scan only 10 orgs per run (oldest-first).
    // All 82 orgs rotate over 8-9 days.
    const orgs = await pool.query(
      `SELECT id, name FROM monitor_orgs
       WHERE is_active = true
       ORDER BY last_scanned_at ASC NULLS FIRST
       LIMIT 10`
    )

    for (const row of orgs.rows) {
      const orgConfig = MONITOR_ORGS.find(o => o.name === row.name)
      if (!orgConfig) continue
      await scanOrg(row.id, orgConfig)
      // slowFetch orgs get extra delay to respect their rate limits
      const delay = orgConfig.slowFetch ? 8000 : 3000
      await new Promise(r => setTimeout(r, delay))
    }

    // Clean up jobs not seen in 30 days
    const expired = await pool.query(
      `UPDATE monitor_jobs
       SET is_active = false
       WHERE last_seen_at < NOW() - INTERVAL '30 days'
       AND is_active = true
       RETURNING id`
    )
    if (expired.rows.length > 0) {
      console.log(`[Monitor] Expired ${expired.rows.length} old job listings`)
    }

    // Purge garbage titles: search-result-page text scraped from job board RSS feeds
    const purged = await pool.query(
      `DELETE FROM monitor_jobs
       WHERE
         title ~ '^\\$'
         OR title ~ '^[0-9]+ (job|position|opening|result|postdoc|researcher)'
         OR title ~* '[0-9]+ (cardiovascular|postdoc|molecular|research) jobs?'
         OR title ~* 'jobs? in (north america|united states|usa|uk|europe|global)'
         OR title ~* '^(join our team|post|genomic sciences|research & development jobs)$'
         OR length(trim(title)) < 6
       RETURNING id`
    )
    if (purged.rows.length > 0) {
      console.log(`[Monitor] Purged ${purged.rows.length} garbage job entries`)
    }

    console.log('[Monitor] Full scan complete')

  } catch (err) {
    console.error('[Monitor] Scan error:', (err as Error).message)
  } finally {
    if (client) {
      if (lockAcquired) {
        try {
          await client.query('SELECT pg_advisory_unlock($1)', [lockId])
        } catch (e) {
          console.error('[Monitor] Failed to release advisory lock:', e)
        }
      }
      client.release()
    }
  }
}

export async function seedOrgs(): Promise<void> {
  const count = await pool.query('SELECT COUNT(*) FROM monitor_orgs')
  if (parseInt(count.rows[0].count) >= MONITOR_ORGS.length) {
    console.log(`[Monitor] ${count.rows[0].count} orgs already seeded`)
    return
  }

  console.log('[Monitor] Seeding organizations...')
  for (const org of MONITOR_ORGS) {
    await pool.query(
      `INSERT INTO monitor_orgs
         (name, sector, country, careers_url, rss_url, api_type)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (name) DO NOTHING`,
      [org.name, org.sector, org.country,
       org.careersUrl || null, org.rssUrl || null, org.apiType]
    )
  }
  console.log(`[Monitor] Seeded ${MONITOR_ORGS.length} organizations`)
}
