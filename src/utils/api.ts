export const API_URL = "https://career-os-backend-production.up.railway.app";

export async function fetchJobs() {
  const response = await fetch(`${API_URL}/api/jobs`);
  if (!response.ok) throw new Error("Failed to fetch jobs");
  return response.json();
}
