const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck for Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

// The Bridge - Targeting the Agentic AI logic
const BACKEND_DIR = path.join(__dirname, 'backend', 'dist', 'api');
const BACKEND_DIST = path.join(__dirname, 'backend', 'dist');
console.log('Targeting Logic at:', BACKEND_DIR);

const load = (f) => {
  const m = require(path.join(BACKEND_DIR, f));
  // Unwraps default exports, named 'router' exports, or the module itself
  return m.default || m.router || (typeof m === 'function' ? m : m);
};

// Mount DJ monitor BEFORE Pooja monitor to avoid /api/monitor prefix collision
try {
  app.use('/api/monitor/dj', load('monitorDJ.js'));
  console.log('✅ API Bridge: DJ Monitor Mounted at /api/monitor/dj');
} catch (e) {
  console.error('❌ API Bridge: DJ Monitor FAILED ->', e.message);
}

try {
  app.use('/api/monitor', load('monitor.js'));
  app.use('/api/jobs', load('jobs.js'));
  console.log('✅ API Bridge: Pooja Monitor + Jobs Mounted');
} catch (e) {
  console.error('❌ API Bridge: FAILED ->', e.message);
}

// Run DB init + org seeding on startup (non-fatal if DB unreachable)
try {
  const { dbInit }     = require(path.join(BACKEND_DIST, 'db', 'init.js'));
  const { seedOrgs }   = require(path.join(BACKEND_DIST, 'opportunity-monitor', 'monitorEngine.js'));
  const { seedOrgsDJ } = require(path.join(BACKEND_DIST, 'opportunity-monitor', 'monitorEngineDJ.js'));
  Promise.resolve()
    .then(() => dbInit())
    .then(() => seedOrgs().catch(e => console.warn('[Seed] Pooja orgs:', e.message)))
    .then(() => seedOrgsDJ().catch(e => console.warn('[Seed] DJ orgs:', e.message)))
    .catch(e => console.error('[Init]', e.message));
} catch (e) {
  console.error('❌ DB Init load failed:', e.message);
}

// Static UI serving
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Catch-all for React/Next routes (Regex prevents hijacking /api)
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Audit Suite Live on port ${PORT}`));
