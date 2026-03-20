/**
 * noise_test.ts — Verify passesHardFilter regex logic before committing.
 * Run with: npx ts-node noise_test.ts
 */

// ── Mirrors the exact regexes added to monitorEngine.ts ──────────────────────

const NOISE_DISCIPLINE_RE = /\b(data|market(?:ing)?|software|i\.?t\.?|finance|financial|social|computer|machine\s+learning|analyst)\s+(scientist|researcher)\b/i

const LIFESCI_ANCHOR_RE = /\b(metabolism|molecular|biotech|cardiovascular|immunology|ph\.?d|postdoc(?:toral)?)\b/i

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
  // SHOULD PASS ✓
  { title: 'Research Scientist – Cardiovascular Biology', expected: true,  reason: 'life-sci anchor: cardiovascular' },
  { title: 'Senior Scientist, Molecular Oncology',        expected: true,  reason: 'life-sci anchor: molecular' },
  { title: 'Staff Scientist – Immunology',                expected: true,  reason: 'life-sci anchor: immunology' },
  // Note: postdoctoral TITLES are still blocked by HARD_FILTER_TERMS (Pooja targets senior roles).
  // 'Postdoc' in LIFESCI_ANCHOR_RE matches descriptions, not job-type titles.
  { title: 'Postdoctoral Fellow, Cardiovascular Research',expected: false, reason: 'hard-filter: postdoctoral (Pooja targets senior roles)' },
  { title: 'Assistant Professor, Molecular Biology',      expected: true,  reason: 'assistant professor exemption' },
  { title: 'Group Leader – Biotech Innovation',           expected: true,  reason: 'life-sci anchor: biotech' },
  { title: 'Investigator, PhD Program – Metabolism',      expected: true,  reason: 'life-sci anchor: metabolism + phd' },
  { title: 'Faculty Researcher, Cardiovascular Genomics', expected: true,  reason: 'life-sci anchor: cardiovascular' },

  // SHOULD FAIL – noise discipline ✗
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

  // SHOULD FAIL – hard filter terms ✗
  { title: 'Lab Technician – Molecular Biology',          expected: false, reason: 'hard-filter: technician' },
  { title: 'Research Intern – Cardiovascular Studies',    expected: false, reason: 'hard-filter: intern' },
  { title: 'Junior Scientist – Biotech',                  expected: false, reason: 'hard-filter: junior' },
  { title: 'Administrative Coordinator – Research Office',expected: false, reason: 'hard-filter: administrative + coordinator' },

  // SHOULD FAIL – no life-sci anchor ✗
  { title: 'Principal Scientist – Engineering',           expected: false, reason: 'no life-sci anchor' },
  { title: 'Research Scientist – Operations',             expected: false, reason: 'no life-sci anchor' },
  { title: 'Staff Scientist – Business Development',      expected: false, reason: 'no life-sci anchor' },
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
