const express = require('express');
const path = require('path');
const app = express();

// 1. RAILWAY PORT FIX: Use the port Railway gives you
const PORT = process.env.PORT || 3001;

app.use(express.static(__dirname));

// 2. HOME ROUTE FIX: This prevents the 'Healthcheck failure'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'career-os-v2.html'));
});

// 3. SEARCH LOGIC: Add your Adzuna/Pooja logic here
app.get('/api/search', (req, res) => {
    // Your job search code goes here
    res.json({ message: "Search endpoint active" });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server is live on port ' + PORT);
});
