"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const monitorEngine_1 = require("../opportunity-monitor/monitorEngine");
const orgConfig_1 = require("../opportunity-monitor/orgConfig");
const router = (0, express_1.Router)();
// RECOMMENDATION 7: Validated query params with caps
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
// GET /api/monitor/jobs?sector=academia&isNew=true&minScore=40&limit=50&offset=0
router.get('/jobs', async (req, res) => {
    try {
        const sector = req.query.sector;
        const isNew = req.query.isNew === 'true';
        const minScore = Math.max(0, parseInt(req.query.minScore || '0'));
        const limit = Math.min(parseInt(req.query.limit || String(DEFAULT_LIMIT)), MAX_LIMIT);
        const offset = Math.max(parseInt(req.query.offset || '0'), 0);
        // Industry and India: strict 45-day recency (no expired listings)
        // Academia/International: 90-day window (faculty cycles are slower)
        const isIndustryOrIndia = sector === 'industry' || sector === 'india';
        const recencyDays = isIndustryOrIndia ? 45 : 90;
        const params = [];
        let where = `WHERE j.is_active = true
      AND j.detected_at > NOW() - INTERVAL '${recencyDays} days'`;
        if (sector && ['academia', 'industry', 'international', 'india'].includes(sector)) {
            params.push(sector);
            where += ` AND j.sector = $${params.length}`;
        }
        if (isNew) {
            where += ` AND j.is_new = true`;
        }
        if (minScore > 0) {
            params.push(minScore);
            where += ` AND j.match_score >= $${params.length}`;
        }
        params.push(limit);
        params.push(offset);
        const result = await client_1.pool.query(`SELECT j.*, o.last_scanned_at, o.api_type
       FROM monitor_jobs j
       JOIN monitor_orgs o ON j.org_id = o.id
       ${where}
       ORDER BY j.match_score DESC NULLS LAST, j.is_new DESC, j.detected_at DESC
       LIMIT $${params.length - 1}
       OFFSET $${params.length}`, params);
        const counts = await client_1.pool.query(`SELECT sector,
         COUNT(*) FILTER (WHERE is_active = true AND detected_at > NOW() - INTERVAL '90 days') as total,
         COUNT(*) FILTER (WHERE is_new = true AND is_active = true AND detected_at > NOW() - INTERVAL '90 days') as new_count
       FROM monitor_jobs
       GROUP BY sector`);
        res.json({
            status: 'success',
            jobs: result.rows,
            counts: counts.rows,
            total: result.rows.length,
            limit,
            offset
        });
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
// GET /api/monitor/orgs?sector=academia
router.get('/orgs', async (req, res) => {
    try {
        const sector = req.query.sector;
        const params = [];
        let where = 'WHERE o.is_active = true';
        if (sector && ['academia', 'industry', 'international', 'india'].includes(sector)) {
            params.push(sector);
            where += ` AND o.sector = $${params.length}`;
        }
        const result = await client_1.pool.query(`SELECT o.*,
         COUNT(j.id) FILTER (WHERE j.is_active = true) as total_jobs,
         COUNT(j.id) FILTER (WHERE j.is_new = true AND j.is_active = true) as new_jobs
       FROM monitor_orgs o
       LEFT JOIN monitor_jobs j ON o.id = j.org_id
       ${where}
       GROUP BY o.id
       ORDER BY new_jobs DESC, total_jobs DESC`, params);
        res.json({ status: 'success', orgs: result.rows });
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
// POST /api/monitor/scan
router.post('/scan', async (req, res) => {
    try {
        const { orgId } = req.body;
        if (orgId) {
            const orgRow = await client_1.pool.query('SELECT * FROM monitor_orgs WHERE id = $1', [orgId]);
            if (!orgRow.rows.length) {
                return res.status(404).json({ error: 'Organization not found' });
            }
            const orgConfig = orgConfig_1.MONITOR_ORGS.find(o => o.name === orgRow.rows[0].name);
            if (!orgConfig) {
                return res.status(404).json({ error: 'Organization config not found' });
            }
            res.json({ status: 'scanning', orgId, message: `Scanning ${orgConfig.name}...` });
            (0, monitorEngine_1.scanOrg)(orgId, orgConfig).catch(console.error);
        }
        else {
            res.json({ status: 'scanning', message: 'Full scan started in background' });
            (0, monitorEngine_1.runFullScan)().catch(console.error);
        }
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
// POST /api/monitor/rescore — recalculate match_score for all active jobs
// Fixes rows inserted before the match_score column existed (score = 0).
// Safe to call at any time; runs in background.
router.post('/rescore', async (req, res) => {
    try {
        res.json({ status: 'rescoring', message: 'Rescoring all active jobs in background' });
        (0, monitorEngine_1.rescoreAllActiveJobs)().catch(console.error);
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
// POST /api/monitor/purge — delete garbage titles and rescore in background
router.post('/purge', async (req, res) => {
    try {
        const deleted = await (0, monitorEngine_1.purgeGarbageJobs)();
        res.json({ status: 'success', deleted, message: `Purged ${deleted} garbage entries` });
        // Also trigger a rescore of remaining jobs
        (0, monitorEngine_1.rescoreAllActiveJobs)().catch(console.error);
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
// POST /api/monitor/mark-seen
router.post('/mark-seen', async (req, res) => {
    try {
        const { sector } = req.body;
        if (sector && ['academia', 'industry', 'international', 'india'].includes(sector)) {
            await client_1.pool.query('UPDATE monitor_jobs SET is_new = false WHERE sector = $1 AND is_active = true', [sector]);
        }
        else {
            await client_1.pool.query('UPDATE monitor_jobs SET is_new = false WHERE is_active = true');
        }
        res.json({ status: 'success', message: 'Jobs marked as seen' });
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
// GET /api/monitor/stats
router.get('/stats', async (req, res) => {
    try {
        const sectors = await client_1.pool.query(`SELECT sector,
         COUNT(*) FILTER (WHERE is_active = true) as total_jobs,
         COUNT(*) FILTER (WHERE is_new = true AND is_active = true) as new_jobs,
         MAX(detected_at) FILTER (WHERE is_active = true) as last_detected
       FROM monitor_jobs
       GROUP BY sector
       ORDER BY sector`);
        const lastScan = await client_1.pool.query(`SELECT MAX(scanned_at) as last_scan
       FROM monitor_scans
       WHERE status = 'success'`);
        const orgCount = await client_1.pool.query('SELECT COUNT(*) as total FROM monitor_orgs WHERE is_active = true');
        res.json({
            status: 'success',
            sectors: sectors.rows,
            lastScan: lastScan.rows[0]?.last_scan,
            totalOrgs: parseInt(orgCount.rows[0]?.total || '0')
        });
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
exports.default = router;
