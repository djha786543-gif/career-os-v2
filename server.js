const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Healthcheck (Must be top priority for Railway)
app.get('/health', (req, res) => res.status(200).send('OK'));

// 2. Link Logic (This is where Pooja's data lives)
try {
    // Attempt to load the compiled logic from the backend folder
    const monitorRouter = require('./backend/dist/api/monitor');
    app.use('/api/monitor', monitorRouter);
} catch (e) {
    console.log('API Logic not found, running in frontend-only mode');
}

// 3. Static Files (Next.js)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('Server live on ' + PORT));
