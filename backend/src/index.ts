import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jobsRouter from './api/jobs';
import alertsRouter from './api/alerts';

dotenv.config();

const app = express();

// CORS - allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Health check with env validation
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    env: {
      serpApi: !!process.env.SERP_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      adzuna: !!process.env.ADZUNA_APP_ID && !!process.env.ADZUNA_APP_KEY
    },
    timestamp: new Date().toISOString()
  });
});

// Mount routers
app.use('/api/jobs', jobsRouter);
app.use('/api/alerts', alertsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Career OS Backend running on port ${PORT}`);
  console.log(`✅ SerpApi configured: ${!!process.env.SERP_API_KEY}`);
  console.log(`✅ CORS origin: ${process.env.FRONTEND_URL || 'localhost:3000'}`);
});
