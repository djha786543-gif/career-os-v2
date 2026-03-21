const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Healthcheck
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 2. API Bridge
try {
  const monitorPath = path.join(__dirname, 'backend', 'dist', 'api', 'monitor');
  const monitorRouter = require(monitorPath);
  app.use('/api/monitor', monitorRouter);
  console.log('API Bridge: Connected');
} catch (e) {
  console.log('API Bridge: Running in fallback mode');
}

// 3. Static Frontend
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Express 5: Use a Regex Literal to catch everything
// This avoids the 'path-to-regexp' string parsing error
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server live on port ${PORT}`);
});
