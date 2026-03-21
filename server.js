const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Healthcheck
app.get('/health', (req, res) => res.status(200).send('OK'));

// 2. THE BRIDGE - Using absolute resolution
const BACKEND_DIR = path.join(__dirname, 'backend', 'dist', 'api');

try {
  // Explicitly loading the specific files we verified with 'ls'
  const monitorRouter = require(path.join(BACKEND_DIR, 'monitor.js'));
  const jobsRouter = require(path.join(BACKEND_DIR, 'jobs.js'));
  
  app.use('/api/monitor', monitorRouter);
  app.use('/api/jobs', jobsRouter);
  console.log('API Bridge: SUCCESS - Routes registered');
} catch (e) {
  console.error('API Bridge: CRITICALLY FAILED');
  console.error('Expected Path:', BACKEND_DIR);
  console.error('Error:', e.message);
}

// 3. Static Frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Catch-all for UI
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server live on ${PORT}`));
