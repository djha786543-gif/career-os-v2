const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Healthcheck (Essential for Railway)
app.get('/health', (req, res) => res.status(200).send('OK'));

// 2. The Bridge (Using Linux-friendly relative paths)
try {
  const monitorRouter = require('./backend/dist/api/monitor');
  const jobsRouter = require('./backend/dist/api/jobs');
  app.use('/api/monitor', monitorRouter);
  app.use('/api/jobs', jobsRouter);
  console.log('API Bridge: Connected to backend logic');
} catch (e) {
  console.error('API Bridge Failure:', e.message);
}

// 3. Static Assets & Express 5 Catch-all
// We use a Regex to ensure UI is served for all non-API routes
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server live on ${PORT}`));
