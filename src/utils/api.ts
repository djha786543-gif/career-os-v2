// Single source of truth — re-export from config/api which normalises the URL.
// Both API_BASE and API_URL are the same value (with /api suffix).
export { API_BASE, API_BASE as API_URL } from '../config/api';

import { API_BASE } from '../config/api';

export async function fetchJobs() {
  const response = await fetch(`${API_BASE}/jobs`);
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return response.json();
}
