const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.static(__dirname));

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/api/jobs', async (req, res) => {
    const { ADZUNA_APP_ID: id, ADZUNA_APP_KEY: key } = process.env;
    console.log(`[TERMINATOR] Attempting Fetch. ID: ${!!id}, Key: ${!!key}`);

    try {
        const response = await axios.get('https://api.adzuna.com/v1/api/jobs/us/search/1', {
            params: { app_id: id, app_key: key, results_per_page: 5, what: "audit" },
            timeout: 8000
        });
        res.json({ status: 'success', jobs: response.data.results || [] });
    } catch (err) {
        console.error('[TERMINATOR ERROR]:', err.response ? err.response.status : err.message);
        res.status(500).json({ status: 'error', code: err.response ? err.response.status : 500 });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'career-os-v2.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`SYSTEM ACTIVE ON PORT ${PORT}`));
