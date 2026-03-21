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
console.log('Targeting Logic at:', BACKEND_DIR);

try {
  const load = (f) => {
    const m = require(path.join(BACKEND_DIR, f));
    // Unwraps default exports, named 'router' exports, or the module itself
    return m.default || m.router || (typeof m === 'function' ? m : m);
  };

  app.use('/api/monitor', load('monitor.js'));
  app.use('/api/jobs', load('jobs.js'));
  console.log('✅ API Bridge: SUCCESS - Logic Mounted');
} catch (e) {
  console.error('❌ API Bridge: FAILED ->', e.message);
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
