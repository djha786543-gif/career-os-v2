const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// 1. Security & Body Parsing
app.use(cors({
  origin: ['https://career-os-portal-production.up.railway.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// 2. Healthcheck
app.get('/health', (req, res) => res.status(200).send('OK'));

// 3. LINK THE ENGINE (This connects to your actual logic)
// We point to the 'dist' folder because Node runs Javascript, not Typescript
const monitorRouter = require('./backend/dist/api/monitor');
const jobsRouter = require('./backend/dist/api/jobs');

app.use('/api/monitor', monitorRouter);
app.use('/api/jobs', jobsRouter);

// 4. Static Files (Next.js export)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
