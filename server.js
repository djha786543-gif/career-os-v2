const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Serve all files in the current directory
app.use(express.static(__dirname));

// Serve the dashboard at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'career-os-v2.html'));
});

// Required for Railway
app.get('/health', (req, res) => res.status(200).send('OK'));

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server is running on port ' + PORT);
});
