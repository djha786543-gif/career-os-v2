import express from 'express';
import { 
  generateTrend, 
  generateVaultEntry, 
  generatePathway, 
  generateTrack, 
  generateAssist, 
  generateSkill 
} from '../services/aiProvider';

const router = express.Router();

// POST /api/ai/trend
router.post('/trend', async (req, res) => {
  try {
    const { profile, mode } = req.body;
    const result = await generateTrend(profile, mode);
    res.json(result);
  } catch (error: any) {
    console.error('[AI Endpoint] /trend error:', error);
    res.status(500).json({ error: 'AI generation failed', message: error.message });
  }
});

// POST /api/ai/vault-entry
router.post('/vault-entry', async (req, res) => {
  try {
    const { profile, topic, type } = req.body;
    const result = await generateVaultEntry(profile, topic, type);
    res.json(result);
  } catch (error: any) {
    console.error('[AI Endpoint] /vault-entry error:', error);
    res.status(500).json({ error: 'AI generation failed', message: error.message });
  }
});

// POST /api/ai/pathway
router.post('/pathway', async (req, res) => {
  try {
    const { profile, targetRole, timeline } = req.body;
    const result = await generatePathway(profile, targetRole, timeline);
    res.json(result);
  } catch (error: any) {
    console.error('[AI Endpoint] /pathway error:', error);
    res.status(500).json({ error: 'AI generation failed', message: error.message });
  }
});

// POST /api/ai/track
router.post('/track', async (req, res) => {
  try {
    const { profile, query } = req.body;
    const result = await generateTrack(profile, query);
    res.json(result);
  } catch (error: any) {
    console.error('[AI Endpoint] /track error:', error);
    res.status(500).json({ error: 'AI generation failed', message: error.message });
  }
});

// POST /api/ai/assist
router.post('/assist', async (req, res) => {
  try {
    const { profile, mode, job } = req.body;
    const result = await generateAssist(profile, mode, job);
    res.json(result);
  } catch (error: any) {
    console.error('[AI Endpoint] /assist error:', error);
    res.status(500).json({ error: 'AI generation failed', message: error.message });
  }
});

// POST /api/ai/skill
router.post('/skill', async (req, res) => {
  try {
    const { profile, mode, query } = req.body;
    const result = await generateSkill(profile, mode, query);
    res.json(result);
  } catch (error: any) {
    console.error('[AI Endpoint] /skill error:', error);
    res.status(500).json({ error: 'AI generation failed', message: error.message });
  }
});

export default router;
