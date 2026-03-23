/**
 * debug_scan.ts — Simulate a Gemini scan and expose which filter kills each title.
 * Run with: node debug_scan.js  (or npx ts-node --skip-project debug_scan.ts)
 *
 * Mirrors the EXACT regex logic in monitorEngine.ts so the output is production-accurate.
 */

// ── Mirrors monitorEngine.ts exactly ─────────────────────────────────────────

const NOISE_DISCIPLINE_RE = /\b(data|market(?:ing)?|software|i\.?t\.?|finance|financial|social|computer|machine\s+learning|analyst)\s+(scientist|researcher)\b/i

// Mirrors monitorEngine.ts LIFESCI_ANCHOR_RE exactly
const LIFESCI_ANCHOR_RE = /\b(metabolism|molecular|biotech|cardiovascular|immunology|ph\.?d|postdoc(?:toral)?|biology|biological|biochem(?:istry|ical)?|genomics|genetics|genetic|research|faculty|staff|science|sciences|investigator|oncology|neuroscience|microbiology|virology|pharmacology|pharma(?:ceutical)?|proteomics|transcriptomics|bioinformatics|crispr|rna|sequencing|cancer|cardiac|immunobiology|epigenetics|haematology|hematology)\b/i

const LIFESCI_ANCHOR_RE_ACTUAL = LIFESCI_ANCHOR_RE

const HARD_FILTER_TERMS = [
  'technician', 'postdoc', 'postdoctoral', 'intern', 'internship',
  'junior', 'admin', 'administrative', 'coordinator', 'assistant'
]

function whyFailed(title: string): string {
  if (/assistant\s+professor/i.test(title)) return 'PASS (assistant professor exemption)'
  if (NOISE_DISCIPLINE_RE.test(title)) {
    const m = title.match(NOISE_DISCIPLINE_RE)
    return `✗ NOISE_DISCIPLINE_RE matched: "${m?.[0]}"`
  }
  const t = title.toLowerCase()
  for (const term of HARD_FILTER_TERMS) {
    if (t.includes(term)) return `✗ HARD_FILTER_TERMS matched: "${term}"`
  }
  if (!LIFESCI_ANCHOR_RE_ACTUAL.test(title)) return '✗ LIFESCI_ANCHOR_RE — no life-science term in title'
  return 'PASS'
}

function passesHardFilter(title: string): boolean {
  if (/assistant\s+professor/i.test(title)) return true
  if (NOISE_DISCIPLINE_RE.test(title)) return false
  const t = title.toLowerCase()
  if (HARD_FILTER_TERMS.some(term => t.includes(term))) return false
  return LIFESCI_ANCHOR_RE_ACTUAL.test(title)
}

// ── Simulated Gemini results for query: "Postdoctoral Researcher Life Sciences" ──

const simulatedGeminiResults = [
  // Should PASS — real bio-science roles
  { title: 'Research Scientist – Life Sciences',        location: 'Boston, USA' },
  { title: 'Senior Research Scientist, Oncology',      location: 'San Francisco, USA' },
  { title: 'Staff Scientist – Genomics',               location: 'Cambridge, MA' },
  { title: 'Principal Investigator – Cell Biology',    location: 'London, UK' },
  { title: 'Faculty Position, Department of Biology',  location: 'Bangalore, India' },
  { title: 'Scientist II – Biochemistry',              location: 'Heidelberg, Germany' },
  { title: 'Associate Scientist, Genetics',            location: 'Basel, Switzerland' },
  { title: 'Group Leader – Neuroscience',              location: 'Stockholm, Sweden' },
  { title: 'Investigator – Cardiovascular Biology',    location: 'Bethesda, USA' },
  { title: 'Research Scientist – Molecular Biology',   location: 'New York, USA' },
  { title: 'Senior Scientist, Cancer Biology',         location: 'Toronto, Canada' },
  { title: 'Scientist – CRISPR Biology',               location: 'Singapore' },
  { title: 'Senior Research Fellow',                   location: 'Oxford, UK' },
  { title: 'Tenure-Track Faculty, Life Sciences',      location: 'Melbourne, Australia' },
  { title: 'Staff Research Scientist',                 location: 'La Jolla, USA' },
  { title: 'Assistant Professor, Molecular Biology',   location: 'NCBS Bangalore, India' },
  { title: 'Scientist I – Immunology',                 location: 'Seattle, USA' },
  { title: 'Research Fellow – Pharmacology',           location: 'Edinburgh, UK' },

  // Should FAIL — noise roles
  { title: 'Data Scientist – AI Platform',             location: 'New York, USA' },
  { title: 'Market Researcher, Consumer Insights',     location: 'London, UK' },
  { title: 'Software Scientist – Cloud',               location: 'San Francisco, USA' },
  { title: 'Computer Scientist – ML',                  location: 'Berlin, Germany' },
  { title: 'Financial Researcher – Risk',              location: 'Zurich, Switzerland' },

  // Should FAIL — hard filter terms
  { title: 'Lab Technician – Genomics',                location: 'Boston, USA' },
  { title: 'Research Intern – Molecular Biology',      location: 'Cambridge, MA' },
  { title: 'Junior Scientist – Cardiovascular',        location: 'London, UK' },
]

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('\n── debug_scan.ts: Simulated Gemini scan for "Postdoctoral Researcher Life Sciences" ──\n')

let passed = 0, killed = 0
const killedByAnchor: string[] = []

for (const job of simulatedGeminiResults) {
  const result = whyFailed(job.title)
  const ok = passesHardFilter(job.title)
  if (ok) passed++
  else {
    killed++
    if (result.includes('LIFESCI_ANCHOR')) killedByAnchor.push(job.title)
  }
  const icon = ok ? '✓' : '✗'
  console.log(`${icon} ${result.padEnd(55)} | ${job.title}`)
}

console.log(`\n── Summary ──────────────────────────────────────────────────────`)
console.log(`  Passed  : ${passed}/${simulatedGeminiResults.length}`)
console.log(`  Killed  : ${killed}/${simulatedGeminiResults.length}`)
if (killedByAnchor.length) {
  console.log(`\n  Killed by LIFESCI_ANCHOR_RE (false positives to fix):`)
  killedByAnchor.forEach(t => console.log(`    - ${t}`))
}
console.log()
