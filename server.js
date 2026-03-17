const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, 'public');

// 1. Explicit Health Check (No wildcard, zero room for error)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 2. Static File Serving
app.use(express.static(publicPath));

// 3. The "Bulletproof" Catch-all (Regex works in all Express versions)
app.get(/.*/, (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Portal files missing. Build might have failed.');
    }
});

// 4. Bind to 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVER_FULLY_OPERATIONAL_ON_PORT_${PORT}`);
});
