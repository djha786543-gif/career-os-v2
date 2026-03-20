// Normalise: strip trailing slash and any trailing /api, then always append /api.
// This makes the URL correct whether NEXT_PUBLIC_API_URL is set with or without /api.
const _raw = (process.env.NEXT_PUBLIC_API_URL || 'https://career-os-backend-production.up.railway.app')
  .replace(/\/+$/, '')        // remove trailing slashes
  .replace(/\/api$/, '');     // remove /api suffix if already present
export const API_BASE = `${_raw}/api`

export const api = {
  get: (path: string) => 
    fetch(`${API_BASE}${path}`).then(r => {
      if (!r.ok) throw new Error(`GET ${path} failed: ${r.statusText}`);
      return r.json();
    }),
  post: (path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => {
      if (!r.ok) throw new Error(`POST ${path} failed: ${r.statusText}`);
      return r.json();
    }),
  patch: (path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => {
      if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.statusText}`);
      return r.json();
    }),
  delete: (path: string) =>
    fetch(`${API_BASE}${path}`, { method: 'DELETE' }).then(r => {
      if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.statusText}`);
      return r.json();
    }),
}
