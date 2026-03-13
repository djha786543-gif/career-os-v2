const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 8080;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.static(__dirname));

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/api/jobs', async (req, res) => {
    // AUDIT CHECK: Log if keys are missing
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    
    console.log(`[Audit] Fetching jobs. Keys present: ID=${!!appId}, Key=${!!appKey}`);

    if (!appId || !appKey) {
        return res.status(500).json({ status: 'error', message: 'Missing API Keys in Railway Variables' });
    }

    try {
        const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=10&what=CISA%20IT%20Audit&content_type=application/json`;
        const response = await axios.get(url);

        const jobs = response.data.results.map(job => ({
            id: job.id,
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            salary: job.salary_min ? `$${Math.round(job.salary_min/1000)}k` : "N/A",
            snippet: job.description.substring(0, 150) + "...",
            applyUrl: job.redirect_url,
            fitScore: 85
        }));

        res.json({ status: 'success', jobs: jobs });
    } catch (error) {
        console.error('[Adzuna Error Detail]:', error.response ? error.response.data : error.message);
        res.status(500).json({ status: 'error', message: 'Adzuna API rejection' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'career-os-v2.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log('Audit Engine Active on ' + PORT));
