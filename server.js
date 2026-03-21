const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Immediate Healthcheck (Must be first)
app.get('/health', (req, res) => res.status(200).send('OK'));

// 2. Link Engine with Error Handling
try {
    const monitorRouter = require('./backend/dist/api/monitor');
    app.use('/api/monitor', monitorRouter);
    console.log('Monitor logic loaded successfully');
} catch (e) {
    console.error('CRITICAL: Monitor logic failed to load:', e.message);
}

// 3. Static Files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log('Server is live on port ' + PORT);
});
