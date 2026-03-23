/**
 * noise_test.ts — Verify passesHardFilter regex logic.
 * Run with: node -e "$(cat noise_test.ts | grep -v 'interface\|: string\|: boolean\|: TestCase')"
 * Or:       npx ts-node --skip-project noise_test.ts
 *
 * IMPORTANT: This file must mirror monitorEngine.ts exactly.
 */

// ── Mirrors the exact regexes in monitorEngine.ts ─────────────────────────────

const NOISE_DISCIPLINE_RE = /\b(data|market(?:ing)?|software|i\.?t\.?|finance|financial|social|computer|machine\s+learning|analyst)\s+(scientist|researcher)\b/i

// Broadened anchor: covers real bio-science title vocabulary.
// NOISE_DISCIPLINE_RE + poojaSuitabilityScore ≥ 3 provide the other layers.
const LIFESCI_ANCHOR_RE = /\b(metabolism|molecular|biotech|cardiovascular|immunology|ph\.?d|postdoc(?:toral)?|biology|biological|biochem(?:istry|ical)?|genomics|genetics|genetic|research|faculty|staff|science|sciences|investigator|oncology|neuroscience|microbiology|virology|pharmacology|pharma(?:ceutical)?|proteomics|transcriptomics|bioinformatics|crispr|rna|sequencing|cancer|cardiac|immunobiology|epigenetics|haematology|hematology)\b/i

const HARD_FILTER_TERMS = [
  'technician', 'postdoc', 'postdoctoral', 'intern', 'internship',
  'junior', 'admin', 'administrative', 'coordinator', 'assistant'
]

function passesHardFilter(title: string): boolean {
  if (/assistant\s+professor/i.test(title)) return true
  if (NOISE_DISCIPLINE_RE.test(title)) return false
  const t = title.toLowerCase()
  if (HARD_FILTER_TERMS.some(term => t.includes(term))) return false
  return LIFESCI_ANCHOR_RE.test(title)
}

// ── Test cases ────────────────────────────────────────────────────────────────

interface TestCase {
  title: string
  expected: boolean
  reason: string
}

const cases: TestCase[] = [
  // ── SHOULD PASS — core bio-science titles ─────────────────────────────────
  { title: 'Research Scientist – Cardiovascular Biology', expected: true,  reason: 'anchor: cardiovascular, biology' },
  { title: 'Senior Scientist, Molecular Oncology',        expected: true,  reason: 'anchor: molecular, oncology' },
  { title: 'Staff Scientist – Immunology',                expected: true,  reason: 'anchor: immunology' },
  { title: 'Assistant Professor, Molecular Biology',      expected: true,  reason: 'assistant professor exemption' },
  { title: 'Group Leader – Biotech Innovation',           expected: true,  reason: 'anchor: biotech' },
  { title: 'Investigator, PhD Program – Metabolism',      expected: true,  reason: 'anchor: metabolism + phd' },
  { title: 'Faculty Researcher, Cardiovascular Genomics', expected: true,  reason: 'anchor: faculty, cardiovascular, genomics' },
  { title: 'Research Scientist – Life Sciences',          expected: true,  reason: 'anchor: research, science' },
  { title: 'Senior Research Scientist, Oncology',         expected: true,  reason: 'anchor: research, oncology' },
  { title: 'Staff Scientist – Genomics',                  expected: true,  reason: 'anchor: staff, genomics' },
  { title: 'Principal Investigator – Cell Biology',       expected: true,  reason: 'anchor: investigator, biology' },
  { title: 'Faculty Position, Department of Biology',     expected: true,  reason: 'anchor: faculty, biology' },
  { title: 'Scientist II – Biochemistry',                 expected: true,  reason: 'anchor: biochemistry' },
  { title: 'Associate Scientist, Genetics',               expected: true,  reason: 'anchor: genetics' },
  { title: 'Group Leader – Neuroscience',                 expected: true,  reason: 'anchor: neuroscience' },
  { title: 'Senior Scientist, Cancer Biology',            expected: true,  reason: 'anchor: cancer, biology' },
  { title: 'Scientist – CRISPR Biology',                  expected: true,  reason: 'anchor: crispr, biology' },
  { title: 'Senior Research Fellow',                      expected: true,  reason: 'anchor: research' },
  { title: 'Tenure-Track Faculty, Life Sciences',         expected: true,  reason: 'anchor: faculty, sciences' },
  { title: 'Staff Research Scientist',                    expected: true,  reason: 'anchor: staff, research' },
  { title: 'Scientist I – Immunology',                    expected: true,  reason: 'anchor: immunology' },
  { title: 'Research Fellow – Pharmacology',              expected: true,  reason: 'anchor: research, pharmacology' },

  // ── SHOULD FAIL — postdoc job type (Pooja targets senior roles) ───────────
  // 'postdoc' in LIFESCI_ANCHOR_RE matches descriptions; HARD_FILTER_TERMS
  // blocks it as a job TYPE first since it runs before the anchor check.
  { title: 'Postdoctoral Fellow, Cardiovascular Research',expected: false, reason: 'hard-filter: postdoctoral' },

  // ── SHOULD FAIL — noise discipline ✗ ─────────────────────────────────────
  { title: 'Data Scientist – AI Platform',                expected: false, reason: 'noise: Data Scientist' },
  { title: 'Market Researcher, Consumer Insights',        expected: false, reason: 'noise: Market Researcher' },
  { title: 'Software Scientist, Cloud Infra',             expected: false, reason: 'noise: Software Scientist' },
  { title: 'IT Scientist – Security Operations',          expected: false, reason: 'noise: IT Scientist' },
  { title: 'Finance Scientist – Risk Modelling',          expected: false, reason: 'noise: Finance Scientist' },
  { title: 'Social Scientist – UX Research',              expected: false, reason: 'noise: Social Scientist' },
  { title: 'Computer Scientist – ML Platform',            expected: false, reason: 'noise: Computer Scientist' },
  { title: 'Machine Learning Scientist – NLP',            expected: false, reason: 'noise: Machine Learning Scientist' },
  { title: 'Analyst Researcher – Market Intelligence',    expected: false, reason: 'noise: Analyst Researcher' },
  { title: 'Financial Researcher – Quant Strategies',     expected: false, reason: 'noise: Financial Researcher' },

  // ── SHOULD FAIL — hard filter terms ✗ ────────────────────────────────────
  { title: 'Lab Technician – Molecular Biology',          expected: false, reason: 'hard-filter: technician' },
  { title: 'Research Intern – Cardiovascular Studies',    expected: false, reason: 'hard-filter: intern' },
  { title: 'Junior Scientist – Biotech',                  expected: false, reason: 'hard-filter: junior' },
  { title: 'Administrative Coordinator – Research Office',expected: false, reason: 'hard-filter: administrative + coordinator' },
]

// ── Runner ────────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

console.log('\n── noise_test.ts ─────────────────────────────────────────────\n')

for (const tc of cases) {
  const result = passesHardFilter(tc.title)
  const ok = result === tc.expected
  const icon = ok ? '✓' : '✗'
  if (ok) passed++; else failed++
  console.log(`${icon} [${tc.expected ? 'PASS' : 'FAIL'}] "${tc.title}"`)
  if (!ok) {
    console.log(`    Expected: ${tc.expected}, Got: ${result}`)
    console.log(`    Reason: ${tc.reason}`)
  }
}

console.log(`\n── Results: ${passed}/${cases.length} passed${failed > 0 ? `, ${failed} FAILED` : ' ✓'} ─────\n`)

if (failed > 0) (process as any).exit(1)
