import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// ─────────────────────────────────────────────────────────────
// Cost Tracking
// ─────────────────────────────────────────────────────────────
interface CostLog {
  provider: 'deepseek' | 'anthropic' | 'cached';
  inputTokens: number;
  outputTokens: number;
  cost: number;
  endpoint: string;
  profile: string;
}

function logCost(log: CostLog) {
  console.log(`[AI COST] ${log.endpoint} | ${log.profile} | ${log.provider.toUpperCase()} | In: ${log.inputTokens}t Out: ${log.outputTokens}t | $${log.cost.toFixed(4)}`);
}

// ─────────────────────────────────────────────────────────────
// DeepSeek V3 Integration (Primary)
// ─────────────────────────────────────────────────────────────
interface DeepSeekRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
}

interface DeepSeekResponse {
  choices: Array<{
    message: { content: string };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  options: { retries?: number; backoff?: number } = {}
): Promise<{ content: string; usage: { input: number; output: number } }> {
  const { retries = 3, backoff = 1000 } = options;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post<DeepSeekResponse>(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        } as DeepSeekRequest,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        content: response.data.choices[0].message.content,
        usage: {
          input: response.data.usage.prompt_tokens,
          output: response.data.usage.completion_tokens
        }
      };
    } catch (error: any) {
      const status = error.response?.status;
      
      if ([429, 500, 503].includes(status) && attempt < retries) {
        console.warn(`[DeepSeek] Attempt ${attempt}/${retries} failed (${status}). Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('DeepSeek max retries exceeded');
}

// ─────────────────────────────────────────────────────────────
// Anthropic Claude 3.5 Sonnet (Fallback with Caching)
// ─────────────────────────────────────────────────────────────
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  options: { useCache?: boolean } = {}
): Promise<{ content: string; usage: { input: number; output: number; cached: number } }> {
  const client = getAnthropicClient();
  const { useCache = true } = options;

  const systemBlocks: any[] = useCache
    ? [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ]
    : [{ type: 'text', text: systemPrompt }];

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    temperature: 0.7,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }]
  });

  return {
    content: message.content[0].type === 'text' ? message.content[0].text : '',
    usage: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      cached: (message.usage as any).cache_read_input_tokens || 0
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Unified AI Provider with Cost-First Failover
// ─────────────────────────────────────────────────────────────
const CP_PROFILES = {
  dj: {
    systemPrompt: "You are DJs career AI. IT Audit Manager, CISA, EY alumni, 10+ years SOX/ITGC/GRC. Target: AI Audit Director. Active cert: AAIA. Remote USA only. Be specific and direct."
  },
  pooja: {
    systemPrompt: "You are Poojas career AI. Postdoc, Cardiovascular & Molecular Biology, Nature Communications author. Target: Research Scientist or PI track. ASCP MB May 2026. Open to global roles. Be specific and direct."
  }
};

export async function generateAI(
  endpoint: string,
  profile: 'dj' | 'pooja',
  userPrompt: string
): Promise<{ result: string; cached: boolean }> {
  const systemPrompt = CP_PROFILES[profile].systemPrompt;
  
  // PRIMARY: DeepSeek
  try {
    const response = await callDeepSeek(systemPrompt, userPrompt);
    
    // DeepSeek pricing: $0.14 per 1M input tokens, $0.28 per 1M output tokens
    const cost = (response.usage.input / 1_000_000) * 0.14 + (response.usage.output / 1_000_000) * 0.28;
    
    logCost({
      provider: 'deepseek',
      inputTokens: response.usage.input,
      outputTokens: response.usage.output,
      cost,
      endpoint,
      profile
    });

    return { result: response.content, cached: false };
  } catch (deepseekError: any) {
    const status = deepseekError.response?.status;
    
    if ([429, 500, 503].includes(status)) {
      console.warn(`[AI Failover] DeepSeek failed (${status}). Falling back to Anthropic...`);
      
      // SECONDARY: Anthropic with prompt caching
      try {
        const response = await callAnthropic(systemPrompt, userPrompt, { useCache: true });
        
        // Anthropic pricing: $3 per 1M input tokens (90% discount on cached = $0.30), $15 per 1M output tokens
        const inputCost = response.usage.cached > 0
          ? (response.usage.cached / 1_000_000) * 0.30 + ((response.usage.input - response.usage.cached) / 1_000_000) * 3.00
          : (response.usage.input / 1_000_000) * 3.00;
        const outputCost = (response.usage.output / 1_000_000) * 15.00;
        const cost = inputCost + outputCost;
        
        logCost({
          provider: 'anthropic',
          inputTokens: response.usage.input,
          outputTokens: response.usage.output,
          cost,
          endpoint,
          profile
        });

        return { result: response.content, cached: response.usage.cached > 0 };
      } catch (anthropicError: any) {
        console.error('[AI Failover] Both DeepSeek and Anthropic failed:', anthropicError.message);
        throw new Error('AI service temporarily unavailable. Both providers failed.');
      }
    }
    
    throw deepseekError;
  }
}

// ─────────────────────────────────────────────────────────────
// Endpoint-Specific AI Generators
// ─────────────────────────────────────────────────────────────

export async function generateTrend(profile: 'dj' | 'pooja', mode: string) {
  const prompts: Record<string, string> = {
    '6months': `Analyze the next 6 months of market trends for ${profile === 'dj' ? 'IT Audit (AI governance, cloud audit, GRC)' : 'Cardiovascular Research (scRNA-seq, spatial transcriptomics, bioinformatics)'}. Focus on: (1) emerging skill demands, (2) regulatory changes, (3) hiring velocity shifts. Format: 3 bullet points with data-backed insights. 250 words max.`,
    'disruption': `Identify 3 disruption risks to ${profile === 'dj' ? 'IT audit careers' : 'cardiovascular research careers'} in the next 12-24 months. Consider: automation, regulatory shifts, market consolidation. Format: Risk name + 1-sentence impact + mitigation strategy. 250 words max.`,
    'opportunity': `Identify 3 hidden opportunities in ${profile === 'dj' ? 'IT audit / AI governance' : 'cardiovascular research / precision medicine'} that most professionals are missing. Focus on: niche certifications, emerging sub-specialties, cross-domain skills. Format: Opportunity + Why it's undervalued + Action step. 250 words max.`
  };

  return generateAI('/ai/trend', profile, prompts[mode] || prompts['6months']);
}

export async function generateVaultEntry(profile: 'dj' | 'pooja', topic: string, type: string) {
  const prompts: Record<string, string> = {
    'full': `Generate a comprehensive study vault entry for: ${topic}. Include: (1) Definition, (2) Key formulas/concepts, (3) Real-world application, (4) Common exam traps. Format for ${profile === 'dj' ? 'ISACA AAIA / IAPP AIGP' : 'ASCP Molecular Biology'} exam. 400 words max.`,
    'traps': `List 5 common exam traps for: ${topic}. Format: TRAP: [misconception] → TRUTH: [correct answer]. Focus on ${profile === 'dj' ? 'AAIA/AIGP' : 'ASCP MB'} exam scenarios. 300 words max.`,
    'compare': `Compare and contrast: ${topic}. Create a comparison table with: Name | Key Principle | Use Case | Exam Hook. 4-6 rows. 300 words max.`,
    'flashcards': `Generate 10 flashcard Q&A pairs for: ${topic}. Format: Q: [question]\nA: [concise answer]. Target ${profile === 'dj' ? 'AAIA/AIGP' : 'ASCP MB'} exam difficulty. 400 words max.`,
    'mnemonics': `Create 3 memory aids / mnemonics for: ${topic}. Include: (1) Acronym/mnemonic, (2) What it represents, (3) Why it works. 250 words max.`
  };

  return generateAI('/ai/vault-entry', profile, prompts[type] || prompts['full']);
}

export async function generatePathway(profile: 'dj' | 'pooja', targetRole: string, timeline: string) {
  const prompt = `Generate a certification pathway to become: ${targetRole} in ${timeline}. For ${profile === 'dj' ? 'IT Audit professional' : 'Research scientist'}. Include: (1) Prerequisite certifications, (2) Step-by-step study plan, (3) Estimated time per phase, (4) Salary impact, (5) Market demand score. Format as structured steps. 500 words max.`;
  return generateAI('/ai/pathway', profile, prompt);
}

export async function generateTrack(profile: 'dj' | 'pooja', query: string) {
  const prompt = `Create a custom learning track for: ${query}. For ${profile === 'dj' ? 'IT Audit / AI Governance professional' : 'Cardiovascular research scientist'}. Format as week-by-week curriculum with: Week label | 3-4 specific tasks per week. 6-12 weeks total. 500 words max.`;
  return generateAI('/ai/track', profile, prompt);
}

export async function generateAssist(profile: 'dj' | 'pooja', mode: string, job: any) {
  const prompts: Record<string, string> = {
    'coverletter': `Write a compelling cover letter for ${profile === 'dj' ? 'Deobrat Jha (IT Audit Manager, CISA, 10+ yrs SOX/ITGC)' : 'Dr. Pooja Jha (Postdoc, Cardiovascular Biology, Nature Comms author)'} applying to:\n\nJob: ${job.title}\nCompany: ${job.company}\nKey Skills: ${job.keySkills.join(', ')}\n\nFormat: 3 paragraphs (200 words). Highlight: (1) Top relevant achievement, (2) Skills match to job, (3) Why this company/role. Professional tone.`,
    'interview': `Generate 5 interview questions for:\n\nJob: ${job.title} at ${job.company}\nCandidate: ${profile === 'dj' ? 'IT Audit Manager (CISA, AI governance, cloud audit)' : 'Postdoc (scRNA-seq, cardiac biology, bioinformatics)'}\n\nFor each question, provide: (1) The question, (2) STAR framework answer structure, (3) Key points to emphasize. 400 words max.`,
    'skillgap': `Analyze skill gaps for:\n\nJob Requirements: ${job.keySkills.join(', ')}\nCandidate: ${profile === 'dj' ? 'IT Audit Manager — SOX, ITGC, CISA, AWS, AI governance' : 'Postdoc — qPCR, RNA-seq, CRISPR, mouse models, scRNA-seq'}\n\nIdentify: (1) 3 gaps, (2) How to close each gap (course/cert/project), (3) Time estimate. 300 words max.`
  };

  return generateAI('/ai/assist', profile, prompts[mode] || prompts['coverletter']);
}

export async function generateSkill(profile: 'dj' | 'pooja', mode: string, query?: string) {
  if (query) {
    const prompt = `Answer this career strategy question for ${profile === 'dj' ? 'IT Audit / AI Governance professional' : 'Cardiovascular research scientist'}:\n\n${query}\n\nProvide: (1) Direct answer, (2) Market context, (3) Actionable next steps. 300 words max.`;
    return generateAI('/ai/skill', profile, prompt);
  }

  const prompts: Record<string, string> = {
    'immediate': `Identify 3 "quick win" skills for ${profile === 'dj' ? 'IT Audit professional (currently CISA + AWS CCP)' : 'Postdoc (currently qPCR + RNA-seq expert)'} that can be acquired in 4-8 weeks and provide immediate job market advantage. Format: Skill | Why it's a quick win | How to acquire | Salary impact. 300 words max.`,
    'strategic': `Analyze strategic skill gaps for ${profile === 'dj' ? 'IT Audit Manager targeting AI Audit Director' : 'Postdoc targeting Scientist II at biotech'}. Compare current skillset vs market demand. Identify: (1) 3 critical gaps, (2) Priority order, (3) 6-month action plan. 400 words max.`,
    'emerging': `List 5 emerging skills in ${profile === 'dj' ? 'IT Audit / AI Governance' : 'Cardiovascular research / precision medicine'} that will be in high demand 12-24 months from now. For each: Skill | Current demand | Predicted demand | First-mover advantage window. 350 words max.`,
    'salary': `Analyze salary impact of top 5 certifications/skills for ${profile === 'dj' ? 'IT Audit professionals' : 'Research scientists in biotech'}. Format: Cert/Skill | Base salary boost | Market demand score | ROI timeline. 300 words max.`
  };

  return generateAI('/ai/skill', profile, prompts[mode] || prompts['immediate']);
}
