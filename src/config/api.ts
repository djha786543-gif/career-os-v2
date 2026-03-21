// Use relative paths so the frontend always talks to the server hosting it
export const API_BASE = '/api';

export const api = {
  get: (path: string) =>
    fetch(\\\src/config/api.ts\).then(r => {
      if (!r.ok) throw new Error(\GET \src/config/api.ts failed: \\);
      return r.json();
    }),
  post: (path: string, body: unknown) =>
    fetch(\\\src/config/api.ts\, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => {
      if (!r.ok) throw new Error(\POST \src/config/api.ts failed: \\);
      return r.json();
    }),
  // ... (rest of your helper functions)
}
