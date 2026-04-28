/**
 * Parse a relative posted-date string ("3 days ago", "2 weeks ago", ISO date, etc.)
 * and return how many days ago it was. Returns 0 for unknown / very recent.
 */
export function daysAgo(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const s = dateStr.toLowerCase().trim();
  if (/^(today|just now|moments? ago|an? hour|hours? ago|\d+\s*h(ours?)? ago|\d+\s*m(ins?)? ago)/.test(s)) return 0;
  if (s.includes('yesterday')) return 1;
  const dayMatch = s.match(/(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1], 10);
  const weekMatch = s.match(/(\d+)\s*week/);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;
  const monthMatch = s.match(/(\d+)\s*month/);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
  const plusMatch = s.match(/^(\d+)\+/);
  if (plusMatch) return parseInt(plusMatch[1], 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const diff = Date.now() - new Date(s).getTime();
    return Math.max(0, Math.floor(diff / 86_400_000));
  }
  return 0;
}

export function isExpiredJob(dateStr: string | undefined | null, maxDays = 30): boolean {
  return daysAgo(dateStr) > maxDays;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  return `${diffDays} days ago`
}

export function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    'USA': '🇺🇸', 'UK': '🇬🇧', 'Germany': '🇩🇪',
    'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Canada': '🇨🇦',
    'Singapore': '🇸🇬', 'Australia': '🇦🇺', 'India': '🇮🇳',
    'France': '🇫🇷', 'Netherlands': '🇳🇱'
  }
  return flags[country] || '🌍'
}

export function sourceBadgeLabel(apiType: string): string {
  const labels: Record<string, string> = {
    'websearch': 'Web Search',
    'usajobs': 'USAJobs.gov',
    'rss': 'RSS Feed',
    'adzuna': 'Adzuna',
    'natureJobs': 'Nature Jobs'
  }
  return labels[apiType] || apiType
}
